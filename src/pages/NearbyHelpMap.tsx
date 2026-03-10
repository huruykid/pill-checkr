import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
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
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Facility {
  name: string;
  address: string;
  phone: string | null;
  distance: string | null;
  website: string | null;
  services: string[];
  type: string | null;
  lat?: number;
  lng?: number;
}

type FilterType = "all" | "treatment" | "naloxone" | "harm-reduction";

const filterConfig: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "treatment", label: "Treatment Centers" },
  { value: "naloxone", label: "Naloxone Access" },
  { value: "harm-reduction", label: "Harm Reduction" },
];

function matchesFilter(facility: Facility, filter: FilterType): boolean {
  if (filter === "all") return true;
  const name = (facility.name + " " + facility.services.join(" ") + " " + (facility.type || "")).toLowerCase();
  if (filter === "treatment") return name.includes("treatment") || name.includes("rehab") || name.includes("detox") || name.includes("recovery");
  if (filter === "naloxone") return name.includes("naloxone") || name.includes("narcan") || name.includes("overdose prevention");
  if (filter === "harm-reduction") return name.includes("harm reduction") || name.includes("syringe") || name.includes("needle") || name.includes("safe");
  return true;
}

export default function NearbyHelpMap() {
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
  const [showList, setShowList] = useState(false);

  const filteredFacilities = facilities.filter((f) => matchesFilter(f, filter));

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
        .bindPopup("Your location");
    }

    const bounds = L.latLngBounds([]);
    if (center) bounds.extend([center.lat, center.lng]);

    facs.forEach((f) => {
      // Use actual facility coordinates if available, otherwise offset from center
      const lat = f.lat ?? (center ? center.lat + (Math.random() - 0.5) * 0.1 : null);
      const lng = f.lng ?? (center ? center.lng + (Math.random() - 0.5) * 0.1 : null);
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
            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.address)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">Get Directions →</a>
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

      const center = params.latitude && params.longitude
        ? { lat: params.latitude, lng: params.longitude }
        : userLocation;

      if (center) addMarkersToMap(facs.filter((f: Facility) => matchesFilter(f, filter)), center);
    } catch (e) {
      console.error("Error finding treatment:", e);
      setLocationError("Unable to find facilities. Try a different ZIP code.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported. Please enter a ZIP code.");
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
        setLocationError("Location access denied. Please enter a ZIP code.");
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
      <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
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
              Use My Location
            </Button>

            <form onSubmit={handleZipSearch} className="flex gap-2 flex-1 max-w-xs">
              <Input
                placeholder="ZIP code"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                maxLength={10}
                className="h-9"
              />
              <Button type="submit" variant="outline" size="sm" disabled={zipcode.trim().length < 5 || loading}>
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
              {showList ? "Map View" : "List View"}
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
                className="text-xs h-7 px-3"
              >
                {f.label}
              </Button>
            ))}
            {searched && (
              <span className="text-xs text-muted-foreground self-center ml-2">
                {filteredFacilities.length} result{filteredFacilities.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {locationError && (
            <p className="text-sm text-destructive max-w-5xl mx-auto w-full">{locationError}</p>
          )}
        </div>

        {/* Map / List area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Map container — always rendered for Leaflet */}
          <div
            ref={mapRef}
            className={`absolute inset-0 ${showList ? "hidden sm:block sm:w-1/2" : "w-full"}`}
          />

          {/* List view */}
          {showList && (
            <div className={`absolute inset-0 overflow-auto bg-background sm:left-1/2 sm:w-1/2`}>
              <div className="p-4 space-y-3">
                {!searched && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Search by location to find nearby facilities.
                  </p>
                )}
                {searched && filteredFacilities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No facilities found matching this filter.
                  </p>
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
                      <div className="flex flex-wrap gap-2">
                        {f.phone && (
                          <a href={`tel:${f.phone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Phone className="h-3 w-3" />
                            {f.phone}
                          </a>
                        )}
                        {f.website && (
                          <a href={f.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Navigation className="h-3 w-3" />
                          Get Directions
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
                      <h3 className="font-bold text-sm text-foreground">SAMHSA Helpline</h3>
                      <p className="text-xs text-muted-foreground">Free, 24/7 referral service</p>
                    </div>
                    <a href="tel:18006624357">
                      <Button variant="default" size="sm" className="gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Call
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
