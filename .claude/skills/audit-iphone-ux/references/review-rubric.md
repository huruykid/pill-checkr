# Stamped iPhone UX Review Rubric

## §0 App non-negotiables (violations are P0)
- NO "safe" / green / "looks legit" state anywhere. No numeric confidence or
  match percentages in user-facing UI. Risk is categorical: unidentified
  (red) or identified-but-untested (amber).
- Negative test results (strips or lab) never bless a pill: every surface
  showing negatives carries the non-transferability line.
- Test strip logging works logged-out. Core value (identify, alerts, help
  map, history) works logged-out.
- External data always shows provenance: source name on the card, full
  attribution one tap away.
- Emergency/help access is never more than one tap from a risk surface.

## §1 Layout & safe areas
- Top content clears the notch/Dynamic Island (Header owns
  env(safe-area-inset-top)); bottom actions clear the home indicator and the
  tab bar (`--tab-bar-space` + env(safe-area-inset-bottom)).
- No horizontal scroll on any screen at 320pt width. Wide content scrolls
  inside its own container.
- Floating buttons (report CTA, EmergencyFAB) never cover the last list item.

## §2 Touch targets & gestures
- Every tappable element ≥44×44pt (repo convention: min-h-[44px] or larger;
  40px chips acceptable only in dense chip rows with spacing).
- No dead taps: anything that looks tappable navigates or reacts. Cards that
  are 90% tappable must be 100% tappable.
- Destructive actions confirm; nothing important lives only in a hover state.

## §3 Typography & Dynamic Type
- Body text ≥14px; captions ≥12px and never load-bearing.
- Truncation: long imprints, drug names, county names truncate with
  ellipsis, never overflow. Test "Dextromethamphetamine Hydrobromide".
- Bebas Neue is display-only; never for body copy or buttons.

## §4 Color, contrast, dark mode
- Text meets 4.5:1 (3:1 for ≥18px bold) in BOTH themes; check danger-on-dark
  and warning-light chips specifically.
- Semantic tokens only (danger/warning/muted); no raw hex in components.
- Never color-only meaning: pair icon or label with every colored state.

## §5 Navigation & structure
- Every screen has a way back; no dead ends. External links open in-app
  browser or new tab, never hijack the WebView.
- Native build: dropped routes redirect, never 404.
- State survives tab switches (scroll position, entered text).

## §6 Feedback & states
- Every async surface has loading (skeletons), empty (with a next action),
  and error (with retry) states. Empty states never look like errors.
- Actions confirm within 100ms (visual) even if completion takes longer;
  haptics on success where the repo already uses them.

## §7 Forms & keyboard
- Inputs use the right keyboard type; imprint field autocapitalizes
  characters, disables autocorrect.
- The keyboard never covers the focused input or the submit button.
- Errors are inline, specific, and non-blaming.

## §8 Accessibility
- Interactive elements have accessible names (aria-label on icon-only
  buttons); images that inform have alt text; decorative ones are hidden.
- Focus order follows visual order; sheets trap focus and restore it.
- Motion respects prefers-reduced-motion; nothing conveys state by motion
  alone.

## §9 Harm-reduction copy standards
- Plain language at ~8th-grade level on user-facing safety surfaces.
- Never moralizing, never alarmist beyond evidence, never falsely
  reassuring. "Test this one" is the universal call to action.
- Every data claim answerable by "says who?" within one tap (Sources).
