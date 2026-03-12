

# Community Pill Database Contributions

## Concept
Allow authenticated users to submit pill entries (photo, imprint, shape, color, drug name) to a moderation queue. Admins review and approve submissions, which then get promoted into the main `pill_reference` table. This creates a crowdsourced safety database — a compelling value proposition for harm reduction partnerships.

## Architecture

```text
User submits pill info ──► community_submissions (pending)
                                    │
                          Admin reviews in dashboard
                                    │
                    ┌───────────────┼───────────────┐
                 Approve         Reject          Request Edit
                    │               │
          Insert into           Mark rejected
          pill_reference        with reason
```

## Database Changes

**New table: `community_submissions`**
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, not null)
- `drug_name` (text, not null)
- `imprint` (text, not null)
- `shape` (pill_shape enum)
- `color` (pill_color enum)
- `photo_url` (text, nullable) — stored in pill-images bucket
- `notes` (text, nullable)
- `status` (text: 'pending' | 'approved' | 'rejected', default 'pending')
- `reviewer_notes` (text, nullable) — admin feedback
- `reviewed_by` (uuid, nullable)
- `reviewed_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

**RLS Policies:**
- Users can INSERT their own submissions (`user_id = auth.uid()`)
- Users can SELECT their own submissions (`user_id = auth.uid()`)
- Admins can SELECT all submissions (`has_role(auth.uid(), 'admin')`)
- Admins can UPDATE all submissions (for approve/reject)

## Frontend Changes

### 1. Community Submit Page (`/contribute`)
- Authenticated-only page with a form: drug name, imprint, shape, color, optional photo upload, notes
- Shows the user's past submissions with status badges (Pending, Approved, Rejected + reason)
- Accessible from the main nav and homepage as a CTA ("Help Build the Database")

### 2. Admin Moderation Tab
- New tab in the Admin dashboard: "Community Submissions"
- Table of pending submissions with photo preview, details, and Approve/Reject buttons
- Approve action: creates a `pill_reference` row with `source: 'community'` and marks submission as approved
- Reject action: requires a reason, marks submission as rejected

### 3. Homepage/Nav Updates
- Add a "Contribute" link in the header navigation
- Add a section on the homepage highlighting community contributions (e.g., submission count)

## Technical Notes
- Photo uploads reuse the existing `pill-images` storage bucket
- Approval logic runs client-side with admin RLS — insert into `pill_reference` + update submission status
- Input validation via Zod: drug name length limits, imprint sanitization
- Rate limiting consideration: max 10 submissions per user per day (enforced via RLS or a simple client-side check)

