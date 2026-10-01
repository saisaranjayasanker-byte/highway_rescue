import { createServerFn } from "@tanstack/react-start";

export const getMapsApiKey = createServerFn({ method: "GET" }).handler(async () => {
  return { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "" };
});
