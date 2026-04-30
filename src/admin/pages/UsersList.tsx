import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, Trash2, Ban, CheckCircle2, AlertTriangle } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function UsersList({ statusFilter }: { statusFilter?: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(statusFilter || "all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    // exclude managers (role check via user_roles)
    const ids = (data ?? []).map((p) => p.id);
    let managerIds = new Set<string>();
    if (ids.length) {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      managerIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    }
    setRows((data ?? []).filter((p) => !managerIds.has(p.id)));
    setLoading(false);
  };

  useEffect(() => { document.title = statusFilter ? `Admin · ${statusFilter} Users` : "Admin · Users"; load(); }, [statusFilter]);

  const filtered = useMemo(() => {
    let r = rows;
    if (status !== "all" && !statusFilter) r = r.filter((u) => u.status === status);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((u) => (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q));
    return r;
  }, [rows, search, status, statusFilter]);

  const blockToggle = async (u: any) => {
    const newStatus = u.status === "blocked" ? "active" : "blocked";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(`User ${newStatus}`);
    load();
  };

  const suspendToggle = async (u: any) => {
    const newStatus = u.status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(`User ${newStatus}`);
    load();
  };

  const del = async (u: any) => {
    if (!confirm(`Delete ${u.email}? This is permanent.`)) return;
    const { error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: u.id } });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{statusFilter === "pending" ? "Pending Users" : "All Users"}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} users</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            {!statusFilter && (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{(u.full_name || u.email || "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">@{u.username || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm font-semibold">${Number(u.balance || 0).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/admin/users/${u.id}`}><Eye className="mr-2 h-4 w-4" />View User</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => blockToggle(u)}>
                          {u.status === "blocked" ? <><CheckCircle2 className="mr-2 h-4 w-4" />Unblock</> : <><Ban className="mr-2 h-4 w-4" />Block</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => del(u)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
