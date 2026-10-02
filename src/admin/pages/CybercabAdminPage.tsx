import { useEffect, useMemo, useState } from "react";
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

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

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

// ─── User picker — lists ALL users from the DB, searchable ─────────────

function UserPicker({
  selectedUser, setSelectedUser,
}: {
  selectedUser: SelectedUser | null;
  setSelectedUser: (u: SelectedUser | null) => void;
}) {
  const [users, setUsers] = useState<SelectedUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name", { ascending: true })
        .limit(1000);
      if (error) toast.error(error.message);
      setUsers((data ?? []) as SelectedUser[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    );
  }, [users, query]);

  if (selectedUser) {
    return (
      <div>
        <Label>User *</Label>
        <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{selectedUser.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setSelectedUser(null); setQuery(""); }}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label>User * {loading ? "" : `(${filtered.length})`}</Label>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by name or email"
        className="mt-1"
      />
      <div className="mt-1 rounded-md border border-border max-h-56 overflow-y-auto">
        {loading && <p className="px-3 py-3 text-xs text-muted-foreground">Loading users…</p>}
        {!loading && filtered.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No users found</p>}
        {filtered.map((u) => (
          <button
            key={u.user_id}
            onClick={() => setSelectedUser(u)}
            className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-0"
          >
            <p className="text-sm font-medium truncate">{u.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Documents — per user ──────────────────────────────────────────────

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

  const selectedUserDocs = selectedUser ? rows.filter((d) => d.user_id === selectedUser.user_id) : [];

  const upload = async () => {
    if (!selectedUser) return toast.error("Select a user first");
    if (!title.trim() || !file) return toast.error("Title and image are required");
    setUploading(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${selectedUser.user_id}/${Date.now()}-${safeName}`;
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
          <UserPicker selectedUser={selectedUser} setSelectedUser={setSelectedUser} />

          {selectedUser && (
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1.5">
                Existing documents for this user: {selectedUserDocs.length}
              </p>
              {selectedUserDocs.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selectedUserDocs.map((d) => (
                    <img key={d.id} src={d.image_url} alt={d.title} title={d.title} className="h-12 w-12 shrink-0 rounded object-cover" />
                  ))}
                </div>
              )}
            </div>
          )}

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

// ─── Investments ───────────────────────────────────────────────────────

function InvestmentsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "active" | "failed">("all");
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});
  const [docsByUser, setDocsByUser] = useState<Record<string, Doc[]>>({});
  const [docsOpen, setDocsOpen] = useState<Record<string, boolean>>({});

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
        .select("user_id, full_name, email, currency, total_balance, deposit")
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

  const toggleDocs = async (userId: string) => {
    const nextOpen = !docsOpen[userId];
    setDocsOpen((o) => ({ ...o, [userId]: nextOpen }));
    if (nextOpen && !docsByUser[userId]) {
      const { data, error } = await supabase
        .from("cybercab_documents")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order");
      if (error) return toast.error(error.message);
      setDocsByUser((m) => ({ ...m, [userId]: (data ?? []) as Doc[] }));
    }
  };

  const approve = async (row: any) => {
    const amt = Number(row.transactions?.amount_usd ?? row.amount_usd);

    if (row.transaction_id) {
      const alreadyApproved = row.transactions?.status === "approved";
      const { error: txErr } = await supabase.from("transactions").update({ status: "approved" }).eq("id", row.transaction_id);
      if (txErr) return toast.error(txErr.message);

      // Only credit if the deposit wasn't already approved from the Deposits page.
      if (!alreadyApproved) {
        await supabase.from("profiles").update({
          total_balance: Number(row.profile?.total_balance || 0) + amt,
          deposit: Number(row.profile?.deposit || 0) + amt,
        }).eq("user_id", row.user_id);
      }
    }

    const { error } = await supabase
      .from("cybercab_investments")
      .update({
        status: "active",
        current_value_usd: Number(row.amount_usd),
        updated_at: new Date().toISOString(),
      })
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

  const unhold = async (row: any) => {
    const { error } = await supabase
      .from("cybercab_investments")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Moved back to pending");
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

  const active = rows.filter((r) => r.status === "active");
  const totalInvested = active.reduce((s, r) => s + Number(r.amount_usd || 0), 0);
  const totalValue = active.reduce((s, r) => s + Number(r.current_value_usd || 0), 0);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total invested</p>
            <p className="text-base font-bold">{usd(totalInvested)}</p>
            <p className="text-[10px] text-muted-foreground">{active.length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current value</p>
            <p className="text-base font-bold">{usd(totalValue)}</p>
            <p className="text-[10px] text-muted-foreground">Sum of per-user values</p>
          </CardContent>
        </Card>
      </div>

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
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Name</span><span className="font-medium text-right">{r.profile?.full_name || "—"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Email</span><span className="font-medium text-right break-all">{r.profile?.email || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(r.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deposit method</span><span className="font-medium">{r.transactions?.method ?? "Not submitted yet"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deposit status</span><span className="font-medium capitalize">{r.transactions?.status ?? "—"}</span></div>
              {r.status === "active" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Current value</span><span className="font-medium">{usd(Number(r.current_value_usd || 0))}</span></div>
              )}
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

            {(r.status === "processing" || r.status === "failed") && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => unhold(r)}>
                Unhold (back to pending)
              </Button>
            )}

            {r.status === "active" && (
              <div className="pt-2 border-t border-border mt-2 space-y-1.5">
                <Label className="text-xs">Update current value for this user's investment (USD)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={valueDrafts[r.id] ?? ""}
                    onChange={(e) => setValueDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => saveCurrentValue(r)}>Update value</Button>
                </div>
              </div>
            )}

            <Button size="sm" variant="ghost" className="w-full" onClick={() => toggleDocs(r.user_id)}>
              {docsOpen[r.user_id] ? "Hide documents" : "View documents"}
            </Button>
            {docsOpen[r.user_id] && (
              <div className="rounded-md bg-muted/40 p-2">
                {!docsByUser[r.user_id] ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : docsByUser[r.user_id].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents for this user</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {docsByUser[r.user_id].map((d) => (
                      <a key={d.id} href={d.image_url} target="_blank" rel="noreferrer" className="block">
                        <img src={d.image_url} alt={d.title} className="h-20 w-full rounded object-cover" />
                        <p className="mt-1 truncate text-[11px]">{d.title}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
