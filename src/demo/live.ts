import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { createSeed, localDate } from "./seed";
import {
  configureLive,
  getState,
  isLive,
  readCachedLive,
  replaceState,
  type RemoteCall,
} from "./store";
import type { DemoState, Trip } from "./types";

// Liga as telas da operacao no banco da Frotak.
//
// - Estado: get_driver_ops_context (uma chamada) convertido para o formato das telas.
// - Acoes: cada acao do motorista vira uma chamada na fila (outbox) guardada no celular,
//   com a hora real e um id unico. A fila sobe em ordem; repetir uma chamada nao duplica
//   nada no banco (client_event_id). Sem sinal, a fila espera o sinal voltar.
// - Erro de regra (ex.: checklist pendente): a chamada sai da fila, o motorista ve o motivo
//   e o estado volta ao do servidor.

const OUTBOX_KEY = "frotak-ops-outbox-v1";
const OPS_MODULES = [
  "driver_journey",
  "driver_safety",
  "fuel_control",
  "delivery_routes",
  "driver_performance",
];

let outbox: RemoteCall[] = [];
let flushing = false;
let started = false;
let refreshTimer: number | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- formato vem do banco e e conferido campo a campo abaixo
type Ctx = any;

function readOutbox(): RemoteCall[] {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as RemoteCall[]) : [];
  } catch {
    return [];
  }
}

function saveOutbox() {
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {
    // sem armazenamento: a fila fica so em memoria
  }
}

function online() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Busca o contexto da operacao. Devolve null quando o tenant nao tem os modulos. */
export async function fetchOpsContext(): Promise<Ctx | null> {
  const { data, error } = await supabase.rpc("get_driver_ops_context");
  if (error) {
    // Banco sem as migrations da operacao: segue no app antigo.
    if (error.code === "PGRST202" || error.code === "42883") return null;
    throw error;
  }
  const ctx = data as Ctx;
  const modules: string[] = ctx?.modules ?? [];
  return modules.some((m) => OPS_MODULES.includes(m)) ? ctx : null;
}

/** Liga o modo ligado na Frotak com o contexto ja carregado. */
export function startLive(ctx: Ctx) {
  outbox = readOutbox();
  const base = readCachedLive() ?? createSeed();
  configureLive(enqueue, mapContext(ctx, base));
  bindListeners();
}

function bindListeners() {
  if (started) return;
  started = true;
  window.addEventListener("online", () => {
    setOffline(false);
    void flush();
  });
  window.addEventListener("offline", () => setOffline(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });
  // Respostas da central e mudancas de rota chegam pelo banco.
  refreshTimer = window.setInterval(() => void refresh(), 45_000);
  void flush();
}

/** Sem sinal ao abrir: usa o ultimo estado guardado e sobe a fila quando o sinal voltar. */
export function startLiveFromCache() {
  const cached = readCachedLive();
  if (!cached) return;
  outbox = readOutbox();
  configureLive(enqueue, {
    ...cached,
    queue: queueView(),
    sim: { ...cached.sim, offline: !online() },
  });
  bindListeners();
}

export function stopLive() {
  if (refreshTimer) window.clearInterval(refreshTimer);
}

function setOffline(offline: boolean) {
  const s = getState();
  replaceState({ ...s, sim: { ...s.sim, offline }, queue: queueView() });
}

function queueView() {
  return outbox.map((c) => ({ id: c.id, at: c.at, label: c.label }));
}

function enqueue(call: RemoteCall) {
  outbox.push(call);
  saveOutbox();
  // A tela ja atualizou; so mostra a fila.
  window.setTimeout(() => {
    const s = getState();
    replaceState({ ...s, queue: queueView(), sim: { ...s.sim, offline: !online() } });
    void flush();
  }, 0);
}

function isNetworkError(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err);
  return !online() || /Failed to fetch|NetworkError|Load failed|fetch failed|timeout/i.test(msg);
}

