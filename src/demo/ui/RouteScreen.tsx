import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  Clock,
  FileBadge,
  LogIn,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  PackageX,
  Play,
  Radar,
  ShieldAlert,
  Timer,
  Truck,
  Undo2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/app/Sheet";
import {
  activeTrip,
  arriveStop,
  finishStop,
  finishTrip,
  startTrip,
  startUnload,
  today,
  useDemo,
  getState,
} from "../store";
import { captureGeo, mapsLink, wazeLink } from "../geo";
import { fmtClock, fmtMin } from "../jornada";
import type { DemoState, RefusalReason, ReturnableKind, Stop, StopStatus, Trip } from "../types";
import {
  BigButton,
  Field,
  Pill,
  PhotoSlot,
  Segmented,
  Stat,
  TextArea,
  TextInput,
  Toggle,
  money,
  num,
  parseNum,
  useNow,
} from "./kit";
import { SignaturePad } from "./SignaturePad";
import type { Navigate } from "./DemoApp";

export const STOP_STATUS_LABEL: Record<StopStatus, string> = {
  pendente: "Pendente",
  a_caminho: "A caminho",
  chegou: "No local, aguardando",
  descarregando: "Em carga ou descarga",
  entregue: "Entregue",
  parcial: "Entregue parcial",
  recusada: "Recusada",
};

const REFUSAL_LABEL: Record<RefusalReason, string> = {
  cliente_fechado: "Cliente fechado",
  sem_pagamento: "Sem pagamento",
  avaria: "Produto avariado",
  pedido_errado: "Pedido errado",
  sem_espaco: "Sem espaco para receber",
  falta_produto: "Faltou produto no caminhao",
  outro: "Outro motivo",
};

export const RETURNABLE_LABEL: Record<ReturnableKind, string> = {
  garrafeira: "Garrafeiras",
  barril: "Barris",
  palete: "Paletes",
};

const DONE: StopStatus[] = ["entregue", "parcial", "recusada"];

export function tripGates(trip: Trip, s: DemoState) {
  const day = today(s);
  const now = Date.now();
  const checklist = s.checklists.find((c) => c.tripId === trip.id && c.moment === "saida");
  const blockingDocs = s.documents.filter(
    (d) => d.blocking && new Date(d.expiresAt).getTime() < now,
  );
  return [
    {
      key: "jornada",
      ok: Boolean(day?.startedAt && !day.endedAt),
      label: "Jornada iniciada",
      page: "ponto" as const,
    },
    {
      key: "checklist",
      ok: Boolean(checklist?.approved),
      label:
        checklist && !checklist.approved
          ? "Checklist com item critico reprovado"
          : "Checklist de saida feito",
      page: "checklist" as const,
    },
    {
      key: "docs",
      ok: blockingDocs.length === 0,
      label: blockingDocs.length
        ? `${blockingDocs[0]!.label} vencido`
        : "Documentos obrigatorios em dia",
      page: "docs" as const,
    },
  ];
}

export function nextAction(trip: Trip, s: DemoState): { label: string; hint?: string } | null {
  if (trip.status === "finalizada") return null;
  if (trip.status === "agendada" || trip.status === "checklist") {
    const pending = tripGates(trip, s).filter((g) => !g.ok);
    return pending.length
      ? {
          label: "Preparar a viagem",
          hint: `${pending.length} passo${pending.length > 1 ? "s" : ""} antes de sair`,
        }
      : { label: "Iniciar viagem", hint: "Tudo pronto para sair" };
  }
  const stop = trip.stops[trip.currentStopIndex];
  if (!stop) return null;
  if (stop.status === "a_caminho")
    return {
      label: `Cheguei: ${short(stop.name)}`,
      hint: stop.window ? `Janela ${stop.window.from} as ${stop.window.to}` : "Confirme ao chegar",
    };
  if (stop.status === "chegou")
    return {
      label:
        stop.kind === "origem"
          ? "Iniciar carregamento"
          : stop.kind === "retorno"
            ? "Prestar contas"
            : "Iniciar descarga",
      hint: `Esperando ha ${fmtMin((Date.now() - new Date(stop.arrivedAt!).getTime()) / 60_000)}`,
    };
  if (stop.status === "descarregando")
    return {
      label:
        stop.kind === "origem"
          ? "Carregamento concluido"
          : stop.kind === "retorno"
            ? "Finalizar viagem"
            : "Registrar entrega",
      hint: "Canhoto, vasilhame e recebimento",
    };
  return null;
}

