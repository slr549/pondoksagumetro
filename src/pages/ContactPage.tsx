import { motion } from "framer-motion";
import { MessageCircle, Instagram, Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Kontak</span>
          <h1 className="mt-1 text-section font-display font-bold text-foreground">Hubungi Kami</h1>
          <p className="mt-4 text-muted-foreground">
            Ada pertanyaan atau ingin memesan? Hubungi kami melalui channel berikut.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { icon: MessageCircle, label: "WhatsApp", value: "+62 812-3456-7890", href: "https://wa.me/6281234567890" },
            { icon: Instagram, label: "Instagram", value: "@pondoksagumetro", href: "https://instagram.com/pondoksagumetro" },
            { icon: Mail, label: "Email", value: "info@pondoksagumetro.com", href: "mailto:info@pondoksagumetro.com" },
            { icon: MapPin, label: "Lokasi", value: "Situgede, Bogor, Jawa Barat", href: undefined },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-xl bg-card p-5 shadow-card"
            >
              <item.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{item.label}</h3>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-muted-foreground hover:text-primary transition-colors">
                  {item.value}
                </a>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
