import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { AlertTriangle } from "lucide-react";

/**
 * Renders a full-screen banner when the current user is suspended.
 * When suspended, children are blurred + non-interactive and a banner overlays.
 */
export function SuspendedGuard({ children }: { children: React.ReactNode }) {
  const [suspended, setSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const check = async (uid: string | null) => {
      if (!uid) { if (active) { setSuspended(false); setLoading(false); } return; }
      const { data } = await supabase.from("profiles").select("status").eq("user_id", uid).maybeSingle();

      if (active) {
        setSuspended(data?.status === "suspended");
        setLoading(false);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void check(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => check(session?.user?.id ?? null));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (loading) return <>{children}</>;
  if (!suspended) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none select-none blur-sm opacity-40">{children}</div>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-card p-6 text-center shadow-lg">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Account Suspended</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been suspended by an administrator. All features are temporarily blocked.
            Please contact support for assistance.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
