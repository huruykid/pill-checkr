# Releasing Pill Checkr iOS

The facts that must never be re-derived, and the loop that ships a build.
Read CLAUDE.md first for product rules; this file is mechanics only.

## Permanent identifiers — never change these

| What | Value |
|---|---|
| Bundle ID | `app.pillcheckr.ios` (PERMANENT — released to App Store Connect) |
| Apple ID | 6804091193 |
| SKU | pillcheckr-ios |
| Store name | "Pill Checkr: ID & Test" |
| Subtitle | "Fentanyl Strips & Naloxone" |
| Xcode project | `ios/App/App.xcodeproj` — scheme **App** |
| Package manager | **SPM only** (`ios/App/CapApp-SPM/Package.swift`). There is no Podfile; never run `pod install`, never add one. |
| Age rating | 18+ (17+ on OS < 26) — UGC yes, drug refs Frequent, medical info Frequent |

Version lives in `ios/App/App.xcodeproj/project.pbxproj`:
`MARKETING_VERSION` (user-facing, e.g. 1.0) and `CURRENT_PROJECT_VERSION`
(build number — bump on EVERY upload, App Store Connect rejects reused ones).

## The web bundle the app ships

The native app ships the **native route table** — always build with
`npm run build:native` (`VITE_TARGET=native`), never `npm run build`.
The native build drops /admin, /contribute, /api-docs, /install, /analytics
(as redirects, never 404s), and ships **no service worker** (disabled for
mode `native` in vite.config.ts — a SW inside the shell serves stale bundles).

## The release loop

Run in this exact order; the audit BEFORE archive is the whole trick.

1. `npm run typecheck && npm run lint` — clean before anything native.
2. `npm run ios:sync` — builds the native bundle and syncs to `ios/App/App/public`
   (use `ios:copy` when no plugin/config changed — it skips the native update).
3. Open `ios/App/App.xcodeproj` in Xcode (NOT a workspace — SPM resolves
   packages automatically on first open; give it a minute).
4. **Simulator smoke pass** on every changed screen — iPhone AND iPad.
   The iPad checklist below is mandatory; reviewers use iPads.
5. Bump `CURRENT_PROJECT_VERSION` in project.pbxproj.
6. Product → Archive (destination: Any iOS Device).
7. Distribute → App Store Connect → Upload.
8. TestFlight on a real device; only after a clean pass, submit for review.

## iPad dead-tap checklist (the Juice 2.1 rejection, itemized)

Juice 1.0.0 was rejected under 2.1 App Completeness for three dead taps on
iPad Air 11" — the exact same button archetypes exist here. Before EVERY
archive, on an **iPad simulator**, tap:

- [ ] "Near me" / "Use my city" on /trends (Community Alerts) — must
      request location and update the feed inline, no dead tap. With no
      reports in that state, the visible "showing everywhere" fallback
      renders, not an empty screen.
- [ ] **Logged out**: Header shows Settings → Settings opens → "Privacy
      Policy" opens /privacy. (Native has no footer; reviewers test logged
      out. This path did not exist before build 1.)
- [ ] WelcomeGate on a fresh install: checkbox enables both buttons;
      "Try it: M 30" lands on an amber identified verdict in one step; the
      safety countdown appears once, not on the next result.
- [ ] Share button on a guest result opens the iOS share sheet; the text
      contains no "safe".
- [ ] The report flow: Results → log a strip → "Report it" nudge → sheet
      opens, submits, and toasts.
- [ ] Emergency FAB → naloxone/help actions.
- [ ] Camera capture on /check (Info.plist camera string must appear).

## Database steps before archiving build 1

The web deploys migrations through Lovable Cloud; the native build talks to
the same database. Apply, in order, and verify:

1. `20260918100000_app_events.sql` — then `select jobname from cron.job`
   shows `rollup-app-events-daily`.
2. `20260918100100_share_visibility.sql` — then, as anon, `select * from
   matches where report_id = <an account holder's shared report>` returns
   rows and an unshared one returns none.
3. `20260918100200_official_advisories.sql` — then Admin → Advisories can
   publish, and anon can read `official_advisories_public`.

Seed 10–15 official advisories for the launch metro (health department,
medical examiner, DEA field division, poison control) BEFORE the store
screenshots are retaken, so the alerts screenshot shows real items.

## 1.1: area alert push (APNs)

Code is in the repo (plugin, AppDelegate forwarders, `App.entitlements`,
`src/lib/push.ts`, `notify-area-alerts` edge function, migration
`20260919100000_area_alert_push.sql`). What only you can do:

1. **APNs key.** Apple Developer → Certificates, IDs & Profiles → Keys → +,
   name it "Pill Checkr APNs", tick Apple Push Notifications service, download
   the `.p8` ONCE and keep it. Note the Key ID and your Team ID.
