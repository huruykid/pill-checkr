# Source framework

The rubric derives from four sources, in priority order when they conflict:

1. **Stamped's own product rules** (CLAUDE.md non-negotiables). These beat
   everything: a HIG-perfect screen that implies "safe" fails the audit.
2. **Apple Human Interface Guidelines** — the platform contract:
   - Clarity, deference, depth as the base aesthetic stance.
   - Layout: safe areas, full-width readability margins, 8pt grid.
   - Touch: 44pt minimum targets; thumb-reachable primary actions.
   - Typography: Dynamic Type support; SF-adjacent hierarchy.
   - Color: semantic color, dark mode parity, 4.5:1 contrast (WCAG AA).
   - Feedback: immediate acknowledgment, progressive disclosure of delay.
   - Navigation: one clear path back; modality only for focused tasks.
3. **WCAG 2.1 AA** for anything HIG leaves quantitatively vague (contrast
   ratios, target spacing, motion preferences).
4. **Harm-reduction communication practice** (SAMHSA/CDC materials style):
   plain language, action-first instructions, no judgment, no false
   certainty; the reader may be scared, impaired, or in a hurry — short
   sentences, one idea each, next step always visible.

When auditing, cite the section (e.g. "HIG-Touch", "WCAG 1.4.3", "CLAUDE.md
non-negotiable") so findings are checkable against the source.
