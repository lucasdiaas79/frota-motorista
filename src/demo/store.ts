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

let KEY = "frotak-demo-ambev-v1";
const listeners = new Set<() => void>();
let state: DemoState | null = null;

// ---------------------------------------------------------------- modo ligado na Frotak
// No modo "live" o estado vem do banco (get_driver_ops_context) e cada acao do motorista
// vira uma chamada de RPC na fila (src/demo/live.ts). A tela atualiza na hora (otimista) e
// a resposta do servidor substitui o estado quando chega.

export type RemoteCall = {
  id: string;
  at: string;
  rpc: string;
  args: Record<string, unknown>;
  label: string;
};

let mode: "demo" | "live" = "demo";
let sender: ((call: RemoteCall) => void) | null = null;

export function configureLive(send: (call: RemoteCall) => void, initial: DemoState) {
  mode = "live";
  KEY = "frotak-ops-live-v1";
  sender = send;
  state = initial;
  emit();
}

export function isLive() {
  return mode === "live";
}

export function replaceState(next: DemoState) {
  state = next;
  emit();
}

/** Guarda o ultimo estado do modo ligado, para abrir o app sem sinal. */
export function readCachedLive(): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("frotak-ops-live-v1");
    return raw ? (JSON.parse(raw) as DemoState) : null;
  } catch {
    return null;
  }
}

function eventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : uid("ev");
}

/** Manda a acao para o servidor (so no modo ligado). `idem` acrescenta hora e id do evento. */
function send(rpc: string, args: Record<string, unknown>, label: string, idem = true) {
  if (mode !== "live" || !sender) return;
  const id = eventId();
  const at = nowIso();
  const clean = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
  sender({
    id,
    at,
    rpc,
    label,
    args: idem ? { ...clean, p_at: at, p_client_event_id: id } : clean,
  });
}

const isUuid = (v?: string) =>
  Boolean(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));

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
  // No modo ligado a fila e cuidada por live.ts; o registro fica pendente ate o servidor responder.
  if (mode === "live") return { draft, synced: false };
  if (!draft.sim.offline) return { draft, synced: true };
  return {
    draft: { ...draft, queue: [...draft.queue, { id: uid("q"), at: nowIso(), label }] },
    synced: false,
  };
}

// ---------------------------------------------------------------- jornada

/**
 * Jornada atual: a que esta aberta (mesmo que tenha comecado ontem, como uma jornada que
 * vira a meia-noite ou ficou sem encerrar), senao a de hoje.
 */
export function today(s: DemoState): WorkDay | undefined {
  const open = s.workDays.filter((d) => d.startedAt && !d.endedAt);
  if (open.length) return open[open.length - 1];
  const date = localDate(Date.now());
  return s.workDays.find((d) => d.date === date);
}

function withToday(s: DemoState, fn: (day: WorkDay) => WorkDay): DemoState {
  const existing = today(s);
  if (!existing) return s;
  return { ...s, workDays: s.workDays.map((d) => (d.id === existing.id ? fn(d) : d)) };
}

export function startDay(geo?: GeoPoint, selfie = false) {
  const day = today(load());
  if (day?.startedAt && !day.endedAt) return;
  applyStartDay(geo, selfie);
  send("driver_journey_start", { p_geo: geo, p_selfie: selfie }, "Inicio de jornada");
}

function applyStartDay(geo?: GeoPoint, selfie = false) {
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

export function setActivity(
  activity: Exclude<Activity, "fora">,
  source: PunchSource,
  reason: string,
  geo?: GeoPoint,
) {
  const before = load();
  applyActivity(activity, source, reason, geo);
  if (load() !== before) {
    send(
      "driver_journey_set_activity",
      { p_activity: activity, p_source: source, p_reason: reason, p_geo: geo },
      `Ponto: ${reason}`,
    );
  }
}

function applyActivity(
  activity: Exclude<Activity, "fora">,
  source: PunchSource,
  reason: string,
  geo?: GeoPoint,
) {
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
  const day = today(load());
  if (!day?.startedAt || day.endedAt) return;
  send("driver_journey_end", { p_geo: geo }, "Fim de jornada");
  set((s) => {
    const day = today(s);
    if (!day?.startedAt || day.endedAt) return s;
    const { draft } = commit(s, "Fim de jornada");
    const at = nowIso();
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

export function adjustSegment(
  dayId: string,
  segmentId: string,
  newStartAt: string,
  reason: string,
) {
  if (isUuid(segmentId)) {
    send(
      "driver_journey_request_adjustment",
      { p_punch_id: segmentId, p_new_started_at: newStartAt, p_reason: reason },
      "Ajuste de ponto",
      false,
    );
  }
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
            adjustment: {
              by: "motorista" as const,
              reason,
              originalStartAt: seg.adjustment?.originalStartAt ?? seg.startAt,
              at: nowIso(),
            },
          };
        if (i === idx - 1) return { ...seg, endAt: newStartAt };
        return seg;
      });
      return { ...d, segments, ...(idx === 0 ? { startedAt: newStartAt } : {}) };
    }),
  }));
}

