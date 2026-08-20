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
  status: string;
  created_at: string;
};

export type DriverAppContext = {
  driver: DriverRow;
  profile: DriverProfileRow | null;
  vehicle: VehicleRow | null;
  trailers: TrailerRow[];
  sender: PartyRow | null;
  recipient: PartyRow | null;
  product: ProductRow | null;
  documents: DriverDocument[];
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
    freight: money(context.vehicle.freight_value),
    distance: "-",
    driver: context.driver.name || "-",
    vehicleId: context.vehicle.id,
    freightId: context.vehicle.current_freight_id ?? undefined,
  };
}

export function stageFromContext(context: DriverAppContext | null): DriverAppStage {
  const vehicle = context?.vehicle;
  const sender = place(context?.sender);
  const recipient = place(context?.recipient);
  const currentPlace = [vehicle?.city, vehicle?.state].filter(Boolean).join(" - ");
  const currentFreightId = Boolean(vehicle?.current_freight_id);

  if (!vehicle || !currentFreightId) {
    return {
      ...FALLBACK_STAGE,
      id: "concluida",
      index: STAGE_INDEX.concluida,
      short: "Livre",
      title: "Nenhuma viagem ativa",
      subtitle: "Aguarde uma nova demanda da central.",
      statusLabel: "Aguardando comando",
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

  if (stage === "AGUARDANDO_NOTA" || stage === "NOTA_EM_CONFERENCIA") {
    return {
      id: "carregamento",
      index: STAGE_INDEX.carregamento,
      short: "Carga",
      title: stage === "NOTA_EM_CONFERENCIA" ? "Nota em conferencia" : "Carregamento",
      subtitle:
        stage === "NOTA_EM_CONFERENCIA"
          ? "A central esta conferindo a nota fiscal enviada."
          : "Confirme o caminhao carregado e envie a nota fiscal.",
      statusLabel:
        stage === "NOTA_EM_CONFERENCIA" ? "Nota em conferencia" : "Parado aguardando carga",
      action: stage === "NOTA_EM_CONFERENCIA" ? "Aguardar central" : "Confirmar caminhao carregado",
      place: sender,
      eta: "Carregando",
      canDriverAdvance: stage === "AGUARDANDO_NOTA",
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

function driverAuthPassword(password: string) {
  return password === "1234" ? "Frotak1234!" : password;
}

export async function signInDriver(phone: string, password: string): Promise<Session> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase nao configurado para o app motorista.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: driverLoginEmail(phone),
    password: driverAuthPassword(password),
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
  return data as DriverAppContext;
}

export async function advanceDriverStage(vehicleId: string): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_advance_stage", {
    p_vehicle_id: vehicleId,
    p_target_stage: null,
  });
  if (error) throw error;
  return data as DriverAppContext;
}

export async function registerDriverDocument(input: {
  kind: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_register_document", {
    p_kind: input.kind,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType ?? null,
    p_size_bytes: input.sizeBytes ?? null,
  });
  if (error) throw error;
  return data as DriverAppContext;
}

export async function registerDriverFuel(input: {
  station: string;
  fuelType: "diesel_s10" | "arla";
  liters: number;
  amount: number;
  odometer: number;
  notes?: string;
}): Promise<DriverAppContext> {
  const { data, error } = await supabase.rpc("driver_app_register_fuel", {
    p_station: input.station,
    p_fuel_type: input.fuelType,
    p_liters: input.liters,
    p_amount: input.amount,
    p_odometer: input.odometer,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as DriverAppContext;
}

export async function completeDriverPasswordSetup(newPassword: string): Promise<DriverAppContext> {
  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
  if (passwordError) throw passwordError;

  const { data, error } = await supabase.rpc("driver_app_complete_password_setup");
  if (error) throw error;
  return data as DriverAppContext;
}

export function subscribeDriverOperationalChanges(onChange: () => void) {
  const channel = supabase
    .channel("driver-app-operational-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "freight_documents" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fuel_records" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
