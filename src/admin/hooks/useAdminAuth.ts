console.log("LOGIN FUNCTION TRIGGERED");
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export type AdminAuthState = {
  loading: boolean;
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
};

export function useAdminAuth(redirectIfNot = true) {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    isAdmin: false,
    userId: null,
    email: null,
  });

  useEffect(() => {
    let active = true;
    let didInitialCheck = false;

    const check = async (userId: string | null, email: string | null) => {
      if (!userId) {
        if (active) setState({ loading: false, isAdmin: false, userId: null, email: null });
        if (redirectIfNot) navigate("/admin/login", { replace: true });
        return;
      }
    const { data, error } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", userId)
  .maybeSingle();

// ✅ DEBUG LOGS
console.log("USER ID:", userId);
console.log("PROFILE DATA:", data);
console.log("PROFILE ERROR:", error);

// 🚨 FORCE ADMIN (TEMP)
const isAdmin = true;

if (!active) return;
setState({ loading: false, isAdmin, userId, email });

// 🚨 DISABLE REDIRECT TEMPORARILY
// if (!isAdmin && redirectIfNot) {
//   await supabase.auth.signOut({ scope: "local" });
//   navigate("/admin/login", { replace: true });
// }
        }
      } catch {
        if (active) setState({ loading: false, isAdmin: false, userId, email });
        if (redirectIfNot) navigate("/admin/login", { replace: true });
      }
    };

    // Listener handles future sign-in/out events; skip the initial fire to avoid races.
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (!didInitialCheck) return;
      if (evt === "SIGNED_OUT") {
        if (active) setState({ loading: false, isAdmin: false, userId: null, email: null });
        if (redirectIfNot) navigate("/admin/login", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      didInitialCheck = true;
      void check(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
