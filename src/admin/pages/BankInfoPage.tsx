import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Landmark, X, Search } from "lucide-react";

type BankField = { label: string; value: string };

type Bank = {
  id: string;
  is_active: boolean;
  fields: BankField[];
  assigned_user_ids: string[];
};

type Profile = { id: string; email: string };

export default function BankInfoPage() {
  const [rows, setRows] = useState<Bank[]>([]);
  const [editing, setEditing] = useState<Partial<Bank> | null>(null);
  const [loading, setLoading] = useState(true);

  // id -> email, for showing chips of currently-assigned users
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_deposit_info")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        is_active: r.is_active,
        fields: r.fields ?? [],
        assigned_user_ids: r.assigned_user_ids ?? [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Bank Info"; load(); }, []);

  // debounce user search
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", `%${userSearch.trim()}%`)
        .limit(6);
      setSearching(false);
      if (!error) setUserResults((data ?? []) as Profile[]);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const fields = editing?.fields ?? [];
  const assignedIds = editing?.assigned_user_ids ?? [];

  const setFields = (next: BankField[]) => {
    if (!editing) return;
    setEditing({ ...editing, fields: next });
  };

  const addField = () => setFields([...fields, { label: "", value: "" }]);

  const updateField = (idx: number, key: "label" | "value", val: string) => {
    const next = fields.slice();
    next[idx] = { ...next[idx], [key]: val };
    setFields(next);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const openEditor = async (b: Partial<Bank>) => {
    setEditing({
      ...b,
      fields: b.fields?.length ? b.fields : [{ label: "", value: "" }],
      assigned_user_ids: b.assigned_user_ids ?? [],
    });
    setUserSearch("");
    setUserResults([]);
    const ids = b.assigned_user_ids ?? [];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, email").in("id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: Profile) => { map[p.id] = p.email; });
      setProfileMap((prev) => ({ ...prev, ...map }));
    }
  };

  const addAssignedUser = (p: Profile) => {
    if (!editing) return;
    if (assignedIds.includes(p.id)) return;
    setEditing({ ...editing, assigned_user_ids: [...assignedIds, p.id] });
    setProfileMap((prev) => ({ ...prev, [p.id]: p.email }));
    setUserSearch("");
    setUserResults([]);
  };

  const removeAssignedUser = (id: string) => {
    if (!editing) return;
    setEditing({ ...editing, assigned_user_ids: assignedIds.filter((i) => i !== id) });
  };

  const save = async () => {
    if (!editing) return;
    const cleaned = (editing.fields ?? []).filter((f) => f.label.trim() && f.value.trim());
    if (cleaned.length === 0) {
      return toast.error("Add at least one field");
    }
    const payload = {
      is_active: !!editing.is_active,
      fields: cleaned,
      assigned_user_ids: editing.assigned_user_ids ?? [],
    };
    if (editing.id) {
      const { error } = await supabase.from("bank_deposit_info").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Bank updated");
    } else {
      const { error } = await supabase.from("bank_deposit_info").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Bank added");
    }
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this bank?")) return;
    const { error } = await supabase.from("bank_deposit_info").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (b: Bank) => {
    const { error } = await supabase
      .from("bank_deposit_info")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Bank Info</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Bank details shown only to assigned users</p>
        </div>
        <Button size="sm" onClick={() => openEditor({ is_active: false, fields: [], assigned_user_ids: [] })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing.id ? "Edit Bank" : "New Bank"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: !!v })} />
              <Label>Active (visible to assigned users)</Label>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Field
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">No fields yet.</p>
              )}
              {fields.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (e.g. Bank Name, IBAN, SWIFT)"
                    value={f.label}
                    onChange={(e) => updateField(idx, "label", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={f.value}
                    onChange={(e) => updateField(idx, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeField(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label>Assign to users</Label>
              <p className="text-xs text-muted-foreground">Only these users will see this bank's details on the deposit page.</p>

              {assignedIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {assignedIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                      {profileMap[id] ?? id}
                      <button type="button" onClick={() => removeAssignedUser(id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search users by email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
              {userResults.length > 0 && (
                <div className="rounded-md border divide-y">
                  {userResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addAssignedUser(p)}
                      disabled={assignedIds.includes(p.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {p.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No banks yet</p>
        ) : rows.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                  <Landmark className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {b.fields[0]?.value || "Bank"}
                    </p>
                    <Switch checked={!!b.is_active} onCheckedChange={() => toggleActive(b)} />
                  </div>
                  {b.fields.map((f, i) => (
                    <p key={i} className="truncate text-[11px] text-muted-foreground">
                      {f.label}: <span className="font-mono">{f.value}</span>
                    </p>
                  ))}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {b.assigned_user_ids.length === 0
                      ? "Not assigned to anyone — hidden from all users"
                      : `Assigned to ${b.assigned_user_ids.length} user${b.assigned_user_ids.length === 1 ? "" : "s"}`}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditor(b)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => del(b.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
