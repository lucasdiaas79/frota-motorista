// Tipos do tenant de demonstracao "Operacao Ambev SE".
// Tudo aqui roda no navegador, sem tocar no banco. Quando um recurso existir de verdade
// na Frotak, a tela troca a chamada do store pela RPC equivalente (ver docs/DEMO_AMBEV.md).

export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number;
  source: "gps" | "simulado";
};

/** O que o motorista esta fazendo agora. Cada troca vira uma marcacao de ponto. */
export type Activity =
  "fora" | "direcao" | "espera" | "carga_descarga" | "refeicao" | "descanso" | "trabalho";

export type PunchSource = "motorista" | "etapa" | "cerca" | "ajuste" | "voz";

export type PunchSegment = {
  id: string;
  activity: Exclude<Activity, "fora">;
  startAt: string;
  endAt?: string;
  source: PunchSource;
  /** Texto curto mostrado no espelho: "Chegou no PDV 3", "Saiu do CDD" */
  reason?: string;
  geo?: GeoPoint;
  selfie?: boolean;
  /** Ajuste: o original nunca e apagado, fica guardado aqui. */
  adjustment?: { by: "motorista" | "gestor"; reason: string; originalStartAt: string; at: string };
  synced: boolean;
};

export type WorkDay = {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt?: string;
  endedAt?: string;
  segments: PunchSegment[];
  confirmedByDriverAt?: string;
};

export type OperationKind = "distribuicao" | "transferencia";

export type StopStatus =
  "pendente" | "a_caminho" | "chegou" | "descarregando" | "entregue" | "parcial" | "recusada";

export type RefusalReason =
  | "cliente_fechado"
  | "sem_pagamento"
  | "avaria"
  | "pedido_errado"
  | "sem_espaco"
  | "falta_produto"
  | "outro";

export type ReturnableKind = "garrafeira" | "barril" | "palete";

export type Stop = {
  id: string;
  order: number;
  kind: "origem" | "entrega" | "destino" | "retorno";
  name: string;
  document?: string; // CNPJ
  address: string;
  city: string;
  geo: { lat: number; lng: number };
  radiusMeters: number;
  window?: { from: string; to: string }; // HH:MM
  dock?: string;
  invoices: { number: string; boxes: number; amount: number; key?: string }[];
  returnablesExpected: Partial<Record<ReturnableKind, number>>;
  payment?: { method: "boleto" | "pix" | "dinheiro"; amount: number };
  status: StopStatus;
  arrivedAt?: string;
  unloadStartedAt?: string;
  finishedAt?: string;
  arrivalGeo?: GeoPoint;
  departureGeo?: GeoPoint;
  arrivalSource?: "motorista" | "cerca";
  delivered?: {
    boxesDelivered: number;
    refusalReason?: RefusalReason;
    refusalNote?: string;
    receiverName?: string;
    signature?: string; // data URL
    podPhoto?: boolean;
    /** Caminho das fotos no armazenamento (app ligado na Frotak). */
    podPhotoPaths?: string[];
    returnables: Partial<Record<ReturnableKind, number>>;
    payment?: { method: "boleto" | "pix" | "dinheiro"; amount: number; received: boolean };
  };
};

export type TripStatus = "agendada" | "checklist" | "em_andamento" | "finalizada";

export type Trip = {
  id: string;
  code: string; // numero do frete / mapa de carga
  kind: OperationKind;
  title: string;
  shipper: string;
  scheduledAt: string;
  status: TripStatus;
  startedAt?: string;
  finishedAt?: string;
  startOdometer?: number;
  endOdometer?: number;
  stops: Stop[];
  currentStopIndex: number;
  totalBoxes: number;
  totalWeightKg: number;
  distanceKm: number;
};

export type FuelStation = {
  id: string;
  name: string;
  brand: string;
  city: string;
  geo: { lat: number; lng: number };
  negotiatedDieselPrice: number;
  negotiatedArlaPrice: number;
  paymentTerms: string;
  accredited: boolean;
};

export type FuelPayment = "cartao_frota" | "a_prazo_posto" | "adiantamento" | "pix";

export type FuelRecord = {
  id: string;
  at: string;
  stationId?: string;
  stationName: string;
  odometer: number;
  dieselLiters: number;
  dieselPrice: number;
  arlaLiters: number;
  arlaPrice: number;
  tankFull: boolean;
  payment: FuelPayment;
  photos: { pump: boolean; receipt: boolean; panel: boolean };
  readBy: "manual" | "leitura_automatica";
  geo?: GeoPoint;
  alerts: FuelAlert[];
  /** Motivo escrito pelo motorista quando ha alerta. A central aprova ou recusa. */
  justification?: string;
  photoPaths?: { pump?: string; receipt?: string; panel?: string };
  reviewStatus?: "ok" | "pendente" | "aprovado" | "recusado";
  synced: boolean;
};

