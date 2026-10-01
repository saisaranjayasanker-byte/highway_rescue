import { __toESM } from "../_runtime.mjs";
import { require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { supabase } from "./button-uqrHs0P3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useAuth-BSZNoc_O.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useAuth() {
	const [session, setSession] = (0, import_react.useState)(null);
	const [user, setUser] = (0, import_react.useState)(null);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
			setSession(s);
			setUser(s?.user ?? null);
			if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
			else setProfile(null);
		});
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session);
			setUser(data.session?.user ?? null);
			if (data.session?.user) loadProfile(data.session.user.id);
			setLoading(false);
		});
		return () => sub.subscription.unsubscribe();
	}, []);
	async function loadProfile(uid) {
		const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
		setProfile(data);
	}
	return {
		session,
		user,
		profile,
		loading,
		reloadProfile: () => user && loadProfile(user.id)
	};
}
//#endregion
export { useAuth };
