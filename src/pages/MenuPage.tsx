import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/products";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type SortOption = "newest" | "price_asc" | "price_desc" | "rating" | "popular";

const sortLabels: Record<SortOption, string> = {
  newest: "Terbaru",
  price_asc: "Harga Terendah",
  price_desc: "Harga Tertinggi",
  rating: "Rating Tertinggi",
  popular: "Terpopuler",
};

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("category") || "Semua";
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minRating, setMinRating] = useState(0);
  const [bestSellerOnly, setBestSellerOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [] } = useCategories();

  // Compute max price for slider
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.max(...products.map((p) => p.price));
  }, [products]);

  // Initialize price range once products load
  const effectiveMaxPrice = priceRange[1] === 0 ? maxPrice : priceRange[1];

  const filtered = useMemo(() => {
    let result = products;

    // Category
    if (activeCategory !== "Semua") {
      result = result.filter((p) => p.categories?.name === activeCategory);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Price range
    if (priceRange[0] > 0 || (priceRange[1] > 0 && priceRange[1] < maxPrice)) {
      result = result.filter(
        (p) => p.price >= priceRange[0] && p.price <= effectiveMaxPrice
      );
    }

    // Min rating
    if (minRating > 0) {
      result = result.filter((p) => (p.avg_rating || 0) >= minRating);
    }

    // Best seller
    if (bestSellerOnly) {
      result = result.filter((p) => p.is_best_seller);
    }

    // In stock
    if (inStockOnly) {
      result = result.filter((p) => p.stock_quantity > 0);
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        break;
      case "popular":
        sorted.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return sorted;
  }, [products, activeCategory, search, sortBy, priceRange, effectiveMaxPrice, maxPrice, minRating, bestSellerOnly, inStockOnly]);

  const categoryNames = ["Semua", ...categories.map((c) => c.name)];

  const activeFilterCount = [
    priceRange[0] > 0 || (priceRange[1] > 0 && priceRange[1] < maxPrice),
    minRating > 0,
    bestSellerOnly,
    inStockOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPriceRange([0, 0]);
    setMinRating(0);
    setBestSellerOnly(false);
    setInStockOnly(false);
    setSearch("");
    setSortBy("newest");
    setActiveCategory("Semua");
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Menu</span>
        <h1 className="mt-1 text-section font-display font-bold text-foreground">Semua Menu</h1>

        {/* Search & Sort bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="mt-3 rounded-xl bg-card p-4 shadow-card space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filter Lanjutan</h3>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearFilters}>
                Reset Semua
              </Button>
            </div>

            {/* Price range */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Rentang Harga: {formatPrice(priceRange[0] || 0)} — {formatPrice(effectiveMaxPrice)}
              </p>
              <Slider
                min={0}
                max={maxPrice}
                step={1000}
                value={[priceRange[0] || 0, effectiveMaxPrice]}
                onValueChange={([min, max]) => setPriceRange([min, max])}
                className="w-full"
              />
            </div>

            {/* Min rating */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Rating Minimum</p>
              <div className="flex gap-2">
                {[0, 3, 3.5, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      minRating === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === 0 ? "Semua" : (
                      <>
                        <Star className="h-3 w-3 fill-current" />
                        {r}+
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBestSellerOnly(!bestSellerOnly)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  bestSellerOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                🔥 Best Seller
              </button>
              <button
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  inStockOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                ✅ Stok Tersedia
              </button>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="sticky top-16 z-30 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-background/80 px-4 py-3 backdrop-blur-xl">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!loadingProducts && (
          <p className="mt-4 text-xs text-muted-foreground">
            {filtered.length} produk ditemukan
            {(search || activeFilterCount > 0 || activeCategory !== "Semua") && (
              <button onClick={clearFilters} className="ml-2 text-primary hover:underline">
                Reset filter
              </button>
            )}
          </p>
        )}

        {/* Products grid */}
        {loadingProducts ? (
          <div className="mt-12 text-center text-muted-foreground">Memuat produk...</div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}

        {!loadingProducts && filtered.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">Tidak ada produk yang cocok dengan filter.</p>
        )}
      </div>
    </div>
  );
}
