import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wrench, Car, MapPin, Zap, ShieldCheck, LogOut } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "RoadRescue · AI Highway Vehicle Rescue" },
      {
        name: "description",
        content:
          "Stranded on the highway? Connect instantly with the nearest available mechanic via GPS-powered live tracking.",
      },
    ],
  }),
});

function Index() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      nav({ to: profile.role === "mechanic" ? "/mechanic" : "/driver" });
    }
  }, [loading, profile, nav]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">RoadRescue</span>
          </div>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
              AI-Powered Roadside Rescue
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Help is{" "}
              <span className="text-primary">minutes</span> away,
              not hours.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Broken down on the highway? Tap one button. We auto-locate you and
              dispatch the nearest available mechanic, with live tracking from start
              to finish.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="text-base">
                <Link to="/auth">
                  <Car className="h-5 w-5 mr-2" />
                  I need help
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/auth">
                  <Wrench className="h-5 w-5 mr-2" />
                  I'm a mechanic
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
            <Feature
              icon={<MapPin className="h-6 w-6" />}
              title="Auto GPS"
              text="Your location is captured the moment you hit the SOS button."
            />
            <Feature
              icon={<Zap className="h-6 w-6" />}
              title="Nearest Match"
              text="Geospatial AI finds the closest mechanic in under a second."
            />
            <Feature
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Live Tracking"
              text="Watch your mechanic move toward you in real-time."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{text}</p>
    </div>
  );
}
