import type {
  ChecklistItem,
  DemoState,
  FuelRecord,
  FuelStation,
  OperationKind,
  PunchSegment,
  Stop,
  TelemetryEvent,
  Trip,
} from "./types";

// Dados ficticios. Nomes de pessoas, empresas, placas e CNPJs sao inventados.
// "Ambev" aparece so como o embarcador da operacao que a demonstracao representa.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

let counter = 0;
export function uid(prefix = "id") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

export function localDate(ms: number) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Gerador deterministico para o historico ficar igual a cada reset.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const CDD = {
  name: "CDD Aracaju (exemplo)",
  address: "Av. Industrial, 1500 - Distrito Industrial",
  city: "Aracaju/SE",
  geo: { lat: -10.9622, lng: -37.0941 },
};

export const FACTORY = {
  name: "Fabrica de bebidas (exemplo)",
  address: "Rod. BR-101, km 92",
  city: "Nossa Senhora do Socorro/SE",
  geo: { lat: -10.8553, lng: -37.1262 },
};

export const STATIONS: FuelStation[] = [
  {
    id: "st_1",
    name: "Posto Rota 101 (exemplo)",
    brand: "Bandeira branca",
    city: "Nossa Senhora do Socorro/SE",
    geo: { lat: -10.8711, lng: -37.1188 },
    negotiatedDieselPrice: 5.89,
    negotiatedArlaPrice: 3.79,
    paymentTerms: "Faturado quinzenal",
    accredited: true,
  },
  {
    id: "st_2",
    name: "Auto Posto Siqueira (exemplo)",
    brand: "Bandeira A",
    city: "Aracaju/SE",
    geo: { lat: -10.9551, lng: -37.0712 },
    negotiatedDieselPrice: 5.94,
    negotiatedArlaPrice: 3.89,
    paymentTerms: "Cartao frota",
    accredited: true,
  },
  {
    id: "st_3",
    name: "Posto Caminhoneiro Itaporanga (exemplo)",
    brand: "Bandeira B",
    city: "Itaporanga d'Ajuda/SE",
    geo: { lat: -11.0081, lng: -37.3109 },
    negotiatedDieselPrice: 5.86,
    negotiatedArlaPrice: 3.75,
    paymentTerms: "Faturado quinzenal",
    accredited: true,
  },
  {
    id: "st_4",
    name: "Posto Estancia Sul (exemplo)",
    brand: "Bandeira branca",
    city: "Estancia/SE",
    geo: { lat: -11.2657, lng: -37.4384 },
    negotiatedDieselPrice: 5.91,
    negotiatedArlaPrice: 3.82,
    paymentTerms: "Cartao frota",
    accredited: true,
  },
];

export const CHECKLIST_TEMPLATE: ChecklistItem[] = [
  { id: "pneus", group: "Pneus e rodas", label: "Pneus calibrados, sem corte ou bolha", critical: true },
  { id: "estepe", group: "Pneus e rodas", label: "Estepe e porcas das rodas", critical: false },
  { id: "freios", group: "Freios e direcao", label: "Freio de servico e de estacionamento", critical: true },
  { id: "direcao", group: "Freios e direcao", label: "Direcao sem folga", critical: true },
  { id: "luzes", group: "Luzes", label: "Farois, setas, luz de freio e re", critical: true },
  { id: "painel", group: "Painel", label: "Sem luz de falha acesa no painel", critical: false },
  { id: "vazamento", group: "Motor", label: "Sem vazamento de oleo, agua ou ar", critical: true },
  { id: "oleo", group: "Motor", label: "Nivel de oleo e agua", critical: false },
  { id: "extintor", group: "Seguranca", label: "Extintor na validade, triangulo e macaco", critical: true },
  { id: "cinto", group: "Seguranca", label: "Cinto de seguranca e retrovisores", critical: true },
  { id: "tacografo", group: "Documentos", label: "Tacografo funcionando e documento do veiculo", critical: true },
  { id: "bau", group: "Carroceria", label: "Bau ou sider sem avaria, lona e travas", critical: false },
  { id: "epi", group: "Seguranca", label: "EPI: colete, bota e luva", critical: false },
  { id: "limpeza", group: "Cabine", label: "Cabine limpa e sem objeto solto", critical: false },
];

