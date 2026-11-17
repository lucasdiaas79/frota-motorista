import { fullToFull } from "./fuel";
import type { DemoState } from "./types";

// Nota do motorista com dados que a Frotak ja tem (abastecimento, rastreador e etapas),
// sem aparelho na rede CAN. Os pesos sao configuraveis pela transportadora.
export const SCORE_WEIGHTS = {
  consumo: 30,
  velocidade: 20,
  ociosidade: 15,
  pontualidade: 15,
  checklist: 10,
  documentos: 10,
} as const;

export const PRIZE_TIERS = [
  { min: 90, amount: 400, label: "Ouro" },
  { min: 80, amount: 250, label: "Prata" },
  { min: 70, amount: 120, label: "Bronze" },
] as const;

export type ScoreLine = {
  key: keyof typeof SCORE_WEIGHTS;
  label: string;
  points: number;
  max: number;
  why: string;
};

export function computeScore(state: DemoState) {
  // Ligado na Frotak: a nota vem calculada do banco (private.driver_score).
  const server = state.live?.score;
  if (server) {
    const lines = server.lines.map((l) => ({
      key: l.key as ScoreLine["key"],
      label: l.label,
      points: l.points,
      max: l.max,
      why: l.available ? l.why : `Sem dado: ${l.why}`,
    }));
    const tier = server.tier
      ? (PRIZE_TIERS.find((t) => t.min === server.tier!.min) ?? { ...server.tier })
      : undefined;
    return { total: server.total, lines, tier, kmPerLiter: server.kmPerLiter ?? 0 };
  }
  const lines: ScoreLine[] = [];
  const kml = fullToFull(state.fuelRecords).average ?? 0;
  const target = state.vehicle.kmPerLiterTarget;
  const consumoRatio = target > 0 ? Math.min(1.1, kml / target) : 0;
  const consumoPts = Math.round(
    SCORE_WEIGHTS.consumo * Math.max(0, Math.min(1, (consumoRatio - 0.85) / 0.2)),
  );
  lines.push({
    key: "consumo",
    label: "Consumo (km/l)",
    points: consumoPts,
    max: SCORE_WEIGHTS.consumo,
    why: `Media ${kml.toFixed(2)} km/l, meta ${target.toFixed(1)} km/l (${Math.round(consumoRatio * 100)}% da meta).`,
  });

  const speeding = state.telemetry.filter((t) => t.kind === "excesso_velocidade").length;
  const harsh = state.telemetry.filter((t) => t.kind === "frenagem_brusca").length;
  const velPts = Math.max(0, SCORE_WEIGHTS.velocidade - speeding * 4 - harsh * 2);
  lines.push({
    key: "velocidade",
    label: "Velocidade e frenagem",
    points: velPts,
    max: SCORE_WEIGHTS.velocidade,
    why: `${speeding} excesso de velocidade e ${harsh} frenagem brusca no mes (-4 e -2 cada).`,
  });

  const idle = state.telemetry.filter((t) => t.kind === "motor_ocioso");
  const unjustified = idle.filter((t) => !t.justified).reduce((s, t) => s + (t.minutes ?? 0), 0);
  const justified = idle.filter((t) => t.justified).reduce((s, t) => s + (t.minutes ?? 0), 0);
  const idlePts = Math.max(0, SCORE_WEIGHTS.ociosidade - Math.round(unjustified / 10));
  lines.push({
    key: "ociosidade",
    label: "Motor ligado parado",
    points: idlePts,
    max: SCORE_WEIGHTS.ociosidade,
    why: `${unjustified} min sem motivo (-1 a cada 10 min). ${justified} min em fila, carga ou descarga nao contam.`,
  });

  const trip = state.trips.find((t) => t.id === state.activeTripId);
  const finished = trip?.stops.filter((s) => s.kind === "entrega" && s.arrivedAt) ?? [];
  const late = finished.filter((s) => {
    if (!s.window || !s.arrivedAt) return false;
    const d = new Date(s.arrivedAt);
    const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return hhmm > s.window.to;
  }).length;
  const pontPts = Math.max(0, SCORE_WEIGHTS.pontualidade - 1 - late * 3);
  lines.push({
    key: "pontualidade",
    label: "Pontualidade nas janelas",
    points: pontPts,
    max: SCORE_WEIGHTS.pontualidade,
    why: late
      ? `${late} chegada fora da janela hoje (-3 cada).`
      : "Chegadas dentro da janela neste mes, com 1 atraso na semana passada.",
  });

  const checklistDone = state.checklists.length > 0;
  const chkPts = checklistDone ? SCORE_WEIGHTS.checklist : SCORE_WEIGHTS.checklist - 4;
  lines.push({
    key: "checklist",
    label: "Checklist do veiculo",
    points: chkPts,
    max: SCORE_WEIGHTS.checklist,
    why: checklistDone
      ? "Checklist de saida feito hoje."
      : "Checklist de hoje ainda nao foi feito (-4).",
  });

  const now = Date.now();
  const expired = state.documents.filter((d) => new Date(d.expiresAt).getTime() < now).length;
  const docPts = Math.max(0, SCORE_WEIGHTS.documentos - expired * 5);
  lines.push({
    key: "documentos",
    label: "Documentos e canhotos",
    points: docPts,
    max: SCORE_WEIGHTS.documentos,
    why: expired
      ? `${expired} documento vencido (-5 cada).`
      : "Documentos em dia e canhotos enviados.",
  });

  const total = lines.reduce((s, l) => s + l.points, 0);
  const tier = PRIZE_TIERS.find((t) => total >= t.min);
  return { total, lines, tier, kmPerLiter: kml };
}
