import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Loader2 } from "lucide-react";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any | null;
  categories: { id: string; name: string; slug: string }[];
  onSaved: () => void;
}

export default function ProductFormDialog({ open, onOpenChange, product, categories, onSaved }: ProductFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!product;

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setDescription(product.description || "");
      setPrice(String(product.price || ""));
      setCategoryId(product.category_id || "");
      setStockQuantity(String(product.stock_quantity ?? 0));
      setIsBestSeller(product.is_best_seller || false);
      setImageUrl(product.image_url || "");
      setImagePreview(product.image_url || null);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId("");
      setStockQuantity("0");
      setIsBestSeller(false);
      setImageUrl("");
      setImagePreview(null);
    }
    setImageFile(null);
  }, [product, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error("Nama dan harga wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseInt(price),
        category_id: categoryId || null,
        stock_quantity: parseInt(stockQuantity) || 0,
        is_best_seller: isBestSeller,
        image_url: finalImageUrl || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        toast.success("Produk berhasil diperbarui.");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produk berhasil ditambahkan.");
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error("Gagal menyimpan produk.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Gambar Produk</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex h-36 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 hover:bg-secondary transition-colors overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs">Klik untuk upload gambar</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="prod-name">Nama Produk *</Label>
            <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama produk" className="mt-1.5" />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="prod-desc">Deskripsi</Label>
            <Textarea id="prod-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi produk" className="mt-1.5" rows={3} />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="prod-price">Harga (Rp) *</Label>
              <Input id="prod-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="prod-stock">Stok</Label>
              <Input id="prod-stock" type="number" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="prod-cat">Kategori</Label>
            <select
              id="prod-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Best Seller */}
          <div className="flex items-center gap-3">
            <Switch id="prod-best" checked={isBestSeller} onCheckedChange={setIsBestSeller} />
            <Label htmlFor="prod-best">Best Seller</Label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
