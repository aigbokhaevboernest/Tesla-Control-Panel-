import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "../components/StatusBadge";
import { BalanceModal } from "../components/BalanceModal";
import { toast } from "sonner";
import {
  Trash2, Ban, CheckCircle2, AlertTriangle, ArrowLeft, KeyRound, ShieldAlert,
  Sparkles, Briefcase,
} from "lucide-react";
import { currencySymbol, formatMoney } from "@/lib/currency";

const ACCOUNT_LEVELS = ["Basic", "Veteran Account", "Master", "Ultimate Account", "Diamond Account"];
const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();
type CodeType = "auth" | "cot" | "tax";

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [accountLevel, setAccountLevel] = useState<string>("Basic");
  const [codes, setCodes] = useState<Record<CodeType, string>>({ auth: "", cot: "", tax: "" });
  const [codeToggles, setCodeToggles] = useState<Record<CodeType, boolean>>({ auth: true, cot: false, tax: false });
  const [traders, setTraders] = useState<any[]>([]);
  const [assignedId, setAssignedId] = useState<string>("");
  const [balanceOpen, setBalanceOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: u, error }, { data: c }, { data: tr }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", id).single(),
      supabase.from("account_withdrawal_codes").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("expert_traders").select("id, name, specialty, win_rate").order("sort_order", { ascending: true }),
    ]);
    if (error) return toast.error(error.message);
    setUser(u);
    setAccountLevel((u as any).account_level || "Basic");
    setAssignedId((u as any).assigned_expert_id || "");

    if (c) {
      setCodes({
        auth: (c as any).auth_code || "",
        cot: (c as any).cot_code || "",
        tax: (c as any).tax_code || "",
      });
      setCodeToggles({
        auth: (c as any).auth_required ?? true,
        cot: (c as any).cot_required ?? false,
        tax: (c as any).tax_required ?? false,
      });
    }
    setTraders(tr ?? []);
  };

  useEffect(() => { document.title = "Admin · User Detail"; load(); }, [id]);

  if (!user) return <p className="text-muted-foreground">Loading…</p>;
  const cur = user.currency;

  const updateProfile = async (patch: Record<string, any>, msg = "Saved") => {
    const { error } = await supabase.from("profiles").update(patch as any).eq("user_id", id!);
    if (error) return toast.error(error.message);
    toast.success(msg);
    load();
  };

  const saveProfile = () => updateProfile({
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    plaintext_password: user.plaintext_password,
  }, "Profile updated");

  const toggleSuspend = () => updateProfile({
    status: user.status === "suspended" ? "active" : "suspended"
  }, "Status changed");

  const toggleBlock = () => updateProfile({
    status: user.status === "blocked" ? "active" : "blocked"
  }, "Status changed");

  const del = async () => {
    if (!confirm(`Delete ${user.email}? Permanent.`)) return;
    // Try to delete the auth user via admin client (likely unavailable in browser).
    const adminAuth = (supabase as any).auth?.admin;
    if (adminAuth?.deleteUser) {
      try { await adminAuth.deleteUser(id); } catch { /* ignore */ }
    }
    const { error: delErr } = await supabase.from("profiles").delete().eq("user_id", id!);
    if (delErr) {
      // fallback: block the user
      const { error: blockErr } = await supabase.from("profiles").update({ status: "blocked" }).eq("user_id", id!);
      if (blockErr) return toast.error(blockErr.message);
      toast.success("User blocked (deletion not permitted)");
    } else {
      toast.success("Deleted");
    }
    navigate("/admin/users");
  };

  const saveAccountLevel = () => updateProfile({ account_level: accountLevel }, "Account level updated");

  const updatePwd = async () => {
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    if (pwd.length < 6) return toast.error("Min 6 characters");
    const { error } = await supabase
      .from("profiles")
      .update({ plaintext_password: pwd })
      .eq("user_id", id!);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwd(""); setPwd2("");
    load();
  };

  const saveCodes = async () => {
    const payload = {
      user_id: id!,
      auth_code: codes.auth.trim().toUpperCase() || null,
      cot_code: codes.cot.trim().toUpperCase() || null,
      tax_code: codes.tax.trim().toUpperCase() || null,
      auth_required: codeToggles.auth,
      cot_required: codeToggles.cot,
      tax_required: codeToggles.tax,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await supabase
      .from("account_withdrawal_codes").select("id").eq("user_id", id!).maybeSingle();
    const { error } = existing
      ? await supabase.from("code").update(payload as any).eq("user_id", id!)
      : await supabase.from("codes").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Codes saved");
  };

  const assignTrader = async () => {
    await updateProfile({ assigned_expert_id: assignedId || null }, "Expert assigned");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{user.full_name || user.email}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={user.status} />
            <span>{user.email}</span>
            {cur && <span>· {cur}</span>}
          </div>
        </div>
      </div>

      {/* Balances */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Balances ({cur || "—"})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <BalanceCell label="Total" value={user.total_balance} currency={cur} accent="text-emerald-600" />
            <BalanceCell label="Deposit" value={user.deposit} currency={cur} accent="text-sky-600" />
            <BalanceCell label="Profit" value={user.profit} currency={cur} accent="text-amber-600" />
          </div>
          <Button size="sm" onClick={() => setBalanceOpen(true)}>Add / Subtract Balance</Button>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Full Name" value={user.full_name} onChange={(v) => setUser({ ...user, full_name: v })} />
          <Field label="Username" value={user.username} onChange={(v) => setUser({ ...user, username: v })} />
          <Field label="Email" value={user.email} onChange={(v) => setUser({ ...user, email: v })} />
          <Field label="Phone" value={user.phone} onChange={(v) => setUser({ ...user, phone: v })} />
          <Field label="Country" value={user.country} onChange={(v) => setUser({ ...user, country: v })} />
          <Field label="Plaintext Password (debug)" value={user.plaintext_password} onChange={(v) => setUser({ ...user, plaintext_password: v })} />
          <div className="sm:col-span-2"><Button onClick={saveProfile}>Save Profile</Button></div>
        </CardContent>
      </Card>

      {/* Account Status */}
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

      {/* Assign Expert Trader */}
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
                  {t.name}{t.specialty ? ` · ${t.specialty}` : ""}{t.win_rate ? ` · ${t.win_rate}%` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={assignTrader}>Save Assignment</Button>
        </CardContent>
      </Card>

      {/* Account Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account Level</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Select value={accountLevel} onValueChange={setAccountLevel}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Select Account Level" />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_LEVELS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={saveAccountLevel}>Update Level</Button>
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

      {/* Withdrawal Codes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Withdrawal Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Auth code is always required. Toggle COT and Tax only when needed.
          </p>
          {(["auth", "cot", "tax"] as CodeType[]).map((k) => {
            const label = k === "auth" ? "Auth Code" : k === "cot" ? "COT Code" : "Tax Code";
            return (
              <div key={k} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Required</span>
                    <Switch
                      checked={codeToggles[k]}
                      disabled={k === "auth"}
                      onCheckedChange={(v) => setCodeToggles({ ...codeToggles, [k]: v })}
                    />
                  </div>
                </div>
                {codeToggles[k] && (
                  <div className="flex gap-2">
                    <Input
                      className="font-mono"
                      placeholder="Enter code"
                      value={codes[k]}
                      onChange={(e) => setCodes({ ...codes, [k]: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCodes({ ...codes, [k]: genCode() })}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          <Button onClick={saveCodes}>Save Codes</Button>
        </CardContent>
      </Card>

      <BalanceModal
        open={balanceOpen}
        onOpenChange={setBalanceOpen}
        user={user}
        onSaved={load}
      />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function BalanceCell({ label, value, currency, accent }: { label: string; value: any; currency?: string; accent: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${accent}`}>{formatMoney(value, currency)}</p>
    </div>
  );
}
