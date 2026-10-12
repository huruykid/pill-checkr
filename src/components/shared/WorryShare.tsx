import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import { SITE_URL } from "@/components/shared/SEOHead";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Heart, Send, Copy } from "lucide-react";

/**
 * "Worried about someone? Send them this." The person who cares writes a
 * short note; it goes out from their own phone with a link into the strip-
 * packet test flow (/go?c=share&mode=test). Stamped stores nothing, and the
 * link carries no sender id: every share uses the same "share" code.
 * See docs/design-strip-companion.md, direction C.
 */
export function WorryShare({ className, placement }: { className?: string; placement: "home" | "settings" | "results" }) {
  const { t, lang } = useI18n();
  const [note, setNote] = useState(() => t("share.worryNote"));
  const link = `${SITE_URL}/go?c=share&mode=test${lang !== "en" ? `&lang=${lang}` : ""}`;
  const text = () => `${note.trim()}\n\n${link}`;

  // navigator.share must run inside the tap with nothing awaited first, or
  // WebKit drops the gesture. Fallback is Messages; Copy is always offered
  // too, so an iPad with no SMS still has a working action.
  const send = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: text() });
        track("share_tapped", { method: "sheet", kind: "worry", placement });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    track("share_tapped", { method: "sms", kind: "worry", placement });
    window.location.href = `sms:?&body=${encodeURIComponent(text())}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      track("share_tapped", { method: "clipboard", kind: "worry", placement });
      toast.success(t("worry.copied"));
    } catch {
      toast.error(t("worry.copyFailed"));
    }
  };

  return (
    <Card className={cn("border-primary/30", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          {t("worry.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("worry.body")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <label htmlFor={`worry-note-${placement}`} className="block text-sm font-medium text-foreground">
          {t("worry.noteLabel")}
        </label>
        <Textarea
          id={`worry-note-${placement}`}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          rows={4}
          className="text-base"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={send} disabled={!note.trim()} className="min-h-11 flex-1 gap-2 font-bold">
            <Send className="h-4 w-4" aria-hidden="true" />
            {t("worry.send")}
          </Button>
          <Button onClick={copy} disabled={!note.trim()} variant="outline" className="min-h-11 gap-2">
            <Copy className="h-4 w-4" aria-hidden="true" />
            {t("worry.copy")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("worry.privacy")}</p>
      </CardContent>
    </Card>
  );
}
