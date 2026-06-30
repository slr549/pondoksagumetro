import { useState, useEffect } from "react";
import { Database, Download, Loader2, Calendar, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BackupHistoryEntry = {
  date: string;
  filename: string;
  size: number;
  tables: number;
  totalRows: number;
};

const HISTORY_KEY = "admin-backup-history";

export default function DatabaseBackup() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const saveHistory = (entry: BackupHistoryEntry) => {
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-backup`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const text = await blob.text();
      const json = JSON.parse(text);

      const filename = `backup-${new Date().toISOString().split("T")[0]}-${Date.now()}.json`;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      const totalRows = Object.values(json.tables).reduce<number>((sum, t: any) => sum + (t.count || 0), 0);
      saveHistory({
        date: new Date().toISOString(),
        filename,
        size: blob.size,
        tables: Object.keys(json.tables).length,
        totalRows,
      });

      toast.success(`Backup berhasil! ${totalRows} baris dari ${Object.keys(json.tables).length} tabel.`);
    } catch (e: any) {
      toast.error("Gagal membuat backup: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Backup Database</h3>
      </div>

      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-base font-semibold text-foreground">Ekspor Seluruh Database</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Unduh snapshot lengkap dari semua tabel (produk, pesanan, pelanggan, kategori, ulasan, wishlist, role) dalam format JSON. File ini bisa digunakan untuk restorasi manual.
            </p>
            <Button onClick={handleBackup} disabled={loading} className="mt-4">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Membuat backup...</> : <><Download className="h-4 w-4" /> Buat & Unduh Backup</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-foreground mb-3">Riwayat Backup (10 terakhir)</h4>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada backup yang dibuat.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
                <FileJson className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{h.filename}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(h.date).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums">{h.totalRows} baris · {h.tables} tabel</p>
                  <p className="tabular-nums">{formatSize(h.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Catatan:</strong> File backup berisi data sensitif. Simpan di lokasi aman dan jangan bagikan. Riwayat backup hanya disimpan secara lokal di browser ini.
        </p>
      </div>
    </div>
  );
}
