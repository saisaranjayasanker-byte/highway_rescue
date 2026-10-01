import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { Loader2 } from "lucide-react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: "primary" | "accent" | "destructive";
};

const containerStyle = { width: "100%", height: "100%" };

export function RescueMap({
  center,
  markers = [],
  zoom = 14,
}: {
  center: { lat: number; lng: number };
  markers?: MapMarker[];
  zoom?: number;
}) {
  const { data, isLoading } = useGoogleMapsKey();
  const apiKey = data?.apiKey ?? "";

  if (isLoading || !apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <MapInner apiKey={apiKey} center={center} markers={markers} zoom={zoom} />;
}

function MapInner({
  apiKey,
  center,
  markers,
  zoom,
}: {
  apiKey: string;
  center: { lat: number; lng: number };
  markers: MapMarker[];
  zoom: number;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-destructive">
        Failed to load map
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: darkMapStyle,
      }}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={{ lat: m.lat, lng: m.lng }}
          label={m.label ? { text: m.label, color: "#fff", fontSize: "12px" } : undefined}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: pinColor(m.color),
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          }}
        />
      ))}
    </GoogleMap>
  );
}

function pinColor(c?: MapMarker["color"]) {
  if (c === "destructive") return "#ef4444";
  if (c === "accent") return "#f59e0b";
  return "#22c55e";
}

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1f2937" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f59e0b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];
