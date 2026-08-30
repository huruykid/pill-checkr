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
      request location and update the feed inline, no dead tap.
- [ ] "Privacy Policy" from Settings (native has no footer — the Settings
      link is the only path; it must open /privacy).
- [ ] The report flow: Results → log a strip → "Report it" nudge → sheet
      opens, submits, and toasts.
- [ ] Emergency FAB → naloxone/help actions.
- [ ] Camera capture on /check (Info.plist camera string must appear).

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