function distributionStops(now: number): Stop[] {
  const pdvs: Array<Omit<Stop, "order" | "kind" | "status" | "radiusMeters">> = [
    {
      id: "s1",
      name: "Mercadinho Bom Preco (exemplo)",
      document: "12.345.678/0001-01",
      address: "Rua Itabaiana, 410 - Centro",
      city: "Aracaju/SE",
      geo: { lat: -10.9139, lng: -37.0565 },
      window: { from: "07:00", to: "11:00" },
      invoices: [{ number: "NF 184.221", boxes: 48, amount: 3912.4, key: "2826 1112 3456 7800 0101 5500 1000 1842 2110 0000 0011" }],
      returnablesExpected: { garrafeira: 40 },
      payment: { method: "boleto", amount: 3912.4 },
    },
    {
      id: "s2",
      name: "Bar do Litoral (exemplo)",
      document: "23.456.789/0001-02",
      address: "Av. Santos Dumont, 1250 - Atalaia",
      city: "Aracaju/SE",
      geo: { lat: -10.9852, lng: -37.0476 },
      window: { from: "08:00", to: "12:00" },
      invoices: [{ number: "NF 184.222", boxes: 22, amount: 1876.0 }],
      returnablesExpected: { garrafeira: 22, barril: 2 },
      payment: { method: "pix", amount: 1876.0 },
    },
    {
      id: "s3",
      name: "Supermercado Sergipano (exemplo)",
      document: "34.567.890/0001-03",
      address: "Av. Hermes Fontes, 3010 - Luzia",
      city: "Aracaju/SE",
      geo: { lat: -10.9468, lng: -37.0631 },
      window: { from: "07:00", to: "10:00" },
      dock: "Doca 2",
      invoices: [
        { number: "NF 184.223", boxes: 120, amount: 9840.0 },
        { number: "NF 184.224", boxes: 36, amount: 2952.0 },
      ],
      returnablesExpected: { palete: 4 },
      payment: { method: "boleto", amount: 12792.0 },
    },
    {
      id: "s4",
      name: "Adega Coroa do Meio (exemplo)",
      document: "45.678.901/0001-04",
      address: "Rua Niceu Dantas, 88 - Coroa do Meio",
      city: "Aracaju/SE",
      geo: { lat: -10.9934, lng: -37.0458 },
      window: { from: "09:00", to: "13:00" },
      invoices: [{ number: "NF 184.225", boxes: 30, amount: 2610.0 }],
      returnablesExpected: { garrafeira: 30 },
      payment: { method: "dinheiro", amount: 2610.0 },
    },
    {
      id: "s5",
      name: "Restaurante Orla Sul (exemplo)",
      document: "56.789.012/0001-05",
      address: "Av. Inacio Barbosa, 2200 - Farolandia",
      city: "Aracaju/SE",
      geo: { lat: -10.9711, lng: -37.0598 },
      window: { from: "10:00", to: "14:00" },
      invoices: [{ number: "NF 184.226", boxes: 18, amount: 1494.0 }],
      returnablesExpected: { garrafeira: 18, barril: 1 },
      payment: { method: "pix", amount: 1494.0 },
    },
    {
      id: "s6",
      name: "Conveniencia Jardins (exemplo)",
      document: "67.890.123/0001-06",
      address: "Rua Proj. Joao Ribeiro, 15 - Jardins",
      city: "Aracaju/SE",
      geo: { lat: -10.9442, lng: -37.0514 },
      window: { from: "10:00", to: "16:00" },
      invoices: [{ number: "NF 184.227", boxes: 26, amount: 2236.0 }],
      returnablesExpected: { garrafeira: 24 },
      payment: { method: "boleto", amount: 2236.0 },
    },
  ];

  const stops: Stop[] = [
    {
      id: "s0",
      order: 0,
      kind: "origem",
      name: CDD.name,
      address: CDD.address,
      city: CDD.city,
      geo: CDD.geo,
      radiusMeters: 300,
      dock: "Doca 7",
      invoices: [],
      returnablesExpected: {},
      status: "pendente",
    },
    ...pdvs.map((p, i) => ({
      ...p,
      order: i + 1,
      kind: "entrega" as const,
      radiusMeters: 150,
      status: "pendente" as const,
    })),
    {
      id: "s9",
      order: pdvs.length + 1,
      kind: "retorno",
      name: `${CDD.name} - retorno e prestacao de contas`,
      address: CDD.address,
      city: CDD.city,
      geo: CDD.geo,
      radiusMeters: 300,
      invoices: [],
      returnablesExpected: {},
      status: "pendente",
    },
  ];
  void now;
  return stops;
}

