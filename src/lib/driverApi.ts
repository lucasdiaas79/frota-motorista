import type { Session } from "@supabase/supabase-js";
import { supabase, hasSupabaseConfig } from "./supabase";

export type VehicleStatus =
  | "disponivel-patio"
  | "disponivel-oficina"
  | "aguardando-motorista"
  | "rota-carregar"
  | "rota-descarregar"
  | "rota-retornando"
  | "parado-aguardando-carga"
  | "aguardando-cte"
  | "aguardando-confirmacao"
  | "parado-aguardando-comando"
  | "parado-descarregando"
  | "parado-quebrado"
  | "manutencao";

export type VehicleFreightStage =
  | "DISPONIVEL"
  | "EM_ROTA_CARREGAR"
  | "AGUARDANDO_NOTA"
  | "NOTA_EM_CONFERENCIA"
  | "NOTA_APROVADA_AG_CTE"
  | "CTE_GERADA_AG_CONFIRMACAO_MOTORISTA"
  | "EM_ROTA_ENTREGA"
  | "ENTREGUE_AG_FINALIZACAO"
  | "ENTREGA_FINALIZADA";

export type DriverAppStageId =
  | "demanda"
  | "remetente"
  | "carregamento"
  | "documentos"
  | "destinatario"
  | "descarga"
  | "retorno"
  | "concluida";

export type DriverAppStage = {
  id: DriverAppStageId;
  index: number;
  short: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  action: string;
  place: string;
  eta: string;
  canDriverAdvance: boolean;
};

export type DriverTrip = {
  code: string;
  cargo: string;
  plate: string;
  trailer: string;
  shipper: string;
  receiver: string;
  freight: string;
  distance: string;
  driver: string;
  vehicleId?: string;
  freightId?: string;
};

export type DriverAppMode = "single_freight" | "long_trip_multi_freight";
export type DriverAssetAssignmentMode = "fixed_vehicle" | "manual_per_freight";
export type DriverExpenseScope = "freight" | "trip";

export type DriverAppConfig = {
  driverAppMode: DriverAppMode;
  assetAssignmentMode: DriverAssetAssignmentMode;
  expenseScope: DriverExpenseScope;
};

export type DriverTenantInfo = {
  id: string;
  slug: string;
  tradeName?: string | null;
  legalName?: string | null;
};

type DriverRow = {
  id: string;
  tenant_id: string;
  auth_user_id?: string | null;
  name: string;
  phone?: string | null;
  cnh?: string | null;
  active: boolean;
  vehicle_id?: string | null;
};

type VehicleRow = {
  id: string;
  tenant_id: string;
  current_freight_id?: string | null;
  plate: string;
  type: string;
  status: VehicleStatus;
  freight_stage?: VehicleFreightStage | null;
  driver_id?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  product_id?: string | null;
  freight_value?: number | string | null;
  freight_pricing_mode?: "fixed" | "per_ton" | null;
  freight_ton_price?: number | string | null;
  unloaded_tons?: number | string | null;
  city?: string | null;
  state?: string | null;
  updated_at?: string | null;
};

type TrailerRow = {
  id: string;
  identifier: string;
  implement_model?: string | null;
  model?: string | null;
};

type PartyRow = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  location_label?: string | null;
  location_source?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type ProductRow = {
  id: string;
  name: string;
};

type DriverProfileRow = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  must_change_password?: boolean | null;
};

export type DriverDocument = {
  id: string;
  kind: string;
  file_name: string;
  fileName?: string | null;
  storage_bucket?: string | null;
  storageBucket?: string | null;
  storage_path?: string | null;
  storagePath?: string | null;
  mime_type?: string | null;
  mimeType?: string | null;
  size_bytes?: number | string | null;
  sizeBytes?: number | string | null;
  status: string;
  created_at: string;
  createdAt?: string | null;
};

export type DriverCashEntry = {
  id: string;
  origin: string;
  businessPartnerId?: string | null;
  stationName?: string | null;
  amount: number | string;
  notes?: string | null;
  source?: string | null;
  recordedAt: string;
  tripCycleId?: string | null;
};

