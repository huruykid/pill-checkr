import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { flagTrue, type ExternalLabReport, type OverdoseCounty } from "@/lib/externalData";

// Map of verified lab results at county centroids, over a national CDC heat
// layer of provisional overdose deaths. Same Leaflet + OSM stack as the Help
// map. Pins are danger-forward: red = fentanyl/nitazene detected, amber =
// xylazine, gray = neither. The heat layer makes the map meaningful in every
// county, not only the states with a drug-checking program. Locations are
// approximate by design — county centroids only, and every popup says so.
const DOT = {
  danger: "#C91D1D",
  warning: "#F9C31F",
  neutral: "#6b7280",
  heat: "#D9480F",
};

function markerColor(r: ExternalLabReport): string {
  if (flagTrue(r.lab_flags, "lab_fentanyl") || flagTrue(r.lab_flags, "lab_fentanyl_any") ||
      flagTrue(r.lab_flags, "lab_nitazene_any") || flagTrue(r.lab_flags, "lab_nitazenes_any")) return DOT.danger;
  if (flagTrue(r.lab_flags, "lab_xylazine") || flagTrue(r.lab_flags, "lab_xylazine_any")) return DOT.warning;
  return DOT.neutral;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function periodLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function LabResultsMap({ reports, sourceNames, heat }: {
  reports: ExternalLabReport[];
  sourceNames: Record<string, string>;
  heat?: OverdoseCounty[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const [showHeat, setShowHeat] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { preferCanvas: true }).setView([39.8283, -98.5795], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    heatLayerRef.current = L.layerGroup().addTo(map); // added first = drawn under pins
    pinLayerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      pinLayerRef.current = null;
      heatLayerRef.current = null;
    };
  }, []);

  // Heat layer: one translucent circle per county, radius ~ sqrt(deaths).
  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showHeat || !heat) return;
    for (const c of heat) {
      if (typeof c.lat !== "number" || typeof c.lon !== "number") continue;
      if (typeof c.deaths !== "number" || c.deaths <= 0) continue;
      const radius = Math.min(34, 3 + Math.sqrt(c.deaths) * 0.9);
      const where = [c.county, c.state].filter(Boolean).join(", ");
      const period = periodLabel(c.period_end);
      let trend = "";
      if (typeof c.deaths_prior === "number" && c.deaths_prior > 0) {
        const pct = Math.round(((c.deaths - c.deaths_prior) / c.deaths_prior) * 100);
        trend = pct === 0 ? " · flat vs prior year" : ` · ${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs prior year`;
      }
      L.circleMarker([c.lat, c.lon], {
        radius,
        stroke: false,
        fillColor: DOT.heat,
        fillOpacity: 0.22,
        interactive: true,
      })
        .bindPopup(
          `<strong>${esc(where)}</strong><br/>` +
          `${c.deaths.toLocaleString()} overdose deaths in the 12 months ending ${esc(period)}${esc(trend)}<br/>` +
          `<span style="opacity:.7">CDC/NCHS provisional · county level · usually an undercount</span>`,
        )
        .addTo(layer);
    }
  }, [heat, showHeat]);

  // Lab-result pins on top.
  useEffect(() => {
    const layer = pinLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const pts: [number, number][] = [];
    for (const r of reports) {
      if (typeof r.lat !== "number" || typeof r.lon !== "number") continue;
      pts.push([r.lat, r.lon]);
      const soldAs = typeof r.substance_expected === "string" && r.substance_expected ? r.substance_expected : null;
      const detected = Array.isArray(r.substances_detected)
        ? r.substances_detected.filter((s): s is string => typeof s === "string" && !!s)
        : [];
      const where = [r.county, r.state].filter(Boolean).join(", ");
      const source = sourceNames[r.source_id] || "Verified lab";
      L.circleMarker([r.lat, r.lon], {
        radius: 7,
        color: markerColor(r),
        weight: 2,
        fillColor: markerColor(r),
        fillOpacity: 0.7,
      })
        .bindPopup(
          `<strong>${esc(soldAs ? `Sold as ${soldAs}` : detected[0] || "Sample")}</strong><br/>` +
          (detected.length
            ? `Lab found: ${esc(detected.slice(0, 5).join(", "))}${detected.length > 5 ? ` +${detected.length - 5} more` : ""}<br/>`
            : "") +
          `${esc(where)} &middot; approximate (county level)<br/>` +
          `<span style="opacity:.7">${esc(source)}</span>`,
        )
        .addTo(layer);
    }
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 7 });
  }, [reports, sourceNames]);

  const heatCount = heat?.filter((c) => typeof c.deaths === "number" && c.deaths > 0).length ?? 0;

  return (
    <div>
      <div ref={mapRef} className="h-[420px] w-full rounded-xl border z-0" aria-label="Map of verified lab results over CDC county overdose deaths, approximate county-level locations" />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: DOT.danger }} /> fentanyl / nitazenes found</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: DOT.warning }} /> xylazine found</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: DOT.neutral }} /> neither in that sample</span>
        {heat && heat.length > 0 && (
          <label className="flex min-h-[40px] cursor-pointer items-center gap-2 select-none">
            <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} className="h-4 w-4" />
            <span><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: DOT.heat, opacity: 0.5 }} /> overdose deaths by county (CDC, {heatCount.toLocaleString()} counties)</span>
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Locations are approximate — county centers only, never exact places. Bigger shaded circles = more deaths in the last 12 months (CDC provisional; counts under 10 are hidden by CDC).
      </p>
    </div>
  );
}
