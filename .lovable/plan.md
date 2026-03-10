

## Fix: SAMHSA Treatment Locator Returns 0 Results

### Root Cause
The `find-treatment` edge function uses incorrect SAMHSA API URLs (`/locator/listing` and `/locator/ExportResults`), which return HTML pages instead of JSON. Both calls fail silently, resulting in 0 facilities every time.

### Fix
Update `supabase/functions/find-treatment/index.ts` to use the correct SAMHSA API endpoint documented in their official developer guide:

**Correct endpoint:** `https://findtreatment.gov/locator/exportsAsJson/v2`

**Key changes:**
1. **URL format**: Use `exportsAsJson/v2` with proper query params (`sAddr`, `limitType=2` for distance-based search, `limitValue=80467` for ~50 miles, `pageSize`, `page`, `sort`)
2. **Address format**: Wrap lat/lng in quotes per the API spec: `sAddr="36.7758,-119.8786"`
3. **Response field mapping**: Update field names to match the actual SAMHSA JSON response schema (likely `name1`, `street1`, `city`, `state`, `zip`, `phone`, `miles`, etc.)
4. **Fix body-consumed error**: The fallback code tries to read `resp.text()` after `resp.json()` already consumed the body — remove that double-read
5. **Remove broken fallback URL**: The `/locator/ExportResults` endpoint is also wrong; replace with a single correct call
6. **For ZIP code searches**: Pass the ZIP directly as `sAddr` value

### Also Fix: Map Marker Placement
Currently markers use random offsets from the user's location (lines 117-118 in `NearbyHelpMap.tsx`). If the SAMHSA response includes actual lat/lng coordinates for facilities, use those instead for accurate map pins.

