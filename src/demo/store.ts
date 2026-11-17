import { useSyncExternalStore } from "react";
import { createSeed, localDate, uid } from "./seed";
import { currentSegment } from "./jornada";
import type {
  Activity,
  ChecklistRun,
  DemoState,
  FuelRecord,
  GeoPoint,
  Occurrence,
  OperationKind,
  PunchSource,
  Stop,
  Trip,
  WorkDay,
} from "./types";

// Store do tenant de demonstracao. Fica so no navegador (localStorage).
// Toda acao que gravaria no banco passa por `commit`, que respeita o modo "sem internet":
// sem sinal, o registro fica na fila com a hora real e sobe quando o sinal volta.

const KEY = "frotak-demo-ambev-v1";
const listeners = new Set<() => void>();
let state: DemoState | null = null;

function load(): DemoState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.version === 1) {
          state = parsed;
          return state;
        }
      }
    } catch {
      // armazenamento indisponivel: segue com dados novos
    }
  }
  state = createSeed();
  return state;
}

function save() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento a demonstracao continua em memoria
  }
}

function emit() {
  save();
  for (const l of listeners) l();
}

function set(updater: (draft: DemoState) => DemoState) {
  state = updater(load());
  emit();
}

export function getState() {
  return load();
}

export function useDemo<T>(selector: (s: DemoState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(load()),
    () => selector(load()),
  );
}

const nowIso = () => new Date().toISOString();

/** Marca o registro como pendente quando o modo sem internet esta ligado. */
function commit(draft: DemoState, label: string): { draft: DemoState; synced: boolean } {
  if (!draft.sim.offline) return { draft, synced: true };
  return {
    draft: { ...draft, queue: [...draft.queue, { id: uid("q"), at: nowIso(), label }] },
    synced: false,
  };
}

// ---------------------------------------------------------------- jornada

export function today(s: DemoState): WorkDay | undefined {
  const date = localDate(Date.now());
  return s.workDays.find((d) => d.date === date);
}

function withToday(s: DemoState, fn: (day: WorkDay) => WorkDay): DemoState {
  const date = localDate(Date.now());
  const existing = s.workDays.find((d) => d.date === date);
  if (!existing) return s;
  return { ...s, workDays: s.workDays.map((d) => (d.date === date ? fn(d) : d)) };
}

export function startDay(geo?: GeoPoint, selfie = false) {
  set((s) => {
    if (today(s)?.startedAt && !today(s)?.endedAt) return s;
    const { draft, synced } = commit(s, "Inicio de jornada");
    const at = nowIso();
    const day: WorkDay = {
      id: uid("day"),
      date: localDate(Date.now()),
      startedAt: at,
      segments: [
        {
          id: uid("seg"),
          activity: "trabalho",
          startAt: at,
          source: "motorista",
          reason: "Inicio de jornada",
          ...(geo ? { geo } : {}),
          selfie,
          synced,
        },
      ],
    };
    const others = draft.workDays.filter((d) => d.date !== day.date);
    return { ...draft, workDays: [...others, day] };
  });
}

export function setActivity(activity: Exclude<Activity, "fora">, source: PunchSource, reason: string, geo?: GeoPoint) {
  set((s) => {
    const day = today(s);
    if (!day?.startedAt || day.endedAt) return s;
    const open = currentSegment(day);
    if (open && open.activity === activity && source !== "etapa") return s;
    const { draft, synced } = commit(s, `Ponto: ${reason}`);
    const at = nowIso();
    return withToday(draft, (d) => ({
      ...d,
      segments: [
        ...d.segments.map((seg) => (seg.endAt ? seg : { ...seg, endAt: at })),
        { id: uid("seg"), activity, startAt: at, source, reason, ...(geo ? { geo } : {}), synced },
      ],
    }));
  });
}

export function endDay(geo?: GeoPoint) {
  set((s) => {
    const day = today(s);
    if (!day?.startedAt || day.endedAt) return s;
    const { draft } = commit(s, "Fim de jornada");
    const at = nowIso();
    void geo;
    return {
      ...withToday(draft, (d) => ({
        ...d,
        endedAt: at,
        segments: d.segments.map((seg) => (seg.endAt ? seg : { ...seg, endAt: at })),
      })),
      previousDayEndedAt: draft.previousDayEndedAt,
    };
  });
}

