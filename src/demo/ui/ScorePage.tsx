import { Medal, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemo } from "../store";
import { PRIZE_TIERS, computeScore } from "../score";
import { ProgressRing, money, num } from "./kit";

export function ScorePage() {
  const state = useDemo((s) => s);
  const score = computeScore(state);
  const team = state.team
    .map((m) => (m.self ? { ...m, score: score.total, kmPerLiter: score.kmPerLiter } : m))
    .sort((a, b) => b.score - a.score);
  const position = team.findIndex((m) => m.self) + 1;
  const next = [...PRIZE_TIERS].reverse().find((t) => t.min > score.total);

  return (
    <div className="space-y-3">
      <div className="surface-card flex items-center gap-4 rounded-[22px] p-4">
        <ProgressRing
          value={score.total / 100}
          size={96}
          stroke={9}
          tone={score.total >= 80 ? "primary" : score.total >= 70 ? "warning" : "danger"}
        >
          <div className="text-center">
            <p className="font-display text-[28px] leading-none font-extrabold">{score.total}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">de 100</p>
          </div>
        </ProgressRing>
        <div className="min-w-0">
          <p className="label-xs">Nota do mes</p>
          <p className="text-[18px] font-extrabold">
            {score.tier ? `Faixa ${score.tier.label}` : "Sem premio ainda"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {score.tier ? `Premio previsto: ${money(score.tier.amount)}` : ""}
            {next
              ? `${score.tier ? ". " : ""}Faltam ${next.min - score.total} pontos para ${next.label} (${money(next.amount)})`
              : ""}
          </p>
          <p className="mt-1 text-[12px] font-bold text-primary">
            {position}o lugar na {state.driver.team}
          </p>
        </div>
      </div>

      <div className="surface-card rounded-[22px] p-4">
        <p className="label-xs">Por que essa nota</p>
        <div className="mt-2 space-y-3">
          {score.lines.map((l) => {
            const lost = l.max - l.points;
            return (
              <div key={l.key}>
                <div className="flex items-center justify-between text-[13.5px] font-extrabold">
                  <span className="flex items-center gap-1.5">
                    {lost === 0 ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-warning" />
                    )}
                    {l.label}
                  </span>
                  <span>
                    {l.points}/{l.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn("h-full rounded-full", lost === 0 ? "bg-primary" : "bg-warning")}
                    style={{ width: `${(l.points / l.max) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">{l.why}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface-card rounded-[22px] p-4">
        <p className="label-xs">Ranking da equipe</p>
        <div className="mt-2 space-y-1.5">
          {team.map((m, i) => (
            <div
              key={m.name}
              className={cn("flex items-center gap-3 rounded-xl p-2", m.self && "bg-primary/10")}
            >
              <span className="w-6 text-center font-display text-[14px] font-extrabold">
                {i < 3 ? (
                  <Medal
                    className={cn(
                      "mx-auto h-4 w-4",
                      i === 0 ? "text-warning" : "text-muted-foreground",
                    )}
                  />
                ) : (
                  i + 1
                )}
              </span>
              <span className={cn("flex-1 text-[13.5px] font-bold", m.self && "text-primary")}>
                {m.self ? "Voce" : m.name}
              </span>
              <span className="text-[12px] text-muted-foreground">{num(m.kmPerLiter, 2)} km/l</span>
              <span className="w-8 text-right font-display text-[14px] font-extrabold">
                {m.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-2/50 p-3 text-[12px] text-muted-foreground">
        <p className="flex items-center gap-1.5 font-extrabold text-foreground">
          <Trophy className="h-4 w-4 text-warning" /> Faixas de premio
        </p>
        <p className="mt-1">
          {PRIZE_TIERS.map((t) => `${t.label}: ${t.min}+ pontos = ${money(t.amount)}`).join(" | ")}.
          Pesos e valores definidos pela transportadora. Fila, carga e descarga nao contam como
          motor ocioso.
        </p>
      </div>
    </div>
  );
}