function transferStops(): Stop[] {
  return [
    {
      id: "t0",
      order: 0,
      kind: "origem",
      name: FACTORY.name,
      address: FACTORY.address,
      city: FACTORY.city,
      geo: FACTORY.geo,
      radiusMeters: 500,
      window: { from: "06:30", to: "07:30" },
      dock: "Doca 12",
      invoices: [{ number: "NF 552.910", boxes: 1680, amount: 98450.0, key: "2826 1100 1122 3300 0144 5500 1000 5529 1010 0000 0099" }],
      returnablesExpected: {},
      status: "pendente",
    },
    {
      id: "t1",
      order: 1,
      kind: "destino",
      name: "CDD Itabaiana (exemplo)",
      address: "Rod. SE-170, km 3",
      city: "Itabaiana/SE",
      geo: { lat: -10.6858, lng: -37.4253 },
      radiusMeters: 400,
      window: { from: "09:00", to: "11:00" },
      dock: "Doca 3",
      invoices: [{ number: "NF 552.910", boxes: 1680, amount: 98450.0 }],
      returnablesExpected: { palete: 28 },
      status: "pendente",
    },
    {
      id: "t2",
      order: 2,
      kind: "retorno",
      name: `${FACTORY.name} - retorno com paletes`,
      address: FACTORY.address,
      city: FACTORY.city,
      geo: FACTORY.geo,
      radiusMeters: 500,
      invoices: [],
      returnablesExpected: {},
      status: "pendente",
    },
  ];
}

function buildTrip(kind: OperationKind, now: number): Trip {
  if (kind === "transferencia") {
    return {
      id: "trip_today",
      code: "TR-24871",
      kind,
      title: "Transferencia fabrica para CDD Itabaiana",
      shipper: "Ambev",
      scheduledAt: iso(now - 20 * MIN),
      status: "agendada",
      stops: transferStops(),
      currentStopIndex: 0,
      totalBoxes: 1680,
      totalWeightKg: 27_400,
      distanceKm: 142,
    };
  }
  return {
    id: "trip_today",
    code: "7731",
    kind,
    title: "Rota de distribuicao Aracaju Sul",
    shipper: "Ambev",
    scheduledAt: iso(now - 20 * MIN),
    status: "agendada",
    stops: distributionStops(now),
    currentStopIndex: 0,
    totalBoxes: 300,
    totalWeightKg: 6_900,
    distanceKm: 58,
  };
}

