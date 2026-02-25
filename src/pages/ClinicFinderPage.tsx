import { useState, useEffect, forwardRef, useCallback } from "react";
import { MapPin, Phone, Clock, Navigation, Search, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { SeoHead } from "@/components/seo/SeoHead";

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: string;
  isOpen: boolean;
  isEmergency: boolean;
  hours: string;
  lat: number;
  lng: number;
}

const ClinicFinderPage = forwardRef<HTMLDivElement>(function ClinicFinderPage(_props, ref) {
  const [searchQuery, setSearchQuery] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingClinics, setIsLoadingClinics] = useState(false);

  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchNearbyClinics = async (lat: number, lng: number) => {
    setIsLoadingClinics(true);
    try {
      const { data, error } = await supabase.functions.invoke('nearby-clinics', {
        body: { lat, lng, radius: 16000 } // ~10 miles
      });

      if (error) {
        console.error('Error fetching clinics:', error);
        return;
      }

      if (data?.clinics) {
        setClinics(data.clinics);
      }
    } catch (err) {
      console.error('Failed to fetch clinics:', err);
    } finally {
      setIsLoadingClinics(false);
    }
  };

  const requestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      let coords: { lat: number; lng: number };

      if (isNative()) {
        // Native: use Capacitor Geolocation plugin
        const { Geolocation } = await import("@capacitor/geolocation");
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      } else {
        // Web: use browser geolocation
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by your browser");
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      }

      setLocation(coords);
      setIsLoadingLocation(false);
      fetchNearbyClinics(coords.lat, coords.lng);
    } catch {
      setLocationError("Unable to get your location. Please enable location services.");
      setIsLoadingLocation(false);
    }
  }, []);

  const openInMaps = (clinic: Clinic) => {
    const destination = encodeURIComponent(clinic.address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const mapsUrl = isIOS
      ? `maps://maps.apple.com/?daddr=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(mapsUrl, "_blank");
  };

  const callClinic = (phone: string) => {
    window.open(`tel:${phone.replace(/[^0-9]/g, "")}`, "_self");
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <div ref={ref} className="min-h-screen">
      <SeoHead
        title="Find Emergency Vet Clinics Near You | PetNurse AI"
        description="Locate veterinary clinics and emergency animal hospitals near you. Get directions, hours, and phone numbers for nearby vet clinics — powered by PetNurse AI."
        canonicalPath="/clinic-finder"
      />
      {/* Header */}
      <header className="safe-area-top glass sticky top-0 z-40">
        <div className="px-5 py-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-5">
            <div className="p-3 rounded-2xl bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Clinic Finder</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinics..."
              className="pl-12 rounded-xl h-12 bg-card shadow-apple-card border-0"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 py-8 max-w-2xl mx-auto">
        {/* Location status */}
        {locationError && (
          <div className="apple-card mb-5 p-4 flex items-center gap-4 bg-warning-amber-bg">
            <AlertCircle className="h-5 w-5 text-warning-amber shrink-0" />
            <p className="text-sm flex-1">{locationError}</p>
            <Button size="sm" variant="outline" onClick={requestLocation} className="active:scale-[0.98] transition-transform">
              Retry
            </Button>
          </div>
        )}

        {/* Emergency notice with Call Nearest Vet button */}
        <div className="status-card status-card-red mb-8 p-5 space-y-4">
          <p className="text-sm font-medium">
            🚨 If your pet is having a life-threatening emergency, call the nearest 24-hour emergency vet immediately.
          </p>
          <Button
            variant="destructive"
            className="w-full h-12 font-semibold active:scale-[0.98] transition-transform"
            onClick={() => {
              if (!navigator.geolocation) {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const query = encodeURIComponent("Emergency Veterinarian");
                const mapsUrl = isIOS
                  ? `maps://maps.apple.com/?q=${query}`
                  : `https://www.google.com/maps/search/${query}`;
                window.open(mapsUrl, "_blank");
                return;
              }
              
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const query = encodeURIComponent("Emergency Veterinarian");
                  const mapsUrl = isIOS
                    ? `maps://maps.apple.com/?q=${query}&sll=${latitude},${longitude}`
                    : `https://www.google.com/maps/search/${query}/@${latitude},${longitude},14z`;
                  window.open(mapsUrl, "_blank");
                },
                () => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const query = encodeURIComponent("Emergency Veterinarian");
                  const mapsUrl = isIOS
                    ? `maps://maps.apple.com/?q=${query}`
                    : `https://www.google.com/maps/search/${query}`;
                  window.open(mapsUrl, "_blank");
                },
                { timeout: 5000, maximumAge: 60000 }
              );
            }}
          >
            <Phone className="h-5 w-5 mr-2" />
            Find Nearest Emergency Vet
          </Button>
        </div>

        {/* Loading state */}
        {(isLoadingLocation || isLoadingClinics) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">
              {isLoadingLocation ? "Getting your location..." : "Finding nearby clinics..."}
            </p>
          </div>
        )}

        {/* Clinic list */}
        {!isLoadingLocation && !isLoadingClinics && (
          <div className="space-y-4">
            {filteredClinics.map((clinic) => (
              <div key={clinic.id} className="apple-card overflow-hidden hover:shadow-apple-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="font-semibold text-foreground">{clinic.name}</h3>
                        {clinic.isEmergency && (
                          <Badge className="bg-emergency-red text-emergency-red-foreground text-xs rounded-lg px-2 py-0.5">
                            24/7
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{clinic.address}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{clinic.distance}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span className={clinic.isOpen ? "text-safe-green font-medium" : "text-muted-foreground"}>
                        {clinic.isOpen ? "Open" : "Closed"} · {clinic.hours}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 active:scale-[0.98] transition-transform"
                      onClick={() => callClinic(clinic.phone)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button
                      className="flex-1 active:scale-[0.98] transition-transform"
                      onClick={() => openInMaps(clinic)}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingLocation && !isLoadingClinics && filteredClinics.length === 0 && clinics.length === 0 && location && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-muted mb-6">
              <MapPin className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No veterinary clinics found nearby.</p>
            <Button onClick={() => location && fetchNearbyClinics(location.lat, location.lng)} className="active:scale-[0.98] transition-transform">
              <Search className="h-4 w-4 mr-2" />
              Search Again
            </Button>
          </div>
        )}

        {filteredClinics.length === 0 && clinics.length > 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-muted mb-6">
              <MapPin className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No clinics found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ClinicFinderPage;