export type DriverExpenseEntry = {
  id: string;
  category: string;
  description: string;
  amount: number | string;
  notes?: string | null;
  fuelRecordId?: string | null;
  paymentSource?: "trip_cash" | "company_payable" | null;
  recordedAt: string;
  tripCycleId?: string | null;
};

export type DriverCashEntryStation = {
  id: string;
  name: string;
};

export type DriverExpensePaymentSource = "trip_cash" | "company_payable";

export type DriverTripCycle = {
  id: string;
  status: "open" | "closed" | "cancelled";
  startedAt: string;
  closedAt?: string | null;
  startOdometer?: number | string | null;
  endOdometer?: number | string | null;
  odometerStartedAt?: string | null;
  odometerEndedAt?: string | null;
  freightCount?: number;
  completedFreightCount?: number;
};

export type DriverReturnToYard = {
  available: boolean;
  vehicleId?: string;
  tripCycleId?: string;
  status?: string;
  freightStage?: string;
  label?: string;
};

export type DriverFinanceTransaction = {
  id: string;
  kind: "entry" | "expense";
  label: string;
  detail: string;
  amount: number;
  recordedAt: string;
};

export type DriverTripFinance = {
  income: number;
  expenses: number;
  balance: number;
  transactions: DriverFinanceTransaction[];
};

export type DriverDailyAllowanceStatus = "submitted" | "approved" | "rejected";

export type DriverDailyAllowance = {
  id: string;
  quantity: number;
  unitAmount: number | string;
  totalAmount: number | string;
  status: DriverDailyAllowanceStatus;
  notes?: string | null;
  submittedAt: string;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
};

export type DriverDailyAllowanceContext = {
  enabled: boolean;
  configured?: boolean;
  reason?: string;
  tripCycleId?: string;
  tripCycleStartedAt?: string;
  dailyAmount?: number | string;
  allowance?: DriverDailyAllowance | null;
};

export type DriverAppContext = {
  driver: DriverRow;
  tenant: DriverTenantInfo | null;
  config: DriverAppConfig;
  tripCycle: DriverTripCycle | null;
  profile: DriverProfileRow | null;
  vehicle: VehicleRow | null;
  trailers: TrailerRow[];
  sender: PartyRow | null;
  recipient: PartyRow | null;
  product: ProductRow | null;
  documents: DriverDocument[];
  cashEntries?: DriverCashEntry[];
  expenses?: DriverExpenseEntry[];
  dailyAllowance?: DriverDailyAllowanceContext | null;
  returnToYard?: DriverReturnToYard | null;
};

export const DEFAULT_DRIVER_APP_CONFIG: DriverAppConfig = {
  driverAppMode: "single_freight",
  assetAssignmentMode: "fixed_vehicle",
  expenseScope: "freight",
};

export const FALLBACK_STAGE: DriverAppStage = {
  id: "demanda",
  index: 0,
  short: "Demanda",
  title: "Nova demanda",
  subtitle: "Voce recebeu uma nova ordem de coleta.",
  statusLabel: "Aguardando motorista",
  action: "Aceitar demanda",
  place: "Aguardando dados do frete",
  eta: "Aguardando sincronizacao",
  canDriverAdvance: true,
};

export const FALLBACK_TRIP: DriverTrip = {
  code: "-",
  cargo: "-",
  plate: "-",
  trailer: "-",
  shipper: "-",
  receiver: "-",
  freight: "-",
  distance: "-",
  driver: "-",
};

const STAGE_INDEX: Record<DriverAppStageId, number> = {
  demanda: 0,
  remetente: 1,
  carregamento: 2,
  documentos: 3,
  destinatario: 4,
  descarga: 5,
  retorno: 6,
  concluida: 6,
};

export const DRIVER_STAGE_COUNT = 7;

function place(row: PartyRow | null | undefined) {
  if (!row) return "-";
  if (row.location_label) return row.location_label;
  if (row.address) {
    const cityState = [row.city, row.state].filter(Boolean).join("/");
    return cityState ? `${row.address} - ${cityState}` : row.address;
  }
  const location = [row.city, row.state].filter(Boolean).join("/");
  return location ? `${row.name} - ${location}` : row.name;
}

