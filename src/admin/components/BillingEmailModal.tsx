import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMoney } from "@/lib/currency";
import { notifyEmail } from "../lib/notifyEmail";

type Plan = { name: string; fee: string; daily: string; max: string };
type Fields = { accountType: string; status: string; balance: string; maxLimit: string; plans: Plan[] };

const PLAN_STYLES = [
  { n: "①", head: "background-color:#eff6ff; border-bottom:1px solid #dbeafe; color:#1d4ed8;", body: "#f8faff", maxColor: "#0f172a" },
  { n: "②", head: "background-color:#f0fdf4; border-bottom:1px solid #bbf7d0; color:#15803d;", body: "#f8fff8", maxColor: "#0f172a" },
  { n: "③", head: "background-color:#fff7ed; border-bottom:1px solid #fed7aa; color:#c2410c;", body: "#fffaf5", maxColor: "#0f172a" },
  { n: "④", head: "background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%); color:#ffffff;", body: "#faf8ff", maxColor: "#7c3aed" },
];

const DEFAULT_PLANS: Plan[] = [
  { name: "Veteran Account", fee: "", daily: "", max: "" },
  { name: "Master Account", fee: "", daily: "", max: "" },
  { name: "Ultimate Account", fee: "", daily: "", max: "" },
  { name: "Diamond Account", fee: "", daily: "", max: "" },
];

const row = (label: string, value: string, last = false, color = "#0f172a") =>
  `<div style="display:flex; justify-content:space-between; font-size:12px;${last ? "" : " padding-bottom:4px;"}"><span style="color:#64748b;">${label}</span><span style="font-weight:600; color:${color};">${value || "—"}</span></div>`;

function buildHtml(f: Fields) {
  const plans = f.plans
    .map((p, i) => {
      const s = PLAN_STYLES[i] ?? PLAN_STYLES[0];
      const isLast = i === f.plans.length - 1;
      return `<div style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; margin:0 0 ${isLast ? 20 : 10}px 0;"><div style="${s.head} padding:8px 16px; font-size:13px; font-weight:700;">${s.n} ${p.name}</div><div style="padding:10px 16px; background-color:${s.body};">${row("Upgrade Fee", p.fee)}${row("Daily Withdrawal Limit", p.daily)}${row("Maximum Balance", p.max, true, s.maxColor)}</div></div>`;
    })
    .join("");

  return `<p style="margin:0 0 12px 0; font-size:14px; color:#374151; line-height:1.6;">Your current account type, <strong style="color:#0f172a;">${f.accountType.toUpperCase()}</strong>, cannot accommodate your existing balance of <strong style="color:#16a34a;">${f.balance}</strong>, which exceeds the current maximum balance limit of ${f.maxLimit}.</p><p style="margin:0 0 12px 0; font-size:14px; color:#374151; line-height:1.6;">As a result, restrictions have been placed on your account due to the high ROI (Return on Investment) and pending withdrawal activity. Transactions and withdrawals are currently unavailable because your account is classified as <strong style="color:#dc2626;">${f.status}</strong>.</p><p style="margin:0 0 20px 0; font-size:14px; color:#374151; line-height:1.6;">An account upgrade is required to remove the current restrictions and enable withdrawals.</p><p style="margin:0 0 10px 0; font-size:15px; font-weight:700; color:#0f172a;">Available Upgrade Options</p>${plans}<p style="margin:0 0 10px 0; font-size:15px; font-weight:700; color:#0f172a;">How to Upgrade</p><p style="margin:0 0 12px 0; font-size:14px; color:#374151; line-height:1.6;">Log in to your account, click <strong>Upgrade</strong> on the Account Level card, choose your preferred upgrade plan, and make the required deposit for the selected badge. Once the deposit is confirmed, your account will be upgraded and withdrawals can proceed according to the limits of your selected plan.</p><p style="margin:0; font-size:14px; color:#374151; line-height:1.6;">Thank you for choosing <strong style="color:#0f172a;">Tesla growth equity</strong>.</p>`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any;
  accountLevel: string;
}

export function BillingEmailModal({ open, onOpenChange, user, accountLevel }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fields, setFields] = useState<Fields>({
    accountType: "", status: "Dormant", balance: "", maxLimit: "", plans: DEFAULT_PLANS,
  });
  const [subject, setSubject] = useState("Account Upgrade Required");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setStep(1);
    setFields((f) => ({
      ...f,
      accountType: accountLevel || user.account_level || "Basic",
      balance: formatMoney(Number(user.total_balance ?? 0), user.currency),
    }));
  }, [open]); // eslint-disable-line

  const setPlan = (i: number, key: keyof Plan, val: string) =>
    setFields((f) => ({ ...f, plans: f.plans.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)) }));

  const preview = () => {
    if (!fields.balance.trim() || !fields.maxLimit.trim()) {
      return toast.error("Enter the existing balance and the max balance limit");
    }
    setHtml(buildHtml(fields));
    setStep(2);
  };

  const send = async () => {
    if (!subject.trim() || !html.trim()) return toast.error("Subject and message are required");
    setSending(true);
    await notifyEmail({
      send: true,
      userId: user.user_id,
      email: user.email,
      intent: "billing_email",
      subject: subject.trim(),
      body: html.replace(/\n\s*/g, "").trim(),
    });
    setSending(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl">
        <div className="shrink-0 border-b border-border px-5 py-3 pr-12">
          <DialogTitle className="text-base">
            {step === 1 ? "Send Billing Email" : "Preview & Edit Email"}
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">To: {user?.email}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Current account type</Label>
                  <Input value={fields.accountType} onChange={(e) => setFields({ ...fields, accountType: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Account status label</Label>
                  <Input value={fields.status} onChange={(e) => setFields({ ...fields, status: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Existing balance</Label>
                  <Input value={fields.balance} onChange={(e) => setFields({ ...fields, balance: e.target.value })} placeholder="e.g. $218,040" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Max balance limit</Label>
                  <Input value={fields.maxLimit} onChange={(e) => setFields({ ...fields, maxLimit: e.target.value })} placeholder="e.g. $210,000" className="mt-1" />
                </div>
              </div>

              <p className="text-[12px] font-semibold pt-1">Upgrade options</p>
              {fields.plans.map((p, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                  <Input value={p.name} onChange={(e) => setPlan(i, "name", e.target.value)} className="font-medium" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Upgrade fee</Label>
                      <Input value={p.fee} onChange={(e) => setPlan(i, "fee", e.target.value)} placeholder="$" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Daily withdrawal</Label>
                      <Input value={p.daily} onChange={(e) => setPlan(i, "daily", e.target.value)} placeholder="$" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Max balance</Label>
                      <Input value={p.max} onChange={(e) => setPlan(i, "max", e.target.value)} placeholder="$ or Unlimited" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div>
                <Label className="text-[12px]">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Preview</Label>
                <div
                  className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
              <div>
                <Label className="text-[12px]">Edit email HTML</Label>
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 flex gap-2 border-t border-border px-5 py-3">
          {step === 1 ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="flex-1" onClick={preview}>Preview email</Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={sending}>Back</Button>
              <Button className="flex-1" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send email"}</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
