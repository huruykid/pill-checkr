import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { isNative } from "@/lib/platform";
import { getSavedLocation, type CityState } from "@/lib/location";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

const PUSH_STATE_KEY = "pc_push_state";

function enabledNow(): boolean {
  try { return !!JSON.parse(localStorage.getItem(PUSH_STATE_KEY) || "null")?.token; } catch { return false; }
}

interface Props {
  /** Location to subscribe to; defaults to the saved alert location. */
  loc?: CityState | null;
  className?: string;
}

/**
 * Opt-in card for area alert pushes. Renders only inside the native shell
 * and only once a state is known. The push module is loaded on demand so
 * web never sees it.
 */
export function AreaAlertsToggle({ loc, className }: Props) {
  const { t, lang } = useI18n();
  const [on, setOn] = useState(enabledNow);
  const [busy, setBusy] = useState(false);
  const location = loc ?? getSavedLocation();

  // Keep the subscription aligned when the saved location changes.
  useEffect(() => {
    if (!isNative() || !on || !location?.state) return;
    import("@/lib/push").then((m) => m.syncAreaAlerts(location, lang)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state, location?.city]);

  if (!isNative() || !location?.state) return null;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const push = await import("@/lib/push");
      if (next) {
        const r = await push.enableAreaAlerts(location, lang);
        if (r === "enabled") {
          setOn(true);
          toast.success(t("push.enabledToast").replace("{state}", location.state));
        } else if (r === "denied") {
          toast.error(t("push.denied"));
        } else {
          toast.error(t("push.failed"));
        }
      } else {
        await push.disableAreaAlerts();
        setOn(false);
        toast.success(t("push.disabledToast"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4", className)}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold">
          <Bell className="h-4 w-4 text-primary" />
          {t("push.title").replace("{state}", location.state)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("push.body")}</p>
      </div>
      <Switch checked={on} disabled={busy} onCheckedChange={toggle} aria-label={t("push.title").replace("{state}", location.state)} />
    </div>
  );
}
