import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("category") || "Semua";
  const [activeCategory, setActiveCategory] = useState(initialCat);

  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [] } = useCategories();

  const filtered = activeCategory === "Semua"
    ? products
    : products.filter((p) => p.categories?.name === activeCategory);

  const categoryNames = ["Semua", ...categories.map((c) => c.name)];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Menu</span>
        <h1 className="mt-1 text-section font-display font-bold text-foreground">Semua Menu</h1>

        {/* Category filter */}
        <div className="sticky top-16 z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-background/80 px-4 py-3 backdrop-blur-xl">
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

        {/* Products grid */}
        {loadingProducts ? (
          <div className="mt-12 text-center text-muted-foreground">Memuat produk...</div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}

        {!loadingProducts && filtered.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">Tidak ada produk di kategori ini.</p>
        )}
      </div>
    </div>
  );
}
