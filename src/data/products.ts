// Product type matching the database schema
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_best_seller: boolean;
  avg_rating: number | null;
  review_count: number | null;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  // Joined field
  categories?: { name: string; slug: string } | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`;
}
