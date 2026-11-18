import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Coffee,
  Hourglass,
  LogIn,
  LogOut,
  Moon,
  PackageOpen,
  Play,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/app/Sheet";
import { ACTIVITY_HINT, ACTIVITY_LABEL, RULES, fmtClock, fmtMin, summarize } from "../jornada";
import {
  REOPEN_LIMIT_MS,
  endDay,
  getState,
  reopenDay,
  setActivity,
  startDay,
  today,
  useDemo,
} from "../store";
import { captureGeo } from "../geo";
import type { Activity } from "../types";
import { BigButton, Pill, ProgressRing, Toggle, useNow, type Tone } from "./kit";
import { CDD } from "../seed";

export const ACTIVITY_ICON: Record<Activity, typeof Play> = {
  fora: LogIn,
  direcao: Play,
  espera: Hourglass,
  carga_descarga: PackageOpen,
  refeicao: Coffee,
  descanso: Moon,
  trabalho: Wrench,
};

export const ACTIVITY_TONE: Record<Activity, Tone> = {
  fora: "muted",
  direcao: "primary",
  espera: "warning",
  carga_descarga: "info",
  refeicao: "muted",
  descanso: "muted",
  trabalho: "info",
};

const MANUAL: Exclude<Activity, "fora">[] = [
  "direcao",
  "espera",
  "refeicao",
  "descanso",
  "trabalho",
];

