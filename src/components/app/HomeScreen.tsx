import { motion } from "motion/react";
import {
  ArrowRight,
  Bell,
  Clock,
  Fuel,
  MapPin,
  MessageSquare,
  Sparkles,
  Truck,
  FileWarning,
} from "lucide-react";
import { Chip, ActionButton, SectionTitle } from "./primitives";
import { ProgressBar } from "./Stepper";
import { DRIVER_STAGE_COUNT, type DriverAppStage, type DriverTrip } from "@/lib/driverApi";

export function HomeScreen({
  driverName,
  stage,
  trip,
  onOpenTrip,
  onAssistant,
  onFuel,
}: {
  driverName: string;
  stage: DriverAppStage;
  trip: DriverTrip;
  onOpenTrip: () => void;
  onAssistant: () => void;
  onFuel: () => void;
}) {
  const progress = stage.index / (DRIVER_STAGE_COUNT - 1);
  const hasFreight = Boolean(trip.freightId);
  const idle = !hasFreight;
  const destinationParts = hasFreight ? stage.place.split(" - ") : ["-"];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-3 pb-3">
      <header className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="font-display text-[25px] leading-none font-extrabold tracking-tight">
          frota<span className="text-primary">k</span>
        </div>
        <div className="min-w-0">
          <p className="label-xs">Boa noite</p>
          <h1 className="truncate text-[23px] leading-tight font-extrabold">{driverName || "-"}</h1>
        </div>
        <button className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </header>

      <motion.div
        layout
        className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <Chip pulse tone={idle ? "muted" : "primary"}>
            {stage.statusLabel}
          </Chip>
          <span className="text-[11px] font-bold text-muted-foreground">
            {stage.index + 1}/{DRIVER_STAGE_COUNT}
          </span>
        </div>

        <h2 className="mt-3 text-[26px] leading-[1.05] font-extrabold">
          {idle ? "Nenhuma viagem ativa" : stage.title}
        </h2>
        <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">
          {idle ? "Aguardando comando da central." : stage.subtitle}
        </p>

        {!idle && (
          <>
            <div className="mt-3 flex items-center gap-2.5 text-[13px]">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-semibold">{stage.place}</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={progress} />
            </div>
          </>
        )}

        <ActionButton
          className="mt-auto"
          onClick={onOpenTrip}
          icon={<ArrowRight className="h-5 w-5" />}
          hint={idle ? undefined : stage.eta}
        >
          {idle ? "Ver historico da rota" : "Continuar viagem"}
        </ActionButton>
      </motion.div>

      <div className="shrink-0">
        <SectionTitle>Resumo rapido</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <Tile
            icon={<Truck className="h-4.5 w-4.5" />}
            label="Veiculo"
            value={hasFreight ? trip.plate : "-"}
            sub={hasFreight ? trip.trailer : "-"}
          />
          <Tile
            icon={<Clock className="h-4.5 w-4.5" />}
            label="Tempo restante"
            value={hasFreight ? "-" : "0h 00"}
            sub={hasFreight ? trip.distance : "-"}
          />
          <Tile
            icon={<MapPin className="h-4.5 w-4.5" />}
            label="Proximo destino"
            value={destinationParts[0] || "-"}
            sub={
              hasFreight && stage.place.includes(" - ")
                ? destinationParts.slice(1).join(" - ")
                : "-"
            }
          />
          <Tile
            icon={<FileWarning className="h-4.5 w-4.5" />}
            label="Pendencias"
            value={idle ? "0" : "1"}
            sub={idle ? "Sem pendencias" : "MDF-e em emissao"}
          />
        </div>
      </div>

      <button
        onClick={onAssistant}
        className="flex min-h-12 shrink-0 items-center gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-3 py-2.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-bold">Assistente FrotaK</span>
          <span className="block text-xs text-muted-foreground">
            "Qual o horario de corte em Suape?"
          </span>
        </span>
      </button>

      <div className="grid shrink-0 grid-cols-2 gap-2.5">
        <QuickAction
          icon={<Fuel className="h-4.5 w-4.5" />}
          label="Registrar despesa"
          onClick={onFuel}
        />
        <QuickAction
          icon={<MessageSquare className="h-4.5 w-4.5" />}
          label="Central"
          onClick={onAssistant}
        />
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="min-h-[84px] rounded-2xl border border-border bg-surface-2/40 p-3">
      <span className="text-primary">{icon}</span>
      <p className="label-xs mt-2">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-extrabold">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex min-h-11 items-center justify-center gap-2.5 rounded-2xl bg-secondary px-3 py-2.5 text-[13px] font-bold"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </motion.button>
  );
}
