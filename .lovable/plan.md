

## Plan: Fix forwardRef Warnings on Footer and EmergencyFAB

### Problem
Two React warnings appear in the console:
1. `Footer` cannot be given refs — rendered in `Layout`
2. `EmergencyFAB` cannot be given refs — rendered in `Layout`

These are non-breaking but produce console noise and indicate a mismatch in how React resolves component refs.

### Fix
Wrap both components with `React.forwardRef` so they can accept refs without warnings:

**`src/components/layout/Footer.tsx`** — Wrap the existing function component export with `forwardRef<HTMLElement>`, forwarding the ref to the `<footer>` element.

**`src/components/shared/EmergencyFAB.tsx`** — Wrap with `forwardRef<HTMLDivElement>`, forwarding the ref to the outer `<div>`.

No changes needed in `Layout.tsx` — these fixes make the components ref-compatible regardless of how they're rendered.

### Scope
- 2 files, minimal changes (add forwardRef wrapper + ref prop on root element)
- No new dependencies

