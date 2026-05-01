import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, TierBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { Trash2, Ban, CheckCircle2, AlertTriangle } from "lucide-react";
import { AccountCodesCard } from "../components/AccountCodesCard";
import { notifyEmail } from "../lib/notifyEmail";

const BADGES = ["Basic Account", "Veteran Account", "Ultimate Account", "Master Account", "Diamond Account"];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [badge, setBadge] = useState<string>("");
  const [emailOnCredit, setEmailOnCredit] = useState(true);
  const [creditNote, setCreditNote] = useState<"deposit" | "profit">("profit");

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) return toast.error(error.message);
    setUser(data);
    setBadge(data.badge || "");
  };

  useEffect(() => { document.title = "Admin · User Detail"; load(); }, [id]);

  if (!user) return <p className="text-muted-foreground">Loading…</p>;

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: user.full_name, username: user.username, email: user.email,
      phone: user.phone, country: user.country, plaintext_password: user.plaintext_password,
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const saveBalance = async () => {
    const { error } = await supabase.functions.invoke("admin-balance", {
      body: { user_id: user.id, action: "set", amount: Number(user.balance) },
    });
    if (error) return toast.error(error.message);
    await notifyEmail({
      send: emailOnCredit, userId: user.id, email: user.email,
      intent: creditNote === "profit" ? "profit_added" : "balance_credited",
      subject: creditNote === "profit" ? "Profit added to your account" : "Your balance has been updated",
      body: `Your new balance is $${Number(user.balance).toLocaleString()}.`,
    });
    toast.success("Balance updated");
  };

  const toggleSuspend = async () => {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(`User ${newStatus}`);
    load();
  };

  const toggleBlock = async () => {
    const newStatus = user.status === "blocked" ? "active" : "blocked";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(`User ${newStatus}`);
    load();
  };

  const del = async () => {
    if (!confirm(`Delete ${user.email}? Permanent.`)) return;
    const { error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: user.id } });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate("/admin/users");
  };

  const saveBadge = async () => {
    const { error } = await supabase.from("profiles").update({ badge }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Badge updated");
    load();
  };

  const updatePwd = async () => {
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    if (pwd.length < 6) return toast.error("Min 6 characters");
    const { error } = await supabase.functions.invoke("admin-update-password", {
      body: { user_id: user.id, new_password: pwd },
    });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwd(""); setPwd2("");
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{user.full_name || user.email}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <StatusBadge status={user.status} /> <TierBadge badge={user.badge} />
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile Info</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name" value={user.full_name} onChange={(v) => setUser({ ...user, full_name: v })} />
          <Field label="Username" value={user.username} onChange={(v) => setUser({ ...user, username: v })} />
          <Field label="Email" value={user.email} onChange={(v) => setUser({ ...user, email: v })} />
          <Field label="Phone" value={user.phone} onChange={(v) => setUser({ ...user, phone: v })} />
          <Field label="Country" value={user.country} onChange={(v) => setUser({ ...user, country: v })} />
          <Field label="Plaintext Password (visible)" value={user.plaintext_password} onChange={(v) => setUser({ ...user, plaintext_password: v })} />
          <div className="md:col-span-2"><Button onClick={saveProfile}>Save Profile</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Balance (USD)</Label>
              <Input type="number" value={user.balance ?? 0} onChange={(e) => setUser({ ...user, balance: e.target.value })} />
              <div className="mt-2 space-y-2">
                <Select value={creditNote} onValueChange={(v: any) => setCreditNote(v)}>
                  <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Notify as: Profit added</SelectItem>
                    <SelectItem value="deposit">Notify as: Deposit/credit</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={emailOnCredit} onCheckedChange={(v) => setEmailOnCredit(v === true)} />
                  Send email notification on save
                </label>
                <Button size="sm" onClick={saveBalance}>Save Balance</Button>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1"><StatusBadge status={user.status} /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={toggleBlock}>
              {user.status === "blocked" ? <><CheckCircle2 className="mr-2 h-4 w-4" />Unblock</> : <><Ban className="mr-2 h-4 w-4" />Block User</>}
            </Button>
            <Button variant="outline" onClick={toggleSuspend}>
              {user.status === "suspended" ? <><CheckCircle2 className="mr-2 h-4 w-4" />Reactivate</> : <><AlertTriangle className="mr-2 h-4 w-4" />Suspend User</>}
            </Button>
            <Button variant="destructive" onClick={del}><Trash2 className="mr-2 h-4 w-4" />Delete User</Button>
          </div>
        </CardContent>
      </Card>

      <AccountCodesCard userId={user.id} />

      <Card>
        <CardHeader><CardTitle>Account Badge</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Select value={badge} onValueChange={setBadge}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select Account Badge" /></SelectTrigger>
            <SelectContent>
              {BADGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={saveBadge}>Update Badge</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>New Password</Label><Input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
          <div><Label>Confirm Password</Label><Input type="text" value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
          <div className="md:col-span-2"><Button onClick={updatePwd}>Update Password</Button></div>
        </CardContent>
      </Card>
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