export function confirmDay(dayId: string) {
  if (isUuid(dayId))
    send("driver_journey_confirm_day", { p_work_day_id: dayId }, "Espelho confirmado", false);
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
  if (!today(s)?.startedAt || today(s)?.endedAt) applyStartDay(geo);
  send(
    "driver_route_start",
    { p_route_id: trip.id, p_odometer: odometer, p_geo: geo },
    "Viagem iniciada",
  );
  const origin = trip.stops[0]!;
  const atOrigin = trip.kind === "distribuicao";
  set((cur) => {
    const { draft } = commit(cur, "Viagem iniciada");
    return patchTrip(
      {
        ...draft,
        vehicle: { ...draft.vehicle, odometer: Math.max(draft.vehicle.odometer, odometer) },
      },
      (t) =>
        patchStop(
          {
            ...t,
            status: "em_andamento",
            startedAt: nowIso(),
            startOdometer: odometer,
            currentStopIndex: 0,
          },
          origin.id,
          (st) =>
            atOrigin
              ? {
                  ...st,
                  status: "chegou",
                  arrivedAt: nowIso(),
                  arrivalSource: "cerca",
                  ...(geo ? { arrivalGeo: geo } : {}),
                }
              : { ...st, status: "a_caminho" },
        ),
    );
  });
  if (atOrigin) applyActivity("espera", "etapa", `Aguardando doca no ${origin.name}`, geo);
  else applyActivity("direcao", "etapa", `Saiu para ${origin.name}`, geo);
}

export function arriveStop(stopId: string, source: "motorista" | "cerca", geo?: GeoPoint) {
  const trip = activeTrip(load());
  const stop = trip?.stops.find((x) => x.id === stopId);
  if (!stop) return;
  send(
    "driver_route_arrive",
    { p_stop_id: stopId, p_source: source, p_geo: geo },
    `Chegada: ${stop.name}`,
  );
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
  applyActivity("espera", source === "cerca" ? "cerca" : "etapa", `Chegou: ${stop.name}`, geo);
}

export function startUnload(stopId: string, geo?: GeoPoint) {
  const trip = activeTrip(load());
  const stop = trip?.stops.find((x) => x.id === stopId);
  if (!stop) return;
  send(
    "driver_route_start_unload",
    { p_stop_id: stopId, p_geo: geo },
    `Inicio de ${stop.kind === "origem" ? "carregamento" : "descarga"}`,
  );
  set((cur) =>
    patchTrip(
      commit(cur, `Inicio de ${stop.kind === "origem" ? "carregamento" : "descarga"}`).draft,
      (t) =>
        patchStop(t, stopId, (st) => ({
          ...st,
          status: "descarregando",
          unloadStartedAt: nowIso(),
        })),
    ),
  );
  applyActivity(
    stop.kind === "retorno" ? "trabalho" : "carga_descarga",
    "etapa",
    stop.kind === "origem"
      ? `Carregamento: ${stop.name}`
      : stop.kind === "retorno"
        ? "Prestacao de contas"
        : `Descarga: ${stop.name}`,
    geo,
  );
}

export function finishStop(
  stopId: string,
  delivered: NonNullable<Stop["delivered"]>,
  status: "entregue" | "parcial" | "recusada",
  geo?: GeoPoint,
) {
  const s = load();
  const trip = activeTrip(s);
  if (!trip) return;
  const idx = trip.stops.findIndex((x) => x.id === stopId);
  const stop = trip.stops[idx];
  if (!stop) return;
  const next = trip.stops[idx + 1];
  send(
    "driver_route_finish_stop",
    {
      p_stop_id: stopId,
      p_result: status,
      p_pod: {
        boxes_delivered: delivered.boxesDelivered,
        refusal_reason: delivered.refusalReason,
        refusal_note: delivered.refusalNote,
        receiver_name: delivered.receiverName,
        signature: delivered.signature,
        pod_photo_paths: delivered.podPhotoPaths ?? [],
        returnables: delivered.returnables,
        payment: delivered.payment,
      },
      p_geo: geo,
    },
    `${status === "recusada" ? "Recusa" : "Entrega"}: ${stop.name}`,
  );
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
        updated = patchStop({ ...updated, currentStopIndex: idx + 1 }, next.id, (st) => ({
          ...st,
          status: "a_caminho",
        }));
      }
      return updated;
    });
  });
  if (next) applyActivity("direcao", "etapa", `Saiu de ${stop.name}`, geo);
}

export function finishTrip(endOdometer: number, geo?: GeoPoint) {
  const trip = activeTrip(load());
  if (trip)
    send(
      "driver_route_finish",
      { p_route_id: trip.id, p_end_odometer: endOdometer, p_geo: geo },
      "Viagem finalizada",
    );
  set((cur) => {
    const { draft } = commit(cur, "Viagem finalizada");
    return patchTrip(
      {
        ...draft,
        vehicle: { ...draft.vehicle, odometer: Math.max(draft.vehicle.odometer, endOdometer) },
      },
      (t) => {
        const last = t.stops[t.stops.length - 1]!;
        return patchStop(
          { ...t, status: "finalizada", finishedAt: nowIso(), endOdometer },
          last.id,
          (st) => ({
            ...st,
            status: "entregue",
            finishedAt: nowIso(),
            ...(geo ? { departureGeo: geo } : {}),
          }),
        );
      },
    );
  });
  applyActivity("trabalho", "etapa", "Viagem finalizada, conferencia final", geo);
}

