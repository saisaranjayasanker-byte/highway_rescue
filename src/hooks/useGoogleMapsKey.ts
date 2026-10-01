import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMapsApiKey } from "@/lib/maps.functions";

export function useGoogleMapsKey() {
  const fn = useServerFn(getMapsApiKey);
  return useQuery({
    queryKey: ["maps-api-key"],
    queryFn: () => fn(),
    staleTime: Infinity,
  });
}
