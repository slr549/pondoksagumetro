import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface CategoryManagerProps {
  categories: { id: string; name: string; slug: string }[];
  onChanged: () => void;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function CategoryManager({ categories, onChanged }: CategoryManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setDialogOpen(true);
  };

  const openEdit = (cat: { id: string; name: string; slug: string }) => {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editing) setSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nama dan slug wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("categories").update({ name: name.trim(), slug: slug.trim() }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Kategori berhasil diperbarui.");
      } else {
        const { error } = await supabase.from("categories").insert({ name: name.trim(), slug: slug.trim() });
        if (error) throw error;
        toast.success("Kategori berhasil ditambahkan.");
      }
      setDialogOpen(false);
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan kategori.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Hapus kategori ini? Produk terkait tidak akan dihapus.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus kategori.");
      return;
    }
    toast.success("Kategori dihapus.");
    onChanged();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display font-semibold text-foreground">Kelola Kategori</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg bg-card p-3 shadow-card">
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">/{c.slug}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground p-1"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => deleteCategory(c.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Belum ada kategori.</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Nama *</Label>
              <Input id="cat-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Nama kategori" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug *</Label>
              <Input id="cat-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="nama-kategori" className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
