import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RescueMap, type MapMarker } from "@/components/RescueMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCurrentPosition, watchPosition, fmtKm } from "@/lib/geo";
import { toast } from "sonner";
import { Loader2, Wrench, MapPin, CheckCircle2, XCircle, LogOut, Bell } from "lucide-react";

export const Route = createFileRoute("/mechanic")({
  component: MechanicPage,
  head: () => ({ meta: [{ title: "Mechanic · RoadRescue" }] }),
});

type IncomingReq = {
  id: string;
  driver_id: string;
  pickup_lat: number;
  pickup_lng: number;
  issue: string | null;
  vehicle_info: string | null;
  status: string;
  created_at: string;
};

function MechanicPage() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [available, setAvailable] = useState(true);
  const [pending, setPending] = useState<IncomingReq[]>([]);
  const [accepted, setAccepted] = useState<IncomingReq | null>(null);
  const [driverName, setDriverName] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
    if (!loading && profile && profile.role === "driver") nav({ to: "/driver" });
  }, [loading, user, profile, nav]);

  // Ensure mechanics row exists for this user
  useEffect(() => {
    if (!user || !profile || profile.role !== "mechanic") return;
    (async () => {
      const { data } = await supabase
        .from("mechanics")
        .select("is_available")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        await supabase.from("mechanics").insert({
          user_id: user.id,
          shop_name: profile.display_name ?? "Mechanic",
          is_available: true,
        });
      } else {
        setAvailable(data.is_available);
      }
    })();
  }, [user, profile]);

  // Watch position & push to DB
  useEffect(() => {
    if (!user) return;
    const stop = watchPosition(async (p) => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude };
      setPos(next);
      await supabase
        .from("mechanics")
        .update({
          location: `SRID=4326;POINT(${next.lng} ${next.lat})` as any,
          last_seen: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    });
    getCurrentPosition()
      .then((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }))
      .catch(() => toast.error("Enable location to receive nearby requests."));
    return stop;
  }, [user]);

  // Load pending requests near me & subscribe to new ones
  useEffect(() => {
    if (!user) return;
    loadPending();
    loadAccepted();

    const ch = supabase
      .channel("rescue-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rescue_requests" },
        () => {
          loadPending();
          loadAccepted();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    async function loadPending() {
      const { data } = await supabase
        .from("rescue_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      setPending((data ?? []) as IncomingReq[]);
    }
    async function loadAccepted() {
      const { data } = await supabase
        .from("rescue_requests")
        .select("*")
        .eq("mechanic_id", user!.id)
        .in("status", ["accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setAccepted((data as IncomingReq | null) ?? null);
      if (data) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", data.driver_id)
          .maybeSingle();
        setDriverName(prof?.display_name ?? "Driver");
      }
    }
  }, [user]);

  async function toggleAvailable(v: boolean) {
    setAvailable(v);
    if (!user) return;
    await supabase.from("mechanics").update({ is_available: v }).eq("user_id", user.id);
  }

  async function accept(r: IncomingReq) {
    if (!user) return;
    const { error } = await supabase
      .from("rescue_requests")
      .update({ mechanic_id: user.id, status: "accepted" })
      .eq("id", r.id)
      .eq("status", "pending"); // race-safe
    if (error) toast.error(error.message);
    else toast.success("Request accepted — heading to driver.");
  }

  async function reject(r: IncomingReq) {
    setPending((p) => p.filter((x) => x.id !== r.id));
  }

  async function complete() {
    if (!accepted) return;
    await supabase
      .from("rescue_requests")
      .update({ status: "completed" })
      .eq("id", accepted.id);
    setAccepted(null);
    toast.success("Job marked complete.");
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
  if (pos) markers.push({ id: "me", lat: pos.lat, lng: pos.lng, color: "primary" });
  if (accepted)
    markers.push({
      id: "driver",
      lat: accepted.pickup_lat,
      lng: accepted.pickup_lng,
      color: "destructive",
    });
  pending.forEach((r) =>
    markers.push({ id: r.id, lat: r.pickup_lat, lng: r.pickup_lng, color: "accent" }),
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">RoadRescue</span>
            <span className="text-xs text-muted-foreground ml-2">Mechanic</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="avail" checked={available} onCheckedChange={toggleAvailable} />
              <Label htmlFor="avail" className="text-sm">
                {available ? "Available" : "Off"}
              </Label>
            </div>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_400px]">
        <div className="h-[50vh] lg:h-auto">
          <RescueMap center={center} markers={markers} zoom={13} />
        </div>

        <div className="p-5 lg:border-l border-border overflow-y-auto space-y-4">
          {accepted ? (
            <Card className="p-5 bg-card border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent">
                  ON THE WAY
                </span>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Driver</p>
              <p className="font-bold text-lg mb-3">{driverName}</p>
              {accepted.vehicle_info && (
                <p className="text-sm mb-1">
                  <span className="text-muted-foreground">Vehicle: </span>
                  {accepted.vehicle_info}
                </p>
              )}
              {accepted.issue && (
                <p className="text-sm mb-3">
                  <span className="text-muted-foreground">Issue: </span>
                  {accepted.issue}
                </p>
              )}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted mb-4 text-sm">
                <MapPin className="h-4 w-4 text-destructive" />
                {accepted.pickup_lat.toFixed(5)}, {accepted.pickup_lng.toFixed(5)}
                {pos && (
                  <span className="ml-auto font-semibold">
                    {fmtKm(
                      haversine(
                        pos.lat,
                        pos.lng,
                        accepted.pickup_lat,
                        accepted.pickup_lng,
                      ),
                    )}
                  </span>
                )}
              </div>
              <Button onClick={complete} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
              </Button>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="font-bold">Incoming requests</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {pending.length} waiting
                </span>
              </div>

              {pending.length === 0 && (
                <Card className="p-6 text-center bg-card border-border">
                  <p className="text-muted-foreground text-sm">
                    {available
                      ? "No active requests nearby. We'll alert you."
                      : "You're offline. Toggle availability to receive requests."}
                  </p>
                </Card>
              )}

              {pending.map((r) => (
                <Card key={r.id} className="p-4 bg-card border-border">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      {r.vehicle_info && <p className="font-semibold">{r.vehicle_info}</p>}
                      <p className="text-sm text-muted-foreground">
                        {r.issue ?? "No details"}
                      </p>
                    </div>
                    {pos && (
                      <span className="text-xs font-semibold text-accent shrink-0">
                        {fmtKm(haversine(pos.lat, pos.lng, r.pickup_lat, r.pickup_lng))}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => accept(r)}
                      size="sm"
                      className="flex-1"
                      disabled={!available}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Accept
                    </Button>
                    <Button onClick={() => reject(r)} size="sm" variant="outline">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
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