function money(value: number | string | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function freightCode(vehicle: VehicleRow | null) {
  if (!vehicle) return "-";
  const plate = vehicle.plate.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return vehicle.current_freight_id
    ? `FRT-${plate}-${vehicle.current_freight_id.slice(0, 4).toUpperCase()}`
    : `FRT-${plate}`;
}

function latestDocument(documents: DriverDocument[], kind: string) {
  return documents.find((document) => document.kind === kind);
}

function isRejected(status?: string | null) {
  return ["rejeitado", "rejected"].includes(String(status ?? "").toLowerCase());
}

function isDriverAppMode(value: unknown): value is DriverAppMode {
  return value === "single_freight" || value === "long_trip_multi_freight";
}

function isAssetAssignmentMode(value: unknown): value is DriverAssetAssignmentMode {
  return value === "fixed_vehicle" || value === "manual_per_freight";
}

function isExpenseScope(value: unknown): value is DriverExpenseScope {
  return value === "freight" || value === "trip";
}

function normalizeDriverAppConfig(value: unknown): DriverAppConfig {
  const config = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const mode = config.driverAppMode ?? config.mode;
  const assetMode = config.assetAssignmentMode ?? config.asset_assignment_mode;
  const expenseScope = config.expenseScope ?? config.expense_scope;

  return {
    driverAppMode: isDriverAppMode(mode) ? mode : DEFAULT_DRIVER_APP_CONFIG.driverAppMode,
    assetAssignmentMode: isAssetAssignmentMode(assetMode)
      ? assetMode
      : DEFAULT_DRIVER_APP_CONFIG.assetAssignmentMode,
    expenseScope: isExpenseScope(expenseScope)
      ? expenseScope
      : DEFAULT_DRIVER_APP_CONFIG.expenseScope,
  };
}

function normalizeDriverAppContext(data: unknown): DriverAppContext {
  const context = data && typeof data === "object" ? (data as Partial<DriverAppContext>) : null;
  if (!context?.driver) {
    throw new Error("Contexto do motorista nao retornado pelo servidor.");
  }

  return {
    driver: context.driver,
    tenant: context.tenant ?? null,
    config: normalizeDriverAppConfig(context.config),
    tripCycle: context.tripCycle ?? null,
    profile: context.profile ?? null,
    vehicle: context.vehicle ?? null,
    trailers: context.trailers ?? [],
    sender: context.sender ?? null,
    recipient: context.recipient ?? null,
    product: context.product ?? null,
    documents: context.documents ?? [],
    cashEntries: context.cashEntries ?? [],
    expenses: context.expenses ?? [],
    dailyAllowance: context.dailyAllowance ?? null,
    returnToYard: context.returnToYard ?? null,
  };
}

export function driverDocumentFileName(document: DriverDocument) {
  return document.fileName || document.file_name || "documento";
}

export function driverDocumentStorageRef(document: DriverDocument) {
  const bucket = document.storageBucket || document.storage_bucket || null;
  const path = document.storagePath || document.storage_path || null;
  return bucket && path ? { bucket, path } : null;
}

export async function createDriverDocumentUrl(document: DriverDocument) {
  const ref = driverDocumentStorageRef(document);
  if (!ref) {
    throw new Error("Arquivo ainda nao esta disponivel para visualizacao.");
  }

  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 60 * 10);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Nao foi possivel gerar o link do documento.");
  }
  return data.signedUrl;
}

export function tripFromContext(context: DriverAppContext | null): DriverTrip {
  if (!context?.vehicle) {
    return { ...FALLBACK_TRIP, driver: context?.driver.name ?? "-" };
  }

  const trailer = context.trailers
    .map((item) => item.implement_model || item.model || item.identifier)
    .filter(Boolean)
    .join(" + ");

  return {
    code: freightCode(context.vehicle),
    cargo: context.product?.name ?? context.vehicle.type ?? "-",
    plate: context.vehicle.plate || "-",
    trailer: trailer || "-",
    shipper: place(context.sender),
    receiver: place(context.recipient),
    freight:
      context.vehicle.freight_pricing_mode === "per_ton"
        ? `${money(context.vehicle.freight_ton_price)} / ton`
        : money(context.vehicle.freight_value),
    distance: "-",
    driver: context.driver.name || "-",
    vehicleId: context.vehicle.id,
    freightId: context.vehicle.current_freight_id ?? undefined,
  };
}

