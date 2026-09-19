/**
 * Area alert push subscription (iOS only). Imported dynamically, and only
 * when isNative() is true, so the web bundle never carries the plugin.
 *
 * Contract (Privacy.tsx states it): a subscription is the APNs device token
 * plus the 2-letter state (and optional city) the person already chose for
 * alerts. No coordinates, no hex cell, no account link. Turning alerts off
 * deletes the row. See migration 20260919100000_area_alert_push.sql.
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { normalizeState, type CityState } from "@/lib/location";
import { track } from "@/lib/analytics";

export const PUSH_STATE_KEY = "pc_push_state";

interface PushState { token: string; state: string; city: string | null }

function read(): PushState | null {
  try { return JSON.parse(localStorage.getItem(PUSH_STATE_KEY) || "null"); } catch { return null; }
}
function write(s: PushState | null) {
  try {
    if (s) localStorage.setItem(PUSH_STATE_KEY, JSON.stringify(s));
    else localStorage.removeItem(PUSH_STATE_KEY);
  } catch { /* private mode */ }
}

export function isAreaAlertsEnabled(): boolean {
  return !!read()?.token;
}

export type EnableResult = "enabled" | "denied" | "unsupported" | "failed";

/** Wait for the APNs token after register(); rejects on registrationError or timeout. */
function awaitToken(timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    let done = false;
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];
    const cleanup = () => { for (const h of handles) h.then((x) => x.remove()).catch(() => {}); };
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("registration timed out"))), timeoutMs);
    handles.push(PushNotifications.addListener("registration", (t: Token) => finish(() => resolve(t.value))));
    handles.push(PushNotifications.addListener("registrationError", (e) =>
      finish(() => reject(new Error(String((e as { error?: string })?.error || "registration failed"))))));
  });
}

export async function enableAreaAlerts(loc: CityState, lang: string): Promise<EnableResult> {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  const state = normalizeState(loc.state);
  if (state.length !== 2) return "failed";
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return "denied";

    const tokenPromise = awaitToken();
    await PushNotifications.register();
    const token = await tokenPromise;

    const { error } = await supabase.rpc("subscribe_area_alerts", {
      p_token: token,
      p_state: state,
      p_city: loc.city || null,
      p_lang: lang,
    });
    if (error) throw error;

    write({ token, state, city: loc.city || null });
    track("push_opted_in", { state });
    return "enabled";
  } catch (e) {
    console.error("enableAreaAlerts", e);
    return "failed";
  }
}

export async function disableAreaAlerts(): Promise<void> {
  const cur = read();
  write(null);
  if (!cur?.token) return;
  try {
    await supabase.rpc("unsubscribe_area_alerts", { p_token: cur.token });
  } catch (e) {
    console.error("disableAreaAlerts", e);
  }
}

/**
 * The saved alert location changed (new "Use my city"): move the
 * subscription with it so the person keeps getting the right state.
 */
export async function syncAreaAlerts(loc: CityState | null, lang: string): Promise<void> {
  const cur = read();
  if (!cur?.token) return;
  if (!loc?.state) return;
  const state = normalizeState(loc.state);
  if (state.length !== 2) return;
  if (state === cur.state && (loc.city || null) === cur.city) return;
  try {
    const { error } = await supabase.rpc("subscribe_area_alerts", {
      p_token: cur.token, p_state: state, p_city: loc.city || null, p_lang: lang,
    });
    if (!error) write({ token: cur.token, state, city: loc.city || null });
  } catch (e) {
    console.error("syncAreaAlerts", e);
  }
}

/** Route a tapped notification into the app. Call once, inside the router. */
export async function wirePushNavigation(navigate: (path: string) => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.addListener("pushNotificationActionPerformed", (a: ActionPerformed) => {
      const path = (a.notification?.data as { path?: string } | undefined)?.path;
      navigate(typeof path === "string" && path.startsWith("/") ? path : "/trends");
    });
  } catch (e) {
    console.error("wirePushNavigation", e);
  }
}
