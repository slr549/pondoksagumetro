import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold text-foreground">Keranjang Kosong</h1>
        <p className="text-muted-foreground">Belum ada produk di keranjang Anda.</p>
        <Link to="/menu" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-cta">
          Lihat Menu <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="text-section font-display font-bold text-foreground">Keranjang</h1>

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <motion.div
              key={item.product.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-4 rounded-xl bg-card p-4 shadow-card"
            >
              <img src={item.product.image} alt={item.product.name} className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{item.product.name}</h3>
                  <p className="text-sm font-medium text-muted-foreground tabular-nums">{formatPrice(item.product.price)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-border">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-xl font-bold text-foreground tabular-nums">{formatPrice(totalPrice)}</span>
          </div>
          <Link
            to="/checkout"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-cta transition-transform hover:scale-[1.03] active:scale-[0.97]"
          >
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
