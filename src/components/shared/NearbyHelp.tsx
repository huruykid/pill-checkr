import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ExternalLink, Loader2, Navigation, Search } from "lucide-react";

interface Facility {
  name: string;
  address: string;
  phone: string | null;
  distance: string | null;
  website: string | null;
  services: string[];
  type: string | null;
}

interface Helpline {
  name: string;
  address: string;
  phone: string;
  website: string;
  services: string[];
  type: string;
}

interface NearbyHelpProps {
  className?: string;
}

export function NearbyHelp({ className }: NearbyHelpProps) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [helpline, setHelpline] = useState<Helpline | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [zipcode, setZipcode] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  const search = async (params: { zipcode?: string; latitude?: number; longitude?: number }) => {
    setLoading(true);
    setLocationError(null);
    try {
      const { data, error } = await supabase.functions.invoke("find-treatment", {
        body: params,
      });
      if (error) throw error;
      setFacilities(data.facilities || []);
      setHelpline(data.helpline || null);
      setSearched(true);
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
      (pos) => search({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {
        setLoading(false);
        setLocationError("Location access denied. Please enter a ZIP code instead.");
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Find Help Near You
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Locate treatment centers, naloxone distribution, and harm reduction services
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!searched && !loading && (
          <div className="space-y-3">
            <Button
              variant="default"
              className="w-full"
              onClick={useGeolocation}
            >
              <Navigation className="mr-2 h-4 w-4" />
              Use My Location
            </Button>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleZipSearch} className="flex gap-2">
              <Input
                placeholder="Enter ZIP code"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                maxLength={10}
                className="flex-1"
              />
              <Button type="submit" variant="outline" disabled={zipcode.trim().length < 5}>
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Finding nearby services...</span>
          </div>
        )}

        {locationError && (
          <p className="text-sm text-destructive">{locationError}</p>
        )}

        {searched && !loading && (
          <>
            {facilities.length > 0 && (
              <div className="space-y-3">
                {facilities.map((f, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-2">
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
                  </div>
                ))}
              </div>
            )}

            {/* Always show helpline */}
            {helpline && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
                <h3 className="font-semibold text-sm text-foreground">{helpline.name}</h3>
                <p className="text-xs text-muted-foreground">{helpline.address}</p>
                <a
                  href={`tel:${helpline.phone}`}
                  className="inline-flex items-center gap-2 text-lg font-bold text-primary hover:underline"
                >
                  <Phone className="h-5 w-5" />
                  {helpline.phone}
                </a>
                <div className="flex flex-wrap gap-1">
                  {helpline.services.map((s, j) => (
                    <Badge key={j} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setSearched(false);
                setFacilities([]);
                setZipcode("");
              }}
            >
              Search Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