export type FuelAlert = {
  code:
    | "odometro_menor"
    | "odometro_impossivel"
    | "acima_tanque"
    | "preco_acima"
    | "rastreador_diverge"
    | "abastecimento_proximo"
    | "fora_do_posto"
    | "arla_fora";
  level: "aviso" | "bloqueio";
  message: string;
};

export type ChecklistAnswer = "ok" | "nok" | "na";

export type ChecklistItem = { id: string; group: string; label: string; critical: boolean };

export type ChecklistRun = {
  id: string;
  moment: "saida" | "chegada";
  tripId?: string;
  at: string;
  odometer?: number;
  answers: Record<
    string,
    { answer: ChecklistAnswer; note?: string; photo?: boolean; photoPath?: string }
  >;
  approved: boolean;
  synced: boolean;
};

export type OccurrenceKind =
  | "pneu"
  | "quebra"
  | "acidente"
  | "avaria_carga"
  | "cliente_fechado"
  | "atraso"
  | "fiscalizacao"
  | "roubo"
  | "emergencia"
  | "outro";

export type Occurrence = {
  id: string;
  kind: OccurrenceKind;
  at: string;
  note: string;
  photo: boolean;
  photoPaths?: string[];
  geo?: GeoPoint;
  tripId?: string;
  stopId?: string;
  severity: "baixa" | "media" | "alta";
  status: "aberta" | "em_atendimento" | "resolvida";
  thread: { at: string; from: "motorista" | "central"; text: string }[];
  synced: boolean;
};

export type DriverDocument = {
  id: string;
  kind: "cnh" | "toxicologico" | "aso" | "direcao_defensiva" | "nr11" | "integracao_cliente";
  label: string;
  number?: string;
  expiresAt: string;
  blocking: boolean;
  photo: boolean;
  /** enviado = foto nova aguardando a central conferir */
  status?: "valido" | "enviado" | "recusado";
};

export type Notice = {
  id: string;
  at: string;
  title: string;
  body: string;
  from: string;
  requiresAck: boolean;
  ackAt?: string;
  tag: "seguranca" | "operacao" | "rh" | "cliente";
};

export type ScheduleEntry = {
  id: string;
  date: string;
  label: string;
  detail: string;
  kind: "viagem" | "folga" | "treinamento";
};

export type TelemetryEvent = {
  id: string;
  at: string;
  kind: "excesso_velocidade" | "motor_ocioso" | "frenagem_brusca";
  detail: string;
  minutes?: number;
  /** Ociosidade justificada (fila, carga, descarga) nao tira ponto. */
  justified?: boolean;
};

export type QueueItem = { id: string; at: string; label: string };

export type DemoState = {
  version: 1;
  seededAt: string;
  tenant: { id: string; name: string; operation: string; shipper: string; city: string };
  driver: {
    id: string;
    name: string;
    cpf: string;
    phone: string;
    team: string;
    hourlyWage: number;
  };
  vehicle: {
    id: string;
    plate: string;
    model: string;
    year: number;
    tankLiters: number;
    kmPerLiterTarget: number;
    odometer: number;
    trailer?: string;
  };
  operationKind: OperationKind;
  workDays: WorkDay[];
  previousDayEndedAt: string;
  trips: Trip[];
  activeTripId?: string;
  stations: FuelStation[];
  fuelRecords: FuelRecord[];
  checklistTemplate: ChecklistItem[];
  checklists: ChecklistRun[];
  occurrences: Occurrence[];
  documents: DriverDocument[];
  notices: Notice[];
  schedule: ScheduleEntry[];
  telemetry: TelemetryEvent[];
  team: { name: string; score: number; kmPerLiter: number; self?: boolean }[];
  /** Simulacoes de demonstracao, controladas pelo painel "Demonstracao". */
  sim: {
    offline: boolean;
    moving: boolean;
    speedKmh: number;
    trackerKmSinceLastFuel: number;
  };
  queue: QueueItem[];
  /** Preenchido quando o app esta ligado na Frotak (tenant com os modulos da operacao). */
  live?: LiveInfo;
};

export type ServerScore = {
  total: number;
  lines: {
    key: string;
    label: string;
    points: number;
    max: number;
    why: string;
    available: boolean;
  }[];
  tier: { min: number; amount: number; label: string } | null;
  kmPerLiter: number | null;
};

export type LiveInfo = {
  modules: string[];
  serverTime: string;
  loadedAt: string;
  score?: ServerScore;
  emergencyPhone?: string;
  lastError?: string;
};
