import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/assets")({
  head: () => ({ meta: [{ title: "Assets — Admin" }] }),
  component: AdminAssets,
});

function AdminAssets() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const campaignsQ = useQuery({
    queryKey: ["all-campaigns-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, campaign_name, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assetsQ = useQuery({
    queryKey: ["all-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, title, description, file_url, file_path, mime_type, campaign_id, campaigns(campaign_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title || !campaignId) {
      toast.error("Pick a file, title, and campaign");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      const { error: insErr } = await supabase.from("assets").insert({
        title: title.trim(),
        description: description.trim() || null,
        campaign_id: campaignId,
        file_url: signed.signedUrl,
        file_path: path,
        mime_type: file.type,
      });
      if (insErr) throw insErr;
      toast.success("Asset uploaded");
      setTitle("");
      setDescription("");
      setFile(null);
      (document.getElementById("asset-file") as HTMLInputElement).value = "";
      qc.invalidateQueries({ queryKey: ["all-assets"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (asset: { id: string; file_path: string }) => {
      await supabase.storage.from("assets").remove([asset.file_path]);
      const { error } = await supabase.from("assets").delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["all-assets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Upload asset</CardTitle>
          <CardDescription>JPG, PNG, GIF, or MP4.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={upload}>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Campaign</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                required
              >
                <option value="">Select campaign…</option>
                {campaignsQ.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campaign_name} {c.status === "active" ? "(active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-file">File</Label>
              <Input
                id="asset-file"
                type="file"
                accept="image/jpeg,image/png,image/gif,video/mp4"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={uploading}>
              <Upload className="mr-1.5 h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {assetsQ.data?.map((a: any) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {a.mime_type?.startsWith("video/") ? (
                  <video src={a.file_url} className="h-full w-full object-cover" controls />
                ) : (
                  <img src={a.file_url} alt={a.title} className="h-full w-full object-cover" />
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.campaigns?.campaign_name ?? "—"}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate({ id: a.id, file_path: a.file_path })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {assetsQ.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No assets uploaded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
