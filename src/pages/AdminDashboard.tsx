import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Users, BarChart3,
  Plus, Pencil, Trash2, ChevronDown, ArrowLeft, Volume2, VolumeX, Volume1, Music,
} from "lucide-react";
import { SOUND_OPTIONS, playNotificationSound } from "@/lib/notificationSounds";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProductFormDialog from "@/components/admin/ProductFormDialog";
import CategoryManager from "@/components/admin/CategoryManager";
import OrderManager from "@/components/admin/OrderManager";
import OrderAnalytics from "@/components/admin/OrderAnalytics";
import CustomerManager from "@/components/admin/CustomerManager";

type AdminTab = "overview" | "products" | "orders" | "categories" | "customers" | "reports";

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalCustomers: 0 });
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [adminVerified, setAdminVerified] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("admin-notif-volume");
    return saved ? parseFloat(saved) : 70;
  });
  const [selectedSound, setSelectedSound] = useState(() => {
    return localStorage.getItem("admin-notif-sound") || "chime";
  });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const soundEnabledRef = useRef(true);
  const selectedSoundRef = useRef(selectedSound);

  useEffect(() => {
    selectedSoundRef.current = selectedSound;
    localStorage.setItem("admin-notif-sound", selectedSound);
  }, [selectedSound]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("admin-notif-volume", String(volume));
  }, [volume]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/");
      toast.error("Akses ditolak.");
      return;
    }
    // Server-side admin verification
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate("/");
          toast.error("Akses ditolak. Anda bukan admin.");
        } else {
          setAdminVerified(true);
        }
      });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!adminVerified) return;
    loadData();

    // Real-time subscription for new orders
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as any;
          if (soundEnabledRef.current) {
            playNotificationSound(selectedSoundRef.current, volume);
          }
          toast.info(`Pesanan baru dari ${newOrder.customer_name}`, {
            description: `Total: ${formatPrice(newOrder.total_price)}`,
            duration: 8000,
          });
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminVerified]);

  const loadData = async () => {
    const [prodRes, ordRes, catRes] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts(prodRes.data || []);
    setOrders(ordRes.data || []);
    setCategories(catRes.data || []);

    const allOrders = ordRes.data || [];
    setStats({
      totalOrders: allOrders.length,
      totalRevenue: allOrders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + o.total_price, 0),
      totalProducts: (prodRes.data || []).length,
      totalCustomers: new Set(allOrders.map((o: any) => o.user_id).filter(Boolean)).size,
    });
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) { toast.error("Gagal update status."); return; }
    toast.success("Status pesanan diperbarui.");
    loadData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus produk."); return; }
    toast.success("Produk dihapus.");
    loadData();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center pt-16"><p className="text-muted-foreground">Loading...</p></div>;
  if (!adminVerified) return null;

  const pendingCount = orders.filter((o: any) => o.status === "pending").length;

  const tabs: { key: AdminTab; icon: any; label: string; badge?: number }[] = [
    { key: "overview", icon: LayoutDashboard, label: "Overview" },
    { key: "products", icon: Package, label: "Produk" },
    { key: "orders", icon: ShoppingBag, label: "Pesanan", badge: pendingCount },
    { key: "categories", icon: Tag, label: "Kategori" },
    { key: "customers", icon: Users, label: "Pelanggan" },
    { key: "reports", icon: BarChart3, label: "Laporan" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    confirmed: "bg-blue-500/20 text-blue-400",
    ready_for_pickup: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-section font-display font-bold text-foreground">Admin Panel</h1>
          <div className="ml-auto relative flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-lg p-2 text-sm transition-colors ${soundEnabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-secondary"}`}
              title={soundEnabled ? "Matikan suara notifikasi" : "Nyalakan suara notifikasi"}
            >
              {!soundEnabled ? <VolumeX className="h-5 w-5" /> : volume > 50 ? <Volume2 className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
            </button>
            {soundEnabled && (
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Atur volume"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showVolumeSlider ? "rotate-180" : ""}`} />
              </button>
            )}
            {showVolumeSlider && soundEnabled && (
              <div className="absolute right-0 top-full mt-2 z-50 rounded-xl bg-card p-3 shadow-card border border-border min-w-[220px]">
                <p className="text-xs text-muted-foreground mb-2">Volume: {Math.round(volume)}%</p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-3 mb-1.5">Suara Notifikasi</p>
                <div className="space-y-1">
                  {SOUND_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSound(s.id); playNotificationSound(s.id, volume); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${selectedSound === s.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                    >
                      <Music className="h-3 w-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => playNotificationSound(selectedSound, volume)}
                  className="mt-3 w-full rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Test Suara
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-20 space-y-1">
              {tabs.map(({ key, icon: Icon, label, badge }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" /> {label}
                  {badge != null && badge > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="flex gap-2 overflow-x-auto md:hidden -mx-4 px-4 pb-2 mb-4">
            {tabs.map(({ key, icon: Icon, label, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
                {badge != null && badge > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Overview */}
            {tab === "overview" && (
              <div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Total Pesanan", value: stats.totalOrders, icon: ShoppingBag },
                    { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: BarChart3 },
                    { label: "Total Produk", value: stats.totalProducts, icon: Package },
                    { label: "Total Pelanggan", value: stats.totalCustomers, icon: Users },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl bg-card p-4 shadow-card">
                      <s.icon className="h-5 w-5 text-primary" />
                      <p className="mt-2 font-display text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <h3 className="font-display text-sm font-semibold text-foreground">Pesanan Terbaru</h3>
                  <div className="mt-3 space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg bg-card p-3 shadow-card">
                        <div>
                          <p className="text-sm font-medium text-foreground">{o.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("id-ID")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(o.total_price)}</p>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[o.status] || ""}`}>{o.status.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Products */}
            {tab === "products" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold text-foreground">Kelola Produk</h3>
                  <Button size="sm" onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Tambah Produk
                  </Button>
                </div>
                <div className="space-y-2">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.categories?.name} · Stok: {p.stock_quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(p.price)}</p>
                      <button onClick={() => { setEditingProduct(p); setProductDialogOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {products.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Belum ada produk di database.</p>}
                </div>
                <ProductFormDialog
                  open={productDialogOpen}
                  onOpenChange={setProductDialogOpen}
                  product={editingProduct}
                  categories={categories}
                  onSaved={loadData}
                />
              </div>
            )}

            {/* Orders */}
            {tab === "orders" && (
              <OrderManager orders={orders} onChanged={loadData} />
            )}

            {/* Categories */}
            {tab === "categories" && (
              <CategoryManager categories={categories} onChanged={loadData} />
            )}

            {/* Customers */}
            {tab === "customers" && (
              <CustomerManager orders={orders} />
            )}

            {/* Reports */}
            {tab === "reports" && (
              <OrderAnalytics orders={orders} products={products} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
