import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Admin" }] }),
  component: AdminCampaigns,
});

function AdminCampaigns() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    campaign_name: "",
    utm_campaign: "",
    base_url: "https://promo.company.com/campaign",
    start_date: "",
    end_date: "",
  });

  const campaignsQ = useQuery({
    queryKey: ["all-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaigns").insert({
        campaign_name: form.campaign_name.trim(),
        utm_campaign: form.utm_campaign.trim().toLowerCase().replace(/\s+/g, "-"),
        base_url: form.base_url.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      setForm({ campaign_name: "", utm_campaign: "", base_url: "https://promo.company.com/campaign", start_date: "", end_date: "" });
      qc.invalidateQueries({ queryKey: ["all-campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (status === "active") {
        // Deactivate any other active campaigns first
        await supabase.from("campaigns").update({ status: "ended" }).eq("status", "active").neq("id", id);
      }
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-campaigns"] });
      qc.invalidateQueries({ queryKey: ["active-campaign"] });
      toast.success("Updated");
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>New campaign</CardTitle>
          <CardDescription>Activate one at a time to drive referral links.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.campaign_name || !form.utm_campaign) {
                toast.error("Name and UTM are required");
                return;
              }
              create.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Campaign name</Label>
              <Input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} placeholder="Black Friday 2026" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>UTM campaign tag</Label>
              <Input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="black-friday-2026" maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://promo.company.com/campaign" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>UTM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignsQ.data?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.campaign_name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.utm_campaign}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: c.id, status: "ended" })}>
                        End
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus.mutate({ id: c.id, status: "active" })}>
                        <Power className="mr-1 h-3 w-3" /> Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {campaignsQ.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No campaigns yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
