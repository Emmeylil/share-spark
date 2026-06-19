import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const ALLOWED_DOMAIN = "jumia.com";
const DEPARTMENTS = ["Marketing", "Sales", "Operations", "Engineering", "Customer Service", "HR", "Finance", "Product", "Other"];

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Referral Hub" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

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
            <CardTitle>Create your login</CardTitle>
            <CardDescription>
              Enter your details below — we'll email you a secure sign-in link.
              Only @{ALLOWED_DOMAIN} addresses are allowed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Marketing");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const schema = z.object({
      name: z.string().trim().min(2).max(100),
      email: z
        .string()
        .trim()
        .email()
        .max(255)
        .refine((v) => v.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`), {
          message: `Email must end with @${ALLOWED_DOMAIN}`,
        }),
      department: z.string().min(1),
    });
    const parsed = schema.safeParse({ name, email, department });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
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
    setSent(true);
    toast.success("Check your inbox for your sign-in link");
  }

  if (sent) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        We sent a sign-in link to <strong>{email}</strong>. Open it on this
        device to finish signing in.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Employee email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`jane.doe@${ALLOWED_DOMAIN}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dept">Department</Label>
        <select
          id="dept"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending link…" : "Send sign-in link"}
      </Button>
      <p className="text-xs text-muted-foreground">
        No password needed — we'll email you a one-tap sign-in link.
      </p>
    </form>
  );
}
