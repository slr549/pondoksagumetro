import { motion, AnimatePresence } from "framer-motion";
import { Star, Plus, Heart } from "lucide-react";
import { Product, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { wishlistIds, toggleWishlist, isToggling } = useWishlist();
  const navigate = useNavigate();
  const isWished = wishlistIds.includes(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Silakan login untuk menyimpan favorit");
      navigate("/login");
      return;
    }
    toggleWishlist(product.id, {
      onSuccess: (result) => {
        toast.success(result.added ? `${product.name} ditambahkan ke wishlist` : `${product.name} dihapus dari wishlist`);
      },
    });
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
              src={product.image_url || "/placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {product.is_best_seller && (
              <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Best Seller
              </span>
            )}
            <button
              onClick={handleWishlist}
              disabled={isToggling}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isWished ? "fill-destructive text-destructive" : "text-muted-foreground"
                }`}
              />
            </button>
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
              <span className="text-xs font-medium text-foreground tabular-nums">{product.avg_rating ?? 0}</span>
              <span className="text-xs text-muted-foreground">({product.review_count ?? 0})</span>
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
