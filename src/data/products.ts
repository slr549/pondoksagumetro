import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";

export type Category = "Dessert" | "Makanan" | "Minuman";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  isBestSeller: boolean;
  rating: number;
  reviewCount: number;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Puding Sagu Pandan",
    description: "Puding sagu lembut dengan saus pandan alami khas Situgede. Tekstur kenyal yang meleleh di mulut.",
    price: 15000,
    category: "Dessert",
    image: product1,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 124,
    stock: 50,
  },
  {
    id: "2",
    name: "Nasi Goreng Spesial",
    description: "Nasi goreng dengan bumbu rahasia, dilengkapi telur, ayam suwir, dan kerupuk.",
    price: 25000,
    category: "Makanan",
    image: product2,
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 98,
    stock: 30,
  },
  {
    id: "3",
    name: "Es Campur Segar",
    description: "Campuran buah segar tropis dengan sirup manis dan es serut. Sangat menyegarkan.",
    price: 18000,
    category: "Minuman",
    image: product3,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 156,
    stock: 40,
  },
  {
    id: "4",
    name: "Klepon Sagu",
    description: "Bola-bola sagu pandan berisi gula merah cair, ditaburi kelapa parut segar.",
    price: 12000,
    category: "Dessert",
    image: product4,
    isBestSeller: false,
    rating: 4.6,
    reviewCount: 72,
    stock: 60,
  },
  {
    id: "5",
    name: "Mie Goreng Pedas",
    description: "Mie goreng dengan level pedas pilihan, topping telur dan sayuran segar.",
    price: 22000,
    category: "Makanan",
    image: product5,
    isBestSeller: false,
    rating: 4.5,
    reviewCount: 64,
    stock: 25,
  },
  {
    id: "6",
    name: "Es Teler Avocado",
    description: "Es teler dengan alpukat, nangka, kelapa muda, dan susu kental manis.",
    price: 20000,
    category: "Minuman",
    image: product6,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 110,
    stock: 35,
  },
];

export const categories: Category[] = ["Dessert", "Makanan", "Minuman"];

export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`;
}
