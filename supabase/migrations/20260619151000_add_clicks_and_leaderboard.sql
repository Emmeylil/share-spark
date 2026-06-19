-- Create clicks table to track link clicks
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated insertions (tracking click events)
CREATE POLICY "Enable insert for all users including anon" ON public.clicks
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Allow authenticated users to view click records
CREATE POLICY "Enable select for all authenticated users" ON public.clicks
  FOR SELECT TO authenticated
  USING (true);

-- Grant select and insert permissions
GRANT SELECT, INSERT ON public.clicks TO authenticated, anon;
GRANT ALL ON public.clicks TO service_role;

-- Security Definer function to aggregate clicks and downloads for the leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  profile_name TEXT,
  department TEXT,
  clicks_count BIGINT,
  downloads_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name AS profile_name,
    p.department,
    COALESCE(c.clicks, 0)::BIGINT AS clicks_count,
    COALESCE(d.downloads, 0)::BIGINT AS downloads_count
  FROM
    public.profiles p
  LEFT JOIN (
    SELECT profile_id, COUNT(*)::BIGINT AS clicks
    FROM public.clicks
    GROUP BY profile_id
  ) c ON c.profile_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*)::BIGINT AS downloads
    FROM public.downloads
    GROUP BY user_id
  ) d ON d.user_id = p.id
  ORDER BY
    clicks_count DESC,
    downloads_count DESC,
    p.name ASC
  LIMIT 10;
END; $$;

-- Grant execute on the leaderboard function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