function fuelHistory(kind: OperationKind, now: number, tank: number): { records: FuelRecord[]; odometer: number } {
  const rand = rng(kind === "distribuicao" ? 7 : 11);
  const records: FuelRecord[] = [];
  let odometer = kind === "distribuicao" ? 182_400 : 418_900;
  const base = kind === "distribuicao" ? 4.15 : 2.62;
  const step = kind === "distribuicao" ? [160, 230] : [520, 690];
  let at = now - 31 * DAY;
  for (let i = 0; i < 13; i += 1) {
    const station = STATIONS[Math.floor(rand() * STATIONS.length)] ?? STATIONS[0]!;
    const distance = Math.round(step[0]! + rand() * (step[1]! - step[0]!));
    const kml = base + (rand() - 0.5) * 0.5 - (i === 9 ? 0.45 : 0);
    const partial = i === 6;
    const liters = Math.min(tank - 5, Math.round((distance / kml) * 10) / 10);
    odometer += distance;
    at += (kind === "distribuicao" ? 2.3 : 2.6) * DAY + rand() * 6 * HOUR;
    records.push({
      id: `fuel_h${i}`,
      at: iso(at),
      stationId: station.id,
      stationName: station.name,
      odometer,
      dieselLiters: partial ? Math.round(liters * 0.55 * 10) / 10 : liters,
      dieselPrice: Math.round((station.negotiatedDieselPrice + (i === 4 ? 0.31 : 0)) * 100) / 100,
      arlaLiters: Math.round(liters * 0.045 * 10) / 10,
      arlaPrice: station.negotiatedArlaPrice,
      tankFull: !partial,
      payment: station.paymentTerms.includes("Cartao") ? "cartao_frota" : "a_prazo_posto",
      photos: { pump: true, receipt: true, panel: i > 3 },
      readBy: i > 7 ? "leitura_automatica" : "manual",
      alerts:
        i === 4
          ? [{ code: "preco_acima", level: "aviso", message: "Preco R$ 0,31 acima do negociado com o posto" }]
          : [],
      synced: true,
    });
  }
  // depois do ultimo abastecimento o caminhao rodou um pouco
  odometer += kind === "distribuicao" ? 86 : 210;
  return { records, odometer };
}

function telemetry(now: number): TelemetryEvent[] {
  return [
    { id: "tel1", at: iso(now - 9 * DAY), kind: "excesso_velocidade", detail: "84 km/h na BR-235 (limite 80)" },
    { id: "tel2", at: iso(now - 6 * DAY), kind: "motor_ocioso", detail: "Motor ligado parado no CDD", minutes: 38, justified: false },
    { id: "tel3", at: iso(now - 6 * DAY), kind: "motor_ocioso", detail: "Fila de descarga no Supermercado Sergipano", minutes: 52, justified: true },
    { id: "tel4", at: iso(now - 3 * DAY), kind: "frenagem_brusca", detail: "Av. Hermes Fontes" },
    { id: "tel5", at: iso(now - 2 * DAY), kind: "motor_ocioso", detail: "Descarga no Bar do Litoral", minutes: 24, justified: true },
  ];
}

function pastDaySegments(dayStart: number, kind: OperationKind): PunchSegment[] {
  const plan: Array<[PunchSegment["activity"], number, string]> =
    kind === "distribuicao"
      ? [
          ["trabalho", 25, "Checklist e conferencia de carga no CDD"],
          ["direcao", 35, "Saiu do CDD"],
          ["carga_descarga", 40, "Descarga no PDV 1"],
          ["direcao", 25, "Seguiu para PDV 2"],
          ["espera", 30, "Fila no PDV 2"],
          ["carga_descarga", 35, "Descarga no PDV 2"],
          ["direcao", 30, "Seguiu para PDV 3"],
          ["refeicao", 65, "Almoco"],
          ["direcao", 40, "Seguiu para PDV 4"],
          ["carga_descarga", 45, "Descarga no PDV 4"],
          ["direcao", 50, "Retorno ao CDD"],
          ["trabalho", 40, "Prestacao de contas e vasilhame"],
        ]
      : [
          ["trabalho", 25, "Checklist na fabrica"],
          ["espera", 70, "Fila na portaria da fabrica"],
          ["carga_descarga", 55, "Carregamento doca 12"],
          ["direcao", 150, "Viagem para o CDD"],
          ["descanso", 30, "Pausa de direcao"],
          ["espera", 45, "Fila no CDD"],
          ["carga_descarga", 60, "Descarga"],
          ["refeicao", 60, "Almoco"],
          ["direcao", 150, "Retorno com paletes"],
        ];
  const segments: PunchSegment[] = [];
  let t = dayStart;
  for (const [activity, minutes, reason] of plan) {
    segments.push({
      id: uid("seg"),
      activity,
      startAt: iso(t),
      endAt: iso(t + minutes * MIN),
      source: activity === "direcao" || activity === "carga_descarga" ? "etapa" : "motorista",
      reason,
      synced: true,
    });
    t += minutes * MIN;
  }
  return segments;
}

