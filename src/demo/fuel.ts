import type { DemoState, FuelAlert, FuelRecord, FuelStation } from "./types";

export type FuelInput = {
  stationId?: string;
  stationName: string;
  odometer: number;
  dieselLiters: number;
  dieselPrice: number;
  arlaLiters: number;
  arlaPrice: number;
  tankFull: boolean;
  at: number;
};

/**
 * Km/l "tanque cheio a tanque cheio": so conta entre dois abastecimentos de tanque cheio,
 * somando os litros de tudo que entrou depois do primeiro ate o segundo. Abastecimento
 * parcial no meio nao distorce, porque os litros dele entram na soma do intervalo.
 */
export function fullToFull(records: FuelRecord[]) {
  const sorted = [...records]
    .filter((r) => r.dieselLiters > 0 && r.odometer > 0)
    .sort((a, b) => a.odometer - b.odometer);
  const intervals: { from: FuelRecord; to: FuelRecord; km: number; liters: number; kmPerLiter: number }[] = [];
  let anchor: FuelRecord | undefined;
  let liters = 0;
  for (const record of sorted) {
    if (!anchor) {
      if (record.tankFull) anchor = record;
      continue;
    }
    liters += record.dieselLiters;
    if (record.tankFull) {
      const km = record.odometer - anchor.odometer;
      if (km > 0 && liters > 0) intervals.push({ from: anchor, to: record, km, liters, kmPerLiter: km / liters });
      anchor = record;
      liters = 0;
    }
  }
  const km = intervals.reduce((s, i) => s + i.km, 0);
  const l = intervals.reduce((s, i) => s + i.liters, 0);
  return { intervals, average: l > 0 ? km / l : null, km, liters: l };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestStations(stations: FuelStation[], from?: { lat: number; lng: number }) {
  return [...stations]
    .map((s) => ({ station: s, km: from ? distanceKm(from, s.geo) : null }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
}

export function lastRecord(records: FuelRecord[]) {
  return [...records].sort((a, b) => b.odometer - a.odometer)[0];
}

/** Regras conferidas na hora do registro. "bloqueio" impede salvar. */
export function validateFuel(input: FuelInput, state: DemoState): FuelAlert[] {
  const alerts: FuelAlert[] = [];
  const last = lastRecord(state.fuelRecords);
  const station = state.stations.find((s) => s.id === input.stationId);

  if (last && input.odometer <= last.odometer) {
    alerts.push({
      code: "odometro_menor",
      level: "bloqueio",
      message: `Odometro ${input.odometer.toLocaleString("pt-BR")} km e menor ou igual ao ultimo (${last.odometer.toLocaleString("pt-BR")} km).`,
    });
  }

  if (last && input.odometer > last.odometer) {
    const km = input.odometer - last.odometer;
    const hours = Math.max(0.5, (input.at - new Date(last.at).getTime()) / 3_600_000);
    if (km / hours > 90) {
      alerts.push({
        code: "odometro_impossivel",
        level: "aviso",
        message: `${km.toLocaleString("pt-BR")} km em ${Math.round(hours)}h desde o ultimo abastecimento. Confira o odometro.`,
      });
    }
    const tracker = state.sim.trackerKmSinceLastFuel;
    if (tracker > 0 && Math.abs(km - tracker) / tracker > 0.12 && Math.abs(km - tracker) > 15) {
      alerts.push({
        code: "rastreador_diverge",
        level: "aviso",
        message: `Rastreador marcou ${tracker} km desde o ultimo abastecimento, o odometro informado da ${km} km.`,
      });
    }
    if (hours < 4 && km < 80) {
      alerts.push({
        code: "abastecimento_proximo",
        level: "aviso",
        message: `Ultimo abastecimento foi ha ${Math.round(hours * 60)} minutos e ${km} km.`,
      });
    }
  }

  if (input.dieselLiters > state.vehicle.tankLiters) {
    alerts.push({
      code: "acima_tanque",
      level: "bloqueio",
      message: `${input.dieselLiters} L passa da capacidade do tanque (${state.vehicle.tankLiters} L).`,
    });
  }

  if (station && input.dieselPrice > station.negotiatedDieselPrice + 0.02) {
    alerts.push({
      code: "preco_acima",
      level: "aviso",
      message: `Preco R$ ${input.dieselPrice.toFixed(2)} acima do negociado (R$ ${station.negotiatedDieselPrice.toFixed(2)}). A central vai conferir.`,
    });
  }

  if (input.dieselLiters > 0 && input.arlaLiters > 0) {
    const ratio = input.arlaLiters / input.dieselLiters;
    if (ratio > 0.08) {
      alerts.push({
        code: "arla_fora",
        level: "aviso",
        message: `ARLA de ${(ratio * 100).toFixed(1)}% do diesel. O normal fica entre 3% e 5%.`,
      });
    }
  }

  return alerts;
}

export const PAYMENT_LABEL = {
  cartao_frota: "Cartao frota",
  a_prazo_posto: "A prazo no posto",
  adiantamento: "Adiantamento (dinheiro)",
  pix: "PIX",
} as const;
