import { MapPin } from "lucide-react";

interface MapEmbedProps {
  title?: string;
  height?: string;
  className?: string;
}

export default function MapEmbed({
  title = "Lokasi Pondok Sagu Metro",
  height = "320px",
  className = "",
}: MapEmbedProps) {
  return (
    <div className={`w-full rounded-xl overflow-hidden border border-border ${className}`}>
      <iframe
        title={title}
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126746.98714792798!2d106.689214!3d-6.594444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69c5c2e8e0b8e5%3A0x8f5e6f8e5a5b5c5d!2sSitugede%2C%20Bogor!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
        width="100%"
        height={height}
        style={{ border: 0, filter: "grayscale(0.2) contrast(1.05)" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href="https://maps.google.com/?q=Situgede,Bogor,Jawa+Barat"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-3 text-sm text-primary hover:underline bg-card/50"
      >
        <MapPin className="h-4 w-4" />
        Buka di Google Maps
      </a>
    </div>
  );
}