export function adjustSegment(dayId: string, segmentId: string, newStartAt: string, reason: string) {
  set((s) => ({
    ...s,
    workDays: s.workDays.map((d) => {
      if (d.id !== dayId) return d;
      const idx = d.segments.findIndex((x) => x.id === segmentId);
      if (idx < 0) return d;
      const segments = d.segments.map((seg, i) => {
        if (i === idx)
          return {
            ...seg,
            startAt: newStartAt,
            adjustment: { by: "motorista" as const, reason, originalStartAt: seg.adjustment?.originalStartAt ?? seg.startAt, at: nowIso() },
          };
        if (i === idx - 1) return { ...seg, endAt: newStartAt };
        return seg;
      });
      return { ...d, segments, ...(idx === 0 ? { startedAt: newStartAt } : {}) };
    }),
  }));
}

export function confirmDay(dayId: string) {
  set((s) => ({
    ...s,
    workDays: s.workDays.map((d) => (d.id === dayId ? { ...d, confirmedByDriverAt: nowIso() } : d)),
  }));
}

// ---------------------------------------------------------------- viagem e entregas

export function activeTrip(s: DemoState): Trip | undefined {
  return s.trips.find((t) => t.id === s.activeTripId);
}

function patchTrip(s: DemoState, fn: (t: Trip) => Trip): DemoState {
  return { ...s, trips: s.trips.map((t) => (t.id === s.activeTripId ? fn(t) : t)) };
}

function patchStop(t: Trip, stopId: string, fn: (stop: Stop) => Stop): Trip {
  return { ...t, stops: t.stops.map((st) => (st.id === stopId ? fn(st) : st)) };
}

export function startTrip(odometer: number, geo?: GeoPoint) {
  const s = load();
  const trip = activeTrip(s);
  if (!trip) return;
  if (!today(s)?.startedAt || today(s)?.endedAt) startDay(geo);
  const origin = trip.stops[0]!;
  const atOrigin = trip.kind === "distribuicao";
  set((cur) => {
    const { draft } = commit(cur, "Viagem iniciada");
    return patchTrip(
      { ...draft, vehicle: { ...draft.vehicle, odometer: Math.max(draft.vehicle.odometer, odometer) } },
      (t) =>
        patchStop(
          { ...t, status: "em_andamento", startedAt: nowIso(), startOdometer: odometer, currentStopIndex: 0 },
          origin.id,
          (st) =>
            atOrigin
              ? { ...st, status: "chegou", arrivedAt: nowIso(), arrivalSource: "cerca", ...(geo ? { arrivalGeo: geo } : {}) }
              : { ...st, status: "a_caminho" },
        ),
    );
  });
  if (atOrigin) setActivity("espera", "etapa", `Aguardando doca no ${origin.name}`, geo);
  else setActivity("direcao", "etapa", `Saiu para ${origin.name}`, geo);
}

export function arriveStop(stopId: string, source: "motorista" | "cerca", geo?: GeoPoint) {
  const trip = activeTrip(load());
  const stop = trip?.stops.find((x) => x.id === stopId);
  if (!stop) return;
  set((cur) => {
    const { draft } = commit(cur, `Chegada: ${stop.name}`);
    return patchTrip(draft, (t) =>
      patchStop(t, stopId, (st) => ({
        ...st,
        status: "chegou",
        arrivedAt: nowIso(),
        arrivalSource: source,
        ...(geo ? { arrivalGeo: geo } : {}),
      })),
    );
  });
  setActivity("espera", source === "cerca" ? "cerca" : "etapa", `Chegou: ${stop.name}`, geo);
}

export function startUnload(stopId: string, geo?: GeoPoint) {
  const trip = activeTrip(load());
  const stop = trip?.stops.find((x) => x.id === stopId);
  if (!stop) return;
  set((cur) =>
    patchTrip(commit(cur, `Inicio de ${stop.kind === "origem" ? "carregamento" : "descarga"}`).draft, (t) =>
      patchStop(t, stopId, (st) => ({ ...st, status: "descarregando", unloadStartedAt: nowIso() })),
    ),
  );
  setActivity(
    stop.kind === "retorno" ? "trabalho" : "carga_descarga",
    "etapa",
    stop.kind === "origem" ? `Carregamento: ${stop.name}` : stop.kind === "retorno" ? "Prestacao de contas" : `Descarga: ${stop.name}`,
    geo,
  );
}

