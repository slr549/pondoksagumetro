import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MessageCircle, CreditCard, ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";
import { openSnap } from "@/lib/midtrans";

declare global {
  interface Window {
    snap: any;
  }
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [method, setMethod] = useState<"online" | "whatsapp">("whatsapp");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Silakan masuk (login) terlebih dahulu untuk melanjutkan checkout.");
      navigate("/login", { state: { from: "/checkout" } });
    } else if (user) {
      supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setName((prev) => prev || data.full_name || "");
            setPhone((prev) => prev || data.phone || "");
          }
        });
    }
  }, [user, authLoading, navigate]);

  const saveOrderToDB = async (orderMethod: "whatsapp" | "online_payment") => {
    const finalPickupTime = giftMessage ? `${pickupTime} | Pesan: ${giftMessage}` : pickupTime;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user?.id || null,
        customer_name: name,
        customer_phone: phone,
        pickup_time: finalPickupTime,
        total_price: totalPrice,
        order_method: orderMethod,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order insert error:", orderErr);
      return null;
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      price_at_purchase: i.product.price,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) {
      console.error("Order items insert error:", itemsErr);
    }

    return order.id;
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
        <p className="text-muted-foreground">Keranjang kosong. Silakan tambahkan produk dulu.</p>
        <Link to="/menu" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Lihat Menu</Link>
      </div>
    );
  }

  const handleWhatsApp = async () => {
    if (!name || !phone || !pickupTime) {
      toast.error("Lengkapi semua informasi terlebih dahulu.");
      return;
    }
    setSaving(true);
    await saveOrderToDB("whatsapp");

    const orderItems = items
      .map((i) => `• ${i.product.name} x${i.quantity} — ${formatPrice(i.product.price * i.quantity)}`)
      .join("\n");
    const msg = encodeURIComponent(
      `🛒 *Pesanan Baru — Pondok Sagu Metro*\n\nNama: ${name}\nTelepon: ${phone}\nWaktu Pickup: ${pickupTime}${giftMessage ? `\nPesan / Hadiah: ${giftMessage}` : ""}\n\n*Detail Pesanan:*\n${orderItems}\n\n*Total: ${formatPrice(totalPrice)}*\n\nTerima kasih! 🙏`
    );
    window.open(`https://wa.me/6281234567890?text=${msg}`, "_blank");
    clearCart();
    toast.success("Pesanan dikirim via WhatsApp!");
    setSaving(false);
    navigate("/");
  };

  const handleOnline = async () => {
    if (!name || !phone || !pickupTime) {
      toast.error("Lengkapi semua informasi terlebih dahulu.");
      return;
    }
    setSaving(true);
<<<<<<< HEAD

    // Simpan order dan dapatkan ID-nya
    const orderId = await saveOrderToDB("online_payment");
    if (!orderId) {
      toast.error("Gagal membuat pesanan di database.");
      setSaving(false);
      return;
    }

    try {
      // Panggil Supabase Edge Function untuk mengambil token Snap Midtrans
      const { data, error } = await supabase.functions.invoke("create-midtrans-transaction", {
        body: {
          order_id: orderId,
          total_price: totalPrice,
          customer_name: name,
          customer_phone: phone,
          items: items.map(i => ({
            product_id: i.product.id,
            price_at_purchase: i.product.price,
            quantity: i.quantity,
            product_name: i.product.name,
          }))
        }
      });

      if (error || !data?.token) {
        throw new Error(error?.message || "Gagal mendapatkan token pembayaran");
      }

      // Tampilkan popup Midtrans — cek dahulu apakah Snap sudah termuat
      if (!window.snap) {
        throw new Error("Midtrans Snap belum termuat. Pastikan koneksi internet stabil dan coba refresh halaman.");
      }

      window.snap.pay(data.token, {
        onSuccess: function () {
          toast.success("Pembayaran berhasil!");
          clearCart();
          navigate("/");
        },
        onPending: function () {
          toast.info("Menunggu penyelesaian pembayaran...");
          // Opsional: arahkan ke halaman riwayat pesanan (Misal dashboard)
          clearCart();
          navigate("/dashboard");
        },
        onError: function (err: any) {
          toast.error("Pembayaran gagal!");
          console.error(err);
          setSaving(false);
        },
        onClose: function () {
          toast.info("Anda menutup pop-up pembayaran.");
          setSaving(false); // Enable the button again
        }
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Terjadi kesalahan sistem saat mencoba membayar.");
=======
    try {
      const orderId = await saveOrderToDB("online_payment");
      if (!orderId) {
        toast.error("Gagal membuat pesanan. Coba lagi.");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-midtrans-transaction",
        { body: { orderId } },
      );

      if (error || !data?.token) {
        console.error("Midtrans invoke error:", error, data);
        toast.error("Gagal memulai pembayaran. Pastikan Midtrans sudah dikonfigurasi.");
        return;
      }

      const result = await openSnap(data.token);
      if (result.status === "success") {
        clearCart();
        toast.success("Pembayaran berhasil!");
        navigate("/");
      } else if (result.status === "pending") {
        clearCart();
        toast.info("Pembayaran menunggu konfirmasi.");
        navigate("/");
      } else if (result.status === "error") {
        toast.error("Pembayaran gagal. Coba lagi.");
      } else {
        toast.info("Pembayaran dibatalkan.");
      }
    } finally {
>>>>>>> f0988ccde38d7e33e8ebdfc6433d9813c2f45656
      setSaving(false);
    }
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
          <div>
            <label className="text-sm font-medium text-foreground">Pesan / Hadiah (Opsional)</label>
            <textarea
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              placeholder="Contoh: Titip ucapan Selamat Ulang Tahun ya..."
              rows={2}
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
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors ${method === "whatsapp"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
                }`}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="font-medium">WhatsApp</span>
            </button>
            <button
              onClick={() => setMethod("online")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors ${method === "online"
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
          disabled={saving}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-cta transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:hover:scale-100"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
          ) : method === "whatsapp" ? (
            <><MessageCircle className="h-4 w-4" /> Pesan via WhatsApp</>
          ) : (
            <><CreditCard className="h-4 w-4" /> Bayar Sekarang</>
          )}
        </button>
      </div>
    </div>
  );
}
