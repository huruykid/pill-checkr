

## Fix: Scroll to Top on Navigation

The app uses React Router's client-side navigation, which doesn't automatically scroll to the top when changing routes. This is a known behavior — the browser preserves the previous scroll position.

### Solution
1. Create `src/components/ScrollToTop.tsx` — a small component that calls `window.scrollTo(0, 0)` on every route change
2. Add it inside `BrowserRouter` in `src/App.tsx`

Two small changes, no other files affected.

