import { useState } from “react”;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from “@/components/ui/dialog”;
import { Label } from “@/components/ui/label”;
import { Input } from “@/components/ui/input”;
import { Button } from “@/components/ui/button”;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from “@/components/ui/select”;
import { Textarea } from “@/components/ui/textarea”;
import { supabase } from “@/lib/supabaseClient”;
import { toast } from “sonner”;
import { notifyEmail } from “../lib/notifyEmail”;

type Wallet = “total_balance” | “profit” | “deposit”;

export function BalanceModal({
open, onOpenChange, user, onSaved,
}: {
open: boolean;
onOpenChange: (v: boolean) => void;
user: any;
onSaved: () => void;
}) {
const [wallet, setWallet] = useState<Wallet>(“total_balance”);
const [type, setType] = useState<“credit” | “debit”>(“credit”);
const [amount, setAmount] = useState(””);
const [description, setDescription] = useState(””);
const [notify, setNotify] = useState(true);
const [busy, setBusy] = useState(false);

if (!user) return null;

const submit = async () => {
const amt = Number(amount);
if (!amt || amt <= 0) return toast.error(“Enter a valid amount”);

```
setBusy(true);

// Fetch fresh balance before updating
const { data: fresh, error: fetchErr } = await supabase
  .from("profiles")
  .select("total_balance, profit, deposit")
  .eq("user_id", user.user_id)
  .single();

if (fetchErr) { setBusy(false); return toast.error(fetchErr.message); }

const current = Number(fresh[wallet] || 0);
const next = type === "credit" ? current + amt : current - amt;
if (next < 0) { setBusy(false); return toast.error("Insufficient balance for debit"); }

const { error } = await supabase
  .from("profiles")
  .update({ [wallet]: next })
  .eq("user_id", user.user_id);

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
```

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
<SelectItem value="total_balance">Main Balance (${Number(user.total_balance || 0).toLocaleString()})</SelectItem>
<SelectItem value="profit">Profit Balance (${Number(user.profit || 0).toLocaleString()})</SelectItem>
<SelectItem value="deposit">Deposit Balance (${Number(user.deposit || 0).toLocaleString()})</SelectItem>
</SelectContent>
</Select>
</div>
<div className="grid grid-cols-2 gap-3">
<div>
<Label>Type</Label>
<Select value={type} onValueChange={(v: “credit” | “debit”) => setType(v)}>
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
type=“number”
inputMode=“decimal”
placeholder=“0.00”
value={amount}
onChange={(e) => setAmount(e.target.value)}
/>
</div>
</div>
<div>
<Label>Description (optional)</Label>
<Textarea
rows={2}
placeholder=“Reason / note”
value={description}
onChange={(e) => setDescription(e.target.value)}
/>
</div>
<label className="flex items-center gap-2 text-xs text-muted-foreground">
<input
type=“checkbox”
checked={notify}
onChange={(e) => setNotify(e.target.checked)}
className=“h-3.5 w-3.5”
/>
Notify user by email
</label>
</div>
<DialogFooter className="gap-2">
<Button variant=“outline” onClick={() => onOpenChange(false)}>Close</Button>
<Button onClick={submit} disabled={busy}>{busy ? “Saving…” : “Submit”}</Button>
</DialogFooter>
</DialogContent>
</Dialog>
);
}

const WALLET_LABEL: Record<Wallet, string> = {
total_balance: “Main Balance”,
profit: “Profit Balance”,
deposit: “Deposit Balance”,
};
