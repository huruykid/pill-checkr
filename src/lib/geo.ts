/**
 * Location capture for reports.
 *
 * Two levels, always the reporter's choice, default city:
 *  - "city": we geocode to city/state and store no point at all.
 *  - "precise": we ALSO store lat/lng in the restricted report_locations table.
 *
 * Public rendering is always the H3 hex cell, never the point.
 */
import { latLngToCell } from "h3-js";
import { saveLocation, type CityState } from "@/lib/location";

export type Precision = "city" | "precise";
export type PlaceType = "public" | "residence" | "unknown";

/** Resolution 6 ≈ 36 km² — coarse enough that a cell is an area, not an address. */
export const HEX_RES = 6;

export interface CapturedLocation {
  city: string;
  state: string;
  hexCell: string;
  /** Only present when the reporter opted into precise. */
  point?: { lat: number; lng: number };
  placeType: PlaceType;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("denied")), {
      timeout: 10000,
      enableHighAccuracy: true,
      maximumAge: 60000,
    });
  });
}

/**
 * Reverse geocode and classify. `place_type` decides public rendering for
 * precise points: a residence renders at hex even when captured precisely,
 * so nobody's home lands on a public map.
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ loc: CityState; placeType: PlaceType }> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
    { headers: { "User-Agent": "PillCheckr-HarmReduction/1.0" } },
  );
  if (!r.ok) throw new Error("geocode");
  const data = await r.json();
  const a = data.address || {};
  const loc: CityState = {
    city: a.city || a.town || a.village || a.county || "",
    state: a.state || "",
  };

  const cls = `${data.class || ""}:${data.type || ""}`;
  const placeType: PlaceType =
    /building:(house|residential|apartments|detached|semidetached_house|terrace)|place:(house|apartment)/.test(cls)
      ? "residence"
      : data.class === "highway" || data.class === "amenity" || data.class === "shop" || data.class === "leisure"
        ? "public"
        : "unknown";

  return { loc, placeType };
}

export async function captureLocation(precision: Precision): Promise<CapturedLocation> {
  const pos = await getPosition();
  const { latitude: lat, longitude: lng } = pos.coords;

  const { loc, placeType } = await reverseGeocode(lat, lng);
  saveLocation(loc);

  const hexCell = latLngToCell(lat, lng, HEX_RES);

  return {
    ...loc,
    hexCell,
    placeType,
    point: precision === "precise" ? { lat, lng } : undefined,
  };
}
