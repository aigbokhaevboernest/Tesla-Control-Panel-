import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.role === "admin";
  };

  useEffect(() => {
    document.title = "Admin Login";
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      try {
        if (await checkAdminRole(session.user.id)) {
          navigate("/admin/dashboard", { replace: true });
        }
      } catch {
        await supabase.auth.signOut({ scope: "local" });
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        toast.error(error?.message ?? "Sign in failed");
        return;
      }
      const isAdmin = await checkAdminRole(data.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut({ scope: "local" });
        toast.error("Access denied");
        return;
      }
      navigate("/admin/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl text-[#1A1A1A]">Admin</h1>
          <p className="mt-1 text-sm text-[#767676]">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-[#E2E2E2] bg-white p-6">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-[#767676]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-[#E2E2E2] focus-visible:border-[#C81E3A] focus-visible:ring-[#C81E3A]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-[#767676]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-[#E2E2E2] focus-visible:border-[#C81E3A] focus-visible:ring-[#C81E3A]/20"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C81E3A] text-white hover:bg-[#A8172F] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
