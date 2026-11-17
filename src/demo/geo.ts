import type { GeoPoint } from "./types";

/**
 * Pega a posicao do celular. Sem permissao ou sem GPS em ate 2,5 s, usa a posicao
 * simulada (normalmente a do local da etapa) e marca a origem como "simulado".
 */
export function captureGeo(fallback: { lat: number; lng: number }): Promise<GeoPoint> {
  const simulated: GeoPoint = {
    lat: fallback.lat + (Math.random() - 0.5) * 0.0008,
    lng: fallback.lng + (Math.random() - 0.5) * 0.0008,
    accuracy: 25,
    source: "simulado",
  };
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(simulated);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(simulated), 2500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps",
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(simulated);
      },
      { enableHighAccuracy: true, timeout: 2400, maximumAge: 30_000 },
    );
  });
}

export function fmtGeo(geo?: GeoPoint) {
  if (!geo) return "Sem posicao";
  return `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${geo.source === "simulado" ? " (simulada)" : ""}`;
}

export function mapsLink(geo: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}`;
}

export function wazeLink(geo: { lat: number; lng: number }) {
  return `https://waze.com/ul?ll=${geo.lat},${geo.lng}&navigate=yes`;
}
