

## Bugs Found During Testing

### Bug 1: No markers on initial ZIP search
When searching by ZIP code, `center` is null (line 166) because `userLocation` is only set via geolocation, not ZIP search. The `if (center)` guard prevents `addMarkersToMap` from running. Markers only appear after switching filters (the `useEffect` on line 87 calls `addMarkersToMap` without this guard).

**Fix**: Remove the `if (center)` guard on line 166 — always call `addMarkersToMap`. The function already handles a missing center gracefully (it just doesn't add a "Your location" marker, which is correct for ZIP searches).

### Bug 2: SAMHSA API returns wrong location for ZIP codes
ZIP 10001 (Manhattan, NYC) returned facilities in Gaithersburg, MD. This is a SAMHSA API behavior issue — their geocoder may not resolve all ZIPs correctly.

**Fix**: Add a geocoding step for ZIP searches using the Nominatim (OpenStreetMap) API to resolve the ZIP to coordinates, then pass lat/lng to SAMHSA instead of the raw ZIP string. This also lets us set `center` properly so the map zooms to the correct area.

### Bug 3: Map doesn't center on searched area for ZIP
Even when markers appear (via filter toggle), the map zooms to facility coordinates which may be far from the searched ZIP. Without geocoding the ZIP, there's no way to center the map on the intended search area.

**Fix**: Same as Bug 2 — geocode the ZIP in the edge function, use coordinates for the SAMHSA query, and return the resolved coordinates to the frontend so the map can center properly.

### Implementation

**Edge function `find-treatment/index.ts`**:
- When `zipcode` is provided, geocode it via Nominatim (`https://nominatim.openstreetmap.org/search?postalcode={zip}&country=US&format=json`) to get lat/lng
- Use those coordinates for the SAMHSA API query instead of the raw ZIP
- Return `search_coordinates: { lat, lng }` in the response

**Frontend `NearbyHelpMap.tsx`**:
- Remove the `if (center)` guard on line 166 — always call `addMarkersToMap`
- After search, use `data.search_coordinates` as the center for the map if no `userLocation` is set
- This ensures the map zooms to the correct area and markers always appear

### Filter status (verified working)
- **All**: 10 results
- **Treatment Centers**: 10 results
- **Naloxone Access**: 6 results
- **Harm Reduction**: 10 results

All filters correctly match SAMHSA service labels. The keyword expansion is working.

