import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { buildReferralLink } from "@/lib/utm";
import { ensureUserExistsAndHasPassword } from "@/lib/auth-server-actions";

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
        <Link to="/" className="mb-6 flex items-center justify-center gap-3 font-semibold">
          <img src="/logo.png" alt="Jumia Logo" className="h-8 object-contain" />
          <span className="text-muted-foreground font-normal">|</span>
          <span className="text-base tracking-tight text-foreground font-medium">Employee Advocacy</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Generate your referral link</CardTitle>
            <CardDescription>
              Enter your details below to instantly generate your referral link and access the hub.
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
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Marketing");
  const [loading, setLoading] = useState(false);
  const [generatedReferral, setGeneratedReferral] = useState("");
  const [campaignName, setCampaignName] = useState("");

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

    const password = `JumiaReferralHub2026!`; // Secure internal password for direct auth

    try {
      // 1. Run the server action to ensure the user exists and has this password set
      await ensureUserExistsAndHasPassword({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          department: parsed.data.department,
        }
      });

      // 2. Sign in using the email and password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: password,
      });

      if (signInError || !signInData.session) {
        setLoading(false);
        toast.error(signInError?.message || "Failed to log in after preparing account.");
        return;
      }

      const session = signInData.session;

      // 3. Update profile to reflect latest name/department (in case they changed it on sign in)
      await supabase
        .from("profiles")
        .update({
          name: parsed.data.name,
          department: parsed.data.department,
        })
        .eq("id", session.user.id);

      // 4. Query the active campaign
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("campaign_name, utm_campaign, base_url")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 5. Fetch the profile to get the slug
      const { data: profile } = await supabase
        .from("profiles")
        .select("slug")
        .eq("id", session.user.id)
        .maybeSingle();

      setLoading(false);

      let referralLink = "";
      if (campaign && profile?.slug) {
        referralLink = buildReferralLink({
          baseUrl: campaign.base_url,
          utmCampaign: campaign.utm_campaign,
          slug: profile.slug,
        });
      } else {
        setCampaignName("");
        setGeneratedReferral("NO_ACTIVE_CAMPAIGN");
        toast.success("Signed in successfully! No active campaign is currently running.");
        return;
      }

      setCampaignName(campaign.campaign_name);
      setGeneratedReferral(referralLink);
      toast.success("Referral link generated successfully!");

    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "An error occurred while generating referral link.");
    }
  }

  async function copyToClipboard() {
    if (generatedReferral && generatedReferral !== "NO_ACTIVE_CAMPAIGN") {
      await navigator.clipboard.writeText(generatedReferral);
      toast.success("Referral link copied to clipboard!");
    }
  }

  if (generatedReferral) {
    return (
      <div className="space-y-4">
        {generatedReferral === "NO_ACTIVE_CAMPAIGN" ? (
          <div className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground text-center">
            You are signed in, but there is no active campaign running at the moment to build a referral link from.
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Your Referral Link</p>
              <p className="text-xs text-muted-foreground">Campaign: {campaignName}</p>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedReferral}
                className="font-mono text-xs bg-background"
              />
              <Button size="sm" onClick={copyToClipboard}>
                Copy
              </Button>
            </div>
          </div>
        )}
        <Button onClick={() => navigate({ to: "/dashboard" })} className="w-full">
          Go to Dashboard
        </Button>
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
        {loading ? "Generating link…" : "Generate referral link"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Instant access — no password or email verification required.
      </p>
    </form>
  );
}

