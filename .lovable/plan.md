

## Fix: "provider 'google' is not supported" Error

### Root Cause
The Google OAuth provider was not properly enabled in Lovable Cloud's authentication configuration. The code is correct — the `lovable.auth.signInWithOAuth("google")` call and the `@lovable.dev/cloud-auth-js` integration are properly set up. The missing piece is the server-side provider configuration.

### Fix
1. **Re-run the Configure Social Auth tool** to enable Google as a provider in Lovable Cloud. This is the only step needed — no code changes required.

This will register Google OAuth on the backend so the `signInWithOAuth("google")` call succeeds instead of returning "provider not supported."