export function createSeed(kind: OperationKind = "distribuicao"): DemoState {
  const now = Date.now();
  const vehicle =
    kind === "distribuicao"
      ? {
          id: "veh_1",
          plate: "FTK4A21",
          model: "VW Constellation 17.230 bau sider",
          year: 2021,
          tankLiters: 275,
          kmPerLiterTarget: 4.2,
          odometer: 0,
        }
      : {
          id: "veh_1",
          plate: "FTK4A21",
          model: "Scania R 450 6x2 + carreta sider",
          year: 2022,
          tankLiters: 680,
          kmPerLiterTarget: 2.6,
          odometer: 0,
          trailer: "FTK7C33",
        };
  const fuel = fuelHistory(kind, now, vehicle.tankLiters);
  vehicle.odometer = fuel.odometer;

  const workDays = [3, 2, 1].map((back) => {
    const day = new Date(now - back * DAY);
    day.setHours(6, 5 + back * 3, 0, 0);
    const segments = pastDaySegments(day.getTime(), kind);
    return {
      id: uid("day"),
      date: localDate(day.getTime()),
      startedAt: segments[0]!.startAt,
      endedAt: segments[segments.length - 1]!.endAt!,
      segments,
      confirmedByDriverAt: back > 1 ? segments[segments.length - 1]!.endAt! : undefined,
    };
  });
  const lastDay = workDays[workDays.length - 1]!;

  const state: DemoState = {
    version: 1,
    seededAt: iso(now),
    tenant: {
      id: "tenant_demo_ambev_se",
      name: "Transportes Serigy (demonstracao)",
      operation: kind === "distribuicao" ? "Operacao Ambev SE - Distribuicao" : "Operacao Ambev SE - Transferencia",
      shipper: "Ambev",
      city: "Aracaju/SE",
    },
    driver: {
      id: "drv_1",
      name: "Motorista Demo",
      cpf: "000.000.001-91",
      phone: "(79) 90000-0001",
      team: kind === "distribuicao" ? "Equipe Aracaju Sul" : "Equipe Transferencia",
      hourlyWage: 14.6,
    },
    vehicle,
    operationKind: kind,
    workDays: workDays.map((d) => {
      const { confirmedByDriverAt, ...rest } = d;
      return confirmedByDriverAt ? { ...rest, confirmedByDriverAt } : rest;
    }),
    previousDayEndedAt: lastDay.endedAt!,
    trips: [buildTrip(kind, now)],
    activeTripId: "trip_today",
    stations: STATIONS,
    fuelRecords: fuel.records,
    checklistTemplate: CHECKLIST_TEMPLATE,
    checklists: [],
    occurrences: [
      {
        id: "occ_old",
        kind: "pneu",
        at: iso(now - 5 * DAY),
        note: "Pneu traseiro direito murcho na Av. Tancredo Neves",
        photo: true,
        severity: "media",
        status: "resolvida",
        thread: [
          { at: iso(now - 5 * DAY), from: "motorista", text: "Pneu traseiro direito murcho na Av. Tancredo Neves" },
          { at: iso(now - 5 * DAY + 6 * MIN), from: "central", text: "Recebido. Borracheiro parceiro a caminho, previsao 25 min." },
          { at: iso(now - 5 * DAY + 70 * MIN), from: "central", text: "Resolvido. Pode seguir a rota." },
        ],
        synced: true,
      },
    ],
    documents: [
      { id: "doc1", kind: "cnh", label: "CNH categoria E", number: "0000000001", expiresAt: iso(now + 23 * DAY), blocking: true, photo: true },
      { id: "doc2", kind: "toxicologico", label: "Exame toxicologico", expiresAt: iso(now + 410 * DAY), blocking: true, photo: true },
      { id: "doc3", kind: "aso", label: "ASO (exame medico)", expiresAt: iso(now + 160 * DAY), blocking: true, photo: true },
      { id: "doc4", kind: "direcao_defensiva", label: "Curso de direcao defensiva", expiresAt: iso(now - 4 * DAY), blocking: false, photo: true },
      { id: "doc5", kind: "integracao_cliente", label: "Integracao de seguranca do cliente", expiresAt: iso(now + 75 * DAY), blocking: true, photo: false },
      { id: "doc6", kind: "nr11", label: "NR-11 (movimentacao de carga)", expiresAt: iso(now + 290 * DAY), blocking: false, photo: true },
    ],
    notices: [
      {
        id: "n1",
        at: iso(now - 2 * HOUR),
        title: "DDS da semana: celular so com o caminhao parado",
        body:
          "Regra do cliente: e proibido mexer no celular com o veiculo em movimento. O app da Frotak trava a tela quando o caminhao anda e deixa so os botoes grandes e a voz. Pare em local seguro para registrar entregas e abastecimentos.",
        from: "Seguranca - Transportes Serigy",
        requiresAck: true,
        tag: "seguranca",
      },
      {
        id: "n2",
        at: iso(now - 26 * HOUR),
        title: "Nova regra de vasilhame",
        body:
          "A partir de segunda, toda garrafeira devolvida precisa ser contada na hora da entrega, no app. A diferenca entre o esperado e o devolvido vai para o relatorio do cliente.",
        from: "Operacao Ambev SE",
        requiresAck: true,
        tag: "cliente",
      },
      {
        id: "n3",
        at: iso(now - 4 * DAY),
        title: "Premiacao de outubro paga",
        body: "A premiacao por desempenho de outubro entrou na folha. Confira sua nota no app em Desempenho.",
        from: "RH",
        requiresAck: false,
        ackAt: iso(now - 3 * DAY),
        tag: "rh",
      },
    ],
    schedule: [
      { id: "sc1", date: localDate(now), label: "Hoje", detail: kind === "distribuicao" ? "Rota Aracaju Sul, 6 entregas" : "Transferencia para Itabaiana", kind: "viagem" },
      { id: "sc2", date: localDate(now + DAY), label: "Amanha", detail: kind === "distribuicao" ? "Rota Aracaju Norte, 8 entregas" : "Transferencia para Lagarto", kind: "viagem" },
      { id: "sc3", date: localDate(now + 2 * DAY), label: "Depois de amanha", detail: "Treinamento de direcao defensiva, 8h no CDD", kind: "treinamento" },
      { id: "sc4", date: localDate(now + 3 * DAY), label: "Folga", detail: "Descanso semanal remunerado", kind: "folga" },
    ],
    telemetry: telemetry(now),
    team: [
      { name: "Motorista A", score: 93, kmPerLiter: kind === "distribuicao" ? 4.48 : 2.81 },
      { name: "Motorista B", score: 88, kmPerLiter: kind === "distribuicao" ? 4.36 : 2.74 },
      { name: "Motorista Demo", score: 0, kmPerLiter: 0, self: true },
      { name: "Motorista C", score: 79, kmPerLiter: kind === "distribuicao" ? 4.02 : 2.55 },
      { name: "Motorista D", score: 74, kmPerLiter: kind === "distribuicao" ? 3.91 : 2.49 },
      { name: "Motorista E", score: 66, kmPerLiter: kind === "distribuicao" ? 3.72 : 2.38 },
    ],
    sim: { offline: false, moving: false, speedKmh: 0, trackerKmSinceLastFuel: kind === "distribuicao" ? 84 : 205 },
    queue: [],
  };
  return state;
}