const ERROR_TEXT: Record<string, string> = {
  ROUTE_CHECKLIST_REQUIRED: "Faca o checklist de saida antes de iniciar a viagem.",
  ROUTE_OTHER_IN_PROGRESS: "Voce ja tem outra viagem em andamento.",
  ROUTE_ALREADY_STARTED: "Esta viagem ja foi iniciada.",
  ROUTE_NOT_IN_PROGRESS: "A viagem nao esta em andamento.",
  ROUTE_STOPS_PENDING: "Ainda ha entregas sem baixa nesta rota.",
  ROUTE_ODOMETER_LOWER: "O odometro final e menor que o inicial.",
  STOP_NOT_ARRIVED: "Marque a chegada antes.",
  STOP_REFUSAL_REASON_REQUIRED: "Informe o motivo da recusa ou da entrega parcial.",
  STOP_RECEIVER_REQUIRED: "Informe quem recebeu.",
  FUEL_ODOMETER_LOWER: "Odometro menor que o do ultimo abastecimento.",
  FUEL_ABOVE_TANK: "Litros acima da capacidade do tanque.",
  FUEL_JUSTIFICATION_REQUIRED: "Explique o alerta do abastecimento antes de salvar.",
  FUEL_STATION_REQUIRED: "Escolha o posto.",
  FUEL_VEHICLE_NOT_FOUND: "Nenhum veiculo vinculado a voce. Fale com a central.",
  CHECKLIST_INCOMPLETE: "Responda todos os itens do checklist.",
  CHECKLIST_NOTE_REQUIRED: "Item reprovado precisa de descricao.",
  CHECKLIST_TEMPLATE_NOT_FOUND: "A transportadora ainda nao cadastrou o checklist.",
  OPS_EVENT_TOO_OLD: "Registro com mais de 72 horas no celular. Fale com a central para lancar.",
  MODULE_DISABLED: "Recurso nao liberado para a sua transportadora.",
};

export function friendlyError(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err);
  const key = Object.keys(ERROR_TEXT).find((k) => msg.includes(k));
  return key ? ERROR_TEXT[key]! : msg;
}

/** Sobe a fila em ordem. Para no primeiro erro de rede; descarta erro de regra. */
export async function flush() {
  if (flushing || !isLive()) return;
  flushing = true;
  let last: Ctx | null = null;
  let rejected = false;
  try {
    while (outbox.length && online()) {
      const call = outbox[0]!;
      const { data, error } = await supabase.rpc(call.rpc, call.args);
      if (error) {
        if (isNetworkError(error)) break;
        outbox.shift();
        saveOutbox();
        rejected = true;
        toast.error(`${call.label}: nao registrado`, { description: friendlyError(error) });
        continue;
      }
      outbox.shift();
      saveOutbox();
      if (data && typeof data === "object" && "modules" in (data as Ctx)) last = data as Ctx;
    }
  } catch (err) {
    if (!isNetworkError(err)) toast.error("Falha ao enviar", { description: friendlyError(err) });
  } finally {
    flushing = false;
  }
  // So troca pelo servidor quando a fila zerou, para nao apagar o que ainda vai subir.
  if (!outbox.length) {
    if (last && !rejected) replaceState(mapContext(last, getState()));
    else await refresh();
  } else {
    const s = getState();
    replaceState({ ...s, queue: queueView(), sim: { ...s.sim, offline: !online() } });
  }
}

export async function refresh() {
  if (!isLive() || outbox.length || !online()) return;
  try {
    const ctx = await fetchOpsContext();
    if (ctx && !outbox.length) replaceState(mapContext(ctx, getState()));
  } catch (err) {
    if (!isNetworkError(err)) console.warn("[frotak-ops] contexto", err);
  }
}

