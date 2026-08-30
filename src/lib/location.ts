import { toast } from "sonner";

export interface CityState { city: string; state: string }

// Nominatim returns full state names ("California") while people type
// abbreviations ("CA"). The feed matches on state, so everything is
// normalized to the USPS code at write time — both geocoded and hand-typed.
const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC", "puerto rico": "PR", guam: "GU",
};
const VALID_CODES = new Set(Object.values(STATE_CODES));

/** "California" → "CA", "ca" → "CA"; unknown input passes through trimmed. */
export function normalizeState(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && VALID_CODES.has(upper)) return upper;
  return STATE_CODES[trimmed.toLowerCase()] || trimmed;
}

const KEY = "pc_alert_location";

export function getSavedLocation(): CityState | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function saveLocation(loc: CityState | null) {
  if (loc) localStorage.setItem(KEY, JSON.stringify(loc)); else localStorage.removeItem(KEY);
}

/** Coarse fix → city/state via Nominatim. Never stores coordinates. */
export function detectCityState(): Promise<CityState> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=10`,
            { headers: { "User-Agent": "PillCheckr-HarmReduction/1.0" } },
          );
          if (!r.ok) throw new Error("geocode");
          const a = (await r.json()).address || {};
          const loc = {
            city: a.city || a.town || a.village || a.county || "",
            state: normalizeState(a.state || ""),
          };
          saveLocation(loc);
          resolve(loc);
        } catch (e) { reject(e); }
      },
      () => reject(new Error("denied")),
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 600000 },
    );
  });
}

export async function detectWithToast(): Promise<CityState | null> {
  try {
    const loc = await detectCityState();
    toast.success(`Near ${loc.city || loc.state} (city-level only)`);
    return loc;
  } catch (e) {
    toast.error((e as Error).message === "denied" ? "Location access denied" : "Could not determine location");
    return null;
  }
}
