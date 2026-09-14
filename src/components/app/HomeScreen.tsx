import { motion } from "motion/react";
import { useState } from "react";
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  History,
  MapPin,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { Chip, ActionButton, SectionTitle } from "./primitives";
import { Sheet } from "./Sheet";
import { ProgressBar } from "./Stepper";
import {
  DRIVER_STAGE_COUNT,
  type DriverAppStage,
  type DriverFinanceTransaction,
  type DriverTrip,
  type DriverTripFinance,
} from "@/lib/driverApi";

export function HomeScreen({
  driverName,
  stage,
  trip,
  finance,
  onOpenTrip,
  onAssistant,
  onFuel,
}: {
  driverName: string;
  stage: DriverAppStage;
  trip: DriverTrip;
  finance: DriverTripFinance;
  onOpenTrip: () => void;
  onAssistant: () => void;
  onFuel: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const progress = stage.index / (DRIVER_STAGE_COUNT - 1);
  const hasFreight = Boolean(trip.freightId);
  const idle = !hasFreight;
  const latestTransactions = finance.transactions.slice(0, 3);

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
        <SectionTitle>Caixa do frete</SectionTitle>
        <MiniDre
          hasFreight={hasFreight}
          finance={finance}
          latestTransactions={latestTransactions}
          onHistory={() => setHistoryOpen(true)}
        />
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

      <div className="shrink-0">
        <QuickAction
          icon={<ReceiptText className="h-4.5 w-4.5" />}
          label="Registrar entradas e despesas"
          onClick={onFuel}
        />
      </div>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Historico financeiro">
        <SectionTitle>Transacoes do frete</SectionTitle>
        <TransactionList transactions={finance.transactions} />
      </Sheet>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function MiniDre({
  hasFreight,
  finance,
  latestTransactions,
  onHistory,
}: {
  hasFreight: boolean;
  finance: DriverTripFinance;
  latestTransactions: DriverFinanceTransaction[];
  onHistory: () => void;
}) {
  const positive = finance.balance >= 0;

  return (
    <div className="rounded-3xl border border-border bg-surface-2/45 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-xs">Saldo atual</p>
          <p
            className={
              positive
                ? "mt-1 text-[24px] leading-none font-extrabold text-primary"
                : "mt-1 text-[24px] leading-none font-extrabold text-destructive"
            }
          >
            {hasFreight ? formatMoney(finance.balance) : "R$ 0,00"}
          </p>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">
            {hasFreight ? "Entradas menos despesas do frete" : "Sem frete ativo"}
          </p>
        </div>
        <button
          onClick={onHistory}
          disabled={!hasFreight || finance.transactions.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-2 text-[12px] font-bold disabled:opacity-40"
        >
          <History className="h-3.5 w-3.5" />
          Historico
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <FinanceMetric
          label="Entradas"
          value={hasFreight ? formatMoney(finance.income) : "R$ 0,00"}
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="entry"
        />
        <FinanceMetric
          label="Despesas"
          value={hasFreight ? formatMoney(finance.expenses) : "R$ 0,00"}
          icon={<ArrowDownRight className="h-4 w-4" />}
          tone="expense"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        {hasFreight && latestTransactions.length > 0 ? (
          latestTransactions.map((transaction) => (
            <button
              key={`${transaction.kind}-${transaction.id}`}
              onClick={onHistory}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-background/55 px-3 py-2 text-left"
            >
              <span
                className={
                  transaction.kind === "entry"
                    ? "grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-primary"
                    : "grid h-7 w-7 place-items-center rounded-full bg-warning/12 text-warning"
                }
              >
                {transaction.kind === "entry" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold">{transaction.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {transaction.detail}
                </span>
              </span>
              <span className="text-right text-[12px] font-extrabold">
                {transaction.kind === "entry" ? "+" : "-"} {formatMoney(transaction.amount)}
              </span>
            </button>
          ))
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-background/55 px-3 py-2.5 text-[12px] text-muted-foreground">
            <span>Nenhuma transacao neste frete.</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "entry" | "expense";
}) {
  return (
    <div className="rounded-2xl bg-background/55 px-3 py-2.5">
      <div className={tone === "entry" ? "text-primary" : "text-warning"}>{icon}</div>
      <p className="label-xs mt-1">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-extrabold">{value}</p>
    </div>
  );
}

function TransactionList({ transactions }: { transactions: DriverFinanceTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-2/40 p-4 text-[13px] font-semibold text-muted-foreground">
        Nenhuma entrada ou despesa registrada neste frete.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <div
          key={`${transaction.kind}-${transaction.id}`}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface-2/35 p-3"
        >
          <span
            className={
              transaction.kind === "entry"
                ? "grid h-9 w-9 place-items-center rounded-full bg-primary/12 text-primary"
                : "grid h-9 w-9 place-items-center rounded-full bg-warning/12 text-warning"
            }
          >
            {transaction.kind === "entry" ? (
              <ArrowUpRight className="h-4.5 w-4.5" />
            ) : (
              <ArrowDownRight className="h-4.5 w-4.5" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-bold">{transaction.label}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {transaction.detail} · {formatDateTime(transaction.recordedAt)}
            </span>
          </span>
          <span className="text-right text-[13px] font-extrabold">
            {transaction.kind === "entry" ? "+" : "-"} {formatMoney(transaction.amount)}
          </span>
        </div>
      ))}
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
      className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-secondary px-3 py-3 text-[13px] font-bold"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </motion.button>
  );
}
