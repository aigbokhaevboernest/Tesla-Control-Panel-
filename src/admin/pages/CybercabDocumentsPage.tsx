import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";

type Doc = { id: string; title: string; image_url: string; sort_order: number };

export default function CybercabDocumentsPage() {
  const [rows, setRows] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("cybercab_documents").select("*").order("sort_order");
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!title.trim() || !file) return toast.error("Title and image are required");
    setUploading(true);

    const path = `${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("cybercab-documents").upload(path, file);
    if (uploadErr) { setUploading(false); return toast.error(uploadErr.message); }

    const { data: pub } = supabase.storage.from("cybercab-documents").getPublicUrl(path);

    const { error } = await supabase.from("cybercab_documents").insert({
      title: title.trim(),
      image_url: pub.publicUrl,
      sort_order: rows.length,
    });
    setUploading(false);
    if (error) return toast.error(error.message);

    toast.success("Document added");
    setTitle(""); setFile(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("cybercab_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <h1 className="text-xl font-bold">Cybercab Documents</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Image</Label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button onClick={upload} disabled={uploading} className="w-full">
            <Upload className="w-4 h-4 mr-1.5" /> {uploading ? "Uploading..." : "Add Document"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <img src={d.image_url} alt={d.title} className="w-16 h-16 object-cover rounded-lg" />
                <p className="flex-1 text-sm font-medium truncate">{d.title}</p>
                <Button size="sm" variant="destructive" onClick={() => del(d.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
