import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { Package, Heart, User, LogOut, Shield } from "lucide-react";

export default function UserDashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "profile">("orders");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
    supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders(data || []));
    supabase.from("wishlist").select("*, products(*)").eq("user_id", user.id).then(({ data }) => setWishlist(data || []));
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <div className="text-center">
          <p className="text-muted-foreground">Silakan login terlebih dahulu.</p>
          <Link to="/login" className="mt-4 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Masuk</Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    confirmed: "bg-blue-500/20 text-blue-400",
    ready_for_pickup: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-section font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Halo, {profile?.full_name || user.email}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground">
                <Shield className="h-3 w-3" /> Admin
              </Link>
            )}
            <button onClick={signOut} className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              <LogOut className="h-3 w-3" /> Keluar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          {([
            { key: "orders", icon: Package, label: "Pesanan" },
            { key: "wishlist", icon: Heart, label: "Wishlist" },
            { key: "profile", icon: User, label: "Profil" },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Orders */}
        {activeTab === "orders" && (
          <div className="mt-6 space-y-3">
            {orders.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Belum ada pesanan.</p>
            ) : orders.map((order) => (
              <div key={order.id} className="rounded-xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("id-ID")}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[order.status] || ""}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.product_name} x{item.quantity}</span>
                      <span className="tabular-nums text-foreground">{formatPrice(item.price_at_purchase * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-border pt-2 flex justify-between">
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <span className="font-display font-bold text-foreground tabular-nums">{formatPrice(order.total_price)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wishlist */}
        {activeTab === "wishlist" && (
          <div className="mt-6 space-y-3">
            {wishlist.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Wishlist kosong.</p>
            ) : wishlist.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card">
                {item.products?.image_url && (
                  <img src={item.products.image_url} alt={item.products.name} className="h-16 w-16 rounded-lg object-cover" />
                )}
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{item.products?.name}</h3>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatPrice(item.products?.price || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Email</span>
                <p className="text-sm text-foreground">{user.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Nama</span>
                <p className="text-sm text-foreground">{profile?.full_name || "-"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Telepon</span>
                <p className="text-sm text-foreground">{profile?.phone || "-"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
