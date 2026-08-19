export type StageId =
  | "demanda"
  | "remetente"
  | "carregamento"
  | "documentos"
  | "destinatario"
  | "descarga"
  | "concluida";

export type Stage = {
  id: StageId;
  index: number;
  short: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  action: string;
  place: string;
  eta: string;
};

export const STAGES: Stage[] = [
  {
    id: "demanda",
    index: 0,
    short: "Demanda",
    title: "Nova demanda",
    subtitle: "Voce recebeu uma nova ordem de coleta.",
    statusLabel: "Aguardando motorista",
    action: "Aceitar demanda",
    place: "ADUMAR - Maruim/SE",
    eta: "1h 20min ate a coleta",
  },
  {
    id: "remetente",
    index: 1,
    short: "Coleta",
    title: "Chegada no remetente",
    subtitle: "Confirme sua chegada no local de coleta.",
    statusLabel: "Em rota - indo carregar",
    action: "Confirmar chegada",
    place: "ADUMAR - Maruim/SE",
    eta: "18 min restantes",
  },
  {
    id: "carregamento",
    index: 2,
    short: "Carga",
    title: "Carregamento",
    subtitle: "Confirme o caminhao carregado e envie a nota fiscal.",
    statusLabel: "Parado aguardando carga",
    action: "Confirmar caminhao carregado",
    place: "Patio de carregamento - Doca 04",
    eta: "Carregando",
  },
  {
    id: "documentos",
    index: 3,
    short: "CT-e",
    title: "CT-e / MDF-e",
    subtitle: "Aguardando emissao dos documentos pela expedicao.",
    statusLabel: "Aguardando CT-e",
    action: "Confirmar recebimento",
    place: "Expedicao ADUMAR",
    eta: "Emissao em andamento",
  },
  {
    id: "destinatario",
    index: 4,
    short: "Entrega",
    title: "Chegada ao destinatario",
    subtitle: "Confirme sua chegada no destino final.",
    statusLabel: "Em rota - indo descarregar",
    action: "Confirmar chegada",
    place: "APM Terminal Porto Suape - Ipojuca/PE",
    eta: "3h 42min restantes",
  },
  {
    id: "descarga",
    index: 5,
    short: "Descarga",
    title: "Descarga",
    subtitle: "Conclua o checklist e finalize a descarga.",
    statusLabel: "Parado aguardando descarga",
    action: "Confirmar descarga concluida",
    place: "APM Terminal Porto Suape - Ipojuca/PE",
    eta: "Descarregando",
  },
  {
    id: "concluida",
    index: 6,
    short: "Fim",
    title: "Rota concluida",
    subtitle: "Operacao finalizada. Aguarde o proximo comando da central.",
    statusLabel: "Aguardando comando",
    action: "Liberar para nova viagem",
    place: "Ipojuca/PE",
    eta: "-",
  },
];

export const TRIP = {
  code: "26C80185-DC88-4F57-A714-6BA69EA97C6F",
  cargo: "Cavalo trator",
  plate: "OER5D76",
  trailer: "QMG-1611 + QMG-1621",
  shipper: "ADUMAR - Maruim/SE",
  receiver: "APM Terminal Porto Suape - Ipojuca/PE",
  freight: "R$ 4.850,00",
  distance: "412 km",
  driver: "Euclesio Ancheta Silva de Oliveira",
};

export const CHECKLIST = [
  "Conferencia de lacres",
  "Foto do veiculo descarregado",
  "Canhoto assinado pelo recebedor",
  "Avarias registradas",
];

export const DOCS = [
  { name: "Nota fiscal 210513", meta: "PDF - 248 KB", state: "ok" as const },
  { name: "CT-e 8891-2", meta: "PDF - 256 KB", state: "ok" as const },
  { name: "MDF-e 4410", meta: "PDF - 191 KB", state: "pending" as const },
  { name: "Ordem de coleta", meta: "PDF - 96 KB", state: "ok" as const },
];