function short(name: string) {
  return name.replace(/\s*\(exemplo\)/, "").split(" - ")[0]!;
}

export function RouteScreen({ navigate }: { navigate: Navigate }) {
  const trip = useDemo(activeTrip);
  const state = useDemo((s) => s);
  const now = useNow(15_000);
  const [startOpen, setStartOpen] = useState(false);
  const [deliveryStop, setDeliveryStop] = useState<Stop | null>(null);
  const [loadOpen, setLoadOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!trip) {
    return <div className="p-6 text-center text-muted-foreground">Nenhuma viagem para hoje.</div>;
  }
  const current = trip.stops[trip.currentStopIndex];
  const deliveries = trip.stops.filter((s) => s.kind === "entrega" || s.kind === "destino");
  const done = deliveries.filter((s) => DONE.includes(s.status)).length;
  const gates = tripGates(trip, state);
  const ready = gates.every((g) => g.ok);

  const run = async () => {
    if (trip.status === "agendada" || trip.status === "checklist") {
      if (!ready) {
        const first = gates.find((g) => !g.ok)!;
        if (first.page === "ponto") navigate("ponto");
        else navigate("more", first.page);
        return;
      }
      setStartOpen(true);
      return;
    }
    if (!current) return;
    const geo = await captureGeo(current.geo);
    if (current.status === "a_caminho") {
      arriveStop(current.id, "motorista", geo);
      toast.success(`Chegada em ${short(current.name)}`, {
        description: "Ponto: espera iniciada, com posicao",
      });
    } else if (current.status === "chegou") {
      startUnload(current.id, geo);
      toast.success(
        current.kind === "origem"
          ? "Carregamento iniciado"
          : current.kind === "retorno"
            ? "Prestacao de contas"
            : "Descarga iniciada",
      );
    } else if (current.status === "descarregando") {
      if (current.kind === "origem") setLoadOpen(true);
      else if (current.kind === "retorno") setReturnOpen(true);
      else setDeliveryStop(current);
    }
  };

  const action = nextAction(trip, state);

  return (
    <div className="space-y-3 px-4 pt-3 pb-24">
      <header>
        <p className="label-xs">
          {trip.kind === "distribuicao" ? "Mapa de carga" : "Frete"} {trip.code} - {trip.shipper}
        </p>
        <h1 className="mt-1 text-[22px] leading-tight font-extrabold">{trip.title}</h1>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat
          label={trip.kind === "distribuicao" ? "Entregas" : "Destinos"}
          value={`${done}/${deliveries.length}`}
        />
        <Stat
          label="Caixas"
          value={num(trip.totalBoxes)}
          sub={`${num(trip.totalWeightKg / 1000, 1)} t`}
        />
        <Stat
          label="Distancia"
          value={`${trip.distanceKm} km`}
          sub={trip.startOdometer ? `Saiu com ${num(trip.startOdometer)} km` : "Previsto"}
        />
      </div>

      {(trip.status === "agendada" || trip.status === "checklist") && (
        <div className="surface-card rounded-[22px] p-4">
          <p className="label-xs">Antes de sair</p>
          <div className="mt-2 space-y-2">
            {gates.map((g) => (
              <button
                key={g.key}
                onClick={() =>
                  g.ok
                    ? undefined
                    : g.page === "ponto"
                      ? navigate("ponto")
                      : navigate("more", g.page)
                }
                className="flex w-full items-center gap-3 rounded-2xl bg-surface-2/50 p-3 text-left"
              >
                {g.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-warning" />
                )}
                <span
                  className={cn(
                    "flex-1 text-[14px] font-bold",
                    g.ok && "text-muted-foreground line-through decoration-1",
                  )}
                >
                  {g.label}
                </span>
                {!g.ok ? (
                  <span className="text-[12px] font-extrabold text-primary">Fazer</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {action ? (
        <BigButton
          onClick={() => void run()}
          hint={action.hint}
          icon={<Play className="h-5 w-5" />}
        >
          {action.label}
        </BigButton>
      ) : null}

      {trip.status === "finalizada" ? (
        <div className="rounded-[22px] border border-primary/30 bg-primary/8 p-4 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-[16px] font-extrabold">
            Viagem finalizada {fmtClock(trip.finishedAt)}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Rodou{" "}
            {trip.endOdometer && trip.startOdometer
              ? num(trip.endOdometer - trip.startOdometer)
              : "--"}{" "}
            km. A central recebeu os canhotos e o acerto.
          </p>
        </div>
      ) : null}

      <ol className="relative space-y-2">
        {trip.stops.map((stop, i) => {
          const isCurrent = i === trip.currentStopIndex && trip.status === "em_andamento";
          const open = expanded === stop.id || isCurrent;
          const finished = DONE.includes(stop.status);
          const waitMin = stop.arrivedAt
            ? ((stop.finishedAt ? new Date(stop.finishedAt).getTime() : now) -
                new Date(stop.arrivedAt).getTime()) /
              60_000
            : 0;
          return (
            <motion.li
              key={stop.id}
              layout
              className={cn(
                "rounded-[20px] border p-3.5",
                isCurrent
                  ? "border-primary/50 bg-primary/6 shadow-[var(--shadow-glow)]"
                  : "border-border bg-surface-2/30",
              )}
            >
              <button
                onClick={() => setExpanded(open && !isCurrent ? null : stop.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                <StopBadge stop={stop} index={i} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-extrabold">{stop.name}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {stop.address} - {stop.city}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Pill
                      tone={
                        finished
                          ? stop.status === "recusada"
                            ? "danger"
                            : "primary"
                          : isCurrent
                            ? "warning"
                            : "muted"
                      }
                    >
                      {STOP_STATUS_LABEL[stop.status]}
                    </Pill>
                    {stop.window ? (
                      <Pill tone="muted">
                        <Clock className="h-3 w-3" /> {stop.window.from}-{stop.window.to}
                      </Pill>
                    ) : null}
                    {stop.arrivalSource === "cerca" ? (
                      <Pill tone="info">
                        <Radar className="h-3 w-3" /> cerca
                      </Pill>
                    ) : null}
                  </span>
                </span>
                {!isCurrent ? (
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                ) : null}
              </button>

              {open ? (
                <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3 text-[13px]">
                  {stop.invoices.length ? (
                    <div className="space-y-1">
                      {stop.invoices.map((nf) => (
                        <div key={nf.number} className="flex items-center justify-between gap-2">
                          <span className="font-bold">{nf.number}</span>
                          <span className="text-muted-foreground">
                            {nf.boxes} cx - {money(nf.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {Object.keys(stop.returnablesExpected).length ? (
                    <p className="text-muted-foreground">
                      Recolher:{" "}
                      {Object.entries(stop.returnablesExpected)
                        .map(
                          ([k, v]) => `${v} ${RETURNABLE_LABEL[k as ReturnableKind].toLowerCase()}`,
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                  {stop.payment ? (
                    <p className="text-muted-foreground">
                      Pagamento:{" "}
                      {stop.payment.method === "boleto"
                        ? "boleto (nao recebe)"
                        : `${stop.payment.method === "pix" ? "PIX" : "dinheiro"} ${money(stop.payment.amount)} na entrega`}
                    </p>
                  ) : null}
                  {stop.dock ? <p className="text-muted-foreground">Doca: {stop.dock}</p> : null}
                  {stop.arrivedAt ? (
                    <div className="flex items-center gap-2 rounded-xl bg-surface-2/70 p-2.5">
                      <Timer className="h-4 w-4 text-warning" />
                      <span className="font-bold">
                        Chegou {fmtClock(stop.arrivedAt)} -{" "}
                        {stop.finishedAt ? "ficou" : "aguardando ha"} {fmtMin(waitMin)}
                      </span>
                      {waitMin > 300 ? <Pill tone="danger">Estadia</Pill> : null}
                    </div>
                  ) : null}
                  {stop.delivered ? <DeliveredSummary stop={stop} /> : null}
                  {isCurrent && stop.status === "a_caminho" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href={wazeLink(stop.geo)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2.5 text-[12px] font-extrabold"
                      >
                        <Navigation className="h-4 w-4" /> Waze
                      </a>
                      <a
                        href={mapsLink(stop.geo)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2.5 text-[12px] font-extrabold"
                      >
                        <MapPin className="h-4 w-4" /> Maps
                      </a>
                      <button
                        onClick={async () => {
                          const geo = await captureGeo(stop.geo);
                          arriveStop(stop.id, "cerca", geo);
                          toast.success("Cerca eletronica: chegada registrada sozinha", {
                            description: short(stop.name),
                          });
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-sky-500/50 py-2.5 text-[12px] font-extrabold text-sky-600 dark:text-sky-400"
                      >
                        <Radar className="h-4 w-4" /> Simular
                      </button>
                    </div>
                  ) : null}
                  {isCurrent ? (
                    <button
                      onClick={() => navigate("more", "occurrence")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[12.5px] font-extrabold text-muted-foreground"
                    >
                      <ShieldAlert className="h-4 w-4" /> Registrar ocorrencia neste local
                    </button>
                  ) : null}
                </div>
              ) : null}
            </motion.li>
          );
        })}
      </ol>

      <StartTripSheet open={startOpen} onClose={() => setStartOpen(false)} trip={trip} />
      <LoadSheet open={loadOpen} onClose={() => setLoadOpen(false)} stop={current} />
      <DeliverySheet stop={deliveryStop} onClose={() => setDeliveryStop(null)} kind={trip.kind} />
      <ReturnSheet
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        trip={trip}
        navigate={navigate}
      />
    </div>
  );
}

function StopBadge({ stop, index }: { stop: Stop; index: number }) {
  const finished = DONE.includes(stop.status);
  const Icon =
    stop.kind === "origem"
      ? Truck
      : stop.kind === "retorno"
        ? Undo2
        : finished
          ? stop.status === "recusada"
            ? PackageX
            : PackageCheck
          : Package;
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-[13px] font-black",
        finished
          ? stop.status === "recusada"
            ? "bg-destructive/12 text-destructive"
            : "bg-primary text-primary-foreground"
          : stop.status === "pendente"
            ? "bg-surface-2 text-muted-foreground"
            : "bg-warning/15 text-warning",
      )}
    >
      {stop.kind === "entrega" && !finished ? index : <Icon className="h-5 w-5" />}
    </span>
  );
}

function DeliveredSummary({ stop }: { stop: Stop }) {
  const d = stop.delivered!;
  return (
    <div className="rounded-xl bg-surface-2/70 p-2.5 text-[12.5px]">
      <p className="font-bold">
        {d.boxesDelivered} caixas entregues
        {d.receiverName ? ` - recebido por ${d.receiverName}` : ""}
      </p>
      {d.refusalReason ? (
        <p className="text-destructive">
          Motivo: {REFUSAL_LABEL[d.refusalReason]}
          {d.refusalNote ? ` - ${d.refusalNote}` : ""}
        </p>
      ) : null}
      {Object.keys(d.returnables).length ? (
        <p className="text-muted-foreground">
          Vasilhame:{" "}
          {Object.entries(d.returnables)
            .map(([k, v]) => `${v} ${RETURNABLE_LABEL[k as ReturnableKind].toLowerCase()}`)
            .join(", ")}
        </p>
      ) : null}
      {d.payment ? (
        <p className="text-muted-foreground">
          {d.payment.received ? `Recebido ${money(d.payment.amount)}` : "Pagamento nao recebido"}
        </p>
      ) : null}
      <p className="text-muted-foreground">
        {d.podPhoto ? "Canhoto fotografado" : "Sem foto do canhoto"}
        {d.signature ? " - assinatura digital" : ""} - {fmtClock(stop.finishedAt)}
      </p>
    </div>
  );
}

function StartTripSheet({
  open,
  onClose,
  trip,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
}) {
  const vehicleOdo = useDemo((s) => s.vehicle.odometer);
  const [odo, setOdo] = useState("");
  const [panel, setPanel] = useState(false);
  const value = parseNum(odo || String(vehicleOdo));
  return (
    <Sheet open={open} onClose={onClose} title="Iniciar viagem">
      <div className="space-y-3">
        <Field label="Odometro de saida" hint={`Ultimo registrado: ${num(vehicleOdo)} km`}>
          <TextInput
            value={odo}
            onChange={setOdo}
            placeholder={String(vehicleOdo)}
            inputMode="numeric"
            suffix="km"
          />
        </Field>
        <PhotoSlot
          label="Foto do painel (odometro)"
          taken={panel}
          onTaken={() => setPanel(true)}
          compact
        />
        <p className="text-[12.5px] text-muted-foreground">
          {trip.kind === "distribuicao"
            ? "Voce ja esta no CDD: a chegada e marcada pela cerca e o ponto passa para espera ate a doca liberar."
            : "O ponto passa para direcao agora, a caminho da fabrica."}
        </p>
        <BigButton
          icon={<LogIn className="h-5 w-5" />}
          onClick={async () => {
            if (!value || value < vehicleOdo) {
              toast.error("Odometro menor que o ultimo registrado");
              return;
            }
            const geo = await captureGeo(trip.stops[0]!.geo);
            startTrip(value, geo);
            onClose();
            toast.success("Viagem iniciada", { description: "Etapa e ponto marcados juntos" });
          }}
        >
          Confirmar saida
        </BigButton>
      </div>
    </Sheet>
  );
}

function LoadSheet({
  open,
  onClose,
  stop,
}: {
  open: boolean;
  onClose: () => void;
  stop?: Stop | undefined;
}) {
  const trip = useDemo(activeTrip);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [sealPhoto, setSealPhoto] = useState(false);
  const [boxes, setBoxes] = useState("");
  if (!stop || !trip) return null;
  const allInvoices = trip.stops.flatMap((s) => (s.kind === "origem" ? [] : s.invoices));
  const invoices = trip.kind === "transferencia" ? stop.invoices : allInvoices;
  return (
    <Sheet open={open} onClose={onClose} title="Carregamento concluido">
      <div className="space-y-3">
        <button
          onClick={() => {
            setScanning(true);
            window.setTimeout(() => {
              setScanning(false);
              setScanned(true);
              toast.success(`${invoices.length} notas lidas pelo codigo de barras`, {
                description: "Leitura da DANFE (demonstracao)",
              });
            }, 1200);
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left",
            scanned ? "border-primary/40 bg-primary/8" : "border-border bg-surface-2/40",
          )}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-background">
            <Barcode className={cn("h-5 w-5", scanning && "animate-pulse")} />
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-extrabold">
              {scanning
                ? "Lendo codigo de barras..."
                : scanned
                  ? "Notas conferidas"
                  : "Ler as notas pela DANFE"}
            </span>
            <span className="block text-[12px] text-muted-foreground">
              Preenche numero, caixas e valor sozinho
            </span>
          </span>
          {scanned ? <Check className="h-5 w-5 text-primary" /> : null}
        </button>
        {scanned ? (
          <div className="space-y-1 rounded-2xl bg-surface-2/50 p-3 text-[12.5px]">
            {invoices.map((nf) => (
              <div key={nf.number} className="flex justify-between">
                <span className="font-bold">{nf.number}</span>
                <span className="text-muted-foreground">
                  {nf.boxes} cx - {money(nf.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <Field
          label="Caixas conferidas no caminhao"
          hint={`Previsto no mapa: ${trip.totalBoxes} caixas`}
        >
          <TextInput
            value={boxes}
            onChange={setBoxes}
            placeholder={String(trip.totalBoxes)}
            inputMode="numeric"
            suffix="cx"
          />
        </Field>
        <PhotoSlot
          label="Foto do lacre ou da carga"
          taken={sealPhoto}
          onTaken={() => setSealPhoto(true)}
          compact
        />
        <BigButton
          disabled={!scanned}
          onClick={async () => {
            const counted = parseNum(boxes || String(trip.totalBoxes)) ?? trip.totalBoxes;
            if (counted !== trip.totalBoxes)
              toast.warning(`Diferenca de ${trip.totalBoxes - counted} caixas avisada a central`);
            const geo = await captureGeo(stop.geo);
            finishStop(
              stop.id,
              { boxesDelivered: counted, returnables: {}, podPhoto: sealPhoto },
              "entregue",
              geo,
            );
            onClose();
            toast.success("Saiu carregado", { description: "Ponto: direcao" });
          }}
        >
          Confirmar e sair
        </BigButton>
      </div>
    </Sheet>
  );
}

function DeliverySheet({
  stop,
  onClose,
  kind,
}: {
  stop: Stop | null;
  onClose: () => void;
  kind: Trip["kind"];
}) {
  return (
    <Sheet
      open={Boolean(stop)}
      onClose={onClose}
      title={kind === "transferencia" ? "Descarga no destino" : "Registrar entrega"}
    >
      {stop ? <DeliveryForm key={stop.id} stop={stop} onDone={onClose} /> : null}
    </Sheet>
  );
}

function DeliveryForm({ stop, onDone }: { stop: Stop; onDone: () => void }) {
  const totalBoxes = stop.invoices.reduce((s, i) => s + i.boxes, 0);
  const [status, setStatus] = useState<"entregue" | "parcial" | "recusada">("entregue");
  const [boxes, setBoxes] = useState("");
  const [reason, setReason] = useState<RefusalReason>("cliente_fechado");
  const [note, setNote] = useState("");
  const [receiver, setReceiver] = useState("");
  const [signature, setSignature] = useState<string>();
  const [pod, setPod] = useState(false);
  const [podPaths, setPodPaths] = useState<string[]>([]);
  const kinds = useMemo(() => {
    const k = new Set<ReturnableKind>(Object.keys(stop.returnablesExpected) as ReturnableKind[]);
    k.add("garrafeira");
    k.add("palete");
    return [...k];
  }, [stop]);
  const [returnables, setReturnables] = useState<Partial<Record<ReturnableKind, number>>>(() => ({
    ...stop.returnablesExpected,
  }));
  const [received, setReceived] = useState(true);
  const needsPayment = stop.payment && stop.payment.method !== "boleto";

  const delivered =
    status === "recusada" ? 0 : status === "entregue" ? totalBoxes : (parseNum(boxes) ?? 0);

  const save = async () => {
    if (status !== "recusada" && !pod && !signature) {
      toast.error("Fotografe o canhoto ou colete a assinatura");
      return;
    }
    if (status === "parcial" && (delivered <= 0 || delivered >= totalBoxes)) {
      toast.error("Informe quantas caixas foram entregues");
      return;
    }
    const geo = await captureGeo(stop.geo);
    finishStop(
      stop.id,
      {
        boxesDelivered: delivered,
        ...(status !== "entregue" ? { refusalReason: reason, refusalNote: note } : {}),
        ...(receiver ? { receiverName: receiver } : {}),
        ...(signature ? { signature } : {}),
        podPhoto: pod,
        ...(podPaths.length ? { podPhotoPaths: podPaths } : {}),
        returnables: status === "recusada" ? {} : returnables,
        ...(needsPayment && status !== "recusada"
          ? {
              payment: {
                method: stop.payment!.method,
                amount:
                  status === "parcial"
                    ? Math.round(((stop.payment!.amount * delivered) / totalBoxes) * 100) / 100
                    : stop.payment!.amount,
                received,
              },
            }
          : {}),
      },
      status,
      geo,
    );
    const diff = Object.entries(stop.returnablesExpected).filter(
      ([k, v]) => (returnables[k as ReturnableKind] ?? 0) < (v ?? 0),
    );
    onDone();
    toast.success(
      status === "recusada" ? "Recusa registrada, central avisada" : "Entrega registrada",
      {
        description: diff.length
          ? "Diferenca de vasilhame vai para o relatorio"
          : "Ponto: direcao para a proxima parada",
      },
    );
  };

  return (
    <div className="space-y-3.5">
      <div className="rounded-2xl bg-surface-2/50 p-3 text-[13px]">
        <p className="font-extrabold">{stop.name}</p>
        <p className="text-muted-foreground">
          {stop.invoices.map((i) => i.number).join(", ")} - {totalBoxes} caixas
        </p>
      </div>
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "entregue", label: "Entregue" },
          { value: "parcial", label: "Parcial" },
          { value: "recusada", label: "Recusada" },
        ]}
      />
      {status === "parcial" ? (
        <Field label="Caixas entregues">
          <TextInput
            value={boxes}
            onChange={setBoxes}
            placeholder={`de ${totalBoxes}`}
            inputMode="numeric"
            suffix="cx"
          />
        </Field>
      ) : null}
      {status !== "entregue" ? (
        <>
          <Field label="Motivo">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(REFUSAL_LABEL) as RefusalReason[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-left text-[12px] font-bold",
                    reason === r ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {REFUSAL_LABEL[r]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Observacao">
            <TextArea
              value={note}
              onChange={setNote}
              placeholder="Ex.: cliente pediu para voltar amanha"
            />
          </Field>
        </>
      ) : null}

      {status !== "recusada" ? (
        <>
          <div>
            <p className="label-xs">Vasilhame recolhido</p>
            <div className="mt-2 space-y-2">
              {kinds.map((k) => {
                const expected = stop.returnablesExpected[k] ?? 0;
                const value = returnables[k] ?? 0;
                return (
                  <div
                    key={k}
                    className="flex items-center gap-3 rounded-2xl border border-border p-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold">{RETURNABLE_LABEL[k]}</span>
                      <span
                        className={cn(
                          "block text-[11px]",
                          value < expected ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        Esperado {expected}
                        {value < expected ? ` - faltam ${expected - value}` : ""}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        setReturnables((r) => ({ ...r, [k]: Math.max(0, (r[k] ?? 0) - 1) }))
                      }
                      className="h-9 w-9 rounded-xl bg-surface-2 text-[18px] font-black"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-display text-[17px] font-extrabold">
                      {value}
                    </span>
                    <button
                      onClick={() => setReturnables((r) => ({ ...r, [k]: (r[k] ?? 0) + 1 }))}
                      className="h-9 w-9 rounded-xl bg-primary/12 text-[18px] font-black text-primary"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          {needsPayment ? (
            <Toggle
              checked={received}
              onChange={setReceived}
              label={`Recebi ${stop.payment!.method === "pix" ? "o PIX" : "em dinheiro"}: ${money(stop.payment!.amount)}`}
              hint="Entra no caixa do motorista e no acerto da viagem"
            />
          ) : null}
          <Field label="Quem recebeu">
            <TextInput value={receiver} onChange={setReceiver} placeholder="Nome do recebedor" />
          </Field>
          <SignaturePad onChange={setSignature} />
        </>
      ) : null}
      <PhotoSlot
        label={status === "recusada" ? "Foto do local ou da avaria" : "Foto do canhoto assinado"}
        folder="canhotos"
        taken={pod}
        onTaken={(ref) => {
          setPod(true);
          if (ref && !ref.startsWith("blob:")) setPodPaths((p) => [...p, ref]);
        }}
      />
      <BigButton
        tone={status === "recusada" ? "danger" : "primary"}
        icon={<Check className="h-5 w-5" />}
        onClick={() => void save()}
      >
        {status === "recusada" ? "Registrar recusa" : "Confirmar entrega"}
      </BigButton>
    </div>
  );
}

function ReturnSheet({
  open,
  onClose,
  trip,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  navigate: Navigate;
}) {
  const vehicleOdo = useDemo((s) => s.vehicle.odometer);
  const [odo, setOdo] = useState("");
  const delivered = trip.stops.filter((s) => s.delivered);
  const totals: Partial<Record<ReturnableKind, { expected: number; got: number }>> = {};
  for (const s of trip.stops) {
    for (const [k, v] of Object.entries(s.returnablesExpected)) {
      const key = k as ReturnableKind;
      totals[key] = {
        expected: (totals[key]?.expected ?? 0) + (v ?? 0),
        got: (totals[key]?.got ?? 0) + (s.delivered?.returnables[key] ?? 0),
      };
    }
  }
  const cash = delivered.reduce(
    (sum, s) => sum + (s.delivered?.payment?.received ? s.delivered.payment.amount : 0),
    0,
  );
  const refused = trip.stops.filter((s) => s.status === "recusada");
  const minOdo = Math.max(vehicleOdo, trip.startOdometer ?? 0);
  const value = parseNum(odo || String(minOdo + trip.distanceKm));
  const checklistDone = getState().checklists.some(
    (c) => c.tripId === trip.id && c.moment === "chegada",
  );

  return (
    <Sheet open={open} onClose={onClose} title="Prestacao de contas">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Entregas"
            value={`${trip.stops.filter((s) => s.status === "entregue" && s.kind === "entrega").length}`}
            sub={`${refused.length} recusada(s)`}
          />
          <Stat label="Recebido" value={money(cash)} sub="PIX e dinheiro" tone="primary" />
        </div>
        {Object.keys(totals).length ? (
          <div className="rounded-2xl border border-border p-3">
            <p className="label-xs">Vasilhame</p>
            {Object.entries(totals).map(([k, v]) => (
              <div key={k} className="mt-1.5 flex justify-between text-[13px]">
                <span className="font-bold">{RETURNABLE_LABEL[k as ReturnableKind]}</span>
                <span
                  className={cn(
                    v!.got < v!.expected ? "font-bold text-warning" : "text-muted-foreground",
                  )}
                >
                  {v!.got} de {v!.expected}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {refused.length ? (
          <div className="rounded-2xl bg-destructive/8 p-3 text-[12.5px]">
            <p className="font-extrabold text-destructive">Devolver no CDD</p>
            {refused.map((s) => (
              <p key={s.id}>
                {s.name}: {s.invoices.reduce((a, b) => a + b.boxes, 0)} caixas
              </p>
            ))}
          </div>
        ) : null}
        <Field label="Odometro de chegada">
          <TextInput
            value={odo}
            onChange={setOdo}
            placeholder={String(minOdo + trip.distanceKm)}
            inputMode="numeric"
            suffix="km"
          />
        </Field>
        <button
          onClick={() => {
            onClose();
            navigate("more", "checklist-chegada");
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left"
        >
          <ClipboardCheck
            className={cn("h-5 w-5", checklistDone ? "text-primary" : "text-muted-foreground")}
          />
          <span className="flex-1 text-[13.5px] font-bold">
            {checklistDone ? "Checklist de chegada feito" : "Fazer checklist de chegada (opcional)"}
          </span>
        </button>
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2/50 p-3 text-[12px] text-muted-foreground">
          <Wallet className="h-4 w-4 shrink-0" />O acerto vai para a central aprovar, com canhotos,
          vasilhame e o dinheiro recebido.
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2/50 p-3 text-[12px] text-muted-foreground">
          <FileBadge className="h-4 w-4 shrink-0" />A Ambev ve os comprovantes no portal do
          embarcador, sem custos nem margem.
        </div>
        <BigButton
          icon={<Check className="h-5 w-5" />}
          onClick={async () => {
            if (!value || value < minOdo) {
              toast.error("Odometro menor que o de saida");
              return;
            }
            const geo = await captureGeo(trip.stops[trip.stops.length - 1]!.geo);
            finishTrip(value, geo);
            onClose();
            toast.success("Viagem finalizada", {
              description: `${num(value - (trip.startOdometer ?? value))} km rodados`,
            });
          }}
        >
          Finalizar viagem
        </BigButton>
      </div>
    </Sheet>
  );
}