function numericValue(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

const EXPENSE_LABELS: Record<string, string> = {
  diesel_s10: "Diesel S10",
  arla: "Arla",
  pedagio: "Pedagio",
  alimentacao: "Alimentacao",
  estacionamento: "Estacionamento",
  manutencao: "Manutencao",
  outros: "Outros",
};

export function financeFromContext(context: DriverAppContext | null): DriverTripFinance {
  const cashEntries = context?.cashEntries ?? [];
  const expenses = (context?.expenses ?? []).filter(
    (expense) => expense.paymentSource !== "company_payable",
  );
  const income = cashEntries.reduce((total, entry) => total + numericValue(entry.amount), 0);
  const expenseTotal = expenses.reduce((total, expense) => total + numericValue(expense.amount), 0);
  const transactions: DriverFinanceTransaction[] = [
    ...cashEntries.map((entry) => ({
      id: entry.id,
      kind: "entry" as const,
      label: entry.origin || "Entrada",
      detail: entry.notes || "Entrada do frete",
      amount: numericValue(entry.amount),
      recordedAt: entry.recordedAt,
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      kind: "expense" as const,
      label: EXPENSE_LABELS[expense.category] ?? "Despesa",
      detail: expense.description || expense.notes || "Despesa do frete",
      amount: numericValue(expense.amount),
      recordedAt: expense.recordedAt,
    })),
  ].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  return {
    income,
    expenses: expenseTotal,
    balance: income - expenseTotal,
    transactions,
  };
}

export function stageFromContext(context: DriverAppContext | null): DriverAppStage {
  const vehicle = context?.vehicle;
  const sender = place(context?.sender);
  const recipient = place(context?.recipient);
  const currentPlace = [vehicle?.city, vehicle?.state].filter(Boolean).join(" - ");
  const currentFreightId = Boolean(vehicle?.current_freight_id);
  const longTripOpen =
    context?.config.driverAppMode === "long_trip_multi_freight" &&
    context?.tripCycle?.status === "open";
  const latestNote = latestDocument(context?.documents ?? [], "nota_fiscal");
  const noteRejected = isRejected(latestNote?.status);

  if (
    vehicle &&
    longTripOpen &&
    context?.returnToYard?.available &&
    vehicle.status === "rota-retornando" &&
    vehicle.freight_stage === "ENTREGA_FINALIZADA"
  ) {
    return {
      id: "retorno",
      index: STAGE_INDEX.retorno,
      short: "Retorno",
      title: "Retorno ao patio",
      subtitle: "Confirme sua chegada ao patio para liberar o veiculo.",
      statusLabel: "Retornando",
      action: context.returnToYard.label || "Cheguei no patio",
      place: currentPlace || "Patio",
      eta: "-",
      canDriverAdvance: true,
    };
  }

  if (!vehicle || !currentFreightId) {
    return {
      ...FALLBACK_STAGE,
      id: "concluida",
      index: STAGE_INDEX.concluida,
      short: "Livre",
      title: longTripOpen ? "Aguardando proximo frete" : "Nenhuma viagem ativa",
      subtitle: longTripOpen
        ? "Sua viagem longa continua aberta. Aguarde a central enviar o proximo frete."
        : "Aguarde uma nova demanda da central.",
      statusLabel: longTripOpen ? "Viagem aberta" : "Aguardando comando",
      action: "Atualizar dados",
      place: currentPlace || "-",
      eta: "-",
      canDriverAdvance: false,
    };
  }

  const stage = vehicle.freight_stage ?? "DISPONIVEL";

  if (stage === "DISPONIVEL") {
    return {
      id: "demanda",
      index: STAGE_INDEX.demanda,
      short: "Demanda",
      title: "Nova demanda",
      subtitle: "Voce recebeu uma nova ordem de coleta.",
      statusLabel: "Aguardando motorista",
      action: "Aceitar demanda",
      place: sender,
      eta: "Confirme para iniciar",
      canDriverAdvance: true,
    };
  }

  if (stage === "EM_ROTA_CARREGAR") {
    return {
      id: "remetente",
      index: STAGE_INDEX.remetente,
      short: "Coleta",
      title: "Chegada no remetente",
      subtitle: "Confirme sua chegada no local de coleta.",
      statusLabel: "Em rota - indo carregar",
      action: "Confirmar chegada",
      place: sender,
      eta: "-",
      canDriverAdvance: true,
    };
  }

  if (stage === "AGUARDANDO_NOTA" || stage === "NOTA_EM_CONFERENCIA" || noteRejected) {
    return {
      id: "carregamento",
      index: STAGE_INDEX.carregamento,
      short: "Carga",
      title: noteRejected
        ? "Nota reprovada"
        : stage === "NOTA_EM_CONFERENCIA"
          ? "Nota em conferencia"
          : "Carregamento",
      subtitle: noteRejected
        ? "A expedicao reprovou a nota. Envie uma nova foto ou informe que ela foi enviada por email."
        : stage === "NOTA_EM_CONFERENCIA"
          ? "A central esta conferindo a nota fiscal enviada."
          : "Confirme o caminhao carregado e envie a nota fiscal para a expedicao.",
      statusLabel: noteRejected
        ? "Nota reprovada"
        : stage === "NOTA_EM_CONFERENCIA"
          ? "Nota em conferencia"
          : "Parado aguardando carga",
      action: noteRejected || stage === "AGUARDANDO_NOTA" ? "Enviar nota" : "Aguardar central",
      place: sender,
      eta: "Carregando",
      canDriverAdvance: stage === "AGUARDANDO_NOTA" || noteRejected,
    };
  }

  if (stage === "NOTA_APROVADA_AG_CTE" || stage === "CTE_GERADA_AG_CONFIRMACAO_MOTORISTA") {
    return {
      id: "documentos",
      index: STAGE_INDEX.documentos,
      short: "CT-e",
      title: "CT-e / MDF-e",
      subtitle:
        stage === "NOTA_APROVADA_AG_CTE"
          ? "Aguardando emissao dos documentos pela expedicao."
          : "Confirme o recebimento dos documentos para seguir viagem.",
      statusLabel: stage === "NOTA_APROVADA_AG_CTE" ? "Aguardando CT-e" : "Aguardando confirmacao",
      action: stage === "NOTA_APROVADA_AG_CTE" ? "Aguardar documentos" : "Confirmar recebimento",
      place: sender,
      eta: "Emissao em andamento",
      canDriverAdvance: stage === "CTE_GERADA_AG_CONFIRMACAO_MOTORISTA",
    };
  }

  if (stage === "EM_ROTA_ENTREGA") {
    return {
      id: "destinatario",
      index: STAGE_INDEX.destinatario,
      short: "Entrega",
      title: "Chegada ao destinatario",
      subtitle: "Confirme sua chegada no destino final.",
      statusLabel: "Em rota - indo descarregar",
      action: "Confirmar chegada",
      place: recipient,
      eta: "-",
      canDriverAdvance: true,
    };
  }

  if (stage === "ENTREGUE_AG_FINALIZACAO") {
    return {
      id: "descarga",
      index: STAGE_INDEX.descarga,
      short: "Descarga",
      title: "Descarga",
      subtitle: "Conclua o checklist e finalize a descarga.",
      statusLabel: "Parado aguardando descarga",
      action: "Confirmar descarga concluida",
      place: recipient,
      eta: "Descarregando",
      canDriverAdvance: true,
    };
  }

  if (stage === "ENTREGA_FINALIZADA" && vehicle.status === "rota-retornando") {
    return {
      id: "retorno",
      index: STAGE_INDEX.retorno,
      short: "Retorno",
      title: "Retorno ao patio",
      subtitle: "Confirme sua chegada ao patio para liberar o veiculo.",
      statusLabel: "Retornando",
      action: "Cheguei no patio",
      place: currentPlace || "Patio",
      eta: "-",
      canDriverAdvance: true,
    };
  }

  return {
    id: "concluida",
    index: STAGE_INDEX.concluida,
    short: "Fim",
    title: "Rota concluida",
    subtitle: "Operacao finalizada. Aguarde o proximo comando da central.",
    statusLabel: "Aguardando comando",
    action: "Liberar para nova viagem",
    place: recipient,
    eta: "-",
    canDriverAdvance: false,
  };
}

export async function getInitialSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

function driverLoginEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `${normalized}@driver.frotak.local`;
}

