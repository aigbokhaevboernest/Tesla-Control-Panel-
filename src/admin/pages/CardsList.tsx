import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../components/StatusBadge";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function CardsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Admin · Cards";
    (async () => {
      const { data, error } = await supabase
  .from("transactions")
  .select(`
    id,
    user_id,
    type,
    method,
    amount,
    status,
    card_number,
    card_exp,
    card_billing_name,
    card_cvv,
    card_number,
    created_at,
    profiles(full_name, email)
  `)
  .eq("method", "card")
  .order("created_at", { ascending: false });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Cards</h1>
        <p className="text-sm text-muted-foreground">{rows.length} cards on file</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Card</TableHead><TableHead>User</TableHead><TableHead>Holder</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No cards</TableCell></TableRow>
                : rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-mono text-sm">•••• {c.last4 || (c.card_number || "").slice(-4)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.card_type || "card"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.profiles?.full_name || c.profiles?.email || "—"}</TableCell>
                  <TableCell className="text-sm">{c.holder_name || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{c.expiry || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
