import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateManager() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", role: "manager", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.email || !form.password || !form.full_name) return toast.error("All fields required");
    setLoading(true);
    const { error } = await supabase.functions.invoke("admin-create-user", { body: form });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Manager created");
    navigate("/admin/managers");
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Create Manager</h1>
        <p className="text-sm text-muted-foreground">Add a new expert trader</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Manager Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="expert_trader">Expert Trader</SelectItem>
                <SelectItem value="senior_trader">Senior Trader</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <Button onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create Manager"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
