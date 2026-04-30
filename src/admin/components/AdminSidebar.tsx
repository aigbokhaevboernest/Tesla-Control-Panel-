import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Clock, IdCard, UserPlus, Briefcase, CreditCard,
  KeyRound, ArrowDownToLine, Receipt, ArrowUpFromLine, FileText, BarChart3, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const SECTIONS: { label: string; items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  { label: "", items: [{ title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard }] },
  { label: "Manage User", items: [
    { title: "All Users", url: "/admin/users", icon: Users },
    { title: "Pending Users", url: "/admin/users/pending", icon: Clock },
    { title: "Pending KYC", url: "/admin/users/kyc", icon: IdCard },
  ]},
  { label: "Manager List", items: [
    { title: "Create Manager", url: "/admin/managers/create", icon: UserPlus },
    { title: "All Managers", url: "/admin/managers", icon: Briefcase },
  ]},
  { label: "Card List", items: [{ title: "Cards", url: "/admin/cards", icon: CreditCard }] },
  { label: "Phrase List", items: [{ title: "Wallet Phrases", url: "/admin/phrases", icon: KeyRound }] },
  { label: "Payment Settings", items: [
    { title: "Deposit Requests", url: "/admin/payments/deposits", icon: ArrowDownToLine },
    { title: "Payment Log", url: "/admin/payments/log", icon: Receipt },
  ]},
  { label: "Payout Settings", items: [
    { title: "Payout Requests", url: "/admin/payouts/requests", icon: ArrowUpFromLine },
    { title: "Payout Log", url: "/admin/payouts/log", icon: FileText },
  ]},
  { label: "Manage Plan", items: [{ title: "Plan List", url: "/admin/plans", icon: BarChart3 }] },
];

export function AdminSidebar() {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Hyip Pro</span>
              <span className="text-[10px] text-muted-foreground">Admin Portal</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {SECTIONS.map((section, idx) => (
          <SidebarGroup key={idx}>
            {section.label && !collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Logout">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
