

## Plan: Real-Time Analysis Progress Steps

### What
Replace the simple spinner loading state with a visible step-by-step progress indicator that walks users through each analysis phase: uploading, extracting features, searching the database, comparing visually, and generating the report.

### How

**File: `src/pages/CheckPill.tsx`**

1. Add an `analysisStep` state (0-4) alongside `isAnalyzing`
2. Define the steps array:
   - Step 0: "Uploading image..." (set before `uploadImage`)
   - Step 1: "Extracting features..." (set before `supabase.functions.invoke`)
   - Step 2: "Searching database..." (set ~2s after invoke, via setTimeout)
   - Step 3: "Comparing visually..." (set ~4s after invoke)
   - Step 4: "Generating report..." (set ~6s after invoke)
3. When `isAnalyzing` is true, render a progress overlay/card between the form and the button area showing:
   - All 5 steps listed vertically
   - Completed steps get a green checkmark
   - Current step gets a spinning loader + bold text
   - Future steps are dimmed
   - A progress bar at the top showing percentage (step/5 * 100)
4. Reset `analysisStep` to 0 in the `finally` block

Since the edge function is a single call, the intermediate steps are time-based estimates to give the user a sense of progress. The first step (upload) is real; the remaining steps advance on timers that approximate the backend processing phases.

### UI Design
- Rounded card with subtle border, appears below the form when analyzing
- Each step: icon (check/spinner/circle) + label
- Smooth transitions between steps using CSS
- Disable the Analyze button and form inputs while analyzing

### Single file change
Only `src/pages/CheckPill.tsx` is modified.

