

## Plan: Redesign Desktop Navigation Bar

### Summary
Restructure the desktop header navigation to improve visual hierarchy by making "Check a Pill" a prominent CTA button, grouping secondary links into a "More" dropdown, and visually separating utility controls (language, auth) on the far right.

### Changes

**1. `src/components/layout/Header.tsx`** — Major restructure of the desktop nav section:

- **CTA Button**: Render the "Check a Pill" link as a solid `bg-primary text-white` button (the red from the hero) instead of a ghost button, making it the most prominent nav element.
- **Main Nav Links**: Render History, Learn, Find Help as standard ghost nav buttons (unchanged style).
- **"More" Dropdown**: Use Radix `Popover` (already available) or a simple state-toggled dropdown to group Contribute, API, and Trends under a "More" button with a `ChevronDown` icon. Dropdown panel styled with `bg-foreground` to match the header.
- **Utility Section**: After the main nav, add a vertical divider (`<Separator orientation="vertical" />` or a simple `border-l` div) followed by the language toggle and Sign In / Settings+Sign Out buttons pushed to the far right.
- **Layout**: Use flexbox with `flex-1` spacer or `ml-auto` to achieve: `[Logo] — [CTA] [History] [Learn] [Find Help] [More ▾] — divider — [EN] [Sign In]`

**2. `src/hooks/useI18n.tsx`** — Add translation key `"nav.more": "More"` in all 4 languages (en, es, fr, pt).

### Mobile nav remains unchanged — all links still appear in the full mobile menu.

### Technical Notes
- The dropdown will use local `useState` for open/close, with a click-outside handler or the existing Popover component.
- Fixed-width considerations: nav items use `whitespace-nowrap` (already in button variants) so language switching won't cause layout shifts.
- No new dependencies needed — uses existing Separator, Button, Popover components.

