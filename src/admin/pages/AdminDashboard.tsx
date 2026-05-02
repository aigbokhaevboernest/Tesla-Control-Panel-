import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { AdminNavbar } from "../components/AdminNavbar";
import { UserTable, type AdminUserRow } from "../components/UserTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users } from "lucide-react";

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const { loading: authLoading, isAdmin, userId, email } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] =
      await Promise.all([
        supabase.from("profiles").select("user_id, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
    if (pErr || rErr) {
      toast.error(pErr?.message || rErr?.message || "Failed to load users");
      setLoading(false);
      return;
    }
    const roleMap = new Map<string, "admin" | "user">();
    (roles ?? []).forEach((r) => {
      const existing = roleMap.get(r.user_id);
      if (r.role === "admin" || !existing) roleMap.set(r.user_id, r.role);
    });
    setUsers(
      (profiles ?? []).map((p) => ({
        id: p.user_id,  // ← fixed
        email: p.email,
        created_at: p.created_at,
        role: roleMap.get(p.user_id) ?? "user",  // ← fixed
      })),
    );
    setLoading(false);
  };


  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email?.toLowerCase().includes(q));
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageUsers = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const toggleRole = async (u: AdminUserRow) => {
    if (u.role === "admin") {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", u.id)
        .eq("role", "admin");
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${u.email} is now a user`);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: u.id, role: "admin" });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${u.email} is now an admin`);
    }
    load();
  };

  const deleteUser = async (u: AdminUserRow) => {
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: u.id },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Deleted ${u.email}`);
    load();
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground">Verifying access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar email={email} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">Users</h1>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {users.length} total
            </p>
          </div>
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="max-w-xs font-mono"
          />
        </div>

        {loading ? (
          <p className="font-mono text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <UserTable
              users={pageUsers}
              currentUserId={userId}
              onToggleRole={toggleRole}
              onDelete={deleteUser}
            />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">
                  Page {pageSafe + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageSafe === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageSafe >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
