import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { Package, Heart, User, LogOut, Shield, Camera, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UserDashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "profile">("orders");

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      setProfile(data);
      setEditName(data?.full_name || "");
      setEditPhone(data?.phone || "");
    });
    supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders(data || []));
    supabase.from("wishlist").select("*, products(*)").eq("user_id", user.id).then(({ data }) => setWishlist(data || []));
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Gagal mengunggah foto");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url })
      .eq("id", user.id);

    if (updateError) {
      toast.error("Gagal menyimpan foto profil");
    } else {
      setProfile((prev: any) => ({ ...prev, avatar_url }));
      toast.success("Foto profil diperbarui");
    }
    setUploadingAvatar(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (trimmedName.length > 100) {
      toast.error("Nama maksimal 100 karakter");
      return;
    }
    if (trimmedPhone && !/^[0-9+\-\s()]{0,20}$/.test(trimmedPhone)) {
      toast.error("Nomor telepon tidak valid");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmedName || null, phone: trimmedPhone || null })
      .eq("id", user.id);

    if (error) {
      toast.error("Gagal menyimpan profil");
    } else {
      setProfile((prev: any) => ({ ...prev, full_name: trimmedName, phone: trimmedPhone }));
      toast.success("Profil diperbarui");
    }
    setSaving(false);
  };

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
            {/* Avatar */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <p className="text-xs text-muted-foreground">Maks. 2MB (JPG, PNG)</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">{user.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Lengkap</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nomor Telepon</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={20}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Profil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}