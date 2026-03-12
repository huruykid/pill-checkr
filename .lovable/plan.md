

# Fix: "Failed to analyze pill" error

## Root Cause
In `supabase/functions/analyze-pill/index.ts` line 19, the Zod schema validates `photoUrl` as:
```typescript
photoUrl: z.string().url().optional().nullable(),
```

But `CheckPill.tsx` line 134 returns just a storage filename (e.g., `abc123.jpg`) from `uploadImage()`. A bare filename is not a valid URL, so Zod rejects the entire request with "Invalid url".

## Fix
Remove the `.url()` validator from the `photoUrl` field in the edge function's Zod schema, since `photoUrl` is a storage path, not a URL:

```typescript
photoUrl: z.string().optional().nullable(),
```

This is a one-line change in `supabase/functions/analyze-pill/index.ts` line 19.

