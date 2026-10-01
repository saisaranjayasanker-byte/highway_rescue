export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export function watchPosition(cb: (pos: GeolocationPosition) => void) {
  if (!("geolocation" in navigator)) return () => {};
  const id = navigator.geolocation.watchPosition(cb, console.error, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000,
  });
  return () => navigator.geolocation.clearWatch(id);
}

export function fmtKm(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
