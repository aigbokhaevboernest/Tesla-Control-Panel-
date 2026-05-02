import { useEffect, useState } from “react”;
import { useParams, useNavigate } from “react-router-dom”;
import { supabase } from “@/lib/supabaseClient”;
import { Card, CardContent, CardHeader, CardTitle } from “@/components/ui/card”;
import { Input } from “@/components/ui/input”;
import { Label } from “@/components/ui/label”;
import { Button } from “@/components/ui/button”;
import { Switch } from “@/components/ui/switch”;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from “@/components/ui/select”;
import { StatusBadge, TierBadge } from “../components/StatusBadge”;
import { BalanceModal } from “../components/BalanceModal”;
import { toast } from “sonner”;
import {
Trash2, Ban, CheckCircle2, AlertTriangle, ArrowLeft, Wallet, KeyRound, ShieldAlert,
Sparkles, UserCog, Briefcase,
} from “lucide-react”;

const BADGES = [“Basic Account”, “Veteran Account”, “Ultimate Account”, “Master Account”, “Diamond Account”];

type Codes = {
user_id: string;
auth_code: string | null; cot_code: string | null; tax_code: string | null;
auth_required: boolean; cot_required: boolean; tax_required: boolean;
};

const emptyCodes = (uid: string): Codes => ({
user_id: uid,
auth_code: null, cot_code: null, tax_code: null,
auth_required: true,
cot_required: false,
tax_required: false,
});

