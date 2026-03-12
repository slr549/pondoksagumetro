import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { products, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <p className="text-muted-foreground">Produk tidak ditemukan.</p>
      </div>
    );
  }

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addToCart(product);
    toast.success(`${qty}x ${product.name} ditambahkan ke keranjang`);
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <Link to="/menu" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Menu
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="overflow-hidden rounded-xl shadow-card"
          >
            <img src={product.image} alt={product.name} className="aspect-square w-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{product.category}</span>
            <h1 className="mt-1 text-section font-display font-bold text-foreground">{product.name}</h1>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium tabular-nums">{product.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">({product.reviewCount} ulasan)</span>
              {product.isBestSeller && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Best Seller</span>
              )}
            </div>

            <p className="mt-4 text-muted-foreground">{product.description}</p>

            <p className="mt-6 font-display text-3xl font-bold text-foreground tabular-nums">
              {formatPrice(product.price)}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-cta transition-transform hover:scale-[1.03] active:scale-[0.97]"
              >
                <ShoppingCart className="h-4 w-4" /> Tambah ke Keranjang
              </button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Stok: <span className="tabular-nums">{product.stock}</span> tersedia
            </p>
          </motion.div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-section font-display font-bold text-foreground">Produk Serupa</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
