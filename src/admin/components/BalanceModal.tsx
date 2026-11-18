import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { currencySymbol, formatMoney } from "@/lib/currency";
import { notifyEmail } from "../lib/notifyEmail";

type Wallet = "total_balance" | "profit" | "deposit";

/**
 * Product rule switches — flip if your rules differ.
 * - Profit credit/debit always moves the main (total) balance too.
 * - Deposit credit/debit only touches the deposit wallet unless this is true.
 */
const DEPOSIT_AFFECTS_TOTAL = false;

const WALLET_LABEL: Record<Wallet, string> = {
  total_balance: "Main Balance",
  profit: "Profit Balance",
  deposit: "Deposit Balance",
};

const minifyHtml = (html: string) => html.replace(/\n\s*/g, "").replace(/>\s+</g, "><");

type Result = {
  wallet: Wallet;
  type: "credit" | "debit";
  amount: number;
  total_balance: number;
  profit: number;
  deposit: number;
  emailed: boolean;
};

export function BalanceModal({
  open, onOpenChange, user, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any;
  onSaved: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet>("total_balance");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sendMail, setSendMail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Fresh start each time the modal is opened.
  useEffect(() => {
    if (open) {
      setResult(null);
      setAmount("");
      setDescription("");
      setSendMail(true);
    }
  }, [open]);

  if (!user) return null;
  const cur = user.currency;
  const sym = currencySymbol(cur);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");

    setBusy(true);

    // Re-read fresh right before writing — `user` can be stale.
    const { data: fresh, error: readError } = await supabase
      .from("profiles")
      .select("total_balance, profit, deposit")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (readError || !fresh) {
      setBusy(false);
      return toast.error(readError?.message ?? "Couldn't load current balance");
    }

    const cTotal = Number((fresh as any).total_balance || 0);
    const cProfit = Number((fresh as any).profit || 0);
    const cDeposit = Number((fresh as any).deposit || 0);
    const sign = type === "credit" ? 1 : -1;

    let nTotal = cTotal;
    let nProfit = cProfit;
    let nDeposit = cDeposit;

    if (wallet === "total_balance") {
      nTotal = cTotal + sign * amt;
    } else if (wallet === "profit") {
      // Profit moves the main balance together.
      nProfit = cProfit + sign * amt;
      nTotal = cTotal + sign * amt;
    } else {
      nDeposit = cDeposit + sign * amt;
      if (DEPOSIT_AFFECTS_TOTAL) nTotal = cTotal + sign * amt;
    }

    if (nTotal < 0 || nProfit < 0 || nDeposit < 0) {
      setBusy(false);
      return toast.error("Insufficient balance for debit");
    }

    const patch: Record<string, number> = {};
    if (wallet === "total_balance") patch.total_balance = nTotal;
    if (wallet === "profit") { patch.profit = nProfit; patch.total_balance = nTotal; }
    if (wallet === "deposit") {
      patch.deposit = nDeposit;
      if (DEPOSIT_AFFECTS_TOTAL) patch.total_balance = nTotal;
    }

    const { error } = await supabase
      .from("profiles")
      .update(patch as any)
      .eq("user_id", user.user_id);

    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    // Email (same helper as the other admin notifications).
    const isCredit = type === "credit";
    const note = description.trim();
    await notifyEmail({
      send: sendMail,
      userId: user.user_id,
      email: user.email,
      intent: isCredit ? "balance_credited" : "balance_debited",
      subject: isCredit ? "Your account has been credited" : "A debit was made to your account",
      body: minifyHtml(`
<p style="margin:0 0 20px 0;">${isCredit ? "Your account has been credited." : "A debit has been applied to your account."} Please review the details below.</p>
<table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0; width:45%;">Wallet</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${WALLET_LABEL[wallet]}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Amount</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:700; border-bottom:1px solid #e2e8f0; color:${isCredit ? "#16a34a" : "#dc2626"};">${isCredit ? "+" : "-"}${formatMoney(amt, cur)}</td>
  </tr>
  ${note ? `<tr style="background:#f8fafc;"><td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Note</td><td style="padding:10px 14px; font-size:13px; color:#0f172a; border-bottom:1px solid #e2e8f0;">${note.replace(/</g, "&lt;")}</td></tr>` : ""}
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Main Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:700; color:#0f172a; border-bottom:1px solid #e2e8f0;">${formatMoney(nTotal, cur)}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Profit Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${formatMoney(nProfit, cur)}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b;">Deposit Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a;">${formatMoney(nDeposit, cur)}</td>
  </tr>
</table>
<p style="margin:0; font-size:13px; color:#64748b; line-height:1.6;">Log in to your dashboard to view your full balance and transaction history. If you have any questions, please contact our support team.</p>`),
    });

    setBusy(false);

    // Stay open: show confirmation, reset the form, refresh parent numbers.
    setResult({
      wallet, type, amount: amt,
      total_balance: nTotal, profit: nProfit, deposit: nDeposit,
      emailed: sendMail && !!user.email,
    });
    setAmount("");
    setDescription("");
    toast.success("Balance updated");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add / Subtract Balance ({cur || "—"})</DialogTitle>
        </DialogHeader>

        {result && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Balance updated
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.type === "credit" ? "Credited" : "Debited"} {formatMoney(result.amount, cur)} · {WALLET_LABEL[result.wallet]}
              {result.emailed ? " · email sent" : ""}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-background/60 p-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="text-[12px] font-semibold tabular-nums">{formatMoney(result.total_balance, cur)}</p>
              </div>
              <div className="rounded-md bg-background/60 p-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Profit</p>
                <p className="text-[12px] font-semibold tabular-nums">{formatMoney(result.profit, cur)}</p>
              </div>
              <div className="rounded-md bg-background/60 p-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Deposit</p>
                <p className="text-[12px] font-semibold tabular-nums">{formatMoney(result.deposit, cur)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Select Wallet</Label>
            <Select value={wallet} onValueChange={(v: Wallet) => setWallet(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="total_balance">Main Balance ({formatMoney(user.total_balance, cur)})</SelectItem>
                <SelectItem value="profit">Profit Balance ({formatMoney(user.profit, cur)})</SelectItem>
                <SelectItem value="deposit">Deposit Balance ({formatMoney(user.deposit, cur)})</SelectItem>
              </SelectContent>
            </Select>
            {wallet === "profit" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Profit changes also update the Main Balance.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: "credit" | "debit") => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (+)</SelectItem>
                  <SelectItem value="debit">Debit (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ({sym || cur || "—"})</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Reason / note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendMail} onCheckedChange={(v) => setSendMail(v === true)} />
            Send email notification to {user.email || "user"}
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Submit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
