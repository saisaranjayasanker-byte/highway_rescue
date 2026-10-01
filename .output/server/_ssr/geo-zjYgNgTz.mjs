import { __toESM } from "../_runtime.mjs";
import { require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { isRedirect, useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { LoaderCircle } from "../_libs/lucide-react.mjs";
import { TSS_SERVER_FUNCTION, createServerFn, getServerFnById } from "./server-CM4xYUZq.mjs";
import { useQuery } from "../_libs/tanstack__react-query.mjs";
import { GoogleMap, Marker, useJsApiLoader } from "../_libs/react-google-maps__api.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/geo-zjYgNgTz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getMapsApiKey = createServerFn({ method: "GET" }).handler(createSsrRpc("b67745be7a24e3fc5bf8b67f2799fd25db3b9ca6e1976241fc5deffd854ec04a"));
function useGoogleMapsKey() {
	const fn = useServerFn(getMapsApiKey);
	return useQuery({
		queryKey: ["maps-api-key"],
		queryFn: () => fn(),
		staleTime: Infinity
	});
}
var containerStyle = {
	width: "100%",
	height: "100%"
};
function RescueMap({ center, markers = [], zoom = 14 }) {
	const { data, isLoading } = useGoogleMapsKey();
	const apiKey = data?.apiKey ?? "";
	if (isLoading || !apiKey) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-full w-full items-center justify-center bg-muted",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-muted-foreground" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapInner, {
		apiKey,
		center,
		markers,
		zoom
	});
}
function MapInner({ apiKey, center, markers, zoom }) {
	const { isLoaded, loadError } = useJsApiLoader({
		id: "google-map-script",
		googleMapsApiKey: apiKey
	});
	if (loadError) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-full w-full items-center justify-center bg-muted text-sm text-destructive",
		children: "Failed to load map"
	});
	if (!isLoaded) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-full w-full items-center justify-center bg-muted",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-muted-foreground" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleMap, {
		mapContainerStyle: containerStyle,
		center,
		zoom,
		options: {
			disableDefaultUI: true,
			zoomControl: true,
			styles: darkMapStyle
		},
		children: markers.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marker, {
			position: {
				lat: m.lat,
				lng: m.lng
			},
			label: m.label ? {
				text: m.label,
				color: "#fff",
				fontSize: "12px"
			} : void 0,
			icon: {
				path: google.maps.SymbolPath.CIRCLE,
				scale: 10,
				fillColor: pinColor(m.color),
				fillOpacity: 1,
				strokeColor: "#fff",
				strokeWeight: 2
			}
		}, m.id))
	});
}
function pinColor(c) {
	if (c === "destructive") return "#ef4444";
	if (c === "accent") return "#f59e0b";
	return "#22c55e";
}
var darkMapStyle = [
	{
		elementType: "geometry",
		stylers: [{ color: "#1f2937" }]
	},
	{
		elementType: "labels.text.stroke",
		stylers: [{ color: "#1f2937" }]
	},
	{
		elementType: "labels.text.fill",
		stylers: [{ color: "#9ca3af" }]
	},
	{
		featureType: "road",
		elementType: "geometry",
		stylers: [{ color: "#374151" }]
	},
	{
		featureType: "road.highway",
		elementType: "geometry",
		stylers: [{ color: "#f59e0b" }]
	},
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#0f172a" }]
	},
	{
		featureType: "poi",
		stylers: [{ visibility: "off" }]
	}
];
function getCurrentPosition() {
	return new Promise((resolve, reject) => {
		if (!("geolocation" in navigator)) {
			reject(/* @__PURE__ */ new Error("Geolocation not supported"));
			return;
		}
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			timeout: 1e4,
			maximumAge: 0
		});
	});
}
function watchPosition(cb) {
	if (!("geolocation" in navigator)) return () => {};
	const id = navigator.geolocation.watchPosition(cb, console.error, {
		enableHighAccuracy: true,
		maximumAge: 5e3,
		timeout: 15e3
	});
	return () => navigator.geolocation.clearWatch(id);
}
function fmtKm(meters) {
	if (meters < 1e3) return `${Math.round(meters)} m`;
	return `${(meters / 1e3).toFixed(1)} km`;
}
//#endregion
export { RescueMap, fmtKm, getCurrentPosition, watchPosition };
