import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera,
  FileText,
  Fuel,
  History,
  Loader2,
  MapPin,
  CheckCircle2,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Timeline } from "./Stepper";
import { Sheet } from "./Sheet";
import { ActionButton, Chip, SectionTitle } from "./primitives";
import {
  DRIVER_STAGE_COUNT,
  type DriverAppStage,
  type DriverDocument,
  type DriverTrip,
} from "@/lib/driverApi";
import { cn } from "@/lib/utils";

export function TripScreen({
  stage,
  trip,
  documents,
  onAdvance,
  onDocument,
  onFuel,
}: {
  stage: DriverAppStage;
  trip: DriverTrip;
  documents: DriverDocument[];
  onAdvance: (unloadedTons?: number) => void;
  onDocument: (kind: string, fileName: string, file?: File) => Promise<void>;
  onFuel: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [unloadedTons, setUnloadedTons] = useState("");
  const noteInputRef = useRef<HTMLInputElement | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const rejectedNote = useMemo(
    () =>
      documents.find(
        (document) =>
          document.kind === "nota_fiscal" &&
          ["rejeitado", "rejected"].includes(String(document.status ?? "").toLowerCase()),
      ),
    [documents],
  );
  const cteDocument = useMemo(
    () =>
      documents.find(
        (document) =>
          (document.kind === "cte" || document.kind === "cte_mdfe") &&
          !["rejeitado", "rejected", "deleted", "excluido"].includes(
            String(document.status ?? "").toLowerCase(),
          ),
      ),
    [documents],
  );
  const hasCteDocument = Boolean(cteDocument);

  useEffect(() => {
    if (stage.id !== "carregamento") setNoteSent(false);
    if (stage.id !== "descarga") {
      setReceipt(false);
      setUnloadedTons("");
    }
  }, [stage.id]);

  const parsedUnloadedTons = Number(unloadedTons.replace(/\./g, "").replace(",", "."));
  const hasUnloadedTons = Number.isFinite(parsedUnloadedTons) && parsedUnloadedTons > 0;

  const canAdvance = !stage.canDriverAdvance
    ? false
    : stage.id === "carregamento"
      ? noteSent
      : stage.id === "documentos"
        ? hasCteDocument
        : stage.id === "descarga"
          ? receipt && hasUnloadedTons
          : true;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-[154px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Chip pulse tone={stage.id === "concluida" ? "muted" : "primary"}>
              {stage.statusLabel}
            </Chip>
            <h1 className="mt-1.5 text-[22px] leading-[1.05] font-extrabold tracking-tight">
              {stage.title}
            </h1>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
              {stage.subtitle}
            </p>
          </div>
        </div>

        <div className="mt-2.5 shrink-0 rounded-3xl bg-surface-2/50 p-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-4 w-px bg-border" />
              <span className="h-2 w-2 rounded-full border-2 border-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div>
                <p className="label-xs">Origem</p>
                <p className="truncate text-[13px] font-bold">{trip.shipper}</p>
              </div>
              <div>
                <p className="label-xs">Destino</p>
                <p className="truncate text-[13px] font-bold">{trip.receiver}</p>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5 text-[12.5px] font-semibold">
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
            className="mt-2.5"
          >
            <p className="label-xs">Agora</p>

            {stage.id === "carregamento" && stage.canDriverAdvance && (
              <div className="space-y-2.5">
                {rejectedNote && (
                  <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-3.5 text-left">
                    <p className="text-[14px] font-extrabold text-destructive">Nota reprovada</p>
                    <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                      A expedicao nao conseguiu validar a nota enviada. Envie uma nova foto ou
                      informe que a nota foi enviada por email.
                    </p>
                  </div>
                )}
                <input
                  ref={noteInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    setSendingNote(true);
                    try {
                      await onDocument("nota_fiscal", file.name || "nota-fiscal.jpg", file);
                      setNoteSent(true);
                      toast.success("Nota enviada para a expedicao");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Nao foi possivel enviar a nota",
                      );
                    } finally {
                      setSendingNote(false);
                    }
                  }}
                />
                <UploadArea
                  done={noteSent}
                  loading={sendingNote}
                  title="Fotografar nota fiscal"
                  doneTitle="Nota enviada"
                  hint="Abra a camera e envie para a expedicao"
                  doneHint="Aguardando CT-e/MDF-e"
                  onClick={() => noteInputRef.current?.click()}
                />
                <ActionButton
                  tone="outline"
                  icon={sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  disabled={sendingNote}
                  onClick={async () => {
                    setSendingNote(true);
                    try {
                      await onDocument("nota_fiscal", "nota-enviada-por-email.txt");
                      setNoteSent(true);
                      toast.success("Nota marcada como enviada por email");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Nao foi possivel informar o envio",
                      );
                    } finally {
                      setSendingNote(false);
                    }
                  }}
                >
                  Nota enviada por email
                </ActionButton>
              </div>
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
                {!hasCteDocument ? (
                  <div className="flex w-full flex-col items-center gap-2 py-2 text-center">
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold">{cteDocument?.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Documento enviado pela expedicao
                        </p>
                      </div>
                    </div>
                    <p className="rounded-2xl bg-background/60 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                      Abra a aba Docs para consultar os arquivos do frete.
                    </p>
                  </div>
                )}
              </div>
            )}

            {stage.id === "descarga" && (
              <div className="space-y-2.5">
                <div className="rounded-3xl border border-border bg-surface-2/40 p-3">
                  <label className="label-xs" htmlFor="unloaded-tons">
                    Toneladas descarregadas
                  </label>
                  <input
                    id="unloaded-tons"
                    value={unloadedTons}
                    onChange={(event) => setUnloadedTons(event.target.value)}
                    inputMode="decimal"
                    placeholder="Ex.: 32,500"
                    className="mt-2 h-11 w-full rounded-2xl border border-border bg-background px-3 text-[16px] font-extrabold outline-none focus:border-primary"
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    Informe a quantidade final descarregada. Em frete por tonelada, este valor
                    calcula a receita do frete.
                  </p>
                </div>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    try {
                      await onDocument("comprovante_entrega", file.name || "comprovante-entrega.jpg", file);
                      setReceipt(true);
                      toast.success("Comprovante anexado");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Nao foi possivel anexar");
                    }
                  }}
                />
                <UploadArea
                  done={receipt}
                  title="Anexar comprovante de entrega"
                  doneTitle="Comprovante anexado"
                  hint="Foto, PDF ou canhoto assinado"
                  doneHint="Canhoto enviado para a central"
                  onClick={() => receiptInputRef.current?.click()}
                />
              </div>
            )}

            {(stage.id === "demanda" ||
              stage.id === "remetente" ||
              stage.id === "destinatario" ||
              stage.id === "retorno" ||
              stage.id === "concluida") && (
              <div className="mt-2 rounded-3xl bg-gradient-to-b from-surface-2/60 to-transparent p-4 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/12 text-primary">
                  {stage.id === "concluida" || stage.id === "retorno" ? (
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

        <button
          onClick={() => setHistoryOpen(true)}
          className="mt-2 flex w-full shrink-0 items-center justify-between gap-4 rounded-3xl border border-border px-4 py-2.5 text-left"
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
          onClick={() => onAdvance(stage.id === "descarga" ? parsedUnloadedTons : undefined)}
          disabled={!canAdvance}
          className="py-3.5 text-[15px]"
          icon={
            stage.id === "concluida" ? (
              <Truck className="h-5.5 w-5.5" />
            ) : (
              <CheckCircle2 className="h-5.5 w-5.5" />
            )
          }
          hint={canAdvance ? undefined : "Conclua os itens acima para liberar"}
        >
          {stage.action}
        </ActionButton>
        <button
          onClick={onFuel}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 py-2.5 text-[13px] font-bold text-warning"
        >
          <Fuel className="h-4.5 w-4.5" />
          Registrar entradas e despesas
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
  loading = false,
  title,
  doneTitle,
  hint,
  doneHint,
  onClick,
}: {
  done: boolean;
  loading?: boolean;
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
        "mt-2 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-3 text-center",
        done ? "border-primary/40 bg-primary/8" : "border-border bg-surface-2/30",
      )}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-primary">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : done ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </span>
      <span>
        <span className="block text-[14px] font-bold">{done ? doneTitle : title}</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {done ? doneHint : hint}
        </span>
      </span>
      {!done && (
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? "Enviando..." : "Abrir camera"}
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
