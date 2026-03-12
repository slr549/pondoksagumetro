import { motion } from "framer-motion";
import { MapPin, Clock, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Tentang Kami</span>
          <h1 className="mt-1 text-section font-display font-bold text-foreground">Pondok Sagu Metro</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Pondok Sagu Metro adalah usaha kuliner lokal yang berlokasi di Situgede, Bogor. Kami menyajikan beragam dessert, makanan, dan minuman segar yang dibuat dengan bahan-bahan pilihan dan resep turun-temurun.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Misi kami sederhana: memberikan pengalaman kuliner terbaik untuk komunitas lokal Situgede dengan harga yang terjangkau dan kualitas yang konsisten.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Heart, title: "Dibuat dengan Cinta", desc: "Setiap produk kami dibuat fresh setiap hari dengan bahan berkualitas." },
            { icon: MapPin, title: "Lokal Situgede", desc: "Kami bangga melayani komunitas lokal dengan produk terbaik." },
            { icon: Clock, title: "Buka Setiap Hari", desc: "08:00 - 21:00 WIB, siap melayani Anda setiap hari." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl bg-card p-6 shadow-card"
            >
              <item.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
