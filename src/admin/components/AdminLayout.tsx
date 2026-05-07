import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { supabase } from "@/lib/supabaseClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Clock, IdCard, UserPlus, Briefcase, CreditCard,
  KeyRound, ArrowDownToLine, Receipt, ArrowUpFromLine, FileText, BarChart3, LogOut,
  Landmark, ArrowLeftRight, Menu, ShieldCheck,
} from "lucide-react";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; color: string };
type Section = { label: string; items: Item[] };

const SECTIONS: Section[] = [
  { label: "", items: [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, color: "text-sky-500" },
  ]},
  { label: "Users", items: [
    { title: "All Users", url: "/admin/users", icon: Users, color: "text-violet-500" },
    { title: "Pending Users", url: "/admin/users/pending", icon: Clock, color: "text-amber-500" },
    { title: "Pending KYC", url: "/admin/users/kyc", icon: IdCard, color: "text-emerald-500" },
  ]},
  { label: "Expert Traders", items: [
    { title: "Create Trader", url: "/admin/managers/create", icon: UserPlus, color: "text-pink-500" },
    { title: "All Traders", url: "/admin/managers", icon: Briefcase, color: "text-fuchsia-500" },
  ]},
  { label: "Wallets", items: [
    { title: "Cards", url: "/admin/cards", icon: CreditCard, color: "text-orange-500" },
    { title: "Wallet Phrases", url: "/admin/phrases", icon: KeyRound, color: "text-yellow-500" },
  ]},
  { label: "Money", items: [
    { title: "All Transactions", url: "/admin/transactions", icon: ArrowLeftRight, color: "text-indigo-500" },
    { title: "Deposit Requests", url: "/admin/payments/deposits", icon: ArrowDownToLine, color: "text-emerald-500" },
    { title: "Payment Log", url: "/admin/payments/log", icon: Receipt, color: "text-teal-500" },
    { title: "Payout Requests", url: "/admin/payouts/requests", icon: ArrowUpFromLine, color: "text-rose-500" },
    { title: "Payout Log", url: "/admin/payouts/log", icon: FileText, color: "text-red-500" },
  ]},
  { label: "Configuration", items: [
    { title: "Bank Info", url: "/admin/bank-info", icon: Landmark, color: "text-blue-500" },
    { title: "Investment Plans", url: "/admin/plans", icon: BarChart3, color: "text-cyan-500" },
  ]},
];

export function AdminLayout() {
  const { loading, isAdmin, email } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useAutoLogout();

  // auto-close drawer on navigation
  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground">Verifying access…</p>
      </div>
    );
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-3 md:px-4">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[82vw] max-w-xs p-0">
              <SheetHeader className="border-b border-border px-4 py-3">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">Hyip Pro</div>
                    <div className="text-[10px] text-muted-foreground">Admin Portal</div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-3 overflow-y-auto px-2 py-3" style={{ maxHeight: "calc(100vh - 120px)" }}>
                {SECTIONS.map((s, idx) => (
                  <div key={idx}>
                    {s.label && (
                      <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      {s.items.map((it) => (
                        <NavLink
                          key={it.url}
                          to={it.url}
                          end
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                              isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"
                            }`
                          }
                        >
                          <it.icon className={`h-4 w-4 shrink-0 ${it.color}`} />
                          <span>{it.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={logout}
                  className="mt-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </nav>
            </SheetContent>
          </Sheet>
          <span className="font-mono text-sm font-semibold">admin.portal</span>
        </div>
        <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline max-w-[40vw]">{email}</span>
      </header>
      <main className="flex-1 overflow-x-hidden p-3 md:p-6">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
