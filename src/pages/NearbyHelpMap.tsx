import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Filter,
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

export default function NearbyHelpMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [zipcode, setZipcode] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  const addMarkersToMap = (facs: Facility[], center?: { lat: number; lng: number }) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Add user location marker
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

    // Geocode facilities (approximate from address) and add markers
    const bounds = L.latLngBounds([]);
    if (center) bounds.extend([center.lat, center.lng]);

    facs.forEach((f, i) => {
      // Use offset from center for demo (real geocoding would use proper API)
      if (center) {
        const lat = center.lat + (Math.random() - 0.5) * 0.1;
        const lng = center.lng + (Math.random() - 0.5) * 0.1;

        const facilityIcon = L.divIcon({
          className: "custom-marker",
          html: '<div style="background:hsl(145,60%,35%);width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const marker = L.marker([lat, lng], { icon: facilityIcon }).addTo(map);
        marker.bindPopup(`
          <strong>${f.name}</strong><br/>
          ${f.address}<br/>
          ${f.phone ? `<a href="tel:${f.phone}">${f.phone}</a>` : ""}
        `);
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

      if (center) addMarkersToMap(facs, center);
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
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <MapPin className="h-4 w-4" />
              Nearby Help
            </div>
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">
              Find Help Near You
            </h1>
            <p className="text-muted-foreground">
              Treatment centers, naloxone access, and harm reduction services in your area
            </p>
          </div>

          {/* Search controls */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="default"
                  onClick={useGeolocation}
                  disabled={loading}
                  className="gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Use My Location
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-px w-6 bg-border" />
                  or
                  <div className="h-px w-6 bg-border" />
                </div>

                <form onSubmit={handleZipSearch} className="flex gap-2 flex-1">
                  <Input
                    placeholder="Enter ZIP code"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    maxLength={10}
                    className="flex-1 max-w-[200px]"
                  />
                  <Button type="submit" variant="outline" disabled={zipcode.trim().length < 5 || loading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </form>

                {loading && <Loader2 className="h-5 w-5 animate-spin text-primary self-center" />}
              </div>
              {locationError && (
                <p className="text-sm text-destructive mt-2">{locationError}</p>
              )}
            </CardContent>
          </Card>

          {/* Map */}
          <Card className="mb-6 overflow-hidden">
            <div ref={mapRef} className="h-[400px] md:h-[500px] w-full" />
          </Card>

          {/* Facility list */}
          {searched && facilities.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {facilities.map((f, i) => (
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
            </div>
          )}

          {searched && facilities.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No facilities found in this area. Try a different location.</p>
              </CardContent>
            </Card>
          )}

          {/* SAMHSA Helpline always shown */}
          <Card className="mt-6 border-primary/20">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-foreground">SAMHSA National Helpline</h3>
                <p className="text-sm text-muted-foreground">
                  Free, confidential, 24/7, 365-day-a-year treatment referral and information service.
                </p>
              </div>
              <a href="tel:18006624357">
                <Button variant="default" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  1-800-662-4357
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
