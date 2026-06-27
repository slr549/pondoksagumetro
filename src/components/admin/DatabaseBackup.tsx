import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function DatabaseBackup() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      toast.info("Memulai proses backup database...");

      // Fetch all required data
      // Note: Admin needs RLS permissions to view profiles and wishlist if those are restricted.
      const tables = [
        "products",
        "categories",
        "orders",
        "order_items",
        "reviews",
        "profiles",
        "wishlist",
        "user_roles"
      ] as const;

      const backupData: Record<string, any> = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.warn(`Gagal mengambil data dari tabel ${table}:`, error.message);
          backupData[table] = { error: error.message };
        } else {
          backupData[table] = data;
        }
      }

      // Add metadata
      const backupPayload = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: "1.0",
          source: "Pondok Sagu Metro Backup",
        },
        data: backupData
      };

      // Create blob and download
      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `backup-pondoksagu-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Backup database berhasil diunduh.");
    } catch (error: any) {
      console.error("Backup failed:", error);
      toast.error("Gagal melakukan backup database: " + error.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <Button 
      onClick={handleBackup} 
      disabled={isBackingUp}
      variant="outline"
      className="bg-card hover:bg-secondary/80 text-foreground border-border shadow-sm"
    >
      {isBackingUp ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {isBackingUp ? "Memproses Backup..." : "Backup Database (JSON)"}
    </Button>
  );
}
