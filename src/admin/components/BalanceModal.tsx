import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { toast } from "sonner";
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
  const [sendMail, setSendMail] = useState(false);
  const [confirmMailOpen, setConfirmMailOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fresh start each time the modal is opened.
  useEffect(() => {
    if (open) {
      setAmount("");
      setSendMail(false);
      setConfirmMailOpen(false);
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
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Main Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:700; color:#0f172a; border-bottom:1px solid #e2e8f0;">${formatMoney(nTotal, cur)}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px; font-size:13px; color:#64748b; border-bottom:1px solid #e2e8f0;">Profit Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${formatMoney(nProfit, cur)}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px; font-size:13px; color:#64748b;">Deposit Balance</td>
    <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a;">${formatMoney(nDeposit, cur)}</td>
  </tr>
</table>
<p style="margin:0; font-size:13px; color:#64748b; line-height:1.6;">Log in to your dashboard to view your full balance and transaction history. If you have any questions, please contact our support team.</p>`),
    });

    setBusy(false);

    // Stay open: reset the form and refresh parent numbers.
    setAmount("");
    toast.success("Balance updated");
    onSaved();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add / Subtract Balance ({cur || "—"})</DialogTitle>
          </DialogHeader>

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
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={sendMail}
                onCheckedChange={(v) => {
                  if (v === true) {
                    // Ask before turning on; the box only checks after confirming.
                    setConfirmMailOpen(true);
                  } else {
                    setSendMail(false);
                  }
                }}
              />
              Send email notification to {user.email || "user"}
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation for turning on the email notification */}
      <Dialog open={confirmMailOpen} onOpenChange={setConfirmMailOpen}>
        <DialogContent className="max-w-sm rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Turn on email notification?</DialogTitle>
            <DialogDescription>
              An email will be sent to {user.email || "the user"} when you submit this balance change.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmMailOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setSendMail(true);
                setConfirmMailOpen(false);
              }}
            >
              Turn on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
