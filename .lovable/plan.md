

## Plan: Forced-Friction Safety Modal

### New File: `src/components/results/SafetyThresholdModal.tsx`

A modal component with:
- Darkened backdrop (`bg-black/80 backdrop-blur-sm`)
- Warning-styled card with amber/yellow header and `AlertTriangle` icon
- Three bullet points (translated): not a lab test, lethal fakes look identical, always have Narcan
- "I Understand & View Results" button **disabled for 3 seconds** with countdown text ("Wait (3)…", "Wait (2)…", etc.)
- After 3s, button activates with final text
- Calls `onDismiss()` when clicked
- Props: `{ open: boolean; onDismiss: () => void }`

### Update: `src/pages/Results.tsx`

- Add state: `const [safetyModalOpen, setSafetyModalOpen] = useState(false)`
- On data load (after `fetchResults` succeeds), check `localStorage` for `ff_safety_modal_${reportId}`. If not set, show modal.
- When dismissed: set localStorage flag, hide modal.
- While modal is open, wrap the main results content with a `blur-xl pointer-events-none` class so content is obscured.
- Render `<SafetyThresholdModal open={safetyModalOpen} onDismiss={...} />` inside the Layout.

### Update: `src/hooks/useI18n.tsx`

Add keys for all 4 locales:
- `safety.modal.title` — "⚠️ Before You View These Results"
- `safety.modal.bullet1` — "Visual analysis is NOT a lab test."
- `safety.modal.bullet2` — "Lethal counterfeits can look identical to real pills."
- `safety.modal.bullet3` — "Always have Narcan ready and never use alone."
- `safety.modal.button_wait` — "Wait ({seconds})…"
- `safety.modal.button_ready` — "I Understand — View Results"

### Files Changed

| File | Action |
|---|---|
| `src/components/results/SafetyThresholdModal.tsx` | New component |
| `src/pages/Results.tsx` | Add modal state, blur gate, render modal |
| `src/hooks/useI18n.tsx` | Add 6 translation keys × 4 locales |

### Scope
- 1 new file (~60 lines), 2 files modified
- No database changes, no new dependencies