// ---------------------------------------------------------------- abastecimento

export function addFuel(record: Omit<FuelRecord, "id" | "synced">) {
  send(
    "driver_fuel_register",
    {
      p_odometer: record.odometer,
      p_diesel_liters: record.dieselLiters,
      p_diesel_amount: Math.round(record.dieselLiters * record.dieselPrice * 100) / 100,
      p_arla_liters: record.arlaLiters,
      p_arla_amount: Math.round(record.arlaLiters * record.arlaPrice * 100) / 100,
      p_tank_full: record.tankFull,
      p_station_id: isUuid(record.stationId) ? record.stationId : undefined,
      p_station_name: record.stationName,
      p_payment_method: record.payment,
      p_justification: record.justification,
      p_receipt_path: record.photoPaths?.receipt,
      p_pump_path: record.photoPaths?.pump,
      p_geo: record.geo,
    },
    `Abastecimento ${record.dieselLiters} L`,
  );
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
  send(
    "driver_checklist_submit",
    {
      p_moment: run.moment,
      p_answers: run.answers,
      p_odometer: run.odometer,
      p_route_id: isUuid(run.tripId) ? run.tripId : undefined,
    },
    `Checklist de ${run.moment}`,
  );
  set((cur) => {
    const { draft, synced } = commit(cur, `Checklist de ${run.moment}`);
    return {
      ...draft,
      checklists: [...draft.checklists, { ...run, id: uid("chk"), synced }],
      trips: draft.trips.map((t) =>
        t.id === run.tripId && t.status === "agendada" && run.approved
          ? { ...t, status: "checklist" as const }
          : t,
      ),
    };
  });
}

/** `remote: false` quando o servidor ja abre a ocorrencia sozinho (ex.: checklist reprovado). */
export function addOccurrence(
  input: Omit<Occurrence, "id" | "synced" | "thread" | "status">,
  opts: { remote?: boolean } = {},
) {
  const id = uid("occ");
  if (opts.remote !== false) {
    send(
      "driver_occurrence_create",
      {
        p_kind: input.kind,
        p_note: input.note,
        p_severity: input.severity,
        p_photo_paths: input.photoPaths ?? [],
        p_geo: input.geo,
        p_route_id: isUuid(input.tripId) ? input.tripId : undefined,
        p_stop_id: isUuid(input.stopId) ? input.stopId : undefined,
      },
      `Ocorrencia: ${input.kind}`,
    );
  }
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
          thread: [
            { at: input.at, from: "motorista", text: input.note || "Ocorrencia registrada" },
          ],
        },
        ...draft.occurrences,
      ],
    };
  });
  return id;
}

export function replyOccurrence(
  id: string,
  text: string,
  from: "central" | "motorista",
  status?: Occurrence["status"],
) {
  // No modo ligado a resposta da central vem do banco; nao simula.
  if (mode === "live" && from === "central") return;
  if (from === "motorista" && isUuid(id))
    send(
      "driver_occurrence_message",
      { p_occurrence_id: id, p_body: text },
      "Mensagem para a central",
      false,
    );
  set((s) => ({
    ...s,
    occurrences: s.occurrences.map((o) =>
      o.id === id
        ? {
            ...o,
            ...(status ? { status } : {}),
            thread: [...o.thread, { at: nowIso(), from, text }],
          }
        : o,
    ),
  }));
}

export function ackNotice(id: string) {
  if (isUuid(id)) send("driver_notice_ack", { p_notice_id: id }, "Ciencia de aviso", false);
  set((s) => ({
    ...s,
    notices: s.notices.map((n) => (n.id === id ? { ...n, ackAt: nowIso() } : n)),
  }));
}

export function renewDocument(id: string, expiresAt: string, filePath?: string) {
  if (mode === "live") {
    if (!filePath || !isUuid(id)) return;
    send(
      "driver_document_submit",
      { p_document_id: id, p_file_path: filePath },
      "Documento renovado",
      false,
    );
    set((s) => ({
      ...s,
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, photo: true, status: "enviado" as const } : d,
      ),
    }));
    return;
  }
  set((s) => ({
    ...s,
    documents: s.documents.map((d) => (d.id === id ? { ...d, expiresAt, photo: true } : d)),
  }));
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
      workDays: s.workDays.map((d) => ({
        ...d,
        segments: d.segments.map((x) => ({ ...x, synced: true })),
      })),
      fuelRecords: s.fuelRecords.map((r) => ({ ...r, synced: true })),
      checklists: s.checklists.map((c) => ({ ...c, synced: true })),
      occurrences: s.occurrences.map((o) => ({ ...o, synced: true })),
    };
  });
}

export function resetDemo(kind: OperationKind) {
  if (mode === "live") return;
  state = createSeed(kind);
  emit();
}
