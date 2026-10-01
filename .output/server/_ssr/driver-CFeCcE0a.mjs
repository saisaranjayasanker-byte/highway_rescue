import { __toESM } from "../_runtime.mjs";
import { require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { Button, cn, supabase } from "./button-uqrHs0P3.mjs";
import { Input } from "./input-DJQKCdHD.mjs";
import { Card, Label } from "./card-BX8d_BdB.mjs";
import { Link, useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { toast } from "../_libs/sonner.mjs";
import { LoaderCircle, LogOut, MapPin, TriangleAlert, Wrench, X } from "../_libs/lucide-react.mjs";
import { RescueMap, fmtKm, getCurrentPosition } from "./geo-zjYgNgTz.mjs";
import { useAuth } from "./useAuth-BSZNoc_O.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/driver-CFeCcE0a.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
function DriverPage() {
	const { user, profile, loading } = useAuth();
	const nav = useNavigate();
	const [pos, setPos] = (0, import_react.useState)(null);
	const [issue, setIssue] = (0, import_react.useState)("");
	const [vehicle, setVehicle] = (0, import_react.useState)("");
	const [active, setActive] = (0, import_react.useState)(null);
	const [mechanicLoc, setMechanicLoc] = (0, import_react.useState)(null);
	const [mechanicName, setMechanicName] = (0, import_react.useState)("");
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!loading && !user) nav({ to: "/auth" });
		if (!loading && profile && profile.role === "mechanic") nav({ to: "/mechanic" });
	}, [
		loading,
		user,
		profile,
		nav
	]);
	(0, import_react.useEffect)(() => {
		getCurrentPosition().then((p) => setPos({
			lat: p.coords.latitude,
			lng: p.coords.longitude
		})).catch(() => toast.error("Couldn't get your GPS location. Enable location services."));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		(async () => {
			const { data } = await supabase.from("rescue_requests").select("*").eq("driver_id", user.id).in("status", [
				"pending",
				"accepted",
				"in_progress"
			]).order("created_at", { ascending: false }).limit(1).maybeSingle();
			if (data) setActive(data);
		})();
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (!active?.id) return;
		const channel = supabase.channel(`req-${active.id}`).on("postgres_changes", {
			event: "UPDATE",
			schema: "public",
			table: "rescue_requests",
			filter: `id=eq.${active.id}`
		}, (payload) => setActive(payload.new)).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [active?.id]);
	(0, import_react.useEffect)(() => {
		if (!active?.mechanic_id) return;
		let mounted = true;
		(async () => {
			const { data: mech } = await supabase.from("mechanics").select("user_id, shop_name, location").eq("user_id", active.mechanic_id).maybeSingle();
			const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", active.mechanic_id).maybeSingle();
			if (mounted && prof) setMechanicName(prof.display_name ?? "Mechanic");
			if (mounted && mech?.location) {
				const loc = parseGeo(mech.location);
				if (loc) setMechanicLoc(loc);
			}
		})();
		const channel = supabase.channel(`mech-${active.mechanic_id}`).on("postgres_changes", {
			event: "UPDATE",
			schema: "public",
			table: "mechanics",
			filter: `user_id=eq.${active.mechanic_id}`
		}, (payload) => {
			const loc = parseGeo(payload.new.location);
			if (loc) setMechanicLoc(loc);
		}).subscribe();
		return () => {
			mounted = false;
			supabase.removeChannel(channel);
		};
	}, [active?.mechanic_id]);
	async function requestHelp() {
		if (!user || !pos) return;
		setSubmitting(true);
		try {
			const { data, error } = await supabase.from("rescue_requests").insert({
				driver_id: user.id,
				pickup_lat: pos.lat,
				pickup_lng: pos.lng,
				pickup_location: `SRID=4326;POINT(${pos.lng} ${pos.lat})`,
				issue: issue || null,
				vehicle_info: vehicle || null,
				status: "pending"
			}).select("*").single();
			if (error) throw error;
			setActive(data);
			toast.success("Help request sent — finding nearest mechanic…");
		} catch (e) {
			toast.error(e.message ?? "Failed to send request");
		} finally {
			setSubmitting(false);
		}
	}
	async function cancel() {
		if (!active) return;
		await supabase.from("rescue_requests").update({ status: "cancelled" }).eq("id", active.id);
		setActive(null);
		setMechanicLoc(null);
	}
	if (loading || !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen bg-background flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin" })
	});
	const center = pos ?? {
		lat: 19.076,
		lng: 72.8777
	};
	const markers = [];
	if (pos) markers.push({
		id: "me",
		lat: pos.lat,
		lng: pos.lng,
		color: "destructive"
	});
	if (mechanicLoc) markers.push({
		id: "mech",
		lat: mechanicLoc.lat,
		lng: mechanicLoc.lng,
		color: "accent"
	});
	const dist = pos && mechanicLoc ? haversine(pos.lat, pos.lng, mechanicLoc.lat, mechanicLoc.lng) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background text-foreground flex flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-w-6xl mx-auto px-4 h-14 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-8 w-8 rounded-lg bg-primary flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "h-4 w-4 text-primary-foreground" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-bold",
							children: "RoadRescue"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground ml-2",
							children: "Driver"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => supabase.auth.signOut(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" })
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 grid lg:grid-cols-[1fr_400px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-[50vh] lg:h-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RescueMap, {
					center,
					markers,
					zoom: 15
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-5 lg:border-l border-border overflow-y-auto",
				children: !active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-5 bg-card border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xl font-bold mb-1",
							children: "Need a mechanic?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground mb-4",
							children: "We'll auto-share your GPS location."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-sm mb-4 p-3 rounded-lg bg-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-primary" }), pos ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								pos.lat.toFixed(5),
								", ",
								pos.lng.toFixed(5)
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: "Locating you…"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 mb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "vehicle",
								children: "Vehicle"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "vehicle",
								placeholder: "e.g. Honda City, white",
								value: vehicle,
								onChange: (e) => setVehicle(e.target.value)
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "issue",
								children: "What's wrong?"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "issue",
								placeholder: "Flat tire, won't start, overheating…",
								value: issue,
								onChange: (e) => setIssue(e.target.value),
								rows: 3
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: requestHelp,
							disabled: !pos || submitting,
							size: "lg",
							className: "w-full text-base h-14",
							children: [submitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin mr-2" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5 mr-2" }), "Request Help Now"]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-5 bg-card border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `px-2.5 py-1 rounded-full text-xs font-semibold ${active.status === "pending" ? "bg-primary/15 text-primary" : active.status === "accepted" || active.status === "in_progress" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`,
								children: active.status.replace("_", " ").toUpperCase()
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "ghost",
								onClick: cancel,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
							})]
						}),
						active.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center py-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-8 w-8 animate-spin mx-auto text-primary mb-3" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: "Finding nearest mechanic…"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground mt-1",
									children: "Hang tight, this is fast."
								})
							]
						}),
						active.mechanic_id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground uppercase tracking-wide",
								children: "Your mechanic"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-bold text-lg",
								children: mechanicName
							})] }), dist !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 p-3 rounded-lg bg-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmtKm(dist) }), " away"]
								})]
							})]
						}),
						active.issue && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 pt-4 border-t border-border",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground uppercase",
								children: "Issue"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: active.issue
							})]
						})
					]
				})
			})]
		})]
	});
}
function parseGeo(loc) {
	if (!loc) return null;
	if (typeof loc === "object" && loc.coordinates) return {
		lng: loc.coordinates[0],
		lat: loc.coordinates[1]
	};
	if (typeof loc === "string") try {
		const hex = loc;
		const bytes = [];
		for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
		const buf = new Uint8Array(bytes).buffer;
		const dv = new DataView(buf);
		const lng = dv.getFloat64(9, true);
		const lat = dv.getFloat64(17, true);
		if (!isNaN(lat) && !isNaN(lng)) return {
			lat,
			lng
		};
	} catch {}
	return null;
}
function haversine(lat1, lng1, lat2, lng2) {
	const R = 6371e3;
	const toRad = (d) => d * Math.PI / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}
//#endregion
export { DriverPage as component };
