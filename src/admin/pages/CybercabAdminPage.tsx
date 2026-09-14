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

type Doc = { id: string; title: string; image_url: string; sort_order: number; user_id: string | null };
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

// ─── Settings ────────────────────────────────────────────────────────────

function SettingsSection() {
  const [price, setPrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("cybercab_settings")
      .select("unit_price_usd, current_value_usd")
      .eq("id", 1)
      .maybeSingle();
    if (data) {
      setPrice(String(data.unit_price_usd));
      setCurrentValue(String(data.current_value_usd));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const priceVal = Number(price);
    const valueVal = Number(currentValue);
    if (!priceVal || priceVal <= 0) return toast.error("Enter a valid unit price");
    if (valueVal < 0) return toast.error("Enter a valid current value");
    setSaving(true);
    const { error } = await supabase
      .from("cybercab_settings")
      .update({ unit_price_usd: priceVal, current_value_usd: valueVal, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings updated");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <Label>Unit price (USD)</Label>
          <p className="text-xs text-muted-foreground mb-1.5">totalInvested ÷ unit price = units held (fractional).</p>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} />
        </div>
        <div>
          <Label>Current value (USD)</Label>
          <p className="text-xs text-muted-foreground mb-1.5">Auto-increases periodically; you can also set it manually.</p>
          <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} disabled={loading} />
        </div>
        <Button onClick={save} disabled={saving || loading} className="w-full">
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Documents ───────────────────────────────────────────────────────────

function DocumentsSection() {
  const [rows, setRows] = useState<Doc[]>([]);
  const [users, setUsers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>(""); // "" = global
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("cybercab_documents").select("*").order("sort_order");
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (userQuery.trim().length < 2) { setUsers([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .or(`full_name.ilike.%${userQuery}%,email.ilike.%${userQuery}%`)
        .limit(8);
      setUsers(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

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
      user_id: selectedUserId || null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);

    if (selectedUserId) {
      const target = users.find((u) => u.user_id === selectedUserId);
      await notifyEmail({
        send: sendEmail,
        userId: selectedUserId,
        email: target?.email,
        intent: "cybercab_document_uploaded",
        subject: "A new Cybercab document is available",
        body: `A new document "${title.trim()}" has been uploaded to your Cybercab investment page.`,
      });
    }

    toast.success("Document added");
    setTitle(""); setFile(null); setSelectedUserId(""); setUserQuery("");
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
          <div>
            <Label>Assign to user (leave blank for all users)</Label>
            <Input
              value={selectedUserId ? (users.find((u) => u.user_id === selectedUserId)?.email ?? "") : userQuery}
              onChange={(e) => { setUserQuery(e.target.value); setSelectedUserId(""); }}
              placeholder="Search by name or email"
            />
            {users.length > 0 && !selectedUserId && (
              <div className="mt-1 rounded-md border border-border max-h-40 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => { setSelectedUserId(u.user_id); setUsers([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  >
                    {u.full_name || "—"} · {u.email}
                  </button>
                ))}
              </div>
            )}
            {selectedUserId && (
              <button onClick={() => { setSelectedUserId(""); setUserQuery(""); }} className="text-xs text-muted-foreground mt-1">
                Clear (make global instead)
              </button>
            )}
          </div>
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
            Email the user when uploaded (if a user is selected)
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
                  <p className="text-xs text-muted-foreground">{d.user_id ? "Assigned" : "Global"}</p>
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

// ─── Investments ─────────────────────────────────────────────────────────

function InvestmentsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "active" | "failed">("all");

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
    setRows(list.map((r) => ({ ...r, profile: profiles[r.user_id] || null })));
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
        Send email on approve / reject
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
