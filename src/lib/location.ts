import { toast } from "sonner";

export interface CityState { city: string; state: string }

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
          const loc = { city: a.city || a.town || a.village || a.county || "", state: a.state || "" };
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
