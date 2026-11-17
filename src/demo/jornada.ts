import type { Activity, PunchSegment, WorkDay } from "./types";

// Regras de jornada usadas nos alertas. Sao as da Lei 13.103/2015 e do CTB (art. 67-C)
// em forma simplificada. A decisao do STF na ADI 5322 (2023) passou a contar o tempo de
// espera como jornada e limitou o fracionamento do descanso; por isso a espera entra no
// total. Antes de usar como ponto oficial, validar com advogado trabalhista e com a
// Portaria MTE 671/2021 (REP-P).
export const RULES = {
  maxContinuousDrivingMin: 330, // 5h30
  warnContinuousDrivingMin: 270, // aviso aos 4h30
  pauseToResetMin: 30,
  normalDayMin: 480, // 8h
  maxExtraLegalMin: 120, // +2h
  maxExtraAgreementMin: 240, // +4h por convencao coletiva
  minMealMin: 60,
  mealRequiredAfterMin: 360,
  minInterDayMin: 660, // 11h
} as const;

export const ACTIVITY_LABEL: Record<Activity, string> = {
  fora: "Fora da jornada",
  direcao: "Direcao",
  espera: "Espera",
  carga_descarga: "Carga e descarga",
  refeicao: "Refeicao",
  descanso: "Descanso",
  trabalho: "Outros trabalhos",
};

export const ACTIVITY_HINT: Record<Activity, string> = {
  fora: "Toque em iniciar jornada",
  direcao: "Conta como direcao e jornada",
  espera: "Fila, portaria, aguardando nota. Conta como jornada",
  carga_descarga: "Acompanhando carga ou descarga",
  refeicao: "Intervalo de refeicao, nao conta como jornada",
  descanso: "Pausa de direcao, nao conta como jornada",
  trabalho: "Checklist, conferencia, prestacao de contas",
};

const COUNTS_AS_WORK: Record<Exclude<Activity, "fora">, boolean> = {
  direcao: true,
  espera: true,
  carga_descarga: true,
  trabalho: true,
  refeicao: false,
  descanso: false,
};

function ms(value?: string) {
  return value ? new Date(value).getTime() : Number.NaN;
}

function segmentMinutes(segment: PunchSegment, now: number) {
  const end = segment.endAt ? ms(segment.endAt) : now;
  return Math.max(0, (end - ms(segment.startAt)) / 60_000);
}

export type JornadaAlert = {
  code: string;
  level: "info" | "aviso" | "violacao";
  title: string;
  detail: string;
};

export type JornadaSummary = {
  current: Activity;
  currentSince?: string;
  totals: Record<Exclude<Activity, "fora">, number>;
  workedMin: number;
  extraMin: number;
  continuousDrivingMin: number;
  drivingLeftMin: number;
  mealDone: boolean;
  interDayMin?: number;
  alerts: JornadaAlert[];
};

export function currentSegment(day?: WorkDay) {
  if (!day) return undefined;
  const last = day.segments[day.segments.length - 1];
  return last && !last.endAt ? last : undefined;
}

export function summarize(
  day: WorkDay | undefined,
  previousDayEndedAt: string | undefined,
  now = Date.now(),
): JornadaSummary {
  const totals = {
    direcao: 0,
    espera: 0,
    carga_descarga: 0,
    refeicao: 0,
    descanso: 0,
    trabalho: 0,
  };
  if (!day || !day.startedAt) {
    return {
      current: "fora",
      totals,
      workedMin: 0,
      extraMin: 0,
      continuousDrivingMin: 0,
      drivingLeftMin: RULES.maxContinuousDrivingMin,
      mealDone: false,
      alerts: [],
    };
  }

  let continuous = 0;
  let pauseAccum = 0;
  for (const seg of day.segments) {
    const minutes = segmentMinutes(seg, now);
    totals[seg.activity] += minutes;
    if (seg.activity === "direcao") {
      continuous += minutes;
      pauseAccum = 0;
    } else {
      pauseAccum += minutes;
      if (pauseAccum >= RULES.pauseToResetMin) continuous = 0;
    }
  }

  const workedMin = (Object.keys(totals) as Array<keyof typeof totals>).reduce(
    (sum, key) => sum + (COUNTS_AS_WORK[key] ? totals[key] : 0),
    0,
  );
  const extraMin = Math.max(0, workedMin - RULES.normalDayMin);
  const current = day.endedAt ? "fora" : (currentSegment(day)?.activity ?? "trabalho");
  const mealDone = day.segments.some(
    (s) => s.activity === "refeicao" && segmentMinutes(s, now) >= RULES.minMealMin,
  );

  const alerts: JornadaAlert[] = [];
  let interDayMin: number | undefined;
  if (previousDayEndedAt) {
    interDayMin = (ms(day.startedAt) - ms(previousDayEndedAt)) / 60_000;
    if (interDayMin < RULES.minInterDayMin) {
      alerts.push({
        code: "interjornada",
        level: "violacao",
        title: "Interjornada menor que 11 horas",
        detail: `Descanso entre jornadas foi de ${fmtMin(interDayMin)}. O minimo e 11h.`,
      });
    }
  }

  if (continuous >= RULES.maxContinuousDrivingMin) {
    alerts.push({
      code: "direcao_continua",
      level: "violacao",
      title: "Passou de 5h30 de direcao sem pausa",
      detail: `Voce esta dirigindo ha ${fmtMin(continuous)}. Pare agora para 30 minutos de descanso.`,
    });
  } else if (continuous >= RULES.warnContinuousDrivingMin) {
    alerts.push({
      code: "direcao_continua_aviso",
      level: "aviso",
      title: "Pausa de direcao chegando",
      detail: `Faltam ${fmtMin(RULES.maxContinuousDrivingMin - continuous)} para o limite de 5h30. Programe a parada.`,
    });
  }

  if (workedMin >= RULES.normalDayMin + RULES.maxExtraAgreementMin) {
    alerts.push({
      code: "jornada_maxima",
      level: "violacao",
      title: "Jornada passou de 12 horas",
      detail: "Limite de horas extras da convencao atingido. Encerre a jornada.",
    });
  } else if (workedMin >= RULES.normalDayMin + RULES.maxExtraLegalMin) {
    alerts.push({
      code: "extra_legal",
      level: "aviso",
      title: "Mais de 2 horas extras",
      detail: "Acima de 2h extras so com convencao coletiva. A central foi avisada.",
    });
  } else if (workedMin >= RULES.normalDayMin) {
    alerts.push({
      code: "hora_extra",
      level: "info",
      title: "Em hora extra",
      detail: `${fmtMin(extraMin)} de hora extra hoje.`,
    });
  }

  if (!mealDone && workedMin >= RULES.mealRequiredAfterMin && current !== "refeicao") {
    alerts.push({
      code: "refeicao",
      level: "aviso",
      title: "Falta o intervalo de refeicao",
      detail: "Com mais de 6h de jornada, faca o intervalo de 1 hora.",
    });
  }

  const currentSince = currentSegment(day)?.startAt;
  return {
    current,
    ...(currentSince ? { currentSince } : {}),
    totals,
    workedMin,
    extraMin,
    continuousDrivingMin: continuous,
    drivingLeftMin: Math.max(0, RULES.maxContinuousDrivingMin - continuous),
    mealDone,
    ...(interDayMin != null ? { interDayMin } : {}),
    alerts,
  };
}

export function fmtMin(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function fmtClock(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
