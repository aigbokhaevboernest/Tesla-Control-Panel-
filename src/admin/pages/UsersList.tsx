import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, Trash2, Ban, CheckCircle2, AlertTriangle } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function UsersList({ statusFilter }: { statusFilter?: string }) {
  const navigate = useNavigate();
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

    const ids = (data ?? []).map((p: any) => p.id);
    let adminIds = new Set<string>();
    if (ids.length) {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      adminIds = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    }
    setRows((data ?? []).filter((p: any) => !adminIds.has(p.id)));
    setLoading(false);
  };

  useEffect(() => {
    document.title = statusFilter ? `Admin · ${statusFilter} Users` : "Admin · Users";
    load();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    let r = rows;
    if (status !== "all" && !statusFilter) r = r.filter((u) => u.status === status);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((u) =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
    return r;
  }, [rows, search, status, statusFilter]);

  const setUserStatus = async (u: any, newStatus: string) => {
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("user_id", u.id);
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
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">
          {statusFilter === "pending" ? "Pending Users" : "All Users"}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{filtered.length} users</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px]"
        />
        {!statusFilter && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No users</p>
        ) : filtered.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{u.full_name || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      {u.username && <p className="truncate text-[11px] text-muted-foreground">@{u.username}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate(`/admin/users/${u.id}`)}>
                          <Eye className="mr-2 h-4 w-4 text-sky-500" /> View User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setUserStatus(u, u.status === "blocked" ? "active" : "blocked")}>
                          {u.status === "blocked"
                            ? <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />Unblock</>
                            : <><Ban className="mr-2 h-4 w-4 text-rose-500" />Block</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUserStatus(u, u.status === "suspended" ? "active" : "suspended")}>
                          {u.status === "suspended"
                            ? <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />Reactivate</>
                            : <><AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />Suspend</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => del(u)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusBadge status={u.status} />
                    <span className="text-sm font-semibold tabular-nums">
                      ${Number(u.balance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
