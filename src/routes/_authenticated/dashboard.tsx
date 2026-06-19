import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Building2, Mail, Trophy, Link2 } from "lucide-react";
import { toast } from "sonner";

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

  // Query clicks count for the logged-in user
  const myClicksQ = useQuery({
    queryKey: ["my-clicks", user.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clicks")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Query downloads count for the logged-in user
  const myDownloadsQ = useQuery({
    queryKey: ["my-downloads", user.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("downloads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Query leaderboard data (auto-refreshed every 10 seconds)
  const leaderboardQ = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const profile = profileQ.data;
  const campaign = campaignQ.data;
  const referralLink =
    profile && campaign && typeof window !== "undefined"
      ? `${window.location.origin}/r/${profile.slug}`
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{profile ? `, ${profile.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Share your unique link and grab the latest campaign creatives.
          </p>
        </div>
      </div>

      {/* User Stats Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Your Link Clicks</p>
              <h3 className="text-3xl font-bold mt-1 tracking-tight">{myClicksQ.data ?? 0}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Link2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Your Downloads</p>
              <h3 className="text-3xl font-bold mt-1 tracking-tight">{myDownloadsQ.data ?? 0}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Download className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Active Campaign</p>
              <h3 className="text-lg font-bold mt-2 truncate max-w-[160px] tracking-tight">{campaign?.campaign_name ?? "No active campaign"}</h3>
            </div>
            <div className={`h-10 px-3 rounded-lg text-xs font-bold flex items-center justify-center ${
              campaign ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            }`}>
              {campaign ? "LIVE" : "INACTIVE"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border/40">
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

        <div className="space-y-6">
          <Card className="border border-border/40">
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

          {/* Team Leaderboard Card */}
          <Card className="border border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500 animate-bounce" />
                Team Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">Top active advocates this campaign</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {leaderboardQ.data?.map((user, idx) => {
                  const isTop3 = idx < 3;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                     <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                       <div className="flex items-center gap-3 min-w-0">
                         <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                           {isTop3 ? medals[idx] : idx + 1}
                         </span>
                         <div className="min-w-0">
                           <div className="text-xs font-semibold truncate">{user.profile_name}</div>
                           <div className="text-[10px] text-muted-foreground truncate">{user.department}</div>
                         </div>
                       </div>
                       <div className="flex items-center gap-3 text-right">
                         <div>
                           <div className="text-xs font-bold">{user.clicks_count}</div>
                           <div className="text-[9px] text-muted-foreground uppercase tracking-wider">clicks</div>
                         </div>
                         <div className="border-l pl-3">
                           <div className="text-xs font-bold">{user.downloads_count}</div>
                           <div className="text-[9px] text-muted-foreground uppercase tracking-wider">downloads</div>
                         </div>
                       </div>
                     </div>
                  );
                })}
                {(!leaderboardQ.data || leaderboardQ.data.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-6">No activity recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
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
