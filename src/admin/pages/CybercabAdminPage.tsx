import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, Upload, Settings, FileText, Rocket } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { notifyEmail } from "../lib/notifyEmail";

type Doc = { id: string; title: string; image_url: string; sort_order: number };
type InvestmentRow = any;

type Section = "settings" | "documents" | "investments";

export default function CybercabAdminPage() {
  const [section, setSection] = useState<Section>("settings");

  // ---------- Settings ----------
  const [price, setPrice] = useState("");
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceSaving, setPriceSaving] = useState(false);

  const loadPrice = async () => {
    setPriceLoading(true);
    const { data } = await supabase.from("cybercab_settings").select("unit_price_usd").eq("id", 1).maybeSingle();
    if (data) setPrice(String(data.unit_price_usd));
    setPriceLoading(false);
  };

  const savePrice = async () => {
    const value = Number(price);
    if (!value || value <= 0) return toast.error("Enter a valid price");
    setPriceSaving(true);
    const { error } = await supabase
      .from("cybercab_settings")
      .update({ unit_price_usd: value, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setPriceSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Unit price updated");
  };

  // ---------- Documents ----------
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  const loadDocs = async () => {
    setDocsLoading(true);
    const { data } = await supabase.from("cybercab_documents").select("*").order("sort_order");
    setDocs(data ?? []);
    setDocsLoading(false);
  };

  const uploadDoc = async () => {
    if (!docTitle.trim() || !docFile) return toast.error("Title and image are required");
    setDocUploading(true);

    const path = `${Date.now()}-${docFile.name}`;
    const { error: uploadErr } = await supabase.storage.from("cybercab-documents").upload(path, docFile);
    if (uploadErr) { setDocUploading(false); return toast.error(uploadErr.message); }

    const { data: pub } = supabase.storage.from("cybercab-documents").getPublicUrl(path);

    const { error } = await supabase.from("cybercab_documents").insert({
      title: docTitle.trim(),
      image_url: pub.publicUrl,
      sort_order: docs.length,
    });
    setDocUploading(false);
    if (error) return toast.error(error.message);

    toast.success("Document added");
    setDocTitle(""); setDocFile(null);
    loadDocs();
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("cybercab_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadDocs();
  };

  // ---------- Investments ----------
  const [rows, setRows] = useState<InvestmentRow[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "active" | "failed">("all");

  const loadInvestments = async () => {
    setInvLoading(true);
    const { data: invs, error } = await supabase
      .from("cybercab_investments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);

    const list = (invs ?? []) as InvestmentRow[];
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    let profiles: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, currency")
        .in("user_id", ids);
      (ps ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
    }
    setRows(list.map((r) => ({ ...r, profile: profiles[r.user_id] || null })));
    setInvLoading(false);
  };

  const setInvestmentStatus = async (row: InvestmentRow, newStatus: "active" | "failed") => {
    const { error } = await supabase
      .from("cybercab_investments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);

    await notifyEmail({
      send: sendEmail,
      userId: row.user_id,
      email: row.profile?.email,
      intent: newStatus === "active" ? "cybercab_investment_approved" : "cybercab_investment_rejected",
      subject: newStatus === "active" ? "Your Cybercab investment is active" : "Update on your Cybercab investment",
      body: newStatus === "active"
        ? `Your Cybercab investment of ${formatMoney(row.amount_usd, row.profile?.currency)} has been approved and is now active.`
        : `Your Cybercab investment of ${formatMoney(row.amount_usd, row.profile?.currency)} could not be approved. Please contact support.`,
    });

    toast.success(`Marked ${newStatus}`);
    loadInvestments();
  };

  // ---------- Load everything once on mount ----------
  useEffect(() => {
    loadPrice();
    loadDocs();
    loadInvestments();
  }, []);

  const filteredInvestments = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const TABS: { key: Section; label: string; icon: typeof Settings }[] = [
    { key: "settings", label: "Settings", icon: Settings },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "investments", label: "Investments", icon: Rocket },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Cybercab Admin</h1>
        <p className="text-sm text-muted-foreground">Manage unit price, documents, and investments in one place</p>
      </div>

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
              section === t.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ---------- Settings section ---------- */}
      {section === "settings" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Unit price (USD)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={priceLoading} />
              <p className="text-xs text-muted-foreground mt-1">
                Used to calculate units held: amount invested ÷ this price.
              </p>
            </div>
            <Button onClick={savePrice} disabled={priceSaving || priceLoading} className="w-full">
              {priceSaving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---------- Documents section ---------- */}
      {section === "documents" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              </div>
              <div>
                <Label>Image</Label>
                <input type="file" accept="image/*" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={uploadDoc} disabled={docUploading} className="w-full">
                <Upload className="w-4 h-4 mr-1.5" /> {docUploading ? "Uploading..." : "Add Document"}
              </Button>
            </CardContent>
          </Card>

          {docsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No documents yet</p>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <img src={d.image_url} alt={d.title} className="w-16 h-16 object-cover rounded-lg" />
                    <p className="flex-1 text-sm font-medium truncate">{d.title}</p>
                    <Button size="sm" variant="destructive" onClick={() => deleteDoc(d.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Investments section ---------- */}
      {section === "investments" && (
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "pending", "processing", "active", "failed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
            Send email on approve / reject
          </label>

          {invLoading && <p className="text-center text-muted-foreground py-10">Loading…</p>}
          {!invLoading && filteredInvestments.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No entries</p>
          )}

          {!invLoading && filteredInvestments.map((r) => (
            <Card key={r.id} className="w-full shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{formatMoney(Number(r.amount_usd), r.profile?.currency)}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted capitalize">{r.status}</span>
                </div>
                <div className="text-sm space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-right">{r.profile?.full_name || r.profile?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-right break-all">{r.profile?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Units</span>
                    <span className="font-medium">{r.units}</span>
                  </div>
                </div>

                {(r.status === "pending" || r.status === "processing") && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" className="w-full" onClick={() => setInvestmentStatus(r, "active")}>Approve</Button>
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => setInvestmentStatus(r, "failed")}>Reject</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
