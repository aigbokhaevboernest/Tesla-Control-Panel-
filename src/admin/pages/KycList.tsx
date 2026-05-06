import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { notifyEmail } from "../lib/notifyEmail";

export default function KycList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kyc_submissions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · KYC"; load(); }, []);

  const review = async (row: any, status: "approved" | "rejected") => {
    const { error } = await supabase.from("kyc_submissions").update({ status }).eq("user_id", row.id);
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ kyc_status: status }).eq("id", row.user_id);
    await notifyEmail({
      send: sendEmail, userId: row.user_id, email: row.profiles?.email,
      intent: status === "approved" ? "kyc_approved" : "kyc_rejected",
      subject: status === "approved" ? "Your KYC was approved" : "Your KYC was rejected",
      body: status === "approved"
        ? "Your KYC verification has been approved. You now have full access."
        : "Your KYC verification was rejected. Please re-submit your documents.",
    });
    toast.success(`KYC ${status}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pending KYC</h1>
        <p className="text-sm text-muted-foreground">{rows.length} submissions awaiting review</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
            Send email notification on approve / reject
          </label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending submissions</TableCell></TableRow>
                : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{r.document_type}</TableCell>
                  <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right space-x-2">
                    {r.document_url && <Button variant="outline" size="sm" asChild><a href={r.document_url} target="_blank" rel="noreferrer">View</a></Button>}
                    <Button size="sm" onClick={() => review(r, "approved")}><Check className="mr-1 h-3 w-3" />Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => review(r, "rejected")}><X className="mr-1 h-3 w-3" />Reject</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
