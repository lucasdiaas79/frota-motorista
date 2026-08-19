import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { DriverAppStage } from "@/lib/driverApi";
import { cn } from "@/lib/utils";

const TIMELINE_STAGES: Array<Pick<DriverAppStage, "id" | "index" | "short" | "title" | "place">> = [
  { id: "demanda", index: 0, short: "Demanda", title: "Nova demanda", place: "Coleta" },
  { id: "remetente", index: 1, short: "Coleta", title: "Chegada no remetente", place: "Origem" },
  { id: "carregamento", index: 2, short: "Carga", title: "Carregamento", place: "Origem" },
  { id: "documentos", index: 3, short: "CT-e", title: "CT-e / MDF-e", place: "Expedicao" },
  {
    id: "destinatario",
    index: 4,
    short: "Entrega",
    title: "Chegada ao destinatario",
    place: "Destino",
  },
  { id: "descarga", index: 5, short: "Descarga", title: "Descarga", place: "Destino" },
  { id: "concluida", index: 6, short: "Fim", title: "Rota concluida", place: "Final" },
];

export function Stepper({ current }: { current: DriverAppStage }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
      {TIMELINE_STAGES.map((s) => {
        const done = s.index < current.index;
        const active = s.index === current.index;
        return (
          <div
            key={s.id}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors",
              done && "border-primary/30 bg-primary/10 text-primary",
              active && "border-primary bg-primary text-primary-foreground",
              !done && !active && "border-border text-muted-foreground",
            )}
          >
            {done ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-current/15 text-[9px]">
                {s.index + 1}
              </span>
            )}
            {s.short}
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <motion.div
        className="h-full rounded-full bg-gradient-primary"
        initial={false}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      />
    </div>
  );
}

export function Timeline({ current }: { current: DriverAppStage }) {
  return (
    <ol className="relative ml-2 border-l border-border pl-6">
      {TIMELINE_STAGES.map((s) => {
        const done = s.index < current.index;
        const active = s.index === current.index;
        return (
          <li key={s.id} className="relative pb-6 last:pb-0">
            <span
              className={cn(
                "absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border-2",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-background",
                !done && !active && "border-border bg-background",
              )}
            >
              {done && <Check className="h-3 w-3" />}
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <p className={cn("text-[15px] font-bold", !done && !active && "text-muted-foreground")}>
              {s.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.place}</p>
          </li>
        );
      })}
    </ol>
  );
}
