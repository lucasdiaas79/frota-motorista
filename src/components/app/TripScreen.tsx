import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Fuel,
  History,
  Loader2,
  MapPin,
  Phone,
  CheckCircle2,
  Truck,
  Upload,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Timeline } from "./Stepper";
import { Sheet } from "./Sheet";
import { ActionButton, Chip, Row, SectionTitle } from "./primitives";
import { DRIVER_STAGE_COUNT, type DriverAppStage, type DriverTrip } from "@/lib/driverApi";
import { cn } from "@/lib/utils";

export function TripScreen({
  stage,
  trip,
  onAdvance,
  onDocument,
  onFuel,
  onAssistant,
}: {
  stage: DriverAppStage;
  trip: DriverTrip;
  onAdvance: () => void;
  onDocument: (kind: string, fileName: string) => Promise<void>;
  onFuel: () => void;
  onAssistant: () => void;
}) {
  const [info, setInfo] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [cteReady, setCteReady] = useState(false);
  const [receipt, setReceipt] = useState(false);

  const canAdvance = !stage.canDriverAdvance
    ? false
    : stage.id === "carregamento"
      ? noteSent
      : stage.id === "documentos"
        ? cteReady
        : stage.id === "descarga"
          ? receipt
          : true;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-[128px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Chip pulse tone={stage.id === "concluida" ? "muted" : "primary"}>
              {stage.statusLabel}
            </Chip>
            <h1 className="mt-2 text-[24px] leading-[1.08] font-extrabold tracking-tight">
              {stage.title}
            </h1>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {stage.subtitle}
            </p>
          </div>
          <button
            onClick={onAssistant}
            aria-label="Assistente FrotaK"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 shrink-0 rounded-3xl bg-surface-2/50 p-3.5">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="h-5 w-px bg-border" />
              <span className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="label-xs">Origem</p>
                <p className="truncate text-[14px] font-bold">{trip.shipper}</p>
              </div>
              <div>
                <p className="label-xs">Destino</p>
                <p className="truncate text-[14px] font-bold">{trip.receiver}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[13px] font-semibold">
            <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{trip.cargo}</span>
            <span className="ml-auto rounded-lg bg-background px-2.5 py-1 font-mono text-[12px] tracking-wider">
              {trip.plate}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 min-h-0 shrink"
          >
            <p className="label-xs">Agora</p>

            {stage.id === "carregamento" && stage.canDriverAdvance && (
              <UploadArea
                done={noteSent}
                title="Anexar foto da nota fiscal"
                doneTitle="Nota fiscal anexada"
                hint="Toque para abrir a camera"
                doneHint="NF enviada para a central"
                onClick={async () => {
                  try {
                    await onDocument("nota_fiscal", "nota-fiscal.jpg");
                    setNoteSent(true);
                    toast.success("Nota fiscal anexada");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Nao foi possivel anexar");
                  }
                }}
              />
            )}

            {stage.id === "carregamento" && !stage.canDriverAdvance && (
              <WaitingPanel
                icon={<FileText className="h-6 w-6" />}
                title="Nota enviada para conferencia"
                description="A central esta validando os dados antes de liberar a proxima etapa."
              />
            )}

            {stage.id === "documentos" && (
              <div className="mt-2 rounded-3xl border border-border bg-surface-2/40 p-4">
                {!cteReady ? (
                  <button
                    onClick={() => {
                      if (!stage.canDriverAdvance) {
                        toast("Aguardando a central liberar os documentos");
                        return;
                      }
                      setCteReady(true);
                      toast.success("CT-e e MDF-e recebidos");
                    }}
                    className="flex w-full flex-col items-center gap-2 py-2 text-center"
                  >
                    <span className="relative grid h-12 w-12 place-items-center">
                      <span className="absolute inset-0 rounded-full bg-primary/15 [animation:pulse-ring_1.8s_ease-out_infinite]" />
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold">
                        Aguardando emissao da CT-e
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        A expedicao esta processando os documentos
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold">CT-e 8891-2 - MDF-e 4410</p>
                        <p className="text-xs text-muted-foreground">Emitidos agora ha pouco</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ActionButton
                        tone="outline"
                        icon={<Eye className="h-4 w-4" />}
                        onClick={() => toast("Abrindo documento...")}
                      >
                        Visualizar
                      </ActionButton>
                      <ActionButton
                        tone="outline"
                        icon={<Download className="h-4 w-4" />}
                        onClick={() => toast.success("Download concluido")}
                      >
                        Baixar
                      </ActionButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage.id === "descarga" && (
              <UploadArea
                done={receipt}
                title="Anexar comprovante de entrega"
                doneTitle="Comprovante anexado"
                hint="Foto, PDF ou canhoto assinado"
                doneHint="Canhoto enviado para a central"
                onClick={async () => {
                  try {
                    await onDocument("comprovante_entrega", "comprovante-entrega.jpg");
                    setReceipt(true);
                    toast.success("Comprovante anexado");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Nao foi possivel anexar");
                  }
                }}
              />
            )}

            {(stage.id === "demanda" ||
              stage.id === "remetente" ||
              stage.id === "destinatario" ||
              stage.id === "concluida") && (
              <div className="mt-2 rounded-3xl bg-gradient-to-b from-surface-2/60 to-transparent p-4 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/12 text-primary">
                  {stage.id === "concluida" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <MapPin className="h-6 w-6" />
                  )}
                </span>
                <p className="mt-2 text-[15px] font-bold">{stage.place}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{stage.eta}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 shrink-0 overflow-hidden rounded-3xl border border-border">
          <button
            onClick={() => setInfo((v) => !v)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
          >
            <span className="text-[14px] font-bold">Informacoes da viagem</span>
            <ChevronDown
              className={cn(
                "h-4.5 w-4.5 shrink-0 text-muted-foreground transition-transform",
                info && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {info && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-border px-4 pb-2">
                  <Row label="Origem" value={trip.shipper} />
                  <Row label="Destino" value={trip.receiver} />
                  <Row label="Placa" value={trip.plate} />
                  <Row label="Carreta" value={trip.trailer} />
                  <Row label="Tipo de carga" value={trip.cargo} />
                  <Row label="Valor do frete" value={trip.freight} />
                  <Row label="Distancia" value={trip.distance} />
                </div>
                <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
                  <ActionButton
                    tone="outline"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={() => toast("Abrindo documentos...")}
                  >
                    Documentos
                  </ActionButton>
                  <ActionButton
                    tone="outline"
                    icon={<Phone className="h-4 w-4" />}
                    onClick={() => toast("Chamando a central...")}
                  >
                    Central
                  </ActionButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setHistoryOpen(true)}
          className="mt-2 flex w-full shrink-0 items-center justify-between gap-4 rounded-3xl border border-border px-4 py-3 text-left"
        >
          <span className="flex items-center gap-3 text-[14px] font-bold">
            <History className="h-4.5 w-4.5 text-muted-foreground" />
            Historico da viagem
          </span>
          <span className="text-[12px] font-semibold text-muted-foreground">
            {stage.index + 1}/{DRIVER_STAGE_COUNT}
          </span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 space-y-2 border-t border-border bg-background/85 px-4 pt-3 pb-3 backdrop-blur-xl">
        <ActionButton
          onClick={onAdvance}
          disabled={!canAdvance}
          className="py-3.5 text-[15px]"
          icon={
            stage.id === "concluida" ? (
              <Truck className="h-5.5 w-5.5" />
            ) : (
              <CheckCircle2 className="h-5.5 w-5.5" />
            )
          }
          hint={canAdvance ? undefined : "Conclua o item acima para liberar"}
        >
          {stage.action}
        </ActionButton>
        <button
          onClick={onFuel}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 py-2.5 text-[13px] font-bold text-warning"
        >
          <Fuel className="h-4.5 w-4.5" />
          Registrar abastecimento
        </button>
      </div>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Historico da viagem">
        <SectionTitle>Atividade</SectionTitle>
        <Timeline current={stage} />
      </Sheet>
    </div>
  );
}

function UploadArea({
  done,
  title,
  doneTitle,
  hint,
  doneHint,
  onClick,
}: {
  done: boolean;
  title: string;
  doneTitle: string;
  hint: string;
  doneHint: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "mt-2 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-4 text-center",
        done ? "border-primary/40 bg-primary/8" : "border-border bg-surface-2/30",
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-primary">
        {done ? <CheckCircle2 className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
      </span>
      <span>
        <span className="block text-[15px] font-bold">{done ? doneTitle : title}</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {done ? doneHint : hint}
        </span>
      </span>
      {!done && (
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground">
          <Upload className="h-4 w-4" /> Abrir camera
        </span>
      )}
    </motion.button>
  );
}

function WaitingPanel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-2 rounded-3xl border border-border bg-surface-2/40 p-4 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/12 text-primary">
        {icon}
      </span>
      <p className="mt-2 text-[15px] font-bold">{title}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
    </div>
  );
}

export { FileText };