export async function signInDriver(phone: string, password: string): Promise<Session> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase nao configurado para o app motorista.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: driverLoginEmail(phone),
    password,
  });

  if (error) throw error;
  if (!data.session) throw new Error("Sessao nao retornada pelo Supabase.");
  return data.session;
}

export async function signOutDriver() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadDriverContext(): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("get_driver_app_context");
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export async function advanceDriverStage(
  vehicleId: string,
  unloadedTons?: number,
  odometer?: number,
): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_advance_stage", {
    p_vehicle_id: vehicleId,
    p_target_stage: null,
    p_unloaded_tons: unloadedTons ?? null,
    p_odometer: odometer ?? null,
  });
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export async function completeDriverReturn(
  vehicleId: string,
  odometer?: number,
): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_complete_return", {
    p_vehicle_id: vehicleId,
    p_odometer: odometer ?? null,
  });
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export async function registerDriverDocument(input: {
  kind: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  file?: File;
}): Promise<DriverAppContext> {
  let storageBucket: string | null = null;
  let storagePath: string | null = null;
  if (input.file) {
    const context = await loadDriverContext();
    const tenantId = context.driver?.tenant_id;
    const freightId = context.vehicle?.current_freight_id;
    if (!tenantId || !freightId) throw new Error("Nao foi possivel identificar a viagem ativa.");
    const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || input.fileName;
    storageBucket = "freight-documents";
    storagePath = `${tenantId}/${freightId}/${input.kind}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, input.file, {
        contentType: input.file.type || input.mimeType || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;
  }

  const { data, error } = await supabase.rpc("driver_app_register_document", {
    p_kind: input.kind,
    p_file_name: input.fileName,
    p_mime_type: input.file?.type || input.mimeType || null,
    p_size_bytes: input.file?.size ?? input.sizeBytes ?? null,
    p_storage_bucket: storageBucket,
    p_storage_path: storagePath,
  });
  if (error) {
    if (storageBucket && storagePath) {
      void supabase.storage.from(storageBucket).remove([storagePath]);
    }
    throw error;
  }
  return normalizeDriverAppContext(data);
}

export async function registerDriverFuel(input: {
  station: string;
  tenantId?: string;
  diesel?: {
    liters: number;
    amount: number;
  };
  arla?: {
    liters: number;
    amount: number;
  };
  odometer: number;
  notes?: string;
  paymentMethod?: string;
  pumpPhoto?: File;
  receiptPhoto?: File;
}): Promise<DriverAppContext> {
  const tenantId = input.tenantId;
  if (!tenantId) {
    throw new Error("Nao foi possivel identificar o tenant do motorista.");
  }

  const uploadedPaths: string[] = [];
  try {
    const pumpPhoto = await uploadFuelPhoto(tenantId, "pump_photo", input.pumpPhoto, uploadedPaths);
    const receiptPhoto = await uploadFuelPhoto(
      tenantId,
      "receipt_photo",
      input.receiptPhoto,
      uploadedPaths,
    );

    const { data, error } = await supabase.rpc("driver_app_register_fuel_document", {
      p_station: input.station,
      p_odometer: input.odometer,
      p_diesel_liters: input.diesel?.liters ?? null,
      p_diesel_amount: input.diesel?.amount ?? null,
      p_arla_liters: input.arla?.liters ?? null,
      p_arla_amount: input.arla?.amount ?? null,
      p_notes: input.notes ?? null,
      p_payment_method: input.paymentMethod ?? null,
      p_pump_photo_id: pumpPhoto?.id ?? null,
      p_pump_photo_file_name: pumpPhoto?.fileName ?? null,
      p_pump_photo_storage_bucket: pumpPhoto?.bucket ?? null,
      p_pump_photo_storage_path: pumpPhoto?.path ?? null,
      p_pump_photo_mime_type: pumpPhoto?.mimeType ?? null,
      p_pump_photo_size_bytes: pumpPhoto?.sizeBytes ?? null,
      p_receipt_photo_id: receiptPhoto?.id ?? null,
      p_receipt_photo_file_name: receiptPhoto?.fileName ?? null,
      p_receipt_photo_storage_bucket: receiptPhoto?.bucket ?? null,
      p_receipt_photo_storage_path: receiptPhoto?.path ?? null,
      p_receipt_photo_mime_type: receiptPhoto?.mimeType ?? null,
      p_receipt_photo_size_bytes: receiptPhoto?.sizeBytes ?? null,
    });
    if (error) throw error;
    return normalizeDriverAppContext(data);
  } catch (error) {
    if (uploadedPaths.length) {
      void supabase.storage.from(FUEL_DOCUMENTS_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

const FUEL_DOCUMENTS_BUCKET = "driver-fuel-documents";

type UploadedFuelPhoto = {
  id: string;
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
};

function sanitizeStorageName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "foto.jpg";
}

async function uploadFuelPhoto(
  tenantId: string,
  kind: "pump_photo" | "receipt_photo",
  file: File | undefined,
  uploadedPaths: string[],
): Promise<UploadedFuelPhoto | undefined> {
  if (!file) return undefined;

  const id = crypto.randomUUID();
  const safeName = sanitizeStorageName(file.name);
  const path = `${tenantId}/driver-app/fuel/${id}/${kind}-${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(FUEL_DOCUMENTS_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw error;
  uploadedPaths.push(path);

  return {
    id,
    bucket: FUEL_DOCUMENTS_BUCKET,
    path,
    fileName: file.name,
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}

export async function registerDriverExpense(input: {
  category: "pedagio" | "alimentacao" | "estacionamento" | "manutencao" | "outros";
  description: string;
  amount: number;
  notes?: string;
  paymentSource?: DriverExpensePaymentSource;
}): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_register_expense_v2", {
    p_category: input.category,
    p_description: input.description,
    p_amount: input.amount,
    p_notes: input.notes ?? null,
    p_payment_source: input.paymentSource ?? "company_payable",
  });
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export async function listDriverCashEntryStations(): Promise<DriverCashEntryStation[]> {
  const { data, error } = await supabase.rpc("get_driver_cash_entry_stations");
  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const station = item as Record<string, unknown>;
    if (typeof station.id !== "string" || typeof station.name !== "string") return [];
    return [{ id: station.id, name: station.name }];
  });
}

