import { MessageCircle, Instagram, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Pondok Sagu Metro</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dessert, Makanan, dan Minuman Segar untuk Semua.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">Navigasi</h4>
            <div className="mt-3 flex flex-col gap-2">
              {["Menu", "Tentang Kami", "Kontak"].map((label) => (
                <a key={label} href={`/${label === "Menu" ? "menu" : label === "Tentang Kami" ? "about" : "contact"}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">Hubungi Kami</h4>
            <div className="mt-3 flex flex-col gap-3">
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a href="https://instagram.com/pondoksagumetro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-4 w-4" /> @pondoksagumetro
              </a>
              <a href="mailto:info@pondoksagumetro.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4" /> info@pondoksagumetro.com
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> Situgede, Bogor
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pondok Sagu Metro. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
