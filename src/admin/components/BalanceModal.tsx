mport { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";

type Wallet = "balance" | "profit_balance" | "deposit_balance";

export function BalanceModal({
  open, onOpenChange, user, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any;
  onSaved: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet>("balance");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");

    const current = Number(user[wallet] || 0);
    const next = type === "credit" ? current + amt : current - amt;
    if (next < 0) return toast.error("Insufficient balance for debit");

    setBusy(true);
    const patch: Record<string, number> = {};
    patch[wallet] = next;
    const { error } = await supabase
      .from("profiles")
      .update(patch as any)
   .eq("user_id", user.user_id)
    setBusy(false);
    if (error) return toast.error(error.message);

    if (notify) {
      await notifyEmail({
        send: true,
        userId: user.user_id,
        email: user.email,
        intent: type === "credit" ? "balance_credited" : "withdrawal_made",
        subject: `Your ${WALLET_LABEL[wallet]} was ${type === "credit" ? "credited" : "debited"}`,
        body: `${type === "credit" ? "Credit" : "Debit"} of $${amt.toLocaleString()} on your ${WALLET_LABEL[wallet]}.${description ? `\n\nNote: ${description}` : ""}`,
      });
    }

    toast.success("Balance updated");
    setAmount(""); setDescription("");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add / Subtract Balance</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Select Wallet</Label>
            <Select value={wallet} onValueChange={(v: Wallet) => setWallet(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="balance">Main Balance (${Number(user.balance || 0).toLocaleString()})</SelectItem>
                <SelectItem value="profit_balance">Profit Balance (${Number(user.profit_balance || 0).toLocaleString()})</SelectItem>
                <SelectItem value="deposit_balance">Deposit Balance (${Number(user.deposit_balance || 0).toLocaleString()})</SelectItem>
              </SelectContent>
            </Select>
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
              <Label>Amount</Label>
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
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Notify user by email
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

const WALLET_LABEL: Record<Wallet, string> = {
  balance: "Main Balance",
  profit_balance: "Profit Balance",
  deposit_balance: "Deposit Balance",
};
