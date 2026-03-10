

## Plan: Add Google Sign-In

Lovable Cloud provides managed Google OAuth out of the box — no API keys needed.

### Steps

1. **Run the Configure Social Login tool** to generate the `src/integrations/lovable` module and install `@lovable.dev/cloud-auth-js`.

2. **Update `src/pages/Auth.tsx`** to add a "Sign in with Google" button:
   - Import `lovable` from `@/integrations/lovable/index`
   - Add a Google sign-in button (with Google icon) above or below the email/password form, separated by an "or" divider
   - On click, call `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
   - Style consistently with the dark/amber design language