2. **Supabase secrets** (project ptisltjfqomavvlnghcm → Edge Functions → Secrets):
   `APNS_KEY_P8` (the whole PEM including BEGIN/END lines), `APNS_KEY_ID`,
   `APNS_TEAM_ID`, `APNS_TOPIC=app.pillcheckr.ios`, and `APNS_HOST`:
   `https://api.sandbox.push.apple.com` while testing builds installed from
   Xcode, `https://api.push.apple.com` for TestFlight and App Store builds.
   Deploy `notify-area-alerts`.
3. **Migration** applied; `select jobname from cron.job` lists
   `notify-area-alerts-15m`.
4. **Xcode.** Open the project; Signing & Capabilities on target App shows
   Push Notifications (from `App.entitlements`). Automatic signing regenerates
   the profile. If Xcode complains the capability is missing on the App ID,
   it is already enabled on the bundle ID (see CLAUDE.md); re-download
   profiles via Xcode → Settings → Accounts.
5. **Test on a real iPhone** (the Simulator cannot receive APNs). Alerts →
   toggle on → iOS prompts → a row appears in `alert_subscriptions` with a
   state and no coordinates. Insert a test report:
   `insert into counterfeit_reports (strip_result, state, imprint, drug_name, risk_level, report_type, evidence_tier, is_anonymous) values ('positive','XX','M 30','Oxycodone','high','pill','strip',true);`
   with your state. Within 15 minutes the push arrives; tapping opens Alerts.
   A second positive within 6 hours does not push. Toggle off deletes the row.
   Delete the test report (or set `hidden = true`) afterwards.
6. Never archive 1.1 until step 5 passes on a TestFlight build against the
   production host.

## Environment flags

| Var | Where | Purpose |
|---|---|---|
| `VITE_APP_STORE_LIVE=true` | Lovable env + `.env.native` | Shows the App Store badge on web and points QR posters at the store link. Flip only after approval. |
| `VITE_SITE_URL` | Lovable env + `.env.native` | Canonical origin for share links, canonicals, `/go`. Set when pillcheckr.app is connected. |
| `VITE_ASC_PROVIDER_TOKEN` | Lovable env | Optional `pt=` for App Store campaign attribution (ASC → Users and Access → Marketing Tools). |

`package.json` `version` feeds the analytics `app_version`; keep it equal to
`MARKETING_VERSION`.

## App Review notes (paste into every submission)

Harm-reduction tool. Never outputs "safe" or any safety guarantee; risk is
categorical (unidentified / identified-but-untested). Cites SAMHSA/CDC.
Guest mode: all core features work without an account. Account deletion is
in-app (Settings → Delete Account). Demo imprint to try: "M 30".
Provide the demo account credentials current at submission time.

## Compliance already wired (do not regress)

- `ITSAppUsesNonExemptEncryption = false` (HTTPS only) — Info.plist.
- Camera / photo library / location usage strings — Info.plist, honest.
- Google sign-in is **hidden on native** (Auth.tsx, `isNative()` gate):
  a third-party login on native requires Sign in with Apple (4.8). If SIWA
  ships later, un-hide Google in the same build, never before.
- Account deletion: Settings → DeleteAccount → `delete-account` edge fn.
- Icons/splash: generated from `resources/icon.svg` via
  `npx @capacitor/assets generate --ios --iconBackgroundColor '#0a0a0a' --splashBackgroundColor '#0a0a0a'`.
  Re-run after changing the mark; commit the regenerated Assets.xcassets.

## Troubleshooting

- **Blank white screen on launch** → the shipped bundle is the web build:
  re-run `npm run ios:sync` (it must say `--mode native`).
- **Stale UI after changes** → `cap copy` ran against an old `dist/`; run
  `ios:copy`, then in Xcode Product → Clean Build Folder.
- **`cap sync` tries pod install** → something re-introduced CocoaPods;
  this project is SPM-only, delete the Podfile and re-sync.
- **Signing errors on archive** → team + automatic signing on target App;
  bundle ID must read `app.pillcheckr.ios` exactly.
- **Upload rejected: duplicate build number** → bump
  `CURRENT_PROJECT_VERSION`, re-archive.

## Build log

| Build | Date | Version | Contents |
|---|---|---|---|
| — | — | 1.0 (1) | Initial Capacitor shell: SPM, 4 plugins (app, haptics, splash-screen, status-bar), compliance plist, native auth gate, icons/splash. Not yet archived. |
| — | 2026-09-19 | 1.1 (pending) | Area alert push: `@capacitor/push-notifications` 7.0.7 (SPM manifest regenerated by the CLI), APNs forwarders in AppDelegate, `App.entitlements`, `alert_subscriptions` + RPCs, `notify-area-alerts` every 15 min, opt-in toggle on Alerts and Settings. Needs the APNs key and secrets before it does anything. |
| — | 2026-09-18 | 1.0 (1) | Growth pass before first archive: guest-reachable Settings/Privacy on native, one-screen WelcomeGate with "Try M 30", first-party analytics, owner/viewer results + native share sheet, official advisories + visible everywhere fallback, Spanish for the alerts loop, Smart App Banner meta. Still not archived. |
