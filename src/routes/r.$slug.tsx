import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/r/$slug")({
  beforeLoad: async ({ params }) => {
    const { slug } = params;

    // 1. Fetch user profile associated with this slug
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (profileErr || !profile) {
      console.error("[Redirect Route] Profile not found for slug:", slug, profileErr);
      throw redirect({ to: "/" });
    }

    // 2. Fetch the current active campaign
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id, base_url, utm_campaign")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (campaignErr || !campaign) {
      console.error("[Redirect Route] No active campaign found", campaignErr);
      throw redirect({ to: "/" });
    }

    try {
      // 3. Log the click in the clicks table (runs anonymously)
      await supabase.from("clicks").insert({
        profile_id: profile.id,
        campaign_id: campaign.id,
      });
    } catch (clickErr) {
      console.error("[Redirect Route] Failed to insert click tracking event:", clickErr);
    }

    // 4. Build target campaign URL with full UTM parameters
    let targetUrl: URL;
    try {
      targetUrl = new URL(campaign.base_url);
    } catch {
      // Fallback if base_url is not a valid absolute URL
      targetUrl = new URL(`https://${campaign.base_url}`);
    }
    
    targetUrl.searchParams.set("utm_source", "OOP-Ref-Internal");
    targetUrl.searchParams.set("utm_medium", slug);
    targetUrl.searchParams.set("utm_campaign", campaign.utm_campaign);

    // 5. Perform external redirect to the target campaign landing page
    throw redirect({
      href: targetUrl.toString(),
      external: true,
    });
  },
  component: () => null,
});