export function finishStop(stopId: string, delivered: NonNullable<Stop["delivered"]>, status: "entregue" | "parcial" | "recusada", geo?: GeoPoint) {
  const s = load();
  const trip = activeTrip(s);
  if (!trip) return;
  const idx = trip.stops.findIndex((x) => x.id === stopId);
  const stop = trip.stops[idx];
  if (!stop) return;
  const next = trip.stops[idx + 1];
  set((cur) => {
    const { draft } = commit(cur, `${status === "recusada" ? "Recusa" : "Entrega"}: ${stop.name}`);
    return patchTrip(draft, (t) => {
      let updated = patchStop(t, stopId, (st) => ({
        ...st,
        status,
        finishedAt: nowIso(),
        delivered,
        ...(geo ? { departureGeo: geo } : {}),
      }));
      if (next) {
        updated = patchStop({ ...updated, currentStopIndex: idx + 1 }, next.id, (st) => ({ ...st, status: "a_caminho" }));
      }
      return updated;
    });
  });
  if (next) setActivity("direcao", "etapa", `Saiu de ${stop.name}`, geo);
}

export function finishTrip(endOdometer: number, geo?: GeoPoint) {
  set((cur) => {
    const { draft } = commit(cur, "Viagem finalizada");
    return patchTrip(
      { ...draft, vehicle: { ...draft.vehicle, odometer: Math.max(draft.vehicle.odometer, endOdometer) } },
      (t) => {
        const last = t.stops[t.stops.length - 1]!;
        return patchStop({ ...t, status: "finalizada", finishedAt: nowIso(), endOdometer }, last.id, (st) => ({
          ...st,
          status: "entregue",
          finishedAt: nowIso(),
          ...(geo ? { departureGeo: geo } : {}),
        }));
      },
    );
  });
  setActivity("trabalho", "etapa", "Viagem finalizada, conferencia final", geo);
}

// ---------------------------------------------------------------- abastecimento

export function addFuel(record: Omit<FuelRecord, "id" | "synced">) {
  set((cur) => {
    const { draft, synced } = commit(cur, `Abastecimento ${record.dieselLiters} L`);
    return {
      ...draft,
      fuelRecords: [...draft.fuelRecords, { ...record, id: uid("fuel"), synced }],
      vehicle: { ...draft.vehicle, odometer: Math.max(draft.vehicle.odometer, record.odometer) },
      sim: { ...draft.sim, trackerKmSinceLastFuel: 0 },
    };
  });
}

// ---------------------------------------------------------------- checklist, ocorrencias, docs, avisos

export function submitChecklist(run: Omit<ChecklistRun, "id" | "synced">) {
  set((cur) => {
    const { draft, synced } = commit(cur, `Checklist de ${run.moment}`);
    return {
      ...draft,
      checklists: [...draft.checklists, { ...run, id: uid("chk"), synced }],
      trips: draft.trips.map((t) =>
        t.id === run.tripId && t.status === "agendada" && run.approved ? { ...t, status: "checklist" as const } : t,
      ),
    };
  });
}

export function addOccurrence(input: Omit<Occurrence, "id" | "synced" | "thread" | "status">) {
  const id = uid("occ");
  set((cur) => {
    const { draft, synced } = commit(cur, `Ocorrencia: ${input.kind}`);
    return {
      ...draft,
      occurrences: [
        {
          ...input,
          id,
          status: "aberta",
          synced,
          thread: [{ at: input.at, from: "motorista", text: input.note || "Ocorrencia registrada" }],
        },
        ...draft.occurrences,
      ],
    };
  });
  return id;
}

export function replyOccurrence(id: string, text: string, from: "central" | "motorista", status?: Occurrence["status"]) {
  set((s) => ({
    ...s,
    occurrences: s.occurrences.map((o) =>
      o.id === id ? { ...o, ...(status ? { status } : {}), thread: [...o.thread, { at: nowIso(), from, text }] } : o,
    ),
  }));
}

export function ackNotice(id: string) {
  set((s) => ({ ...s, notices: s.notices.map((n) => (n.id === id ? { ...n, ackAt: nowIso() } : n)) }));
}

export function renewDocument(id: string, expiresAt: string) {
  set((s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? { ...d, expiresAt, photo: true } : d)) }));
}

// ---------------------------------------------------------------- simulacoes

export function setSim(patch: Partial<DemoState["sim"]>) {
  set((s) => {
    const goingOnline = s.sim.offline && patch.offline === false;
    const sim = { ...s.sim, ...patch };
    if (!goingOnline) return { ...s, sim };
    // sinal voltou: tudo que estava na fila sobe com a hora original
    return {
      ...s,
      sim,
      queue: [],
      workDays: s.workDays.map((d) => ({ ...d, segments: d.segments.map((x) => ({ ...x, synced: true })) })),
      fuelRecords: s.fuelRecords.map((r) => ({ ...r, synced: true })),
      checklists: s.checklists.map((c) => ({ ...c, synced: true })),
      occurrences: s.occurrences.map((o) => ({ ...o, synced: true })),
    };
  });
}

export function resetDemo(kind: OperationKind) {
  state = createSeed(kind);
  emit();
}
