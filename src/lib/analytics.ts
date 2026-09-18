/**
 * First-party usage events. No SDK, no cookies, no IP, no user id.
 *
 * Every event carries a random per-install UUID (pc_install_id) so funnels
 * and week-one retention can be computed, plus platform, app version,
 * language, the 2-letter state the user chose for alerts (if any), and the
 * first-touch acquisition source (utm_source or the QR campaign code).
 *
 * Never send imprint text, photo paths, coordinates, emails, or user ids.
 * Privacy.tsx discloses exactly this — change both together.
 */
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { getSavedLocation } from "@/lib/location";

export type AppEvent =
  | "first_check"
  | "verdict_viewed"
  | "strip_logged"
  | "report_posted"
  | "share_tapped"
  | "alerts_viewed_near"
  | "help_map_opened"
  | "review_prompted"
  | "push_opted_in"
  | "store_badge_tapped"
  | "qr_landing";

const INSTALL_KEY = "pc_install_id";
const SOURCE_KEY = "pc_acq_source";
const FIRST_CHECK_KEY = "pc_first_check_at";
export const CHECKS_COMPLETED_KEY = "pc_checks_completed";

/** Keys this module owns; DeleteAccount clears them. */
export const ANALYTICS_STORAGE_KEYS = [INSTALL_KEY, SOURCE_KEY, FIRST_CHECK_KEY, CHECKS_COMPLETED_KEY, "pc_my_reports"];

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

export function getInstallId(): string {
  let id = safeGet(INSTALL_KEY);
  if (!id) {
    id = crypto.randomUUID();
    safeSet(INSTALL_KEY, id);
  }
  return id;
}

/**
 * First-touch attribution. Reads ?utm_source= or ?c= (QR campaign code) once
 * and keeps the first value seen on this install. Call on app start.
 */
export function captureAttribution(search: string = window.location.search): void {
  if (safeGet(SOURCE_KEY)) return;
  const params = new URLSearchParams(search);
  const raw = params.get("c") || params.get("utm_source");
  if (!raw) return;
  const clean = raw.replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  if (clean) safeSet(SOURCE_KEY, clean);
}

export function getAcquisitionSource(): string | null {
  return safeGet(SOURCE_KEY);
}

const LANGS = new Set(["en", "es", "fr", "pt"]);

/** Fire-and-forget. Never throws, never blocks UI. */
export function track(event: AppEvent, props: Record<string, string | number | boolean | null> = {}): void {
  try {
    const lang = safeGet("pc_lang");
    const state = getSavedLocation()?.state;
    const row = {
      event,
      install_id: getInstallId(),
      platform: isNative() ? "ios" : "web",
      app_version: __APP_VERSION__,
      lang: lang && LANGS.has(lang) ? lang : null,
      state: state && state.length === 2 ? state.toUpperCase() : null,
      source: getAcquisitionSource(),
      props,
    };
    void supabase.from("app_events").insert(row).then(({ error }) => {
      if (error && import.meta.env.DEV) console.debug("track failed", event, error.message);
    });
  } catch {
    /* analytics must never break the app */
  }
}

/**
 * Called when a verdict renders. Emits verdict_viewed every time and
 * first_check once per install.
 */
export function trackVerdictViewed(props: { verdict: "identified" | "unidentified"; mode: "quick" | "photo" }): void {
  if (!safeGet(FIRST_CHECK_KEY)) {
    safeSet(FIRST_CHECK_KEY, new Date().toISOString());
    track("first_check", props);
  }
  track("verdict_viewed", props);
}

/** Local count of checks this install has completed (onboarding default, review prompt). */
export function incrementChecksCompleted(): number {
  const done = Number(safeGet(CHECKS_COMPLETED_KEY) || "0") + 1;
  safeSet(CHECKS_COMPLETED_KEY, String(done));
  return done;
}
export function getChecksCompleted(): number {
  return Number(safeGet(CHECKS_COMPLETED_KEY) || "0");
}

/**
 * Guest ownership of results. Guest reports have no user_id, so the device
 * remembers which report ids it created; Results uses this to decide between
 * owner mode (log a strip, share) and viewer mode (someone else's link).
 */
const MY_REPORTS_KEY = "pc_my_reports";
export function rememberMyReport(reportId: string): void {
  if (!reportId) return;
  try {
    const list: string[] = JSON.parse(safeGet(MY_REPORTS_KEY) || "[]");
    if (!list.includes(reportId)) list.unshift(reportId);
    safeSet(MY_REPORTS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch { /* ignore */ }
}
export function isMyReport(reportId: string): boolean {
  try {
    const list: string[] = JSON.parse(safeGet(MY_REPORTS_KEY) || "[]");
    return list.includes(reportId);
  } catch { return false; }
}
