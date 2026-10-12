import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_URL } from "@/components/shared/SEOHead";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PartnerLink = Database["public"]["Tables"]["partner_links"]["Row"];

const linkFor = (token: string) => `${SITE_URL}/partner/${token}`;

/**
 * Mint and revoke the secret stats links partners use (/partner/:token).
 * The link, not the ?c= code, is the credential: codes are guessable.
 */
export function PartnerLinksCard() {
  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [source, setSource] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("partner_links").select("*").order("created_at", { ascending: false });
    if (error) toast.error(`Partner links: ${error.message}. Run migration 20261011120000_partner_stats.sql.`);
    setLinks(data || []);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = source.trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,40}$/.test(code)) {
      toast.error("Code: lowercase letters, numbers, - and _ only (max 40).");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("partner_links").insert({ source: code, label: label.trim() || null });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSource(""); setLabel("");
    load();
  };

  const revoke = async (token: string) => {
    const { error } = await supabase.from("partner_links").update({ revoked_at: new Date().toISOString() }).eq("token", token);
    if (error) toast.error(error.message); else load();
  };

  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(linkFor(token)); toast.success("Link copied"); }
    catch { toast.error("Couldn't copy; select the link instead."); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Partner stats links</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Give an outreach group a private link to totals for its own QR code (scans, first checks, strips logged).
          Anyone with the link can see those totals, so send it only to the group. Turning a link off is immediate.
        </p>
        <form onSubmit={create} className="flex flex-wrap gap-2">
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="QR code, e.g. fresno-outreach" className="min-h-11 flex-1 min-w-[12rem]" />
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Group name (shown on the page)" className="min-h-11 flex-1 min-w-[12rem]" />
          <Button type="submit" disabled={saving} className="min-h-11">Create link</Button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1 pr-4">Group</th><th className="pr-4">Code</th><th className="pr-4">Link</th><th /></tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.token} className={`border-t ${l.revoked_at ? "text-muted-foreground line-through" : ""}`}>
                  <td className="py-1.5 pr-4">{l.label || "—"}</td>
                  <td className="pr-4 font-mono text-xs">{l.source}</td>
                  <td className="pr-4 font-mono text-xs break-all">{l.revoked_at ? "off" : linkFor(l.token)}</td>
                  <td className="whitespace-nowrap py-1.5 text-right">
                    {!l.revoked_at && (
                      <>
                        <Button size="sm" variant="outline" className="min-h-11 mr-2" onClick={() => copy(l.token)}>Copy</Button>
                        <Button size="sm" variant="outline" className="min-h-11" onClick={() => revoke(l.token)}>Turn off</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {links.length === 0 && <tr><td colSpan={4} className="py-3 text-muted-foreground">No partner links yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
