import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { isNative } from "@/lib/platform";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/components/shared/SEOHead";
import { cn } from "@/lib/utils";

interface ShareResultCardProps {
  reportId: string;
  imprint: string | null;
  drugName: string | null;
  city?: string | null;
  strip: "positive" | "negative" | null;
  /** Account holders' reports start unshared; guests' are shared at creation. */
  shared: boolean;
  canToggle: boolean;
  onSharedChange?: (shared: boolean) => void;
  className?: string;
}

/**
 * The one viral surface. Native share sheet when available (WKWebView and
 * mobile browsers), clipboard otherwise. The text always carries the
 * harm-reduction message and never the word "safe".
 */
export function ShareResultCard({
  reportId, imprint, drugName, city, strip, shared, canToggle, onSharedChange, className,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const url = `${SITE_URL}/results/${reportId}?utm_source=share&utm_medium=${isNative() ? "ios" : "web"}&utm_campaign=result`;

  const buildText = () => {
    const stamp = imprint ? `“${imprint}”` : t("share.aPill");
    const drug = drugName || "";
    const where = city ? t("share.near").replace("{city}", city) : "";
    if (strip === "positive") {
      return t("share.positive").replace("{imprint}", stamp).replace("{drug}", drug).replace("{where}", where);
    }
    if (strip === "negative") {
      return t("share.negative").replace("{imprint}", stamp).replace("{drug}", drug);
    }
    return t("share.untested").replace("{imprint}", stamp);
  };

  const share = async () => {
    setBusy(true);
    try {
      if (canToggle && !shared) {
        const { error } = await supabase.from("reports").update({ shared: true }).eq("id", reportId);
        if (error) throw error;
        onSharedChange?.(true);
      }
      const text = buildText();
      const kind = strip || "untested";
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
      if (nav.share) {
        try {
          await nav.share({ title: "Pill Checkr", text, url });
          track("share_tapped", { method: "sheet", kind });
          setDone(true);
          return;
        } catch (e) {
          // AbortError = user closed the sheet; anything else falls back to clipboard.
          if ((e as Error)?.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      track("share_tapped", { method: "clipboard", kind });
      setDone(true);
      toast.success(t("share.copied"));
    } catch (e) {
      console.error(e);
      toast.error(t("results.shareError"));
    } finally {
      setBusy(false);
    }
  };

  const unshare = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("reports").update({ shared: false }).eq("id", reportId);
      if (error) throw error;
      onSharedChange?.(false);
      toast.success(t("results.unshareMsg"));
    } catch {
      toast.error(t("results.shareError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn("border-primary/30", className)}>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              {t("share.title")}
            </p>
            <p className="text-sm text-muted-foreground">{t("share.subtitle")}</p>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" disabled={busy} onClick={share}>
            {done ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {t("share.button")}
          </Button>
        </div>
        {canToggle && shared && (
          <button type="button" onClick={unshare} disabled={busy}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-4">
            {t("results.unshare")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
