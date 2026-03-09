

## Fix Import-Pill-Data Edge Function

### Problem
The `import-pill-data` edge function has issues that will cause it to fail:

1. **`getClaims()` is not a valid Supabase JS method** (line 634). This will throw a runtime error on every call.
2. **Missing `verify_jwt = false`** in `config.toml` — the function does its own auth but Supabase will reject requests before the code runs.

### Fix Plan

**File: `supabase/functions/import-pill-data/index.ts`**
- Replace `userClient.auth.getClaims(token)` with `userClient.auth.getUser()` 
- Extract `userId` from `user.id` instead of `claims.sub`

**File: `supabase/config.toml`**
- Add:
```toml
[functions.import-pill-data]
verify_jwt = false
```

### Changes Summary
- 2 files modified
- No database changes needed
- After fix, user can test the import flow by logging in as admin and using the API Import tab

