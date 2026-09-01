---
name: audit-iphone-ux
description: iPhone UX audit for Stamped (React + Vite + Capacitor harm-reduction app). Use before ANY TestFlight/App Store build, after changes to screens, navigation, forms, or states, and whenever asked to review UX, accessibility, or "does this look right on the phone". Produces a prioritized P0–P3 findings report; never auto-ships fixes without listing them.
---

# iPhone UX Audit — Stamped

Audit the changed surfaces (or the whole app before a release) against
`references/review-rubric.md`, grounded in the principles in
`references/source-framework.md`. This app has non-negotiables that override
generic advice — check them first.

## Procedure

1. Identify the audit scope: files changed since the last build
   (`git diff --name-only <last-build-tag-or-sha>`) plus every screen they
   render on. Before a release, walk all four tabs: Identify (/check),
   Alerts (/trends), Help (/nearby-help), History.
2. Check the app's non-negotiables (see rubric §0) before anything else.
   A violation there is automatically P0.
3. Walk the rubric section by section against the code (and the Simulator
   when available). Cite file:line for every finding.
4. Report findings as P0 (blocks release) / P1 (fix before App Store
   submission) / P2 (fix soon) / P3 (polish). For each: what, where,
   why it matters, and the smallest fix.
5. Fix only what the operator approves, or what is listed as auto-fixable
   and trivial (copy, aria-labels, token swaps). Re-run typecheck after.

## Scope notes for this repo

- Two targets, one repo: web (all routes) and native (`isNative()` drops
  /admin, /contribute, /api-docs, /install). Audit native paths for release.
- Header owns top safe-area inset; BottomTabBar owns bottom inset;
  `--tab-bar-space` offsets floating elements. Anything fixed-position must
  respect both.
- The archive ships whatever is in `ios/App/App/public` — confirm
  `npm run ios:sync` ran after the last code change before signing off.
