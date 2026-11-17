import {
  AlertTriangle,
  Bell,
  ChevronRight,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPin,
  ShieldAlert,
  Siren,
  Trophy,
  FileBadge,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { activeTrip, useDemo } from "../store";
import { fullToFull } from "../fuel";
import { computeScore } from "../score";
import { JourneyCard, useJourney } from "./JourneyCard";
import { Card, IconChip, Pill, num } from "./kit";
import type { Navigate } from "./DemoApp";
import { STOP_STATUS_LABEL, nextAction } from "./RouteScreen";

export function DayScreen({ navigate }: { navigate: Navigate }) {
  const tenant = useDemo((s) => s.tenant);
  const driver = useDemo((s) => s.driver);
  const vehicle = useDemo((s) => s.vehicle);
  const trip = useDemo(activeTrip);
  const state = useDemo((s) => s);
  const journey = useJourney();
  const kml = fullToFull(state.fuelRecords).average;
  const score = computeScore(state);
  const now = Date.now();
  const expiring = state.documents.filter(
    (d) => new Date(d.expiresAt).getTime() - now < 30 * 86_400_000,
  );
  const pendingNotices = state.notices.filter((n) => n.requiresAck && !n.ackAt);
  const openOcc = state.occurrences.filter((o) => o.status !== "resolvida");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const stop = trip ? trip.stops[trip.currentStopIndex] : undefined;
  const action = trip ? nextAction(trip, state) : null;

  const alerts = [
    ...journey.alerts
      .filter((a) => a.level !== "info")
      .map((a) => ({
        tone: a.level === "violacao" ? "danger" : "warning",
        title: a.title,
        detail: a.detail,
        go: () => navigate("ponto"),
      })),
    ...expiring.map((d) => {
      const days = Math.round((new Date(d.expiresAt).getTime() - now) / 86_400_000);
      return {
        tone: days < 0 ? "danger" : "warning",
        title: days < 0 ? `${d.label} vencido` : `${d.label} vence em ${days} dias`,
        detail: d.blocking ? "Documento obrigatorio para rodar." : "Renove para nao perder pontos.",
        go: () => navigate("more", "docs"),
      };
    }),
  ] as { tone: "danger" | "warning"; title: string; detail: string; go: () => void }[];

  return (
    <div className="space-y-3 px-4 pt-3 pb-24">
      <header className="flex items-center gap-3">
        <div className="font-display text-[25px] leading-none font-extrabold tracking-tight">
          frota<span className="text-primary">k</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-xs truncate">
            {greeting} - {tenant.operation}
          </p>
          <h1 className="truncate text-[21px] leading-tight font-extrabold">{driver.name}</h1>
        </div>
        <button
          onClick={() => navigate("more", "notices")}
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2"
        >
          <Bell className="h-5 w-5" />
          {pendingNotices.length ? (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive" />
          ) : null}
        </button>
      </header>

      <div className="flex items-center gap-2 text-[12px] font-bold text-muted-foreground">
        <span className="rounded-full bg-surface-2 px-2.5 py-1">{vehicle.plate}</span>
        <span className="truncate">{vehicle.model}</span>
      </div>

      <JourneyCard compact />

      {trip ? (
        <Card onClick={() => navigate("route")} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="label-xs">
              {trip.kind === "distribuicao" ? "Rota de entregas" : "Transferencia"} - {trip.code}
            </p>
            <Pill
              tone={
                trip.status === "em_andamento"
                  ? "primary"
                  : trip.status === "finalizada"
                    ? "muted"
                    : "warning"
              }
            >
              {trip.status === "em_andamento"
                ? "Em andamento"
                : trip.status === "finalizada"
                  ? "Finalizada"
                  : "Aguardando inicio"}
            </Pill>
          </div>
          <h2 className="mt-2 text-[20px] leading-tight font-extrabold">{trip.title}</h2>
          {stop ? (
            <div className="mt-2 flex items-start gap-2 text-[13px]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate font-bold">{stop.name}</span>
                <span className="block text-muted-foreground">
                  {STOP_STATUS_LABEL[stop.status]}
                  {stop.window ? ` - janela ${stop.window.from} as ${stop.window.to}` : ""}
                </span>
              </span>
            </div>
          ) : null}
          <DeliveryProgress
            done={
              trip.stops.filter(
                (s) =>
                  s.kind === "entrega" && ["entregue", "parcial", "recusada"].includes(s.status),
              ).length
            }
            total={trip.stops.filter((s) => s.kind === "entrega").length}
            kind={trip.kind}
          />
          {action ? (
            <span className="mt-3 flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-glow)]">
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[15px] font-extrabold">{action.label}</span>
                {action.hint ? (
                  <span className="text-[11px] font-semibold opacity-75">{action.hint}</span>
                ) : null}
              </span>
            </span>
          ) : null}
        </Card>
      ) : null}

      {alerts.length ? (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((a) => (
            <button
              key={a.title}
              onClick={a.go}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-3 text-left",
                a.tone === "danger"
                  ? "border-destructive/30 bg-destructive/8"
                  : "border-warning/30 bg-warning/10",
              )}
            >
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  a.tone === "danger" ? "text-destructive" : "text-warning",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold">{a.title}</span>
                <span className="block text-[12px] text-muted-foreground">{a.detail}</span>
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Quick
          icon={<Fuel className="h-5 w-5" />}
          label="Abastecer"
          onClick={() => navigate("more", "fuel-new")}
        />
        <Quick
          icon={<ClipboardCheck className="h-5 w-5" />}
          label="Checklist"
          onClick={() => navigate("more", "checklist")}
        />
        <Quick
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Ocorrencia"
          badge={openOcc.length}
          onClick={() => navigate("more", "occurrence")}
        />
        <Quick
          icon={<FileBadge className="h-5 w-5" />}
          label="Documentos"
          badge={expiring.length}
          onClick={() => navigate("more", "docs")}
        />
        <Quick
          icon={<Bell className="h-5 w-5" />}
          label="Avisos"
          badge={pendingNotices.length}
          onClick={() => navigate("more", "notices")}
        />
        <Quick
          icon={<Siren className="h-5 w-5" />}
          label="Emergencia"
          danger
          onClick={() => navigate("more", "emergency")}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card onClick={() => navigate("more", "fuel")} className="p-3.5">
          <div className="flex items-center gap-2">
            <IconChip className="h-8 w-8 rounded-xl">
              <Gauge className="h-4 w-4" />
            </IconChip>
            <p className="label-xs">Meu km/l</p>
          </div>
          <p
            className={cn(
              "mt-2 font-display text-[24px] font-extrabold",
              kml != null && kml < vehicle.kmPerLiterTarget ? "text-warning" : "text-primary",
            )}
          >
            {kml != null ? num(kml, 2) : "--"}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground">
            Meta {num(vehicle.kmPerLiterTarget, 1)} km/l
          </p>
        </Card>
        <Card onClick={() => navigate("more", "score")} className="p-3.5">
          <div className="flex items-center gap-2">
            <IconChip className="h-8 w-8 rounded-xl" tone="warning">
              <Trophy className="h-4 w-4" />
            </IconChip>
            <p className="label-xs">Minha nota</p>
          </div>
          <p className="mt-2 font-display text-[24px] font-extrabold">{score.total}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {score.tier ? `Faixa ${score.tier.label}` : "Abaixo da faixa de premio"}
          </p>
        </Card>
      </div>

      <Card onClick={() => navigate("more", "schedule")} className="flex items-center gap-3 p-3.5">
        <IconChip tone="muted">
          <CalendarDays className="h-5 w-5" />
        </IconChip>
        <div className="min-w-0 flex-1">
          <p className="label-xs">Proxima escala</p>
          <p className="truncate text-[14px] font-bold">
            {state.schedule[1]?.detail ?? "Sem escala"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Card>
    </div>
  );
}

function DeliveryProgress({ done, total, kind }: { done: number; total: number; kind: string }) {
  if (!total) return null;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
        <span>{kind === "distribuicao" ? "Entregas" : "Destinos"}</span>
        <span>
          {done}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-primary"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Quick({
  icon,
  label,
  onClick,
  badge,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-[11.5px] font-extrabold",
        danger
          ? "border-destructive/30 bg-destructive/8 text-destructive"
          : "border-border bg-surface-2/40",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl",
          danger ? "bg-destructive/12" : "bg-primary/12 text-primary",
        )}
      >
        {icon}
      </span>
      {label}
      {badge ? (
        <span className="absolute top-1.5 right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-black text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
