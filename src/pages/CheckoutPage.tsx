import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, CreditCard, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [method, setMethod] = useState<"online" | "whatsapp">("whatsapp");

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
        <p className="text-muted-foreground">Keranjang kosong. Silakan tambahkan produk dulu.</p>
        <Link to="/menu" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Lihat Menu</Link>
      </div>
    );
  }

  const handleWhatsApp = () => {
    if (!name || !phone || !pickupTime) {
      toast.error("Lengkapi semua informasi terlebih dahulu.");
      return;
    }
    const orderItems = items
      .map((i) => `• ${i.product.name} x${i.quantity} — ${formatPrice(i.product.price * i.quantity)}`)
      .join("\n");
    const msg = encodeURIComponent(
      `🛒 *Pesanan Baru — Pondok Sagu Metro*\n\nNama: ${name}\nTelepon: ${phone}\nWaktu Pickup: ${pickupTime}\n\n*Detail Pesanan:*\n${orderItems}\n\n*Total: ${formatPrice(totalPrice)}*\n\nTerima kasih! 🙏`
    );
    window.open(`https://wa.me/6281234567890?text=${msg}`, "_blank");
    clearCart();
    toast.success("Pesanan dikirim via WhatsApp!");
    navigate("/");
  };

  const handleOnline = () => {
    if (!name || !phone || !pickupTime) {
      toast.error("Lengkapi semua informasi terlebih dahulu.");
      return;
    }
    toast.info("Integrasi Midtrans akan segera tersedia. Gunakan WhatsApp untuk saat ini.");
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-xl px-4">
        <Link to="/cart" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Keranjang
        </Link>

        <h1 className="text-section font-display font-bold text-foreground">Checkout</h1>

        {/* Order summary */}
        <div className="mt-6 rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Ringkasan Pesanan</h3>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                <span className="font-medium text-foreground tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-lg font-bold text-foreground tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nama</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">No. Telepon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Waktu Pickup</label>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
          </div>
        </div>

        {/* Order method */}
        <div className="mt-6">
          <label className="text-sm font-medium text-foreground">Metode Pemesanan</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod("whatsapp")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors ${
                method === "whatsapp"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="font-medium">WhatsApp</span>
            </button>
            <button
              onClick={() => setMethod("online")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors ${
                method === "online"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <CreditCard className="h-6 w-6" />
              <span className="font-medium">Bayar Online</span>
            </button>
          </div>
        </div>

        <button
          onClick={method === "whatsapp" ? handleWhatsApp : handleOnline}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-cta transition-transform hover:scale-[1.03] active:scale-[0.97]"
        >
          {method === "whatsapp" ? (
            <>
              <MessageCircle className="h-4 w-4" /> Pesan via WhatsApp
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" /> Bayar Sekarang
            </>
          )}
        </button>
      </div>
    </div>
  );
}
