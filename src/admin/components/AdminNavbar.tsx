import { Button } from "@/components/ui/button";
import { performLogout } from "@/hooks/useAutoLogout";
import { LogOut, ShieldCheck } from "lucide-react";

export function AdminNavbar({ email }: { email: string | null }) {
  // Shared logout path: signs out, clears auth + idle keys, hard-redirects to /admin/login.
  const logout = () => {
    void performLogout("manual");
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-foreground" />
          <span className="font-mono text-sm font-semibold tracking-tight">
            Tesla Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          {email && (
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
