import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Link2, Download, Building2, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AdminAnalytics,
});

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminAnalytics() {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, downloads, profiles, assets] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("downloads").select("id, asset_id, user_id", { count: "exact" }),
        supabase.from("profiles").select("id, name, department"),
        supabase.from("assets").select("id, title"),
      ]);
      const downloadsRows = downloads.data ?? [];

      // Top department
      const profById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      const deptCount = new Map<string, number>();
      const userDownloads = new Map<string, number>();
      const assetDownloads = new Map<string, number>();
      for (const d of downloadsRows) {
        const p = profById.get(d.user_id);
        if (p?.department) deptCount.set(p.department, (deptCount.get(p.department) ?? 0) + 1);
        userDownloads.set(d.user_id, (userDownloads.get(d.user_id) ?? 0) + 1);
        assetDownloads.set(d.asset_id, (assetDownloads.get(d.asset_id) ?? 0) + 1);
      }
      const topDept = [...deptCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      const topAssetId = [...assetDownloads.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const topAsset = (assets.data ?? []).find((a) => a.id === topAssetId)?.title ?? "—";

      // Per-user breakdown rows
      const rows = (profiles.data ?? [])
        .map((p) => ({
          name: p.name,
          department: p.department,
          downloads: userDownloads.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 10);

      return {
        userCount: users.count ?? 0,
        downloadCount: downloads.count ?? 0,
        topDept,
        topAsset,
        rows,
      };
    },
  });

  const d = overview.data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Users} label="Users" value={d?.userCount ?? "—"} />
        <Stat icon={Link2} label="Links Generated" value={d?.userCount ?? "—"} />
        <Stat icon={Download} label="Downloads" value={d?.downloadCount ?? "—"} />
        <Stat icon={Building2} label="Top Department" value={d?.topDept ?? "—"} />
        <Stat icon={ImageIcon} label="Top Creative" value={d?.topAsset ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most active users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d?.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.department}</TableCell>
                  <TableCell className="text-right">{r.downloads}</TableCell>
                </TableRow>
              ))}
              {d && d.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
