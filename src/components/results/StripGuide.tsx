import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { hapticSuccess } from "@/lib/platform";
import { ChevronDown, Timer, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type StripReading = "positive" | "negative" | "invalid";

// A drawn strip for each reading, so the answer to "what am I looking at?"
// sits on the button itself. Fentanyl strips read backwards from what people
// expect: ONE line (control only) means fentanyl was found.
export function StripDiagram({ reading, className }: { reading: StripReading; className?: string }) {
  const line = "hsl(330 55% 42%)";
  const showC = reading !== "invalid";
  const showT = reading === "negative";
  return (
    <svg viewBox="0 0 72 22" className={cn("!h-auto !w-full !max-w-[78px]", className)} aria-hidden="true">
      <rect x="0.5" y="0.5" width="71" height="21" rx="4" fill="#fff" stroke="hsl(0 0% 70%)" />
      {/* wavy dip end */}
      <path d="M2 4 q3 3.5 0 7 q-3 3.5 0 7" fill="none" stroke="hsl(0 0% 70%)" />
      {/* result window */}
      <rect x="22" y="4" width="34" height="14" rx="2" fill="hsl(0 0% 96%)" stroke="hsl(0 0% 82%)" />
      {showT && <rect x="31" y="5" width="3" height="12" fill={line} />}
      {showC && <rect x="45" y="5" width="3" height="12" fill={line} />}
      <text x="32.5" y="21" fontSize="5" textAnchor="middle" fill="hsl(0 0% 40%)">T</text>
      <text x="46.5" y="21" fontSize="5" textAnchor="middle" fill="hsl(0 0% 40%)">C</text>
    </svg>
  );
}

const WAIT_SECONDS = 5 * 60;
const STEP_KEYS = ["testStrip.guide.step1", "testStrip.guide.step2", "testStrip.guide.step3", "testStrip.guide.step4"];

function useCountdown() {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    if (endAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  // Wall-clock based, so a locked screen or background tab doesn't stall it.
  const remaining = endAt === null ? WAIT_SECONDS : Math.max(0, Math.ceil((endAt - now) / 1000));
  const done = endAt !== null && remaining === 0;

  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      hapticSuccess();
    }
  }, [done]);

  return {
    running: endAt !== null && !done,
    done,
    remaining,
    start: () => { fired.current = false; setNow(Date.now()); setEndAt(Date.now() + WAIT_SECONDS * 1000); },
    reset: () => { fired.current = false; setEndAt(null); },
  };
}

export function StripGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const timer = useCountdown();
  const mm = Math.floor(timer.remaining / 60);
  const ss = String(timer.remaining % 60).padStart(2, "0");

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        className="flex w-full min-h-11 items-center justify-between gap-2 px-4 py-2 text-sm font-semibold text-foreground"
        aria-expanded={open}
        aria-controls="strip-guide-body"
        onClick={() => onOpenChange(!open)}
      >
        {t("testStrip.guide.toggle")}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id="strip-guide-body" className="space-y-4 px-4 pb-4">
          <ol className="space-y-2">
            {STEP_KEYS.map((key, i) => (
              <li key={key} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{t(key)}</span>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Timer className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              {/* role=timer is not announced every tick; only the hint/done line is live. */}
              <p role="timer" className="font-mono text-2xl font-bold tabular-nums text-foreground">{mm}:{ss}</p>
              <p aria-live="polite" className="text-xs text-muted-foreground">
                {timer.done ? t("testStrip.guide.timerDone") : t("testStrip.guide.timerHint")}
              </p>
            </div>
            {timer.running || timer.done ? (
              <Button variant="outline" className="min-h-11 gap-1.5" onClick={timer.reset}>
                <RotateCcw className="h-4 w-4" />
                {t("testStrip.guide.timerReset")}
              </Button>
            ) : (
              <Button className="min-h-11" onClick={timer.start}>
                {t("testStrip.guide.timerStart")}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t("testStrip.guide.source")}</p>
        </div>
      )}
    </div>
  );
}
