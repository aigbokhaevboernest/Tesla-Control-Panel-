import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

    const check = async (userId: string | null, email: string | null) => {
      if (!userId) {
        if (active) setState({ loading: false, isAdmin: false, userId: null, email: null });
        if (redirectIfNot) navigate("/admin/login", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      const isAdmin = !!data && !error;
      if (active) setState({ loading: false, isAdmin, userId, email });
      if (!isAdmin && redirectIfNot) {
        await supabase.auth.signOut({ scope: "local" });
        navigate("/admin/login", { replace: true });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      check(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      check(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
