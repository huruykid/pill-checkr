// Area alert fan-out: push iOS subscribers in a state when a NEW
// fentanyl-positive strip report appears there. Invoked every 15 minutes by
// pg_cron (migration 20260919100000_area_alert_push.sql).
//
// Rules (Privacy.tsx and CLAUDE.md describe them):
//   * positive strips only; hidden reports never notify;
//   * one push per device per 6 hours, collapsed per state;
//   * the payload names an imprint and a drug, never a person, a place
//     finer than a city, or the word "safe";
//   * 410 / BadDeviceToken deletes the subscription; 3 other failures too.
//
// Secrets: APNS_KEY_P8 (PEM), APNS_KEY_ID, APNS_TEAM_ID, APNS_TOPIC
// (app.pillcheckr.ios), APNS_HOST (https://api.sandbox.push.apple.com for
// Xcode-installed builds, https://api.push.apple.com for TestFlight/App Store).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOOKBACK_HOURS = 24;
const PER_DEVICE_COOLDOWN_HOURS = 6;
const MAX_FAILURES = 3;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Report = {
  id: string;
  state: string | null;
  city: string | null;
  imprint: string | null;
  drug_name: string | null;
  created_at: string;
};

type Subscription = {
  id: string;
  device_token: string;
  state: string;
  city: string | null;
  lang: string;
  failures: number;
};

// ---------- APNs auth (ES256 JWT, cached ~50 minutes) ----------

let cachedJwt: { token: string; issuedAt: number } | null = null;

function b64url(bytes: Uint8Array | string): string {
  const s = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function apnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.issuedAt < 50 * 60) return cachedJwt.token;

  const keyPem = Deno.env.get("APNS_KEY_P8");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  if (!keyPem || !keyId || !teamId) throw new Error("APNs secrets missing (APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID)");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(keyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${claims}`;
  // WebCrypto ECDSA returns raw r||s, which is exactly the JWS format.
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput)),
  );
  const token = `${signingInput}.${b64url(sig)}`;
  cachedJwt = { token, issuedAt: now };
  return token;
}

// ---------- Copy (never "safe") ----------

function copyFor(lang: string, r: Report, where: string) {
  const imprint = r.imprint ? `“${r.imprint}”` : null;
  const drug = r.drug_name || null;
  if (lang === "es") {
    const subj = imprint ? `Una pastilla con la marca ${imprint}` : "Una pastilla";
    const sold = drug ? ` vendida como ${drug}` : "";
    return {
      title: `Tira positiva a fentanilo reportada cerca de ${where}`,
      body: `${subj}${sold} dio positivo. Prueba antes de usar. Lleva naloxona.`,
    };
  }
  const subj = imprint ? `A pill stamped ${imprint}` : "A pill";
  const sold = drug ? ` sold as ${drug}` : "";
  return {
    title: `Fentanyl-positive strip reported near ${where}`,
    body: `${subj}${sold} tested positive. Test before you use. Carry naloxone.`,
  };
}

// ---------- APNs send ----------

type SendResult = "sent" | "gone" | "failed";

async function sendPush(token: string, state: string, alert: { title: string; body: string }): Promise<SendResult> {
  const host = Deno.env.get("APNS_HOST") || "https://api.push.apple.com";
  const topic = Deno.env.get("APNS_TOPIC") || "app.pillcheckr.ios";
  const jwt = await apnsJwt();
  const res = await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-collapse-id": `area-alert-${state}`,
    },
    body: JSON.stringify({
      aps: { alert, sound: "default" },
      path: "/trends",
    }),
  });
  if (res.ok) return "sent";
  let reason = "";
  try { reason = (await res.json())?.reason ?? ""; } catch { /* no body */ }
  if (res.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic") {
    return "gone";
  }
  console.warn(`APNs ${res.status} ${reason} for token …${token.slice(-6)}`);
  return "failed";
}

// ---------- Handler ----------

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
    const { data: reports, error: rErr } = await admin
      .from("counterfeit_reports")
      .select("id, state, city, imprint, drug_name, created_at")
      .eq("hidden", false)
      .eq("strip_result", "positive")
      .is("notified_at", null)
      .not("state", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (rErr) throw rErr;

    const pending = (reports || []) as Report[];
    if (pending.length === 0) return json({ states: 0, reports: 0, sent: 0, removed: 0 });

    // Newest report per state drives the message; all of them get marked.
    const byState = new Map<string, Report[]>();
    for (const r of pending) {
      const st = (r.state || "").trim().toUpperCase();
      if (st.length !== 2) continue;
      const list = byState.get(st) || [];
      list.push(r);
      byState.set(st, list);
    }

    const cooldownCutoff = new Date(Date.now() - PER_DEVICE_COOLDOWN_HOURS * 3600 * 1000).toISOString();
    let sent = 0;
    let removed = 0;
    const now = new Date().toISOString();

    for (const [state, list] of byState) {
      const newest = list[0];
      const where = newest.city || state;

      const { data: subs, error: sErr } = await admin
        .from("alert_subscriptions")
        .select("id, device_token, state, city, lang, failures")
        .eq("state", state)
        .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownCutoff}`);
      if (sErr) throw sErr;

      for (const s of (subs || []) as Subscription[]) {
        const alert = copyFor(s.lang, newest, where);
        let result: SendResult;
        try {
          result = await sendPush(s.device_token, state, alert);
        } catch (e) {
          console.error("send error", e);
          result = "failed";
        }
        if (result === "sent") {
          sent++;
          await admin.from("alert_subscriptions").update({ last_notified_at: now, failures: 0 }).eq("id", s.id);
        } else if (result === "gone" || s.failures + 1 >= MAX_FAILURES) {
          removed++;
          await admin.from("alert_subscriptions").delete().eq("id", s.id);
        } else {
          await admin.from("alert_subscriptions").update({ failures: s.failures + 1 }).eq("id", s.id);
        }
      }
    }

    const ids = pending.map((r) => r.id);
    const { error: mErr } = await admin.from("counterfeit_reports").update({ notified_at: now }).in("id", ids);
    if (mErr) throw mErr;

    console.log(`notify-area-alerts: ${byState.size} states, ${ids.length} reports, ${sent} sent, ${removed} removed`);
    return json({ states: byState.size, reports: ids.length, sent, removed });
  } catch (e) {
    console.error("notify-area-alerts failed:", e);
    return json({ error: (e as Error).message ?? "notify failed" }, 500);
  }
});
