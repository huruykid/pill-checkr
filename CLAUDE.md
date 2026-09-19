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
- iOS shell: Capacitor (SPM only, no CocoaPods) in `ios/`. Mechanics, the
  release loop, and the iPad dead-tap checklist live in RELEASING.md — read
  it before any archive. Native ships `npm run ios:sync`, never plain build.
- Google sign-in is hidden on native (Guideline 4.8) until Sign in with
  Apple ships; email auth is the native path.
- Target 17+ (Drug Use or References; Medical/Treatment Information).
- In-app account deletion: Settings → DeleteAccount → `delete-account` edge
  function (needs SUPABASE_SERVICE_ROLE_KEY).
- Migrations that must be applied to the live (Lovable Cloud) database before
  build 1 ships: `20260918100000_app_events`, `20260918100100_share_visibility`,
  `20260918100200_official_advisories`. Without the first, `track()` fails
  silently (fine) but Metrics is empty; without the second, shared links from
  account holders render with no matches.
- Reviewer notes must state: harm reduction, never outputs "safe", cites
  SAMHSA/CDC; provide demo account and a sample imprint (e.g. "M 30").

## Growth surfaces (Sept 2026)
- Onboarding is ONE screen: `WelcomeGate` (legal checkbox + "Try it: M 30"
  which deep-links to `/check?imprint=M%2030&auto=1`). The old walkthrough
  is gone; `pc_onboarding_complete` is still written for compatibility.
  Safety countdown shows once per device (`pc_safety_modal_seen`).
- Guests can open Settings (native has no footer, so Settings → Privacy is
  the only path; reviewers test logged out). Account-only cards render
  behind `user`. Never reintroduce the `/auth` redirect.
- Analytics are FIRST-PARTY ONLY: `app_events` table via
  `src/lib/analytics.ts` (`track()`); anon insert, admin select, 90-day raw
  retention, nightly `rollup-app-events-daily`. No third-party SDK, ever —
  Privacy.tsx and LISTING.md §4 say so. Never send imprint text, photo
  paths, coordinates, IP, or user id. Admin → Metrics reads the rollup.
- Results has owner vs viewer mode. Guest ownership = `pc_my_reports`.
  Viewers never see the photo, strip logger, Buddy Alert, or Save. Result
  pages are `noindex`. Guest reports are `shared=true` at creation; account
  holders flip `shared` from ShareResultCard. RLS on matches/test strips
  follows the parent report's `shared`.
- Share text lives in i18n `share.*` and must never contain "safe".
- `/go?c=<code>` is the QR landing page, `/qr?c=<code>&lang=es` the printable
  poster (web only; native redirects). Every printed poster gets its own
  code; `pc_acq_source` keeps first touch; Metrics shows first checks by
  source. Once live, the QR points at the App Store campaign link.
- Official advisories (`official_advisories` + `_public` view) are the honest
  seed for an empty feed. They are NOT community reports: separate table,
  distinct `AdvisoryCard`, not under the community disclaimer. Enter them
  in Admin → Advisories. Never seed fake community reports.
- Near-me with zero community reports falls back to everywhere VISIBLY
  (notice + near chip stays selected). Do not silently switch scope.
- Area alert push (1.1): `alert_subscriptions` = device token + 2-letter
  state (+ optional city). RLS with NO policies; the API only reaches it via
  `subscribe_area_alerts` / `unsubscribe_area_alerts` RPCs. Sender
  `notify-area-alerts` (pg_cron every 15 min) pushes positive strips only,
  one per device per 6 h, never the word "safe". Client is
  `src/lib/push.ts` (dynamic import, native only) + `AreaAlertsToggle`.
  `pc_push_state` holds the token locally. Turning off deletes the row.
  Privacy.tsx describes the token; change both together.
- `VITE_APP_STORE_LIVE=true` turns on the AppStoreBadge everywhere;
  `VITE_SITE_URL` is the canonical origin (set when pillcheckr.app connects);
  `VITE_ASC_PROVIDER_TOKEN` adds `pt=` to App Store campaign links.

## Traps
- localStorage keys are `pc_*` (renamed from `ff_*`); API keys are `pc_*`.
  Analytics/ownership keys: `pc_install_id`, `pc_acq_source`,
  `pc_first_check_at`, `pc_checks_completed`, `pc_my_reports`,
  `pc_safety_modal_seen` — all cleared by DeleteAccount.
- Anonymous uploads land in `pill-images/anon/` — purged at 30 days by the
  `purge-anon-images` edge fn (nightly pg_cron job `purge-anon-images-daily`).
  Privacy.tsx states the 30-day window; keep them in sync.
- `tune-confidence-scores` was legacy admin tooling — deleted from the repo
  and its weekly cron unscheduled (migration 20260830130100). If Lovable still
  has it deployed, that instance is orphaned and safe to remove.

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
- Moderation: `counterfeit_reports.hidden` exists; both public views filter
  `hidden = false`. Admin queue UI: /admin → Reports tab (ReportsModerationTab).
- Rate limit: BEFORE INSERT trigger `throttle_counterfeit_reports` — max 5
  reports/hour per connection, keyed on a salted IP hash kept 24h in
  `report_throttle` (no policies; only the trigger touches it). Privacy.tsx
  discloses the 24h hash — keep them in sync.
- States are stored as USPS codes (`normalizeState` in src/lib/location.ts)
  so geocoded "California" and hand-typed "CA" match in the near-me feed.

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
  Scheduled: pg_cron job `purge-report-locations`, nightly 03:30 UTC (see
  migration 20260829172854). If this job ever disappears, the privacy policy
  is false — verify it exists after any DB reset.
- `report_type` pill|overdose, `evidence_tier` lab|strip|suspected_opioid|visual.
  Every map point displays its tier. An overdose is NOT a fentanyl detection.
- Privacy policy /privacy is coupled to all of the above. Change one, change
  both in the same commit, or the App Privacy label becomes false — that is a
  store removal, not a rejection.
