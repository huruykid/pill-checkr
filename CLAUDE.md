# Pill Checkr — project rules

## What it is
A community drug-checking network. Identify a pill → test it with a fentanyl
strip → log the result → anonymous regional alerts warn others. Naloxone and
help are one tap away. Formerly "Fent Finder" (renamed: a photo cannot detect
fentanyl and the app must never imply it can).

## The ONE question the app answers
"What is this pill stamped to be, is that type being faked near me, and how do
I test it?" The home screen answers it above the fold.

## Non-negotiables
- NO "safe" / green / "looks legit" state anywhere. No numeric confidence or
  match percentages in user-facing UI. Risk is categorical: unidentified (red)
  or identified-but-untested (amber). See Results.tsx verdict card.
- Test strip logging works WITHOUT an account (guest mode). It is the moat
  interaction and sits directly under the verdict on Results.
- Core value (identify, alerts, help map, history) works logged out.

## Two products, one repo
- Web (default): all 15 routes, SEO footer, developer API docs/keys/webhooks.
- Native (`npm run build:native`, VITE_TARGET=native): drops /admin,
  /contribute, /api-docs, /install (redirects, never 404). `isNative()` in
  src/lib/platform.ts hides web-only chrome at runtime.
- Web never breaks when native changes. Native diverges; web keeps default.

## Layout ownership
- Header owns top safe-area inset. BottomTabBar owns bottom inset.
- `--tab-bar-space` CSS var: 56px mobile, 0 on md+. Layout main and the
  EmergencyFAB both offset from it.
- Tabs: Identify(/check) · Alerts(/trends) · Help(/nearby-help) · History.

## App Store
- Target 17+ (Drug Use or References; Medical/Treatment Information).
- In-app account deletion: Settings → DeleteAccount → `delete-account` edge
  function (needs SUPABASE_SERVICE_ROLE_KEY).
- Reviewer notes must state: harm reduction, never outputs "safe", cites
  SAMHSA/CDC; provide demo account and a sample imprint (e.g. "M 30").

## Traps
- localStorage keys are `pc_*` (renamed from `ff_*`); API keys are `pc_*`.
- Anonymous uploads land in `pill-images/anon/` — needs a purge job.
- `tune-confidence-scores` edge fn is legacy admin tooling; safe to delete.

## Community Alerts (the loop, on screen)
- `/trends` = CommunityAlerts.tsx feed (both targets). Old charts page lives
  at `/analytics`, web only.
- Data: `counterfeit_reports_public` view (id, city, state, risk_level,
  drug_name, imprint, strip_result, created_at). notes/photo/GPS never leave
  the base table. Migration 20260821000000_community_alerts.sql.
- Writes: ReportFoundSheet inserts to `counterfeit_reports` as guest or user.
  Results → TestStripLogger `onLogged` → nudge → same sheet, prefilled with
  imprint, drug, strip result and report_id (source='results').
- "Near me" = ilike(state) + same-city sorted first. Location is city/state
  only, cached in `pc_alert_location`. No coordinates are ever sent.
- TODO before launch: rate-limit anonymous inserts (edge fn or pg trigger by
  session), and an admin "hide" flag on counterfeit_reports for spam.

## App Store record (created Aug 2026)
- Apple ID 6804091193 · bundle `app.pillcheckr.ios` (PERMANENT) · SKU pillcheckr-ios
- Store name "Pill Checkr: ID & Test" ("Pill Checkr" alone was taken)
- Subtitle "Fentanyl Strips & Naloxone" · Medical / Health & Fitness
- Age rating 18+ (17+ on OS < 26): UGC yes, drug refs Frequent,
  medical/treatment info Frequent, health topics yes; no social/messaging/ads.
- Bundle ID capabilities enabled: Push Notifications, Sign In with Apple.

### Lesson from the Juice 1.0.0 rejection (same dev account)
Rejected under **2.1 App Completeness**, NOT for content: dead taps on
iPad Air 11-inch (iPadOS 18.6) — "Enable Location", "Privacy Policy & Terms",
and "Report Content or User" all did nothing. Pill Checkr has the same three
button archetypes (Near-me / Use my city, privacy links, report sheet).
Before archiving: test every one of them on an **iPad** simulator, not just
iPhone. Reviewers use iPad.

## Privacy policy
`/privacy` (Privacy.tsx) ships on BOTH web and native — never strip it. It is
linked from the footer (web) AND from Settings (native, where there is no
footer). Both links must be tapped on an iPad before every archive; a dead
"Privacy Policy" tap is exactly what got Juice rejected under 2.1.
Contact address used: privacy@pillcheckr.app — this mailbox must exist.

## Location & the map (the contract)
- Precise coordinates NEVER go on `counterfeit_reports`. They live in
  `report_locations` (restricted): insert allowed for anon, SELECT admin-only.
  The public feed/map/API cannot read it. Do not add a join.
- Public rendering is ALWAYS the H3 cell (`hex_cell`, res 6 ≈ 36 km²) computed
  on-device in src/lib/geo.ts. Points are for cluster detection and partner
  sharing, not display.
- Precise is opt-in per report, default "City only", never remembered.
  PrecisionChoice.tsx states the subpoena tradeoff in plain words — don't
  soften that copy.
- `place_type='residence'` renders at hex publicly even when captured precisely.
- Retention: `purge_expired_report_locations()` hard-deletes points at 30 days.
  MUST be scheduled (pg_cron or an edge fn). Unscheduled = the privacy policy
  is false. This is the single highest-risk loose end in the repo.
- `report_type` pill|overdose, `evidence_tier` lab|strip|suspected_opioid|visual.
  Every map point displays its tier. An overdose is NOT a fentanyl detection.
- Privacy policy /privacy is coupled to all of the above. Change one, change
  both in the same commit, or the App Privacy label becomes false — that is a
  store removal, not a rejection.
