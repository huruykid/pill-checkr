

# Harm Reduction Features Implementation Plan

## Features to Build

### 1. Counterfeit Warning Banner on Results Page
When any match contains "HIGH COUNTERFEIT RISK" in its `explanation` field (already populated from `pill_reference.notes`), show a prominent red warning card between the matches section and the "What To Do Next" section.

**Content:** "This pill matches a medication commonly targeted by counterfeiters. Visual appearance alone CANNOT confirm authenticity. Use fentanyl test strips, have naloxone ready, never use alone."

**Location:** `src/pages/Results.tsx` — new `<CounterfeitWarning>` component rendered conditionally when any match's `explanation` includes "HIGH COUNTERFEIT RISK".

### 2. "Never Use Alone" Hotline Button + Fentanyl Test Strip Info
Add a sticky/prominent action card to the Results page with:
- **Never Use Alone hotline**: `1-800-484-3731` — clickable `tel:` link with phone icon
- **988 Suicide & Crisis Lifeline**: `988`
- Brief fentanyl test strip guidance text

Also add this to the "What To Do Next" section as actionable items.

**Location:** `src/pages/Results.tsx` — new `<HarmReductionResources>` component after the "What To Do Next" card.

### 3. Naloxone/Narcan Locator
Add a new section/card on Results page and a dedicated route linking to external naloxone locator services:
- Link to **NEXT Distro** (nextdistro.org/naloxone) for free mail-order naloxone
- Link to **naloxonelocator.org** for local pickup
- Brief explanation of what naloxone is and why to have it

**Location:** Part of the `<HarmReductionResources>` component on Results. Also add a "Get Naloxone" nav link or button on the Education page.

### 4. Safety Kit Checklist on Education Page
Add an interactive checklist component to the Education page (above the articles list) with items:
- Get Narcan/naloxone (link to locator)
- Get fentanyl test strips (link to dancesafe.org)
- Save Never Use Alone number (1-800-484-3731)
- Learn rescue breathing (link to education article)
- Tell someone you trust

Checklist state saved to `localStorage` so users can track progress across sessions.

**Location:** New `src/components/shared/SafetyChecklist.tsx` component, rendered at top of `src/pages/Education.tsx`.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/shared/CounterfeitWarning.tsx` | **Create** — red banner when match has counterfeit risk |
| `src/components/shared/HarmReductionResources.tsx` | **Create** — hotline buttons, test strip info, naloxone locator links |
| `src/components/shared/SafetyChecklist.tsx` | **Create** — interactive localStorage-backed checklist |
| `src/pages/Results.tsx` | **Modify** — add CounterfeitWarning + HarmReductionResources |
| `src/pages/Education.tsx` | **Modify** — add SafetyChecklist above article grid |

No database changes needed — all data is already available through the existing `matches.explanation` field.

