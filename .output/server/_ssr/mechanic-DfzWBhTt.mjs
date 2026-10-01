import { __toESM } from "../_runtime.mjs";
import { require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { Button, cn, supabase } from "./button-uqrHs0P3.mjs";
import { Card, Label } from "./card-BX8d_BdB.mjs";
import { Link, useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { toast } from "../_libs/sonner.mjs";
import { Bell, CircleCheck, CircleX, LoaderCircle, LogOut, MapPin, Wrench } from "../_libs/lucide-react.mjs";
import { RescueMap, fmtKm, getCurrentPosition, watchPosition } from "./geo-zjYgNgTz.mjs";
import { useAuth } from "./useAuth-BSZNoc_O.mjs";
import { Root, Thumb } from "../_libs/@radix-ui/react-switch+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mechanic-DfzWBhTt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Root.displayName;
function MechanicPage() {
	const { user, profile, loading } = useAuth();
	const nav = useNavigate();
	const [pos, setPos] = (0, import_react.useState)(null);
	const [available, setAvailable] = (0, import_react.useState)(true);
	const [pending, setPending] = (0, import_react.useState)([]);
	const [accepted, setAccepted] = (0, import_react.useState)(null);
	const [driverName, setDriverName] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!loading && !user) nav({ to: "/auth" });
		if (!loading && profile && profile.role === "driver") nav({ to: "/driver" });
	}, [
		loading,
		user,
		profile,
		nav
	]);
	(0, import_react.useEffect)(() => {
		if (!user || !profile || profile.role !== "mechanic") return;
		(async () => {
			const { data } = await supabase.from("mechanics").select("is_available").eq("user_id", user.id).maybeSingle();
			if (!data) await supabase.from("mechanics").insert({
				user_id: user.id,
				shop_name: profile.display_name ?? "Mechanic",
				is_available: true
			});
			else setAvailable(data.is_available);
		})();
	}, [user, profile]);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		const stop = watchPosition(async (p) => {
			const next = {
				lat: p.coords.latitude,
				lng: p.coords.longitude
			};
			setPos(next);
			await supabase.from("mechanics").update({
				location: `SRID=4326;POINT(${next.lng} ${next.lat})`,
				last_seen: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("user_id", user.id);
		});
		getCurrentPosition().then((p) => setPos({
			lat: p.coords.latitude,
			lng: p.coords.longitude
		})).catch(() => toast.error("Enable location to receive nearby requests."));
		return stop;
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		loadPending();
		loadAccepted();
		const ch = supabase.channel("rescue-feed").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "rescue_requests"
		}, () => {
			loadPending();
			loadAccepted();
		}).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
		async function loadPending() {
			const { data } = await supabase.from("rescue_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(20);
			setPending(data ?? []);
		}
		async function loadAccepted() {
			const { data } = await supabase.from("rescue_requests").select("*").eq("mechanic_id", user.id).in("status", ["accepted", "in_progress"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
			setAccepted(data ?? null);
			if (data) {
				const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", data.driver_id).maybeSingle();
				setDriverName(prof?.display_name ?? "Driver");
			}
		}
	}, [user]);
	async function toggleAvailable(v) {
		setAvailable(v);
		if (!user) return;
		await supabase.from("mechanics").update({ is_available: v }).eq("user_id", user.id);
	}
	async function accept(r) {
		if (!user) return;
		const { error } = await supabase.from("rescue_requests").update({
			mechanic_id: user.id,
			status: "accepted"
		}).eq("id", r.id).eq("status", "pending");
		if (error) toast.error(error.message);
		else toast.success("Request accepted — heading to driver.");
	}
	async function reject(r) {
		setPending((p) => p.filter((x) => x.id !== r.id));
	}
	async function complete() {
		if (!accepted) return;
		await supabase.from("rescue_requests").update({ status: "completed" }).eq("id", accepted.id);
		setAccepted(null);
		toast.success("Job marked complete.");
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
		color: "primary"
	});
	if (accepted) markers.push({
		id: "driver",
		lat: accepted.pickup_lat,
		lng: accepted.pickup_lng,
		color: "destructive"
	});
	pending.forEach((r) => markers.push({
		id: r.id,
		lat: r.pickup_lat,
		lng: r.pickup_lng,
		color: "accent"
	}));
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
							children: "Mechanic"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							id: "avail",
							checked: available,
							onCheckedChange: toggleAvailable
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "avail",
							className: "text-sm",
							children: available ? "Available" : "Off"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => supabase.auth.signOut(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" })
					})]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 grid lg:grid-cols-[1fr_400px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-[50vh] lg:h-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RescueMap, {
					center,
					markers,
					zoom: 13
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-5 lg:border-l border-border overflow-y-auto space-y-4",
				children: accepted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-5 bg-card border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center justify-between mb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent",
								children: "ON THE WAY"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground uppercase tracking-wide",
							children: "Driver"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-bold text-lg mb-3",
							children: driverName
						}),
						accepted.vehicle_info && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm mb-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: "Vehicle: "
							}), accepted.vehicle_info]
						}),
						accepted.issue && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm mb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: "Issue: "
							}), accepted.issue]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 p-3 rounded-lg bg-muted mb-4 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-destructive" }),
								accepted.pickup_lat.toFixed(5),
								", ",
								accepted.pickup_lng.toFixed(5),
								pos && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto font-semibold",
									children: fmtKm(haversine(pos.lat, pos.lng, accepted.pickup_lat, accepted.pickup_lng))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: complete,
							className: "w-full",
							size: "lg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 mr-2" }), " Mark Complete"]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-bold",
								children: "Incoming requests"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-auto text-xs text-muted-foreground",
								children: [pending.length, " waiting"]
							})
						]
					}),
					pending.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "p-6 text-center bg-card border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted-foreground text-sm",
							children: available ? "No active requests nearby. We'll alert you." : "You're offline. Toggle availability to receive requests."
						})
					}),
					pending.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-4 bg-card border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3 mb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [r.vehicle_info && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold",
								children: r.vehicle_info
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: r.issue ?? "No details"
							})] }), pos && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-semibold text-accent shrink-0",
								children: fmtKm(haversine(pos.lat, pos.lng, r.pickup_lat, r.pickup_lng))
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2 mt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => accept(r),
								size: "sm",
								className: "flex-1",
								disabled: !available,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 mr-1" }), " Accept"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: () => reject(r),
								size: "sm",
								variant: "outline",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4" })
							})]
						})]
					}, r.id))
				] })
			})]
		})]
	});
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
export { MechanicPage as component };
