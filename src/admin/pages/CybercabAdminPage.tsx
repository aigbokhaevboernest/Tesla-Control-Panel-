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

type Doc = { id: string; title: string; image_url: string; sort_order: number; user_id: string; profile?: any };
type SelectedUser = { user_id: string; full_name: string; email: string };
type Section = "settings" | "documents" | "investments";

export default function CybercabAdminPage() {
  const [section, setSection] = useState<Section>("investments");

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Cybercab</h1>
        <p className="text-sm text-muted-foreground">Manage settings, documents, and investments</p>
      </div>

      <div className="flex gap-1.5">
        {([
          { id: "settings", label: "Settings", icon: Settings },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "investments", label: "Investments", icon: Rocket },
        ] as const).map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              section === s.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" /> {s.label}
          </button>
        ))}
      </div>

      {section === "settings" && <SettingsSection />}
      {section === "documents" && <DocumentsSection />}
      {section === "investments" && <InvestmentsSection />}
    </div>
  );
}

// ─── Settings — unit price only, global ────────────────────────────────

function SettingsSection() {
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("cybercab_settings").select("unit_price_usd").eq("id", 1).maybeSingle();
    if (data) setPrice(String(data.unit_price_usd));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const priceVal = Number(price);
    if (!priceVal || priceVal <= 0) return toast.error("Enter a valid unit price");
    setSaving(true);
    const { error } = await supabase
      .from("cybercab_settings")
      .update({ unit_price_usd: priceVal, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Unit price updated");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <Label>Unit price (USD)</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Global for all users. totalInvested ÷ unit price = units held (fractional).
          </p>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} />
        </div>
        <Button onClick={save} disabled={saving || loading} className="w-full">
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Documents — per user, required ────────────────────────────────────

function UserSearch({
  selectedUser, setSelectedUser,
}: {
  selectedUser: SelectedUser | null;
  setSelectedUser: (u: SelectedUser | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedUser[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);
      setResults(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      <Label>User *</Label>
      <Input
        value={selectedUser ? `${selectedUser.full_name || "—"} · ${selectedUser.email}` : query}
        onChange={(e) => { setQuery(e.target.value); setSelectedUser(null); }}
        placeholder="Search by name or email"
      />
      {results.length > 0 && !selectedUser && (
        <div className="mt-1 rounded-md border border-border max-h-40 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.user_id}
              onClick={() => { setSelectedUser(u); setQuery(""); setResults([]); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
            >
              {u.full_name || "—"} · {u.email}
            </button>
          ))}
        </div>
      )}
      {selectedUser && (
        <button onClick={() => { setSelectedUser(null); setQuery(""); }} className="text-xs text-muted-foreground mt-1">
          Change user
        </button>
      )}
    </div>
  );
}

function DocumentsSection() {
  const [rows, setRows] = useState<Doc[]>([]);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("cybercab_documents").select("*").order("sort_order");
    const docs = (data ?? []) as Doc[];

    const ids = Array.from(new Set(docs.map((d) => d.user_id)));
    let profiles: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      (ps ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
    }
    setRows(docs.map((d) => ({ ...d, profile: profiles[d.user_id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!selectedUser) return toast.error("Select a user first");
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
      user_id: selectedUser.user_id,
    });
    setUploading(false);
    if (error) return toast.error(error.message);

    await notifyEmail({
      send: sendEmail,
      userId: selectedUser.user_id,
      email: selectedUser.email,
      intent: "cybercab_document_uploaded",
      subject: "A new Cybercab document is available",
      body: `A new document "${title.trim()}" has been uploaded to your Cybercab investment page.`,
    });

    toast.success("Document added");
    setTitle(""); setFile(null); setSelectedUser(null);
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
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <UserSearch selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Image</Label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
            Email the user when uploaded
          </label>
          <Button onClick={upload} disabled={uploading} className="w-full">
            <Upload className="w-4 h-4 mr-1.5" /> {uploading ? "Uploading..." : "Add Document"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No documents yet</p>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <img src={d.image_url} alt={d.title} className="w-16 h-16 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.profile?.full_name || d.profile?.email || "Unknown user"}
                  </p>
                </div>
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

// ─── Investments — per-user current value editable ─────────────────────

function InvestmentsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "active" | "failed">("all");
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: invs, error } = await supabase
      .from("cybercab_investments")
      .select("*, transactions:transaction_id(id, status, method, proof_url, amount_usd)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);

    const list = (invs ?? []) as any[];
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    let profiles: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, currency, total_balance")
        .in("user_id", ids);
      (ps ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
    }
    const withProfiles = list.map((r) => ({ ...r, profile: profiles[r.user_id] || null }));
    setRows(withProfiles);

    const drafts: Record<string, string> = {};
    withProfiles.forEach((r) => { drafts[r.id] = String(r.current_value_usd ?? 0); });
    setValueDrafts(drafts);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (row: any) => {
    if (row.transaction_id) {
      const { error: txErr } = await supabase.from("transactions").update({ status: "approved" }).eq("id", row.transaction_id);
      if (txErr) return toast.error(txErr.message);

      const current = Number(row.profile?.total_balance || 0);
      const amt = Number(row.transactions?.amount_usd ?? row.amount_usd);
      await supabase.from("profiles").update({ total_balance: current + amt }).eq("user_id", row.user_id);
    }

    const { error } = await supabase
      .from("cybercab_investments")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);

    await notifyEmail({
      send: sendEmail,
      userId: row.user_id,
      email: row.profile?.email,
      intent: "cybercab_investment_approved",
      subject: "Your Cybercab investment is active",
      body: `Your Cybercab investment of ${formatMoney(row.amount_usd, row.profile?.currency)} has been approved and is now active.`,
    });

    toast.success("Approved");
    load();
  };

  const reject = async (row: any) => {
    if (row.transaction_id) {
      await supabase.from("transactions").update({ status: "rejected" }).eq("id", row.transaction_id);
    }
    const { error } = await supabase
      .from("cybercab_investments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);

    await notifyEmail({
      send: sendEmail,
      userId: row.user_id,
      email: row.profile?.email,
      intent: "cybercab_investment_rejected",
      subject: "Update on your Cybercab investment",
      body: `Your Cybercab investment of ${formatMoney(row.amount_usd, row.profile?.currency)} could not be approved. Please contact support.`,
    });

    toast.success("Rejected");
    load();
  };

  const saveCurrentValue = async (row: any) => {
    const val = Number(valueDrafts[row.id]);
    if (isNaN(val) || val < 0) return toast.error("Invalid value");

    const { error } = await supabase
      .from("cybercab_investments")
      .update({ current_value_usd: val, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);

    await notifyEmail({
      send: sendEmail,
      userId: row.user_id,
      email: row.profile?.email,
      intent: "cybercab_value_updated",
      subject: "Your Cybercab investment value has been updated",
      body: `The current value of your Cybercab investment is now ${formatMoney(val, row.profile?.currency)}.`,
    });

    toast.success("Current value updated for this investment");
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
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
        Send email on approve / reject / value update
      </label>

      {loading && <p className="text-center text-muted-foreground py-10">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No entries</p>
      )}

      {!loading && filtered.map((r) => (
        <Card key={r.id} className="w-full shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{formatMoney(Number(r.amount_usd), r.profile?.currency)}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted capitalize">{r.status}</span>
            </div>
            <div className="text-sm space-y-0.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium text-right">{r.profile?.full_name || r.profile?.email || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium text-right break-all">{r.profile?.email || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(r.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deposit method</span><span className="font-medium">{r.transactions?.method ?? "Not submitted yet"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deposit status</span><span className="font-medium capitalize">{r.transactions?.status ?? "—"}</span></div>
              {r.transactions?.proof_url && (
                <div className="pt-1"><span className="text-muted-foreground">Proof: </span><span className="text-xs break-all">{r.transactions.proof_url}</span></div>
              )}
            </div>

            {(r.status === "pending" || r.status === "processing") && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="sm" className="w-full" onClick={() => approve(r)}>Approve</Button>
                <Button size="sm" variant="destructive" className="w-full" onClick={() => reject(r)}>Reject</Button>
              </div>
            )}

            {r.status === "active" && (
              <div className="pt-2 border-t border-border mt-2 space-y-1.5">
                <Label className="text-xs">Current value for this investment (USD)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={valueDrafts[r.id] ?? ""}
                    onChange={(e) => setValueDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => saveCurrentValue(r)}>Save</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
