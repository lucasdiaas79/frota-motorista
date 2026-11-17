import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CloudOff, Info, MapPin, PencilLine, Radar, Route as RouteIcon, ShieldCheck, Smartphone, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/app/Sheet";
import { ACTIVITY_LABEL, fmtClock, fmtMin, summarize } from "../jornada";
import { adjustSegment, confirmDay, today, useDemo } from "../store";
import { fmtGeo } from "../geo";
import type { PunchSegment, PunchSource, WorkDay } from "../types";
import { ACTIVITY_ICON, JourneyCard } from "./JourneyCard";
import { BigButton, Field, Pill, Segmented, TextArea, TextInput, dayLabel, money, useNow } from "./kit";

const SOURCE: Record<PunchSource, { label: string; icon: typeof MapPin }> = {
  motorista: { label: "motorista", icon: Smartphone },
  etapa: { label: "etapa do frete", icon: RouteIcon },
  cerca: { label: "cerca eletronica", icon: Radar },
  ajuste: { label: "ajuste", icon: PencilLine },
  voz: { label: "voz", icon: Mic },
};

export function PontoScreen() {
  const now = useNow(15_000);
  const day = useDemo((s) => today(s));
  const days = useDemo((s) => s.workDays);
  const prevEnd = useDemo((s) => s.previousDayEndedAt);
  const wage = useDemo((s) => s.driver.hourlyWage);
  const summary = summarize(day, prevEnd, now);
  const [view, setView] = useState<"hoje" | "espelho">("hoje");
  const [adjust, setAdjust] = useState<{ day: WorkDay; seg: PunchSegment } | null>(null);

  const history = [...days].sort((a, b) => b.date.localeCompare(a.date));
  const week = history.reduce(
    (acc, d) => {
      const s = summarize(d, undefined, now);
      return { worked: acc.worked + s.workedMin, extra: acc.extra + s.extraMin, wait: acc.wait + s.totals.espera };
    },
    { worked: 0, extra: 0, wait: 0 },
  );

  return (
    <div className="space-y-3 px-4 pt-3 pb-24">
      <header className="flex items-end justify-between">
        <div>
          <p className="label-xs">Ponto e jornada</p>
          <h1 className="text-[24px] font-extrabold">Minha jornada</h1>
        </div>
        <Pill tone="info">
          <ShieldCheck className="h-3 w-3" /> Lei 13.103
        </Pill>
      </header>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "hoje", label: "Hoje" },
          { value: "espelho", label: "Espelho de ponto" },
        ]}
      />

      {view === "hoje" ? (
        <>
          <JourneyCard />
          {summary.alerts.length ? (
            <div className="space-y-2">
              {summary.alerts.map((a) => (
                <div
                  key={a.code}
                  className={cn(
                    "flex gap-3 rounded-2xl border p-3",
                    a.level === "violacao" && "border-destructive/30 bg-destructive/8",
                    a.level === "aviso" && "border-warning/30 bg-warning/10",
                    a.level === "info" && "border-border bg-surface-2/40",
                  )}
                >
                  {a.level === "info" ? <Info className="h-5 w-5 shrink-0 text-muted-foreground" /> : <AlertTriangle className={cn("h-5 w-5 shrink-0", a.level === "violacao" ? "text-destructive" : "text-warning")} />}
                  <div>
                    <p className="text-[13.5px] font-extrabold">{a.title}</p>
                    <p className="text-[12px] text-muted-foreground">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {day?.startedAt ? (
            <div className="surface-card rounded-[22px] p-4">
              <p className="label-xs">Marcacoes de hoje</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                As etapas da viagem marcam o ponto sozinhas. Voce so marca o que nao e etapa: refeicao, descanso, espera fora do roteiro.
              </p>
              <Timeline day={day} now={now} onAdjust={(seg) => setAdjust({ day, seg })} />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <MiniBox label="Trabalhado" value={fmtMin(week.worked)} />
            <MiniBox label="Extras" value={fmtMin(week.extra)} warn={week.extra > 0} />
            <MiniBox label="Espera" value={fmtMin(week.wait)} />
          </div>
          <p className="text-[12px] text-muted-foreground">
            Hora extra estimada na semana: {money((week.extra / 60) * wage * 1.5)} (50% sobre R$ {wage.toFixed(2)}/h). Valor final pela folha.
          </p>
          {history.map((d) => {
            const s = summarize(d, undefined, now);
            const isToday = d.id === day?.id;
            return (
              <div key={d.id} className="surface-card rounded-[22px] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-extrabold capitalize">{isToday ? "Hoje" : dayLabel(d.startedAt ?? d.date)}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {fmtClock(d.startedAt)} as {d.endedAt ? fmtClock(d.endedAt) : "agora"} - {d.segments.length} marcacoes
                    </p>
                  </div>
                  {d.confirmedByDriverAt ? (
                    <Pill tone="primary">
                      <CheckCircle2 className="h-3 w-3" /> Conferido
                    </Pill>
                  ) : d.endedAt ? (
                    <Pill tone="warning">Conferir</Pill>
                  ) : (
                    <Pill>Em aberto</Pill>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                  <MiniBox label="Jornada" value={fmtMin(s.workedMin)} small />
                  <MiniBox label="Direcao" value={fmtMin(s.totals.direcao)} small />
                  <MiniBox label="Espera" value={fmtMin(s.totals.espera)} small />
                  <MiniBox label="Extra" value={fmtMin(s.extraMin)} small warn={s.extraMin > 0} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  <MiniBox label="Carga/desc." value={fmtMin(s.totals.carga_descarga)} small />
                  <MiniBox label="Refeicao" value={fmtMin(s.totals.refeicao)} small />
                  <MiniBox label="Descanso" value={fmtMin(s.totals.descanso)} small />
                </div>
                {d.endedAt && !d.confirmedByDriverAt ? (
                  <BigButton
                    className="mt-3"
                    onClick={() => {
                      confirmDay(d.id);
                      toast.success("Espelho conferido", { description: "Assinado no app com data e hora" });
                    }}
                  >
                    Conferi e concordo
                  </BigButton>
                ) : null}
              </div>
            );
          })}
          <p className="px-1 text-[11px] text-muted-foreground">
            Demonstracao. Para valer como ponto oficial (Portaria MTE 671/2021, REP-P), a Frotak ainda precisa do registro do programa e dos arquivos AFD e AEJ.
          </p>
        </>
      )}

      <AdjustSheet target={adjust} onClose={() => setAdjust(null)} />
    </div>
  );
}

function Timeline({ day, now, onAdjust }: { day: WorkDay; now: number; onAdjust: (seg: PunchSegment) => void }) {
  return (
    <ol className="relative mt-3 ml-1 border-l border-border pl-5">
      {day.segments.map((seg) => {
        const Icon = ACTIVITY_ICON[seg.activity];
        const Src = SOURCE[seg.source].icon;
        const minutes = ((seg.endAt ? new Date(seg.endAt).getTime() : now) - new Date(seg.startAt).getTime()) / 60_000;
        return (
          <li key={seg.id} className="relative pb-4 last:pb-0">
            <span className={cn("absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full", seg.endAt ? "bg-surface-2 text-muted-foreground" : "bg-primary text-primary-foreground")}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold">
                  {fmtClock(seg.startAt)} {ACTIVITY_LABEL[seg.activity]}
                  <span className="ml-1.5 text-[12px] font-semibold text-muted-foreground">{fmtMin(minutes)}</span>
                </p>
                {seg.reason ? <p className="truncate text-[12px] text-muted-foreground">{seg.reason}</p> : null}
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] font-bold text-muted-foreground uppercase">
                  <span className="flex items-center gap-1">
                    <Src className="h-3 w-3" /> {SOURCE[seg.source].label}
                  </span>
                  {seg.geo ? (
                    <span className="flex items-center gap-1 normal-case">
                      <MapPin className="h-3 w-3" /> {fmtGeo(seg.geo)}
                    </span>
                  ) : null}
                  {!seg.synced ? (
                    <span className="flex items-center gap-1 text-warning">
                      <CloudOff className="h-3 w-3" /> na fila
                    </span>
                  ) : null}
                </p>
                {seg.adjustment ? (
                  <p className="mt-1 text-[11px] text-warning">
                    Ajustado de {fmtClock(seg.adjustment.originalStartAt)}: {seg.adjustment.reason}
                  </p>
                ) : null}
              </div>
              <button onClick={() => onAdjust(seg)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground" aria-label="Ajustar">
                <PencilLine className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AdjustSheet({ target, onClose }: { target: { day: WorkDay; seg: PunchSegment } | null; onClose: () => void }) {
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Sheet open={Boolean(target)} onClose={onClose} title="Ajustar marcacao">
      {target ? (
        <div className="space-y-3">
          <p className="text-[13px] text-muted-foreground">
            {ACTIVITY_LABEL[target.seg.activity]} marcada as {fmtClock(target.seg.startAt)}. O horario original fica guardado e o gestor aprova o ajuste.
          </p>
          <Field label="Horario correto">
            <TextInput value={time} onChange={setTime} placeholder="HH:MM" inputMode="numeric" />
          </Field>
          <Field label="Motivo (obrigatorio)">
            <TextArea value={reason} onChange={setReason} placeholder="Ex.: esqueci de marcar a refeicao na hora" />
          </Field>
          <BigButton
            onClick={() => {
              const m = /^(\d{1,2}):?(\d{2})$/.exec(time.trim());
              if (!m || reason.trim().length < 5) {
                toast.error("Informe o horario (HH:MM) e o motivo");
                return;
              }
              const d = new Date(target.seg.startAt);
              d.setHours(Number(m[1]), Number(m[2]), 0, 0);
              adjustSegment(target.day.id, target.seg.id, d.toISOString(), reason.trim());
              setTime("");
              setReason("");
              onClose();
              toast.success("Ajuste enviado para aprovacao do gestor");
            }}
          >
            Enviar ajuste
          </BigButton>
        </div>
      ) : null}
    </Sheet>
  );
}

function MiniBox({ label, value, warn, small }: { label: string; value: string; warn?: boolean; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-2.5">
      <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className={cn("font-display font-extrabold", small ? "text-[13.5px]" : "text-[18px]", warn && "text-warning")}>{value}</p>
    </div>
  );
}
