import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { normalizeState } from "@/lib/location";
import { Loader2, Eye, EyeOff, ExternalLink, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Advisory = Database["public"]["Tables"]["official_advisories"]["Row"];

const EMPTY = {
  title: "", summary: "", issuer: "", source_url: "", state: "", city: "",
  drug_name: "", imprint: "", published_on: new Date().toISOString().slice(0, 10), expires_on: "",
};

/**
 * Manual entry for official counterfeit-pill advisories (health department,
 * medical examiner, DEA field division, poison control). This is how the
 * alerts feed gets seeded for a metro before the community fills it.
 */
export function AdvisoriesTab() {
  const [rows, setRows] = useState<Advisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("official_advisories")
      .select("*")
      .order("published_on", { ascending: false })
      .limit(200);
    if (error) toast.error("Could not load advisories");
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSave =
    form.title.trim().length >= 3 && form.issuer.trim().length >= 2 &&
    /^https:\/\//.test(form.source_url.trim()) && normalizeState(form.state).length === 2 && form.published_on;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("official_advisories").insert({
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      issuer: form.issuer.trim(),
      source_url: form.source_url.trim(),
      state: normalizeState(form.state),
      city: form.city.trim() || null,
      drug_name: form.drug_name.trim() || null,
      imprint: form.imprint.trim().toUpperCase() || null,
      published_on: form.published_on,
      expires_on: form.expires_on || null,
      created_by: auth.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Advisory published to the feed");
    setForm({ ...EMPTY });
    load();
  };

  const toggle = async (a: Advisory) => {
    setBusyId(a.id);
    const { error } = await supabase.from("official_advisories").update({ hidden: !a.hidden }).eq("id", a.id);
    setBusyId(null);
    if (error) { toast.error("Update failed"); return; }
    setRows((rs) => rs.map((r) => (r.id === a.id ? { ...r, hidden: !a.hidden } : r)));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={set("title")} maxLength={140}
              placeholder="Counterfeit oxycodone “M 30” pills containing fentanyl found in Multnomah County" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Summary (optional)</Label>
            <Textarea rows={2} value={form.summary} onChange={set("summary")} maxLength={500}
              placeholder="One or two sentences in plain language. What was found, where, what to do." />
          </div>
          <div className="space-y-2">
            <Label>Issuer</Label>
            <Input value={form.issuer} onChange={set("issuer")} maxLength={120} placeholder="Multnomah County Health Department" />
          </div>
          <div className="space-y-2">
            <Label>Source URL (https)</Label>
            <Input value={form.source_url} onChange={set("source_url")} placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value={form.state} onChange={set("state")} maxLength={40} placeholder="OR or Oregon" />
          </div>
          <div className="space-y-2">
            <Label>City (optional)</Label>
            <Input value={form.city} onChange={set("city")} maxLength={80} placeholder="Portland" />
          </div>
          <div className="space-y-2">
            <Label>Drug name (optional)</Label>
            <Input value={form.drug_name} onChange={set("drug_name")} maxLength={80} placeholder="Oxycodone" />
          </div>
          <div className="space-y-2">
            <Label>Imprint (optional)</Label>
            <Input value={form.imprint} onChange={set("imprint")} maxLength={40} placeholder="M 30" className="font-mono uppercase" />
          </div>
          <div className="space-y-2">
            <Label>Published on</Label>
            <Input type="date" value={form.published_on} onChange={set("published_on")} />
          </div>
          <div className="space-y-2">
            <Label>Expires on (optional)</Label>
            <Input type="date" value={form.expires_on} onChange={set("expires_on")} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={save} disabled={!canSave || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Publish advisory
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No advisories yet. Seed your metro from the health department, medical examiner, DEA field division, and poison control.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id} className={a.hidden ? "opacity-60" : undefined}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.title}</span>
                    {a.hidden && <Badge variant="destructive">Hidden</Badge>}
                    {a.expires_on && new Date(a.expires_on) < new Date() && <Badge variant="outline">Expired</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.issuer} · {[a.city, a.state].filter(Boolean).join(", ")} · {a.published_on}
                    {a.imprint ? ` · “${a.imprint}”` : ""}{a.drug_name ? ` · ${a.drug_name}` : ""}
                  </p>
                  <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4">
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button size="sm" variant={a.hidden ? "outline" : "destructive"} disabled={busyId === a.id} onClick={() => toggle(a)} className="gap-1.5">
                  {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : a.hidden ? <><Eye className="h-4 w-4" /> Unhide</> : <><EyeOff className="h-4 w-4" /> Hide</>}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
