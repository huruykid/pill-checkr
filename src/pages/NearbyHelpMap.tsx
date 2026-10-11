import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  Phone,
  ExternalLink,
  List,
  Map,
  X,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { track } from "@/lib/analytics";

interface Facility {
  name: string;
  address: string;
  phone: string | null;
  distance: string | null;
  website: string | null;
  services: string[];
  type: string | null;
  lat?: number | null;
  lng?: number | null;
}

type FilterType = "all" | "treatment" | "naloxone" | "harm-reduction";

const filterConfig: { value: FilterType; labelKey: string }[] = [
  { value: "all", labelKey: "help.filter.all" },
  { value: "treatment", labelKey: "help.filter.treatment" },
  { value: "naloxone", labelKey: "help.filter.naloxone" },
  { value: "harm-reduction", labelKey: "help.filter.harmReduction" },
];

function matchesFilter(facility: Facility, filter: FilterType): boolean {
  if (filter === "all") return true;
  const text = (facility.name + " " + facility.services.join(" ") + " " + (facility.type || "")).toLowerCase();
  if (filter === "treatment") return text.includes("treatment") || text.includes("rehab") || text.includes("detox") || text.includes("recovery") || text.includes("residential") || text.includes("inpatient") || text.includes("outpatient");
  if (filter === "naloxone") return text.includes("naloxone") || text.includes("narcan") || text.includes("overdose prevention") || text.includes("opioid reversal") || text.includes("nalmefene") || text.includes("buprenorphine") || text.includes("medication assisted") || text.includes("medication-assisted") || text.includes("opioid treatment") || text.includes("methadone") || text.includes("suboxone");
  if (filter === "harm-reduction") return text.includes("harm reduction") || text.includes("syringe") || text.includes("needle") || text.includes("safe") || text.includes("opioid treatment") || text.includes("medication-assisted") || text.includes("mat ") || text.includes("buprenorphine") || text.includes("methadone") || text.includes("suboxone") || text.includes("outreach") || text.includes("opioid") || text.includes("substance use") || text.includes("substance abuse") || text.includes("prevention") || text.includes("counseling") || text.includes("mental health");
  return true;
}