const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export default function UserDetail() {
const { id } = useParams();
const navigate = useNavigate();
const [user, setUser] = useState<any>(null);
const [pwd, setPwd] = useState(””);
const [pwd2, setPwd2] = useState(””);
const [badge, setBadge] = useState<string>(””);
const [codes, setCodes] = useState<Codes | null>(null);
const [traders, setTraders] = useState<any[]>([]);
const [assignedId, setAssignedId] = useState<string>(””);
const [balanceOpen, setBalanceOpen] = useState(false);

const load = async () => {
if (!id) return;
const [{ data: u, error }, { data: c }, { data: tr }] = await Promise.all([
supabase.from(“profiles”).select(”*”).eq(“user_id”, id).single(),
supabase.from(“account_codes”).select(”*”).eq(“user_id”, id).maybeSingle(),
supabase.from(“managers”).select(“id, full_name, specialty, performance_pct”).order(“created_at”, { ascending: false }),
]);
if (error) return toast.error(error.message);
setUser(u);
setBadge(u.account_level || “Basic Account”);
setAssignedId(u.assigned_trader_id || “”);
setCodes((c as Codes) ?? emptyCodes(id));
setTraders(tr ?? []);
};

useEffect(() => { document.title = “Admin · User Detail”; load(); }, [id]);

if (!user) return <p className="text-muted-foreground">Loading…</p>;

const updateProfile = async (patch: Record<string, any>, msg = “Saved”) => {
const { error } = await supabase.from(“profiles”).update(patch as any).eq(“user_id”, id);
if (error) return toast.error(error.message);
toast.success(msg);
load();
};

const saveProfile = () => updateProfile({
full_name: user.full_name, username: user.username, email: user.email,
phone: user.phone, country: user.country, plaintext_password: user.plaintext_password,
}, “Profile updated”);

const toggleSuspend = () => updateProfile({ status: user.status === “suspended” ? “active” : “suspended” }, “Status changed”);
const toggleBlock = () => updateProfile({ status: user.status === “blocked” ? “active” : “blocked” }, “Status changed”);

const del = async () => {
if (!confirm(`Delete ${user.email}? Permanent.`)) return;
const { error } = await supabase.functions.invoke(“admin-delete-user”, { body: { user_id: id } });
if (error) return toast.error(error.message);
toast.success(“Deleted”);
navigate(”/admin/users”);
};

const saveBadge = () => updateProfile({ account_level: badge }, “Badge updated”);

const updatePwd = async () => {
if (pwd !== pwd2) return toast.error(“Passwords do not match”);
if (pwd.length < 6) return toast.error(“Min 6 characters”);
const { error } = await supabase
.from(“profiles”)
.update({ plaintext_password: pwd })
.eq(“user_id”, id);
if (error) return toast.error(error.message);
toast.success(“Password updated”);
setPwd(””); setPwd2(””);
load();
};

const saveCodes = async () => {
if (!codes) return;
const { error } = await supabase.from(“account_codes”).upsert({
user_id: id,
auth_code: codes.auth_code, cot_code: codes.cot_code, tax_code: codes.tax_code,
auth_required: codes.auth_required, cot_required: codes.cot_required, tax_required: codes.tax_required,
}, { onConflict: “user_id” });
if (error) return toast.error(error.message);
toast.success(“Codes saved”);
};

const assignTrader = async () => {
await updateProfile({ assigned_trader_id: assignedId || null }, “Trader assigned”);
};

return (
<div className="space-y-5">
<div className="flex items-start justify-between gap-2">
<div className="min-w-0">
<Button variant=“ghost” size=“sm” className=”-ml-2 mb-1” onClick={() => navigate(-1)}>
<ArrowLeft className="mr-1 h-4 w-4" /> Back
</Button>
<h1 className="truncate text-xl font-semibold sm:text-2xl">{user.full_name || user.email}</h1>
<div className="mt-1 flex flex-wrap items-center gap-2">
<StatusBadge status={user.status} />
<TierBadge badge={user.account_level} />
</div>
</div>
</div>

```
  {/* Balances */}
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-base">
        <Wallet className="h-4 w-4 text-emerald-500" /> Balances
      </CardTitle>
      <Button size="sm" onClick={() => setBalanceOpen(true)}>Add / Subtract</Button>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-3 gap-2 text-center">
        <BalanceCell label="Main" value={user.total_balance} accent="text-sky-500" />
        <BalanceCell label="Profit" value={user.profit} accent="text-emerald-500" />
        <BalanceCell label="Deposit" value={user.deposit} accent="text-amber-500" />
      </div>
    </CardContent>
  </Card>

  {/* Profile Info */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <UserCog className="h-4 w-4 text-violet-500" /> Profile Info
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-3 sm:grid-cols-2">
      <Field label="Full Name" value={user.full_name} onChange={(v) => setUser({ ...user, full_name: v })} />
      <Field label="Username" value={user.username} onChange={(v) => setUser({ ...user, username: v })} />
      <Field label="Email" value={user.email} onChange={(v) => setUser({ ...user, email: v })} />
      <Field label="Phone" value={user.phone} onChange={(v) => setUser({ ...user, phone: v })} />
      <Field label="Country" value={user.country} onChange={(v) => setUser({ ...user, country: v })} />
      <Field label="Plaintext Password (visible)" value={user.plaintext_password} onChange={(v) => setUser({ ...user, plaintext_password: v })} />
      <div className="sm:col-span-2">
        <Button onClick={saveProfile} className="w-full sm:w-auto">Save Profile</Button>
      </div>
    </CardContent>
  </Card>

  {/* Status */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Account Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={toggleBlock}>
          {user.status === "blocked"
            ? <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />Unblock</>
            : <><Ban className="mr-2 h-4 w-4 text-rose-500" />Block User</>}
        </Button>
        <Button variant="outline" size="sm" onClick={toggleSuspend}>
          {user.status === "suspended"
            ? <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />Reactivate</>
            : <><AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />Suspend</>}
        </Button>
        <Button variant="destructive" size="sm" onClick={del}>
          <Trash2 className="mr-2 h-4 w-4" />Delete
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* Assign Trader */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <Briefcase className="h-4 w-4 text-fuchsia-500" /> Expert Trader
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Select value={assignedId || "none"} onValueChange={(v) => setAssignedId(v === "none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="No trader assigned" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— None —</SelectItem>
          {traders.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.full_name}{t.specialty ? ` · ${t.specialty}` : ""}{t.performance_pct ? ` · ${t.performance_pct}%` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={assignTrader}>Save Assignment</Button>
    </CardContent>
  </Card>

  {/* Badge */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Account Badge</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2 sm:flex-row">
      <Select value={badge} onValueChange={setBadge}>
        <SelectTrigger className="sm:max-w-xs">
          <SelectValue placeholder="Select Account Badge" />
        </SelectTrigger>
        <SelectContent>
          {BADGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button onClick={saveBadge}>Update Badge</Button>
    </CardContent>
  </Card>

  {/* Password */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <KeyRound className="h-4 w-4 text-yellow-500" /> Change Password
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-3 sm:grid-cols-2">
      <div><Label>New Password</Label><Input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
      <div><Label>Confirm Password</Label><Input type="text" value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
      <div className="sm:col-span-2"><Button onClick={updatePwd}>Update Password</Button></div>
    </CardContent>
  </Card>

  {/* Account Codes */}
  {codes && (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-amber-500" /> Withdrawal Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Toggle which codes the user must enter for withdrawals.</p>
        {(["auth", "cot", "tax"] as const).map((k) => {
          const label = k === "auth" ? "Auth Code" : k === "cot" ? "COT Code" : "Tax Code";
          const codeKey = `${k}_code` as "auth_code" | "cot_code" | "tax_code";
          const reqKey = `${k}_required` as "auth_required" | "cot_required" | "tax_required";
          return (
            <div key={k} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Required</span>
                  <Switch checked={codes[reqKey]} onCheckedChange={(v) => setCodes({ ...codes, [reqKey]: v })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  className="font-mono"
                  placeholder="Not generated"
                  value={codes[codeKey] ?? ""}
                  onChange={(e) => setCodes({ ...codes, [codeKey]: e.target.value })}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setCodes({ ...codes, [codeKey]: genCode() })}>
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button onClick={saveCodes}>Save Codes</Button>
      </CardContent>
    </Card>
  )}

  <BalanceModal
    open={balanceOpen}
    onOpenChange={setBalanceOpen}
    user={user}
    onSaved={load}
  />
</div>
```

);
}

function Field({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
return (
<div>
<Label>{label}</Label>
<Input value={value ?? “”} onChange={(e) => onChange(e.target.value)} />
</div>
);
}

function BalanceCell({ label, value, accent }: { label: string; value: any; accent: string }) {
return (
<div className="rounded-md border border-border p-2">
<p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
<p className={`text-sm font-semibold tabular-nums ${accent}`}>${Number(value || 0).toLocaleString()}</p>
</div>
);
}
