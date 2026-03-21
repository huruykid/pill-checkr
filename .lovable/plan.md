

## Fix: Mobile Button Text Overflow

The "Open Full Map" buttons in `src/pages/Results.tsx` (line 686) and `src/pages/Education.tsx` (line 221) use `w-full` but the long text overflows because the button base styles enforce `whitespace-nowrap` and a fixed height.

### Changes

**`src/pages/Results.tsx` (line 686)** and **`src/pages/Education.tsx` (line 221)**:
- Add `whitespace-normal h-auto py-3 text-center` to both button classNames so text wraps, height adjusts, and text is centered with padding.