export default function NearbyHelpMap() {
  const { t } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [zipcode, setZipcode] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchParams] = useSearchParams();
  const initialFilter = (searchParams.get("filter") as FilterType) || "all";
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  // Arriving from "Find naloxone" opens the list, so the OTC / by-mail
  // fallback is visible before (or without) a location search.
  const [showList, setShowList] = useState(initialFilter === "naloxone");

  const filteredFacilities = facilities.filter((f) => matchesFilter(f, filter));

  // An empty filter leaves the map blank; open the list so the fallback
  // (helpline, naloxone without a facility) is what people see.
  useEffect(() => {
    if (searched && filteredFacilities.length === 0) setShowList(true);
  }, [searched, filteredFacilities.length]);

  useEffect(() => {
    track("help_map_opened", { filter: initialFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Re-render markers when filter changes
  useEffect(() => {
    if (searched && facilities.length > 0) {
      addMarkersToMap(filteredFacilities, userLocation || undefined);
    }
  }, [filter]);

  const addMarkersToMap = (facs: Facility[], center?: { lat: number; lng: number }) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (center) {
      const userIcon = L.divIcon({
        className: "custom-marker",
        html: '<div style="background:hsl(0,75%,45%);width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([center.lat, center.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(t("help.yourLocation"));
    }

    const bounds = L.latLngBounds([]);
    if (center) bounds.extend([center.lat, center.lng]);

    facs.forEach((f) => {
      // Only plot real coordinates. A guessed pin can send someone to an
      // empty street; facilities without coordinates stay list-only.
      const lat = f.lat;
      const lng = f.lng;
      if (lat != null && lng != null) {

        const facilityIcon = L.divIcon({
          className: "custom-marker",
          html: '<div style="background:hsl(145,60%,35%);width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const popupContent = `
          <div style="min-width:200px">
            <strong>${f.name}</strong><br/>
            <span style="font-size:12px;color:#666">${f.address}</span><br/>
            ${f.phone ? `<a href="tel:${f.phone}" style="font-size:12px">📞 ${f.phone}</a><br/>` : ""}
            ${f.services.length > 0 ? `<span style="font-size:11px;color:#888">${f.services.slice(0, 2).join(", ")}</span><br/>` : ""}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.address)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">${t("help.directions")} →</a>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: facilityIcon }).addTo(map);
        marker.bindPopup(popupContent);
        bounds.extend([lat, lng]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  };

  const search = async (params: { zipcode?: string; latitude?: number; longitude?: number }) => {
    setLoading(true);
    setLocationError(null);
    try {
      const { data, error } = await supabase.functions.invoke("find-treatment", {
        body: params,
      });
      if (error) throw error;
      const facs = data.facilities || [];
      setFacilities(facs);
      setSearched(true);

      // Use search_coordinates from edge function (geocoded ZIP or passed lat/lng)
      const center = data.search_coordinates
        ? { lat: data.search_coordinates.lat, lng: data.search_coordinates.lng }
        : userLocation;

      if (center && !userLocation) setUserLocation(center);

      addMarkersToMap(facs.filter((f: Facility) => matchesFilter(f, filter)), center || undefined);
    } catch (e) {
      console.error("Error finding treatment:", e);
      setLocationError(t("help.error.search"));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t("help.error.noGeo"));
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        search({ latitude: loc.lat, longitude: loc.lng });
      },
      () => {
        setLoading(false);
        setLocationError(t("help.error.denied"));
      },
      { timeout: 10000 }
    );
  };

  const handleZipSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipcode.trim().length >= 5) {
      search({ zipcode: zipcode.trim() });
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Find Help Near You | Stamped"
        description="Find naloxone, fentanyl test strips, treatment centers, and harm reduction services near your location."
        path="/nearby-help"
        jsonLd={makeWebPage("Find Help Near You", "/nearby-help", "Locate naloxone, testing services, and treatment centers nearby.")}
      />
      <div
        className="flex flex-col"
        // Header (3.5rem + top inset) and the tab bar (--tab-bar-space + bottom inset) own their own space.
        style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-top) - var(--tab-bar-space) - env(safe-area-inset-bottom))" }}
      >
        {/* Top bar: search + filters */}
        <div className="border-b border-border bg-card px-4 py-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center max-w-5xl mx-auto w-full">
            <Button
              variant="default"
              onClick={useGeolocation}
              disabled={loading}
              className="gap-2 shrink-0"
              size="sm"
            >
              <Navigation className="h-4 w-4" />
              {t("help.useLocation")}
            </Button>

            <form onSubmit={handleZipSearch} className="flex gap-2 flex-1 max-w-xs">
              <Input
                placeholder={t("help.zip")}
                aria-label={t("help.zip")}
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                maxLength={10}
                inputMode="numeric"
                autoComplete="postal-code"
              />
              <Button type="submit" variant="outline" size="sm" disabled={zipcode.trim().length < 5 || loading} aria-label={t("common.search")}>
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

            {/* List/Map toggle for mobile */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 sm:ml-auto"
              onClick={() => setShowList(!showList)}
            >
              {showList ? <Map className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {showList ? t("help.mapView") : t("help.listView")}
            </Button>
          </div>

          {/* Filter toggles */}
          <div className="flex gap-2 flex-wrap max-w-5xl mx-auto w-full">
            {filterConfig.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
                className="text-xs px-3"
              >
                {t(f.labelKey)}
              </Button>
            ))}
            {searched && (
              <span className="text-xs text-muted-foreground self-center ml-2">
                {t(filteredFacilities.length === 1 ? "help.result" : "help.results").replace("{n}", String(filteredFacilities.length))}
              </span>
            )}
          </div>

          {locationError && (
            <p className="text-sm text-destructive max-w-5xl mx-auto w-full">{locationError}</p>
          )}
        </div>

        {/* Map / List area */}
        {/* isolate: Leaflet panes and the z-[1000] list stay inside this box, under the emergency FAB. */}
        <div className="flex-1 relative isolate overflow-hidden">
          {/* Map container — always visible */}
          <div ref={mapRef} className="absolute inset-0 w-full" />

          {/* List overlay panel */}
          {showList && (
            <div className="absolute bottom-0 left-0 right-0 h-[60vh] sm:top-0 sm:right-0 sm:left-auto sm:bottom-0 sm:w-[380px] sm:h-auto bg-background/95 backdrop-blur-sm shadow-xl rounded-t-xl sm:rounded-t-none sm:rounded-l-xl overflow-hidden flex flex-col z-[1000]">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border shrink-0">
                <span className="text-sm font-semibold text-foreground">
                  {t(filteredFacilities.length === 1 ? "help.result" : "help.results").replace("{n}", String(filteredFacilities.length))}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowList(false)} aria-label={t("common.close")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center py-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {!searched && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("help.searchPrompt")}
                  </p>
                )}
                {searched && filteredFacilities.length === 0 && filter !== "naloxone" && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("help.noResults")}
                  </p>
                )}
                {filter === "naloxone" && (
                  <Card className="border-danger/40">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-bold text-sm text-foreground">{t("help.naloxone.title")}</h3>
                      <p className="text-xs text-muted-foreground">{t("help.naloxone.otc")}</p>
                      <a
                        href="https://nextdistro.org/naloxone"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("hr.freeByMail")}
                      </a>
                    </CardContent>
                  </Card>
                )}
                {filteredFacilities.map((f, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{f.name}</h3>
                        {f.distance && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {f.distance}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{f.address}</p>
                      {(f.lat == null || f.lng == null) && (
                        <p className="text-xs text-muted-foreground italic">{t("help.notOnMap")}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {f.phone && (
                          <a href={`tel:${f.phone}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-primary hover:underline">
                            <Phone className="h-3 w-3" />
                            {f.phone}
                          </a>
                        )}
                        {f.website && (
                          <a href={f.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />
                            {t("help.website")}
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-primary hover:underline"
                        >
                          <Navigation className="h-3 w-3" />
                          {t("help.directions")}
                        </a>
                      </div>
                      {f.services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {f.services.slice(0, 4).map((s, j) => (
                            <Badge key={j} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* SAMHSA Helpline */}
                <Card className="border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-foreground">{t("help.samhsa")}</h3>
                      <p className="text-xs text-muted-foreground">{t("help.samhsaDesc")}</p>
                    </div>
                    <a href="tel:18006624357">
                      <Button variant="default" size="sm" className="gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {t("help.call")}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
