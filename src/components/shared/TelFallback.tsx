import { useEffect } from "react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

/** iPadOS reports itself as a Mac; touch points give it away. */
function isIpad(): boolean {
  const ua = navigator.userAgent;
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function pretty(num: string): string {
  const d = num.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `1-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

/**
 * Every tel: link in the app (911, Poison Control, Never Use Alone, SAMHSA,
 * facility numbers) is a dead tap on an iPad that can't place calls — the
 * exact 2.1 rejection Juice got. On iPad we let the link proceed (it works
 * with iPhone Continuity) and also show the number with a Copy action, so
 * the tap always does something visible.
 */
export function TelFallback() {
  const { t } = useI18n();
  useEffect(() => {
    if (!isIpad()) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!a) return;
      const number = pretty(a.getAttribute("href")!.slice(4));
      toast(t("tel.ipadHint").replace("{number}", number), {
        duration: 15000,
        action: {
          label: t("tel.copy"),
          onClick: () => { navigator.clipboard?.writeText(number).catch(() => {}); },
        },
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [t]);
  return null;
}
