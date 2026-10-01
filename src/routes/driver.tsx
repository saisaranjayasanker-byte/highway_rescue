import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RescueMap, type MapMarker } from "@/components/RescueMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentPosition, fmtKm } from "@/lib/geo";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, Wrench, AlertTriangle, X, LogOut } from "lucide-react";

export const Route = createFileRoute("/driver")({
  component: DriverPage,
  head: () => ({ meta: [{ title: "Driver · RoadRescue" }] }),
});

type Req = {
  id: string;
  status: string;
  pickup_lat: number;
  pickup_lng: number;
  mechanic_id: string | null;
  issue: string | null;
  vehicle_info: string | null;
};

function DriverPage() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [issue, setIssue] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [active, setActive] = useState<Req | null>(null);
  const [mechanicLoc, setMechanicLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [mechanicName, setMechanicName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
    if (!loading && profile && profile.role === "mechanic") nav({ to: "/mechanic" });
  }, [loading, user, profile, nav]);

  // Get my position once on load
  useEffect(() => {
    getCurrentPosition()
      .then((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }))
      .catch(() => toast.error("Couldn't get your GPS location. Enable location services."));
  }, []);

  // Load any active request for me
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("rescue_requests")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", ["pending", "accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setActive(data as Req);
    })();
  }, [user]);

  // Realtime: my request updates
  useEffect(() => {
    if (!active?.id) return;
    const channel = supabase
      .channel(`req-${active.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rescue_requests", filter: `id=eq.${active.id}` },
        (payload) => setActive(payload.new as Req),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [active?.id]);

  // Realtime: mechanic location once assigned
  useEffect(() => {
    if (!active?.mechanic_id) return;
    let mounted = true;
    (async () => {
      const { data: mech } = await supabase
        .from("mechanics")
        .select("user_id, shop_name, location")
        .eq("user_id", active.mechanic_id!)
        .maybeSingle();
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", active.mechanic_id!)
        .maybeSingle();
      if (mounted && prof) setMechanicName(prof.display_name ?? "Mechanic");
      if (mounted && mech?.location) {
        const loc = parseGeo(mech.location);
        if (loc) setMechanicLoc(loc);
      }
    })();

    const channel = supabase
      .channel(`mech-${active.mechanic_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mechanics",
          filter: `user_id=eq.${active.mechanic_id}`,
        },
        (payload) => {
          const loc = parseGeo((payload.new as any).location);
          if (loc) setMechanicLoc(loc);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [active?.mechanic_id]);

  async function requestHelp() {
    if (!user || !pos) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("rescue_requests")
        .insert({
          driver_id: user.id,
          pickup_lat: pos.lat,
          pickup_lng: pos.lng,
          pickup_location: `SRID=4326;POINT(${pos.lng} ${pos.lat})` as any,
          issue: issue || null,
          vehicle_info: vehicle || null,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      setActive(data as Req);
      toast.success("Help request sent — finding nearest mechanic…");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    if (!active) return;
    await supabase
      .from("rescue_requests")
      .update({ status: "cancelled" })
      .eq("id", active.id);
    setActive(null);
    setMechanicLoc(null);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const center = pos ?? { lat: 19.076, lng: 72.8777 };
  const markers: MapMarker[] = [];
  if (pos) markers.push({ id: "me", lat: pos.lat, lng: pos.lng, color: "destructive" });
  if (mechanicLoc)
    markers.push({ id: "mech", lat: mechanicLoc.lat, lng: mechanicLoc.lng, color: "accent" });

  const dist =
    pos && mechanicLoc
      ? haversine(pos.lat, pos.lng, mechanicLoc.lat, mechanicLoc.lng)
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">RoadRescue</span>
            <span className="text-xs text-muted-foreground ml-2">Driver</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_400px]">
        <div className="h-[50vh] lg:h-auto">
          <RescueMap center={center} markers={markers} zoom={15} />
        </div>

        <div className="p-5 lg:border-l border-border overflow-y-auto">
          {!active ? (
            <Card className="p-5 bg-card border-border">
              <h2 className="text-xl font-bold mb-1">Need a mechanic?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We'll auto-share your GPS location.
              </p>

              <div className="flex items-center gap-2 text-sm mb-4 p-3 rounded-lg bg-muted">
                <MapPin className="h-4 w-4 text-primary" />
                {pos ? (
                  <span>
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Locating you…</span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Input
                    id="vehicle"
                    placeholder="e.g. Honda City, white"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="issue">What's wrong?</Label>
                  <Textarea
                    id="issue"
                    placeholder="Flat tire, won't start, overheating…"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <Button
                onClick={requestHelp}
                disabled={!pos || submitting}
                size="lg"
                className="w-full text-base h-14"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 mr-2" />
                )}
                Request Help Now
              </Button>
            </Card>
          ) : (
            <Card className="p-5 bg-card border-border">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    active.status === "pending"
                      ? "bg-primary/15 text-primary"
                      : active.status === "accepted" || active.status === "in_progress"
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {active.status.replace("_", " ").toUpperCase()}
                </span>
                <Button size="sm" variant="ghost" onClick={cancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {active.status === "pending" && (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="font-medium">Finding nearest mechanic…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hang tight, this is fast.
                  </p>
                </div>
              )}

              {active.mechanic_id && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Your mechanic
                    </p>
                    <p className="font-bold text-lg">{mechanicName}</p>
                  </div>
                  {dist !== null && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="text-sm">
                        <strong>{fmtKm(dist)}</strong> away
                      </span>
                    </div>
                  )}
                </div>
              )}

              {active.issue && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase">Issue</p>
                  <p className="text-sm">{active.issue}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Parse PostGIS geography return — supabase returns it as a hex WKB string OR GeoJSON
function parseGeo(loc: any): { lat: number; lng: number } | null {
  if (!loc) return null;
  if (typeof loc === "object" && loc.coordinates) {
    return { lng: loc.coordinates[0], lat: loc.coordinates[1] };
  }
  if (typeof loc === "string") {
    // EWKB hex - try decode
    try {
      const hex = loc;
      // POINT structure: skip 9 bytes header then read 16 bytes (2 doubles, little-endian)
      const bytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
      const buf = new Uint8Array(bytes).buffer;
      const dv = new DataView(buf);
      // header: 1 byte order + 4 bytes type + 4 bytes srid = 9
      const lng = dv.getFloat64(9, true);
      const lat = dv.getFloat64(17, true);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    } catch {}
  }
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
