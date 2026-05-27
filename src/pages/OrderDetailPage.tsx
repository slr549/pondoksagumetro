import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MessageCircle, CreditCard, MapPin, Phone, User as UserIcon, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import type { Tables } from "@/integrations/supabase/types";

type OrderRow = Tables<"orders"> & { order_items?: Tables<"order_items">[] };

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  ready_for_pickup: "Siap Diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  ready_for_pickup: "bg-primary/20 text-primary",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setOrder(data as OrderRow | null);
        setLoading(false);
      });
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <p className="text-sm text-muted-foreground">Memuat pesanan...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
        <p className="text-muted-foreground">Silakan login untuk melihat pesanan.</p>
        <Link to="/login" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Masuk</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
        <p className="text-muted-foreground">Pesanan tidak ditemukan.</p>
        <Link to="/dashboard" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Kembali ke Dashboard</Link>
      </div>
    );
  }

  const isWhatsApp = order.order_method === "whatsapp";
  const methodLabel = isWhatsApp ? "WhatsApp" : "Pembayaran Online";
  const MethodIcon = isWhatsApp ? MessageCircle : CreditCard;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-2xl px-4">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-section font-display font-bold text-foreground">Ringkasan Pesanan</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              ID: <span className="font-mono">{order.id.slice(0, 8)}</span> · {new Date(order.created_at).toLocaleString("id-ID")}
            </p>
          </div>
          <span className={`rounded-md px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] || "bg-secondary text-foreground"}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        {/* Method + Pickup */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">Metode Pemesanan</p>
            <div className="mt-2 flex items-center gap-2">
              <MethodIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{methodLabel}</span>
            </div>
            {order.payment_status && (
              <p className="mt-2 text-xs text-muted-foreground">
                Status pembayaran: <span className="font-medium text-foreground">{order.payment_status}</span>
              </p>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">Detail Pickup</p>
            <div className="mt-2 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{order.pickup_time || "Belum diatur"}</span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Pondok Sagu Metro — Situgede</span>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="mt-3 rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">Informasi Pelanggan</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <UserIcon className="h-4 w-4 text-muted-foreground" /> {order.customer_name}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Phone className="h-4 w-4 text-muted-foreground" /> {order.customer_phone}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-3 rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Item Pesanan</p>
          </div>
          <div className="mt-3 space-y-2">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.product_name} x{item.quantity}</span>
                <span className="tabular-nums text-foreground">{formatPrice(item.price_at_purchase * item.quantity)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="font-display text-lg font-bold text-foreground tabular-nums">{formatPrice(order.total_price)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}