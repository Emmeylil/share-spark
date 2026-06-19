import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Building2, Mail } from "lucide-react";
import { toast } from "sonner";
import { buildReferralLink } from "@/lib/utm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Referral Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email, department, slug")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const campaignQ = useQuery({
    queryKey: ["active-campaign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, campaign_name, utm_campaign, base_url, status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const assetsQ = useQuery({
    queryKey: ["assets", campaignQ.data?.id],
    enabled: !!campaignQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, title, description, file_url, file_path, mime_type, campaign_id")
        .eq("campaign_id", campaignQ.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const recordDownload = useMutation({
    mutationFn: async (assetId: string) => {
      await supabase.from("downloads").insert({
        user_id: user.id,
        asset_id: assetId,
        campaign_id: campaignQ.data?.id ?? null,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-downloads"] }),
  });

  const profile = profileQ.data;
  const campaign = campaignQ.data;
  const referralLink =
    profile && campaign
      ? buildReferralLink({
          baseUrl: campaign.base_url,
          utmCampaign: campaign.utm_campaign,
          slug: profile.slug,
        })
      : "";

  async function copy() {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  }

  async function download(assetId: string, fileUrl: string, title: string) {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      recordDownload.mutate(assetId);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome{profile ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Share your unique link and grab the latest campaign creatives.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your referral link</CardTitle>
            <CardDescription>
              {campaign
                ? <>For campaign <Badge variant="secondary">{campaign.campaign_name}</Badge></>
                : "No active campaign yet — please check back soon."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input readOnly value={referralLink} placeholder="Waiting for active campaign…" className="font-mono text-xs" />
              <Button onClick={copy} disabled={!referralLink}>
                <Copy className="mr-1.5 h-4 w-4" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> {profile?.email}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" /> {profile?.department}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Campaign assets</h2>
        {!campaign && <p className="text-sm text-muted-foreground">Assets will appear when a campaign is active.</p>}
        {campaign && assetsQ.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No assets uploaded yet.</p>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assetsQ.data?.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {a.mime_type?.startsWith("video/") ? (
                  <video src={a.file_url} className="h-full w-full object-cover" controls />
                ) : (
                  <img src={a.file_url} alt={a.title} className="h-full w-full object-cover" />
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <div>
                  <div className="font-semibold">{a.title}</div>
                  {a.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                  )}
                </div>
                <Button className="w-full" onClick={() => download(a.id, a.file_url, a.title)}>
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
