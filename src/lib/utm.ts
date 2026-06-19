export function buildReferralLink(opts: {
  baseUrl: string;
  utmCampaign: string;
  slug: string;
  source?: string;
}) {
  const source = opts.source ?? "OOP-Ref-Internal";
  const url = new URL(opts.baseUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", opts.slug);
  url.searchParams.set("utm_campaign", opts.utmCampaign);
  return url.toString();
}
