import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { flagTrue, type ExternalLabReport } from "@/lib/externalData";

// Map of verified lab results at county centroids. Same Leaflet + OSM stack as
// the Help map. Markers are danger-forward: red = fentanyl/nitazene detected,
// amber = xylazine, gray = neither. Locations are approximate by design —
// county centroids only, and the popup says so.
const DOT = {
  danger: "#C91D1D",
  warning: "#F9C31F",
  neutral: "#6b7280",
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

export function LabResultsMap({ reports, sourceNames }: {
  reports: ExternalLabReport[];
  sourceNames: Record<string, string>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
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
        radius: 9,
        color: markerColor(r),
        weight: 2,
        fillColor: markerColor(r),
        fillOpacity: 0.55,
      })
        .bindPopup(
          `<strong>${esc(soldAs ? `Sold as ${soldAs}` : detected[0] || "Sample")}</strong><br/>` +
          (detected.length ? `Lab found: ${esc(detected.join(", "))}<br/>` : "") +
          `${esc(where)} &middot; approximate (county level)<br/>` +
          `<span style="opacity:.7">${esc(source)}</span>`,
        )
        .addTo(layer);
    }
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 7 });
  }, [reports, sourceNames]);

  return (
    <div>
      <div ref={mapRef} className="h-[420px] w-full rounded-xl border z-0" aria-label="Map of verified lab results, approximate county-level locations" />
      <p className="mt-2 text-xs text-muted-foreground">
        Locations are approximate — county centers only, never exact places.
        Red: fentanyl or nitazenes detected. Amber: xylazine. Gray: neither detected in that sample.
      </p>
    </div>
  );
}
