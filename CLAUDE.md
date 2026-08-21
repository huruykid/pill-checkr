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
