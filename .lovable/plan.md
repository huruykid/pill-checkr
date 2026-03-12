

# Add Optional Back-Side Photo Upload

Both the Check Pill (`/check`) and Contribute (`/contribute`) pages currently support a single image upload. This plan adds an optional second image slot for the back side of the pill.

## Changes

### 1. CheckPill.tsx (`/check`)
- Add `backImageFile` / `backImagePreview` state alongside existing front image state
- Add a second upload zone labeled "Back of pill (optional)" below the existing one
- Upload both images to `pill-images` bucket (back image as `{uuid}_back.{ext}`)
- Pass `backImage` (base64) and `backPhotoUrl` (storage path) to the `analyze-pill` edge function
- Reuse the same `handleFileSelect` pattern with a `side` parameter

### 2. Contribute.tsx (`/contribute`)
- Add `backPhotoFile` / `backPhotoPreview` state
- Add a second file input labeled "Back of pill (optional)"
- Upload back photo to `pill-images` as `community/{uid}/{ts}_back.{ext}`
- Store the back photo path in the submission

### 3. Database: `community_submissions` table
- Add `back_photo_url` column (text, nullable) via migration

### 4. Database: `reports` table
- Add `back_photo_url` column (text, nullable) via migration

### 5. Edge function `analyze-pill/index.ts`
- Accept optional `backImage` and `backPhotoUrl` fields in the Zod schema
- If `backImage` is provided, include it in the AI prompt for more comprehensive analysis
- Store `back_photo_url` in the report record

### 6. Admin CommunitySubmissionsTab
- Show back photo preview button when `back_photo_url` exists

