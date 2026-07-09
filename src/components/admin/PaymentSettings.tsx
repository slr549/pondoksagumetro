import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, Landmark, Wallet, Power, Save } from "lucide-react";

interface PaymentSettingsRow {
  id: string;
  midtrans_active: boolean;
  transfer_enabled: boolean;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  qris_image_url: string | null;
  cod_enabled: boolean;
  cod_note: string;
}

export default function PaymentSettings() {
  const [row, setRow] = useState<PaymentSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("payment_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) toast.error("Gagal memuat pengaturan pembayaran.");
      setRow(data as PaymentSettingsRow | null);
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<PaymentSettingsRow>) => {
    setRow((r) => (r ? { ...r, ...patch } : r));
  };

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("payment_settings")
      .update({
        midtrans_active: row.midtrans_active,
        transfer_enabled: row.transfer_enabled,
        bank_name: row.bank_name,
        bank_account_number: row.bank_account_number,
        bank_account_holder: row.bank_account_holder,
        qris_image_url: row.qris_image_url,
        cod_enabled: row.cod_enabled,
        cod_note: row.cod_note,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success("Pengaturan pembayaran disimpan.");
  };

  const toggleMidtrans = async () => {
    if (!row) return;
    const next = !row.midtrans_active;
    update({ midtrans_active: next });
    const { error } = await (supabase as any)
      .from("payment_settings")
      .update({ midtrans_active: next })
      .eq("id", row.id);
    if (error) {
      toast.error("Gagal mengubah status Midtrans.");
      update({ midtrans_active: !next });
      return;
    }
    toast.success(next ? "Midtrans diaktifkan." : "Midtrans dinonaktifkan.");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat pengaturan pembayaran...
      </div>
    );
  }
  if (!row) {
    return <p className="text-sm text-muted-foreground">Pengaturan pembayaran belum tersedia.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">Pengaturan Pembayaran</h3>
        <p className="text-xs text-muted-foreground">Atur metode pembayaran yang tersedia di halaman checkout.</p>
      </div>

      {/* Midtrans toggle */}
      <div className="rounded-xl bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Midtrans (Pembayaran Online)</p>
              <p className="text-xs text-muted-foreground">
                Snap payment gateway (kartu, e-wallet, virtual account). Nonaktifkan sementara jika sedang bermasalah.
              </p>
            </div>
          </div>
          <button
            onClick={toggleMidtrans}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              row.midtrans_active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {row.midtrans_active ? "Aktif" : "Nonaktif"}
          </button>
        </div>
      </div>

      {/* Local: Transfer */}
      <div className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <Landmark className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Transfer Bank Manual</p>
              <p className="text-xs text-muted-foreground">Rekening yang ditampilkan ke pelanggan di halaman checkout.</p>
            </div>
          </div>
          <button
            onClick={() => update({ transfer_enabled: !row.transfer_enabled })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              row.transfer_enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {row.transfer_enabled ? "Aktif" : "Nonaktif"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nama Bank</label>
            <input
              value={row.bank_name}
              onChange={(e) => update({ bank_name: e.target.value })}
              placeholder="BCA / BRI / Mandiri"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nomor Rekening</label>
            <input
              value={row.bank_account_number}
              onChange={(e) => update({ bank_account_number: e.target.value })}
              placeholder="1234567890"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Atas Nama</label>
            <input
              value={row.bank_account_holder}
              onChange={(e) => update({ bank_account_holder: e.target.value })}
              placeholder="Pondok Sagu Metro"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">URL Gambar QRIS (Opsional)</label>
          <input
            value={row.qris_image_url ?? ""}
            onChange={(e) => update({ qris_image_url: e.target.value || null })}
            placeholder="https://... (gambar QRIS)"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {row.qris_image_url && (
            <img src={row.qris_image_url} alt="QRIS" className="mt-2 h-32 w-32 rounded-lg object-cover border border-border" />
          )}
        </div>
      </div>

      {/* Local: COD */}
      <div className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <Wallet className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Bayar di Tempat (COD)</p>
              <p className="text-xs text-muted-foreground">Pelanggan membayar tunai saat pickup.</p>
            </div>
          </div>
          <button
            onClick={() => update({ cod_enabled: !row.cod_enabled })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              row.cod_enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {row.cod_enabled ? "Aktif" : "Nonaktif"}
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Catatan COD</label>
          <textarea
            value={row.cod_note}
            onChange={(e) => update({ cod_note: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-cta disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Simpan Pengaturan
      </button>
    </div>
  );
}