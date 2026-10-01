import { TSS_SERVER_FUNCTION, createServerFn } from "./server-CM4xYUZq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/maps.functions-DKclewLX.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getMapsApiKey_createServerFn_handler = createServerRpc({
	id: "b67745be7a24e3fc5bf8b67f2799fd25db3b9ca6e1976241fc5deffd854ec04a",
	name: "getMapsApiKey",
	filename: "src/lib/maps.functions.ts"
}, (opts) => getMapsApiKey.__executeServer(opts));
var getMapsApiKey = createServerFn({ method: "GET" }).handler(getMapsApiKey_createServerFn_handler, async () => {
	return { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "" };
});
//#endregion
export { getMapsApiKey_createServerFn_handler };