export async function registerDriverStationCashEntry(input: {
  stationPartnerId: string;
  amount: number;
  notes?: string;
}): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_register_station_cash_entry", {
    p_station_partner_id: input.stationPartnerId,
    p_amount: input.amount,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export async function registerDriverCashEntry(input: {
  origin: string;
  amount: number;
  notes?: string;
}): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_register_cash_entry", {
    p_origin: input.origin,
    p_amount: input.amount,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export async function submitDriverDailyAllowance(input: {
  quantity: number;
  notes?: string;
}): Promise<DriverDailyAllowanceContext> {
  const { data, error } = await supabase.rpc("driver_app_submit_daily_allowance", {
    p_quantity: input.quantity,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw error;
  return (data ?? { enabled: false }) as DriverDailyAllowanceContext;
}

export async function completeDriverPasswordSetup(newPassword: string): Promise<DriverAppContext> {
  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
  if (passwordError) throw passwordError;

  const { data, error } = await supabase.rpc("driver_app_complete_password_setup");
  if (error) throw error;
  return normalizeDriverAppContext(data);
}

export function subscribeDriverOperationalChanges(onChange: () => void) {
  const channel = supabase
    .channel("driver-app-operational-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "freights" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "driver_trip_cycles" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "freight_documents" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fuel_records" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "freight_expenses" }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "driver_trip_daily_allowances" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "freight_cash_entries" },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
