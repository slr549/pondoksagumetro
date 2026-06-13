import { useState } from "react";
import { Database, Download, Loader2, FileJson, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Column = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  ordinal_position: number;
};
type ForeignKey = {
  constraint_name: string;
  column: string;
  references_table: string;
  references_column: string;
  references_schema: string;
};
type Policy = { policy: string; command: string; roles: string[] };
type TableInfo = {
  name: string;
  columns: Column[];
  primary_key: string[];
  foreign_keys: ForeignKey[];
  rls_policies: Policy[];
};
type SchemaExport = {
  generated_at: string;
  schema: string;
  tables: TableInfo[];
};

function buildDDL(schema: SchemaExport): string {
  const lines: string[] = [];
  lines.push(`-- Schema export for "${schema.schema}"`);
  lines.push(`-- Generated at ${schema.generated_at}`);
  lines.push("");

  for (const t of schema.tables) {
    lines.push(`-- ============================================`);
    lines.push(`-- Table: ${schema.schema}.${t.name}`);
    lines.push(`-- ============================================`);
    lines.push(`CREATE TABLE ${schema.schema}.${t.name} (`);
    const colLines = t.columns.map((c) => {
      const type = c.character_maximum_length
        ? `${c.data_type}(${c.character_maximum_length})`
        : c.data_type === "USER-DEFINED"
        ? c.udt_name
        : c.data_type;
      const nullable = c.is_nullable === "NO" ? " NOT NULL" : "";
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
      return `  ${c.column_name} ${type}${nullable}${def}`;
    });
    if (t.primary_key.length > 0) {
      colLines.push(`  PRIMARY KEY (${t.primary_key.join(", ")})`);
    }
    lines.push(colLines.join(",\n"));
    lines.push(`);`);

    for (const fk of t.foreign_keys) {
      lines.push(
        `ALTER TABLE ${schema.schema}.${t.name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.references_schema}.${fk.references_table}(${fk.references_column});`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SchemaExport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SchemaExport | null>(null);

  const fetchSchema = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await (supabase.rpc as any)("get_schema_export");
      if (error) throw error;
      setData(result as SchemaExport);
      toast.success(`Berhasil memuat ${(result as SchemaExport).tables.length} tabel.`);
    } catch (e: any) {
      toast.error("Gagal memuat skema: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    if (!data) return;
    const fname = `schema-${new Date().toISOString().split("T")[0]}.json`;
    download(fname, JSON.stringify(data, null, 2), "application/json");
  };

  const exportDDL = () => {
    if (!data) return;
    const fname = `schema-${new Date().toISOString().split("T")[0]}.sql`;
    download(fname, buildDDL(data), "application/sql");
  };

  const totalFKs = data?.tables.reduce((s, t) => s + t.foreign_keys.length, 0) ?? 0;
  const totalCols = data?.tables.reduce((s, t) => s + t.columns.length, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Ekspor Struktur Tabel</h3>
      </div>

      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-base font-semibold text-foreground">Skema Database & Relasi Foreign Key</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Ekspor struktur lengkap semua tabel di schema <code className="px-1 rounded bg-secondary">public</code>: kolom, tipe data, primary key, foreign key, dan RLS policies. Khusus role Developer.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={fetchSchema} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</> : <><Database className="h-4 w-4" /> Muat Skema</>}
              </Button>
              <Button variant="outline" onClick={exportJSON} disabled={!data}>
                <FileJson className="h-4 w-4" /> Unduh JSON
              </Button>
              <Button variant="outline" onClick={exportDDL} disabled={!data}>
                <FileText className="h-4 w-4" /> Unduh SQL (DDL)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-card p-3 shadow-card text-center">
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">{data.tables.length}</p>
              <p className="text-xs text-muted-foreground">Tabel</p>
            </div>
            <div className="rounded-lg bg-card p-3 shadow-card text-center">
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">{totalCols}</p>
              <p className="text-xs text-muted-foreground">Kolom</p>
            </div>
            <div className="rounded-lg bg-card p-3 shadow-card text-center">
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">{totalFKs}</p>
              <p className="text-xs text-muted-foreground">Foreign Key</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.tables.map((t) => (
              <div key={t.name} className="rounded-xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display font-semibold text-foreground">{t.name}</h4>
                  <span className="text-xs text-muted-foreground">
                    {t.columns.length} kolom · {t.foreign_keys.length} FK · {t.rls_policies.length} policy
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-1.5 pr-3 font-medium">Kolom</th>
                        <th className="py-1.5 pr-3 font-medium">Tipe</th>
                        <th className="py-1.5 pr-3 font-medium">Null</th>
                        <th className="py-1.5 pr-3 font-medium">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.columns.map((c) => {
                        const isPK = t.primary_key.includes(c.column_name);
                        const fk = t.foreign_keys.find((f) => f.column === c.column_name);
                        return (
                          <tr key={c.column_name} className="border-b border-border/40 last:border-0">
                            <td className="py-1.5 pr-3 font-mono text-foreground">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {c.column_name}
                                {isPK && <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">PK</span>}
                                {fk && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">FK</span>}
                              </div>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                              {c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type}
                            </td>
                            <td className="py-1.5 pr-3 text-muted-foreground">{c.is_nullable === "YES" ? "✓" : "—"}</td>
                            <td className="py-1.5 pr-3 font-mono text-muted-foreground truncate max-w-[180px]">
                              {c.column_default ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {t.foreign_keys.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Link2 className="h-3 w-3" /> Relasi Foreign Key
                    </p>
                    <div className="space-y-1">
                      {t.foreign_keys.map((fk) => (
                        <div key={fk.constraint_name} className="text-xs font-mono text-muted-foreground">
                          <span className="text-foreground">{fk.column}</span>
                          {" → "}
                          <span className="text-primary">{fk.references_schema}.{fk.references_table}</span>
                          <span>({fk.references_column})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Catatan:</strong> File DDL yang diunduh adalah representasi yang disederhanakan dari skema saat ini dan tidak mencakup index, trigger, atau RLS policies secara lengkap. Untuk backup penuh, gunakan tab Backup.
        </p>
      </div>
    </div>
  );
}