export function JourneyCard({ compact = false }: { compact?: boolean }) {
  const now = useNow(10_000);
  const day = useDemo((s) => today(s));
  const prevEnd = useDemo((s) => s.previousDayEndedAt);
  const summary = summarize(day, prevEnd, now);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [selfie, setSelfie] = useState(true);
  const started = Boolean(day?.startedAt && !day.endedAt);
  const ended = Boolean(day?.endedAt);
  const canReopen = Boolean(
    day?.endedAt && now - new Date(day.endedAt).getTime() <= REOPEN_LIMIT_MS,
  );
  const Icon = ACTIVITY_ICON[summary.current];
  const drivingRatio = summary.continuousDrivingMin / RULES.maxContinuousDrivingMin;
  const ringTone: Tone =
    drivingRatio >= 1 ? "danger" : drivingRatio >= 0.82 ? "warning" : "primary";
  const sinceMin = summary.currentSince
    ? (now - new Date(summary.currentSince).getTime()) / 60_000
    : 0;

  const change = async (activity: Exclude<Activity, "fora">) => {
    const geo = await captureGeo(CDD.geo);
    setActivity(activity, "motorista", ACTIVITY_LABEL[activity], geo);
    toast.success(`Ponto marcado: ${ACTIVITY_LABEL[activity]}`, {
      description: `${fmtClock(new Date().toISOString())} com posicao`,
    });
  };

  return (
    <div className="surface-card rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs">Jornada de hoje</p>
        {started ? (
          <Pill tone={ACTIVITY_TONE[summary.current]}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {ACTIVITY_LABEL[summary.current]}
          </Pill>
        ) : ended ? (
          <Pill>Encerrada {fmtClock(day?.endedAt)}</Pill>
        ) : (
          <Pill tone="warning">Nao iniciada</Pill>
        )}
      </div>

      {started ? (
        <div className="mt-3 flex items-center gap-4">
          <ProgressRing value={drivingRatio} size={78} tone={ringTone}>
            <div className="text-center leading-none">
              <p className="font-display text-[15px] font-extrabold">
                {fmtMin(summary.drivingLeftMin)}
              </p>
              <p className="mt-0.5 text-[8.5px] font-bold text-muted-foreground uppercase">
                p/ pausa
              </p>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <p className="truncate text-[19px] font-extrabold">
                {ACTIVITY_LABEL[summary.current]}
              </p>
            </div>
            <p className="text-[12.5px] font-semibold text-muted-foreground">
              ha {fmtMin(sinceMin)} desde {fmtClock(summary.currentSince)}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <MiniStat label="Jornada" value={fmtMin(summary.workedMin)} />
              <MiniStat label="Direcao" value={fmtMin(summary.totals.direcao)} />
              <MiniStat
                label="Extra"
                value={fmtMin(summary.extraMin)}
                warn={summary.extraMin > 0}
              />
            </div>
          </div>
        </div>
      ) : null}

      {!started && !ended ? (
        <div className="mt-3">
          <p className="text-[14px] text-muted-foreground">
            Marque o inicio para liberar a viagem. A hora vem do servidor e a posicao do GPS.
          </p>
          {prevEnd && Date.now() - new Date(prevEnd).getTime() < 4 * 86_400_000 ? (
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
              Fim da ultima jornada:{" "}
              {new Date(prevEnd).toLocaleString("pt-BR", {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}
          <BigButton
            className="mt-3"
            icon={<LogIn className="h-5 w-5" />}
            onClick={() => setStartOpen(true)}
          >
            Iniciar jornada
          </BigButton>
        </div>
      ) : null}

      {ended && canReopen ? (
        <div className="mt-3">
          <p className="text-[13px] text-muted-foreground">
            Encerrou sem querer ou precisa voltar ao trabalho? Reabra a jornada. O tempo parado
            fica fora da jornada.
          </p>
          <button
            onClick={() => setReopenOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-[13px] font-extrabold"
          >
            <RotateCcw className="h-4 w-4" /> Reabrir jornada
          </button>
        </div>
      ) : null}

      {started && !compact ? (
        <>
          <p className="mt-4 label-xs">Trocar atividade</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {MANUAL.map((a) => {
              const I = ACTIVITY_ICON[a];
              const active = summary.current === a;
              return (
                <motion.button
                  key={a}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => void change(a)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-[10px] font-extrabold",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface-2/40",
                  )}
                >
                  <I className="h-4.5 w-4.5" />
                  {ACTIVITY_LABEL[a].split(" ")[0]}
                </motion.button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            {ACTIVITY_HINT[summary.current]}
          </p>
          <button
            onClick={() => setEndOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-[13px] font-extrabold text-muted-foreground"
          >
            <LogOut className="h-4 w-4" /> Encerrar jornada
          </button>
        </>
      ) : null}

      <Sheet open={startOpen} onClose={() => setStartOpen(false)} title="Iniciar jornada">
        <div className="space-y-3">
          {prevEnd && Date.now() - new Date(prevEnd).getTime() < 4 * 86_400_000 ? (
            <InterDayNotice prevEnd={prevEnd} />
          ) : null}
          <Toggle
            checked={selfie}
            onChange={setSelfie}
            label="Tirar selfie de confirmacao"
            hint="Ajuda a provar quem marcou o ponto"
          />
          <BigButton
            icon={<LogIn className="h-5 w-5" />}
            onClick={async () => {
              const geo = await captureGeo(CDD.geo);
              startDay(geo, selfie);
              setStartOpen(false);
              toast.success("Jornada iniciada", {
                description: `${fmtClock(new Date().toISOString())} - posicao registrada`,
              });
            }}
          >
            Confirmar inicio agora
          </BigButton>
        </div>
      </Sheet>

      <Sheet open={reopenOpen} onClose={() => setReopenOpen(false)} title="Reabrir jornada">
        <div className="space-y-3">
          <p className="text-[14px] text-muted-foreground">
            A jornada encerrada as {fmtClock(day?.endedAt)} volta a contar a partir de agora. O
            intervalo entre o fim e agora fica fora da jornada. A central ve a reabertura no
            espelho de ponto.
          </p>
          <BigButton
            icon={<RotateCcw className="h-5 w-5" />}
            onClick={async () => {
              const geo = await captureGeo(CDD.geo);
              reopenDay(geo);
              setReopenOpen(false);
              toast.success("Jornada reaberta", {
                description: `${fmtClock(new Date().toISOString())} - posicao registrada`,
              });
            }}
          >
            Confirmar reabertura
          </BigButton>
        </div>
      </Sheet>

      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title="Encerrar jornada">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Trabalhado" value={fmtMin(summary.workedMin)} big />
            <MiniStat
              label="Hora extra"
              value={fmtMin(summary.extraMin)}
              big
              warn={summary.extraMin > 0}
            />
            <MiniStat label="Direcao" value={fmtMin(summary.totals.direcao)} big />
            <MiniStat label="Espera" value={fmtMin(summary.totals.espera)} big />
          </div>
          <p className="text-[13px] text-muted-foreground">
            O proximo inicio so fica liberado sem alerta depois de 11h de descanso.
          </p>
          <BigButton
            tone="danger"
            icon={<LogOut className="h-5 w-5" />}
            onClick={async () => {
              const geo = await captureGeo(CDD.geo);
              endDay(geo);
              setEndOpen(false);
              toast.success("Jornada encerrada", { description: "Bom descanso!" });
            }}
          >
            Encerrar agora
          </BigButton>
        </div>
      </Sheet>
    </div>
  );
}

function InterDayNotice({ prevEnd }: { prevEnd: string }) {
  const rest = (Date.now() - new Date(prevEnd).getTime()) / 60_000;
  const ok = rest >= RULES.minInterDayMin;
  return (
    <div
      className={cn(
        "rounded-2xl p-3.5 text-[13px] font-semibold",
        ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
      )}
    >
      {ok
        ? `Descanso desde a ultima jornada: ${fmtMin(rest)}. Interjornada ok.`
        : `Descanso de so ${fmtMin(rest)} desde a ultima jornada. O minimo e 11h; a central sera avisada.`}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  warn,
  big,
}: {
  label: string;
  value: string;
  warn?: boolean;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-2 py-1.5">
      <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "font-display font-extrabold",
          big ? "text-[18px]" : "text-[13px]",
          warn && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function useJourney() {
  const now = useNow(10_000);
  const day = useDemo((s) => today(s));
  const prevEnd = useDemo((s) => s.previousDayEndedAt);
  return summarize(day, prevEnd, now);
}

export function journeyStarted() {
  const day = today(getState());
  return Boolean(day?.startedAt && !day.endedAt);
}
