import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { products, categories, Category } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("category") as Category | null;
  const [activeCategory, setActiveCategory] = useState<Category | "Semua">(initialCat || "Semua");

  const filtered = activeCategory === "Semua"
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Menu</span>
        <h1 className="mt-1 text-section font-display font-bold text-foreground">Semua Menu</h1>

        {/* Category filter */}
        <div className="sticky top-16 z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-background/80 px-4 py-3 backdrop-blur-xl">
          {(["Semua", ...categories] as const).map((cat) => (
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
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">Tidak ada produk di kategori ini.</p>
        )}
      </div>
    </div>
  );
}