/** Envia uma foto para o bucket da operacao e devolve o caminho. */
export async function uploadOpsFile(file: Blob, folder: string, ext = "jpg") {
  const s = getState();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const path = `${s.tenant.id}/${s.driver.id}/${folder}/${localDate(Date.now())}-${id}.${ext}`;
  const { error } = await supabase.storage.from("driver-ops").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signOutLive() {
  stopLive();
  outbox = [];
  saveOutbox();
  try {
    window.localStorage.removeItem("frotak-ops-live-v1");
  } catch {
    // nada
  }
  await supabase.auth.signOut();
  window.location.reload();
}

// ---------------------------------------------------------------- conversao do contexto

const num = (v: unknown, fallback = 0) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? fallback : Number(v);

export function mapContext(ctx: Ctx, prev: DemoState): DemoState {
  const todayDate = localDate(Date.now());
  const workDays = (ctx.workDays ?? []).map((d: Ctx) => ({
    id: d.id,
    date: String(d.date),
    ...(d.startedAt ? { startedAt: d.startedAt } : {}),
    ...(d.endedAt ? { endedAt: d.endedAt } : {}),
    ...(d.confirmedByDriverAt ? { confirmedByDriverAt: d.confirmedByDriverAt } : {}),
    segments: (d.segments ?? []).map((p: Ctx) => ({
      id: p.id,
      activity: p.activity,
      startAt: p.startAt,
      ...(p.endAt ? { endAt: p.endAt } : {}),
      source: p.source === "central" ? "ajuste" : p.source,
      ...(p.reason ? { reason: p.reason } : {}),
      ...(p.geo
        ? { geo: { ...p.geo, source: p.geo.source === "simulado" ? "simulado" : "gps" } }
        : {}),
      ...(p.adjustment
        ? {
            adjustment: {
              by: "motorista" as const,
              reason: p.adjustment.reason ?? "",
              originalStartAt: p.adjustment.originalStartAt,
              at: p.adjustment.at ?? p.startAt,
            },
          }
        : {}),
      synced: true,
    })),
  }));
  const prevEnd = workDays
    .filter((d: Ctx) => d.date !== todayDate && d.endedAt)
    .map((d: Ctx) => d.endedAt as string)
    .sort()
    .at(-1);

  const recentChecklist = (ctx.checklists ?? []).some(
    (c: Ctx) =>
      c.moment === "saida" && c.approved && Date.now() - new Date(c.at).getTime() < 12 * 3_600_000,
  );

  const trips: Trip[] = (ctx.trips ?? []).map((r: Ctx) => ({
    id: r.id,
    code: r.code,
    kind: r.kind,
    title: r.title,
    shipper: r.shipper ?? "",
    scheduledAt: r.scheduledAt,
    status:
      r.status === "agendada" && recentChecklist
        ? "checklist"
        : r.status === "cancelada"
          ? "finalizada"
          : r.status,
    ...(r.startedAt ? { startedAt: r.startedAt } : {}),
    ...(r.finishedAt ? { finishedAt: r.finishedAt } : {}),
    ...(r.startOdometer != null ? { startOdometer: num(r.startOdometer) } : {}),
    ...(r.endOdometer != null ? { endOdometer: num(r.endOdometer) } : {}),
    currentStopIndex: num(r.currentStopIndex),
    totalBoxes: num(r.totalBoxes),
    totalWeightKg: num(r.totalWeightKg),
    distanceKm: num(r.distanceKm),
    stops: (r.stops ?? []).map((s: Ctx, i: number) => ({
      id: s.id,
      order: i,
      kind: s.kind,
      name: s.name,
      ...(s.document ? { document: s.document } : {}),
      address: s.address ?? "",
      city: s.city ?? "",
      geo: { lat: num(s.geo?.lat), lng: num(s.geo?.lng) },
      radiusMeters: num(s.radiusMeters, 150),
      ...(s.window ? { window: s.window } : {}),
      ...(s.dock ? { dock: s.dock } : {}),
      invoices: (s.invoices ?? []).map((nf: Ctx) => ({
        number: String(nf.number ?? ""),
        boxes: num(nf.boxes),
        amount: num(nf.amount),
        ...(nf.key ? { key: nf.key } : {}),
      })),
      returnablesExpected: s.returnablesExpected ?? {},
      ...(s.payment
        ? { payment: { method: s.payment.method, amount: num(s.payment.amount) } }
        : {}),
      status: s.status,
      ...(s.arrivedAt ? { arrivedAt: s.arrivedAt } : {}),
      ...(s.unloadStartedAt ? { unloadStartedAt: s.unloadStartedAt } : {}),
      ...(s.finishedAt ? { finishedAt: s.finishedAt } : {}),
      ...(s.arrivalGeo ? { arrivalGeo: { ...s.arrivalGeo, source: "gps" } } : {}),
      ...(s.departureGeo ? { departureGeo: { ...s.departureGeo, source: "gps" } } : {}),
      ...(s.arrivalSource ? { arrivalSource: s.arrivalSource } : {}),
      ...(s.delivered
        ? {
            delivered: {
              boxesDelivered: num(s.delivered.boxesDelivered),
              ...(s.delivered.refusalReason ? { refusalReason: s.delivered.refusalReason } : {}),
              ...(s.delivered.refusalNote ? { refusalNote: s.delivered.refusalNote } : {}),
              ...(s.delivered.receiverName ? { receiverName: s.delivered.receiverName } : {}),
              ...(s.delivered.signature ? { signature: s.delivered.signature } : {}),
              podPhoto: Boolean(s.delivered.podPhoto),
              returnables: s.delivered.returnables ?? {},
              ...(s.delivered.payment ? { payment: s.delivered.payment } : {}),
            },
          }
        : {}),
    })),
  }));

  const v = ctx.vehicle ?? {};
  const activeTripId: string | undefined = ctx.activeTripId ?? undefined;
  const active = trips.find((t) => t.id === activeTripId);

  const { activeTripId: _previousTrip, live: _previousLive, ...base } = prev;
  void _previousTrip;
  void _previousLive;
  return {
    ...base,
    version: 1,
    tenant: {
      id: ctx.tenant?.id ?? prev.tenant.id,
      name: ctx.tenant?.name ?? "",
      operation: ctx.tenant?.operation ?? "Operacao",
      shipper: ctx.tenant?.shipper ?? "",
      city: ctx.tenant?.city ?? "",
    },
    driver: {
      ...prev.driver,
      id: ctx.driver?.id ?? prev.driver.id,
      name: ctx.driver?.name ?? "",
      phone: ctx.driver?.phone ?? "",
      cpf: "",
      team: ctx.tenant?.operation ?? "",
      hourlyWage: 0,
    },
    vehicle: {
      id: v.id ?? "",
      plate: v.plate ?? "Sem veiculo",
      model: v.model ?? "",
      year: num(v.year),
      tankLiters: num(v.tankLiters, 300),
      kmPerLiterTarget: num(v.kmPerLiterTarget, 0),
      odometer: num(v.odometer),
    },
    operationKind: active?.kind ?? prev.operationKind,
    workDays,
    // Sem jornada anterior registrada: usa uma data antiga (interjornada cumprida) e a tela nao mostra.
    previousDayEndedAt: prevEnd ?? new Date(Date.now() - 7 * 86_400_000).toISOString(),
    trips,
    ...(activeTripId ? { activeTripId } : {}),
    stations: (ctx.stations ?? []).map((st: Ctx) => ({
      id: st.id,
      name: st.name,
      brand: st.brand ?? "",
      city: st.city ?? "",
      geo: { lat: num(st.geo?.lat), lng: num(st.geo?.lng) },
      negotiatedDieselPrice: num(st.negotiatedDieselPrice),
      negotiatedArlaPrice: num(st.negotiatedArlaPrice),
      paymentTerms: st.paymentTerms ?? "",
      accredited: Boolean(st.accredited),
    })),
    fuelRecords: (ctx.fuelRecords ?? []).map((f: Ctx) => ({
      id: f.id,
      at: f.at,
      ...(f.stationId ? { stationId: f.stationId } : {}),
      stationName: f.stationName,
      odometer: num(f.odometer),
      dieselLiters: num(f.dieselLiters),
      dieselPrice: num(f.dieselPrice),
      arlaLiters: num(f.arlaLiters),
      arlaPrice: num(f.arlaPrice),
      tankFull: f.tankFull !== false,
      payment: f.payment ?? "cartao_frota",
      photos: {
        pump: Boolean(f.photos?.pump),
        receipt: Boolean(f.photos?.receipt),
        panel: Boolean(f.photos?.panel),
      },
      readBy: "manual",
      ...(f.geo ? { geo: { ...f.geo, source: "gps" } } : {}),
      alerts: (f.alerts ?? []).map((a: Ctx) => ({
        code: a.code,
        level: "aviso",
        message: a.message ?? "",
      })),
      ...(f.reviewStatus ? { reviewStatus: f.reviewStatus } : {}),
      synced: true,
    })),
    checklistTemplate: ctx.checklistTemplate ?? [],
    checklists: (ctx.checklists ?? []).map((c: Ctx) => ({
      id: c.id,
      moment: c.moment,
      ...(c.tripId ? { tripId: c.tripId } : {}),
      at: c.at,
      ...(c.odometer != null ? { odometer: num(c.odometer) } : {}),
      answers: c.answers ?? {},
      approved: Boolean(c.approved),
      synced: true,
    })),
    occurrences: (ctx.occurrences ?? []).map((o: Ctx) => ({
      id: o.id,
      kind: o.kind === "checklist" ? "quebra" : o.kind,
      at: o.at,
      note: o.note ?? "",
      photo: Boolean(o.photo),
      ...(o.geo ? { geo: { ...o.geo, source: "gps" } } : {}),
      ...(o.tripId ? { tripId: o.tripId } : {}),
      ...(o.stopId ? { stopId: o.stopId } : {}),
      severity: o.severity ?? "media",
      status: o.status ?? "aberta",
      thread: o.thread?.length
        ? o.thread
        : [{ at: o.at, from: "motorista", text: o.note || "Ocorrencia registrada" }],
      synced: true,
    })),
    documents: (ctx.documents ?? []).map((d: Ctx) => ({
      id: d.id,
      kind: d.kind,
      label: d.label,
      ...(d.number ? { number: d.number } : {}),
      expiresAt: `${d.expiresAt}T12:00:00`,
      blocking: Boolean(d.blocking),
      photo: Boolean(d.photo),
      ...(d.status ? { status: d.status } : {}),
    })),
    notices: (ctx.notices ?? []).map((n: Ctx) => ({
      id: n.id,
      at: n.at,
      title: n.title,
      body: n.body,
      from: n.from ?? "Central",
      requiresAck: Boolean(n.requiresAck),
      ...(n.ackAt ? { ackAt: n.ackAt } : {}),
      tag: n.tag ?? "operacao",
    })),
    schedule: [
      {
        id: "hoje",
        date: todayDate,
        label: "Hoje",
        detail: active?.title ?? "Sem viagem hoje",
        kind: "viagem",
      },
      ...(ctx.schedule ?? []).filter((e: Ctx) => e.id !== activeTripId),
    ],
    telemetry: [],
    team: ctx.team ?? [],
    sim: {
      ...prev.sim,
      offline: !online(),
      trackerKmSinceLastFuel: Math.round(num(v.trackerKmSinceLastFuel)),
    },
    queue: queueView(),
    live: {
      modules: ctx.modules ?? [],
      serverTime: ctx.serverTime,
      loadedAt: new Date().toISOString(),
      ...(ctx.score ? { score: ctx.score } : {}),
      ...(ctx.tenant?.emergencyPhone ? { emergencyPhone: ctx.tenant.emergencyPhone } : {}),
    },
  };
}
