import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, ArrowUpDown } from "lucide-react";

export type AdminUserRow = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  created_at: string;
};

type Props = {
  users: AdminUserRow[];
  currentUserId: string | null;
  onToggleRole: (u: AdminUserRow) => Promise<void>;
  onDelete: (u: AdminUserRow) => Promise<void>;
};

export function UserTable({ users, currentUserId, onToggleRole, onDelete }: Props) {
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-mono text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Role</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Created</TableHead>
              <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = busyId === u.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="font-mono">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || isSelf}
                        onClick={async () => {
                          setBusyId(u.id);
                          await onToggleRole(u);
                          setBusyId(null);
                        }}
                      >
                        <ArrowUpDown className="mr-1.5 h-3 w-3" />
                        {u.role === "admin" ? "Make user" : "Make admin"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy || isSelf}
                        onClick={() => setPendingDelete(u)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-mono">{pendingDelete?.email}</span> from
              authentication and the database. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                const u = pendingDelete;
                setPendingDelete(null);
                setBusyId(u.id);
                await onDelete(u);
                setBusyId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
