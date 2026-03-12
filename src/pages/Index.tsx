import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, MapPin, Clock, ChevronRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { products, categories, formatPrice } from "@/data/products";
import ProductCard from "@/components/ProductCard";

const reviews = [
  { name: "Siti R.", rating: 5, text: "Puding sagunya enak banget! Pasti balik lagi.", date: "2 hari lalu" },
  { name: "Budi A.", rating: 5, text: "Nasi goreng spesialnya juara. Porsinya banyak.", date: "1 minggu lalu" },
  { name: "Dewi S.", rating: 4, text: "Es campur segar dan manis, cocok di cuaca panas.", date: "2 minggu lalu" },
];

export default function Index() {
  const bestSellers = products.filter((p) => p.isBestSeller);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-[100svh] items-center md:min-h-[70vh]">
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroBg} alt="Pondok Sagu Metro food" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
        </div>
        <div className="container relative z-10 mx-auto px-4 py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <h1 className="text-hero font-display font-extrabold leading-[1.1] text-foreground">
              Satu Klik dari{" "}
              <span className="text-gradient">Manisnya Situgede</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Dessert, Makanan, dan Minuman Segar untuk Semua. Pesan online, ambil di toko.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-cta transition-transform hover:scale-[1.03] active:scale-[0.97]"
              >
                Lihat Menu <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Terlaris</span>
              <h2 className="mt-1 text-section font-display font-bold text-foreground">Best Seller</h2>
            </div>
            <Link to="/menu" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Lihat Semua <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {bestSellers.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-border py-12 md:py-16">
        <div className="container mx-auto px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Kategori</span>
          <h2 className="mt-1 text-section font-display font-bold text-foreground">Pilih Kategori</h2>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat}
                to={`/menu?category=${cat}`}
                className="group flex flex-col items-center gap-3 rounded-xl bg-card p-6 shadow-card transition-shadow hover:shadow-elevated"
              >
                <span className="text-2xl">
                  {cat === "Dessert" ? "🍮" : cat === "Makanan" ? "🍛" : "🥤"}
                </span>
                <span className="font-display text-sm font-semibold text-foreground">{cat}</span>
                <span className="text-xs text-muted-foreground">
                  {products.filter((p) => p.category === cat).length} produk
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Preview */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Menu</span>
          <h2 className="mt-1 text-section font-display font-bold text-foreground">Semua Menu</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Lihat Semua Menu <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="border-t border-border py-16 md:py-24">
        <div className="container mx-auto px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Ulasan</span>
          <h2 className="mt-1 text-section font-display font-bold text-foreground">Kata Pelanggan</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-card p-5 shadow-card"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-foreground">"{r.text}"</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pickup Info */}
      <section className="border-t border-border py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="rounded-xl bg-card p-6 shadow-card md:p-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Pickup</span>
            <h2 className="mt-1 text-section font-display font-bold text-foreground">Ambil di Toko</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Lokasi</h4>
                  <p className="text-sm text-muted-foreground">Situgede, Bogor, Jawa Barat</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Jam Operasional</h4>
                  <p className="text-sm text-muted-foreground">Setiap hari, 08:00 - 21:00 WIB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
