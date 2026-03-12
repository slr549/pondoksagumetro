import { motion } from "framer-motion";
import { Star, Plus } from "lucide-react";
import { Product, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { addToCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={`/product/${product.id}`}>
        <div className="overflow-hidden rounded-xl bg-card shadow-card transition-shadow duration-200 hover:shadow-elevated">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {product.isBestSeller && (
              <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Best Seller
              </span>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-display text-sm font-semibold text-foreground">
                  {product.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-xs font-medium text-foreground tabular-nums">{product.rating}</span>
              <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-display text-base font-bold text-foreground tabular-nums">
                {formatPrice(product.price)}
              </span>
              <button
                onClick={handleAdd}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
