import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ALLOWED_DOMAIN = "jumia.com";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Referral Hub" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState(search.mode === "signup" ? "signup" : "signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="inline-block h-7 w-7 rounded-md bg-primary" />
          Referral Hub
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Only @{ALLOWED_DOMAIN} email addresses can register.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <SignInForm onSuccess={() => navigate({ to: "/dashboard" })} />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm onSuccess={() => navigate({ to: "/dashboard" })} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Welcome back");
      onSuccess();
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="si-email">Work email</Label>
        <Input id="si-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`you@${ALLOWED_DOMAIN}`} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-pw">Password</Label>
        <Input id="si-pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

const DEPARTMENTS = ["Marketing", "Sales", "Operations", "Engineering", "Customer Service", "HR", "Finance", "Product", "Other"];

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Marketing");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const schema = z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255).refine((v) => v.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`), {
        message: `Email must end with @${ALLOWED_DOMAIN}`,
      }),
      password: z.string().min(8).max(72),
      department: z.string().min(1),
    });
    const parsed = schema.safeParse({ name, email, password, department });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: parsed.data.name, department: parsed.data.department },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Official name</Label>
        <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Work email</Label>
        <Input id="su-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`jane.doe@${ALLOWED_DOMAIN}`} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-dept">Department</Label>
        <select
          id="su-dept"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pw">Password</Label>
        <Input id="su-pw" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
