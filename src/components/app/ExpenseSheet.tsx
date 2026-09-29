import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Fuel,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { ActionButton } from "./primitives";
import { cn } from "@/lib/utils";
import type {
  DriverCashEntryStation,
  DriverDailyAllowanceContext,
  DriverExpensePaymentSource,
} from "@/lib/driverApi";

const CATEGORIES = [
  { value: "pedagio", label: "Pedagio" },
  { value: "alimentacao", label: "Alimentacao" },
  { value: "estacionamento", label: "Estacionamento" },
  { value: "manutencao", label: "Manutencao" },
  { value: "outros", label: "Outros" },
] as const;

type ExpenseCategory = (typeof CATEGORIES)[number]["value"];
type SheetMode = "entry" | "expense" | "allowance";

export function ExpenseSheet({
  open,
  onClose,
  onFuel,
  onSave,
  onSaveEntry,
  financeScope,
  stations,
  stationsLoading,
  longTripMode,
  dailyAllowance,
  onSaveDailyAllowance,
}: {
  open: boolean;
  onClose: () => void;
  onFuel: () => void;
  financeScope: "freight" | "trip";
  stations: DriverCashEntryStation[];
  stationsLoading: boolean;
  longTripMode: boolean;
  dailyAllowance?: DriverDailyAllowanceContext | null;
  onSave: (input: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    notes?: string;
    paymentSource: DriverExpensePaymentSource;
  }) => Promise<void>;
  onSaveEntry: (input: {
    origin?: string;
    stationPartnerId?: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
  onSaveDailyAllowance: (input: { quantity: number; notes?: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<SheetMode>("entry");
  const [category, setCategory] = useState<ExpenseCategory>("pedagio");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryOrigin, setEntryOrigin] = useState("");
  const [stationPartnerId, setStationPartnerId] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentSource, setPaymentSource] = useState<DriverExpensePaymentSource>(
    financeScope === "trip" ? "trip_cash" : "company_payable",
  );
  const [saving, setSaving] = useState(false);
  const [allowanceQuantity, setAllowanceQuantity] = useState("");
  const [allowanceNotes, setAllowanceNotes] = useState("");
  const scopeLabel = financeScope === "trip" ? "na viagem atual" : "no frete atual";

  useEffect(() => {
    if (open) {
      setPaymentSource(financeScope === "trip" ? "trip_cash" : "company_payable");
      setAllowanceQuantity(
        dailyAllowance?.allowance?.quantity ? String(dailyAllowance.allowance.quantity) : "",
      );
      setAllowanceNotes(dailyAllowance?.allowance?.notes ?? "");
    }
  }, [dailyAllowance, financeScope, open]);

  const resetExpense = () => {
    setDescription("");
    setAmount("");
    setNotes("");
    setCategory("pedagio");
    setPaymentSource(financeScope === "trip" ? "trip_cash" : "company_payable");
  };

  const resetEntry = () => {
    setEntryOrigin("");
    setStationPartnerId("");
    setEntryAmount("");
    setEntryNotes("");
  };

  const saveExpense = async () => {
    const parsedAmount = parseMoney(amount);
    if (!description.trim() || !parsedAmount || parsedAmount <= 0) {
      toast.error("Informe descricao e valor da despesa");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        category,
        description: description.trim(),
        amount: parsedAmount,
        notes: notes.trim() || undefined,
        paymentSource: financeScope === "trip" ? paymentSource : "company_payable",
      });
      toast.success("Despesa registrada");
      resetExpense();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar");
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async () => {
    const parsedAmount = parseMoney(entryAmount);
    const hasOrigin =
      financeScope === "trip" ? Boolean(stationPartnerId) : Boolean(entryOrigin.trim());
    if (!hasOrigin || !parsedAmount || parsedAmount <= 0) {
      toast.error(
        financeScope === "trip"
          ? "Selecione o posto e informe o valor"
          : "Informe origem e valor da entrada",
      );
      return;
    }

    setSaving(true);
    try {
      await onSaveEntry({
        origin: financeScope === "trip" ? undefined : entryOrigin.trim(),
        stationPartnerId: financeScope === "trip" ? stationPartnerId : undefined,
        amount: parsedAmount,
        notes: entryNotes.trim() || undefined,
      });
      toast.success("Entrada registrada");
      resetEntry();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar");
    } finally {
      setSaving(false);
    }
  };

  const saveDailyAllowance = async () => {
    const quantity = Number.parseInt(allowanceQuantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 120) {
      toast.error("Informe uma quantidade de 1 a 120 diarias");
      return;
    }

    setSaving(true);
    try {
      await onSaveDailyAllowance({ quantity, notes: allowanceNotes.trim() || undefined });
      toast.success("Diarias enviadas para aprovacao");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar as diarias");
    } finally {
      setSaving(false);
    }
  };

  const save = mode === "entry" ? saveEntry : mode === "expense" ? saveExpense : saveDailyAllowance;
  const showAllowance = longTripMode;
  const allowanceStatus = dailyAllowance?.allowance?.status;
  const allowanceLocked = allowanceStatus === "approved";
  const allowanceReady = Boolean(dailyAllowance?.enabled && dailyAllowance?.configured);
  const allowanceQuantityValue = Number.parseInt(allowanceQuantity, 10) || 0;
  const allowanceTotal = allowanceQuantityValue * Number(dailyAllowance?.dailyAmount ?? 0);

  return (
    <Sheet open={open} onClose={onClose} title="Entradas e despesas">
      <div
        className={cn(
          "grid gap-2 rounded-2xl bg-surface-2/60 p-1",
          showAllowance ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        <ModeButton
          active={mode === "entry"}
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Entrada"
          onClick={() => setMode("entry")}
        />
        <ModeButton
          active={mode === "expense"}
          icon={<ArrowDownRight className="h-4 w-4" />}
          label="Despesa"
          onClick={() => setMode("expense")}
        />
        {showAllowance && (
          <ModeButton
            active={mode === "allowance"}
            icon={<CalendarDays className="h-4 w-4" />}
            label="Diarias"
            onClick={() => setMode("allowance")}
          />
        )}
      </div>

      <div className="mt-5 space-y-3">
        {mode === "entry" ? (
          <>
            {financeScope === "trip" ? (
              <StationSelect
                stations={stations}
                loading={stationsLoading}
                value={stationPartnerId}
                onChange={setStationPartnerId}
              />
            ) : (
              <Field
                label="Origem do dinheiro"
                placeholder="Ex: adiantamento da central"
                value={entryOrigin}
                onChange={setEntryOrigin}
              />
            )}
            <Field
              label="Valor da entrada"
              placeholder="R$ 0,00"
              value={entryAmount}
              onChange={setEntryAmount}
              numeric
            />
            <Field
              label="Observacoes"
              placeholder="Opcional"
              value={entryNotes}
              onChange={setEntryNotes}
            />
          </>
        ) : mode === "expense" ? (
          <>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onFuel}
              className="flex w-full items-center gap-3 rounded-3xl bg-gradient-primary px-5 py-4 text-left text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <Fuel className="h-6 w-6 shrink-0" />
              <span>
                <span className="block text-[15px] font-bold">Abastecimento</span>
                <span className="block text-[12px] opacity-80">
                  Diesel ou Arla entram {scopeLabel}
                </span>
              </span>
            </motion.button>

            <Segmented
              label="Tipo de despesa"
              value={category}
              onChange={(value) => setCategory(value)}
            />
            {financeScope === "trip" && (
              <PaymentSourceControl value={paymentSource} onChange={setPaymentSource} />
            )}
            <Field
              label="Descricao"
              placeholder={category === "outros" ? "Ex: despesa diversa" : "Ex: pedagio BR-101"}
              value={description}
              onChange={setDescription}
            />
            <Field
              label="Valor"
              placeholder="R$ 0,00"
              value={amount}
              onChange={setAmount}
              numeric
            />
            <Field label="Observacoes" placeholder="Opcional" value={notes} onChange={setNotes} />
          </>
        ) : (
          <DailyAllowanceForm
            context={dailyAllowance}
            quantity={allowanceQuantity}
            notes={allowanceNotes}
            total={allowanceTotal}
            locked={allowanceLocked}
            onQuantityChange={setAllowanceQuantity}
            onNotesChange={setAllowanceNotes}
          />
        )}

        {!(mode === "allowance" && allowanceLocked) && (
          <ActionButton
            className="mt-1 py-5 text-[16px]"
            icon={
              saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "allowance" ? (
                <CalendarDays className="h-5 w-5" />
              ) : (
                <ReceiptText className="h-5 w-5" />
              )
            }
            onClick={save}
            disabled={
              saving ||
              (mode === "entry" && financeScope === "trip" && stations.length === 0) ||
              (mode === "allowance" && !allowanceReady)
            }
          >
            {saving
              ? "Salvando..."
              : mode === "entry"
                ? "Salvar entrada"
                : mode === "expense"
                  ? "Salvar despesa"
                  : allowanceStatus === "rejected"
                    ? "Reenviar diarias"
                    : allowanceStatus === "submitted"
                      ? "Atualizar diarias"
                      : "Enviar diarias"}
          </ActionButton>
        )}
      </div>
    </Sheet>
  );
}

function DailyAllowanceForm({
  context,
  quantity,
  notes,
  total,
  locked,
  onQuantityChange,
  onNotesChange,
}: {
  context?: DriverDailyAllowanceContext | null;
  quantity: string;
  notes: string;
  total: number;
  locked: boolean;
  onQuantityChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  const allowance = context?.allowance;
  const ready = Boolean(context?.enabled && context?.configured);
  const status = allowance?.status;

  return (
    <>
      {!context?.tripCycleId ? (
        <AllowanceNotice title="Nenhuma viagem longa aberta">
          As diarias podem ser informadas durante um tiro longo ativo.
        </AllowanceNotice>
      ) : !ready ? (
        <AllowanceNotice title="Diarias aguardando configuracao">
          A central precisa definir e ativar o valor da diaria antes do envio.
        </AllowanceNotice>
      ) : (
        <>
          {status && (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3",
                status === "approved"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : status === "rejected"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-600",
              )}
            >
              <div className="flex items-center gap-2 text-[14px] font-extrabold">
                {status === "approved" && <CheckCircle2 className="h-4 w-4" />}
                {status === "approved"
                  ? "Diarias aprovadas"
                  : status === "rejected"
                    ? "Diarias reprovadas"
                    : "Aguardando aprovacao"}
              </div>
              {allowance?.reviewNotes && (
                <p className="mt-1 text-[12px] font-medium">{allowance.reviewNotes}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
              <span className="label-xs">Valor por diaria</span>
              <strong className="mt-1 block text-[16px]">
                {formatCurrency(context?.dailyAmount)}
              </strong>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3">
              <span className="label-xs">Total calculado</span>
              <strong className="mt-1 block text-[16px] text-primary">
                {formatCurrency(total)}
              </strong>
            </div>
          </div>

          <label className="block rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
            <span className="label-xs">Quantidade de diarias</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              step={1}
              placeholder="Ex: 8"
              value={quantity}
              disabled={locked}
              onChange={(event) => onQuantityChange(event.target.value)}
              className="mt-1 w-full bg-transparent text-[18px] font-bold outline-none placeholder:text-muted-foreground/60 disabled:opacity-70"
            />
          </label>
          <Field
            label="Observacoes"
            placeholder="Opcional"
            value={notes}
            onChange={onNotesChange}
            disabled={locked}
          />
        </>
      )}
    </>
  );
}

function AllowanceNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-4">
      <p className="text-[14px] font-extrabold">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{children}</p>
    </div>
  );
}

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function StationSelect({
  stations,
  loading,
  value,
  onChange,
}: {
  stations: DriverCashEntryStation[];
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
      <span className="label-xs">Posto onde retirou o dinheiro</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || stations.length === 0}
        className="mt-1 w-full bg-transparent text-[15px] font-semibold outline-none disabled:text-muted-foreground"
      >
        <option value="">
          {loading
            ? "Carregando postos..."
            : stations.length === 0
              ? "Nenhum posto/fornecedor cadastrado"
              : "Selecione o posto"}
        </option>
        {stations.map((station) => (
          <option key={station.id} value={station.id} className="bg-background text-foreground">
            {station.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PaymentSourceControl({
  value,
  onChange,
}: {
  value: DriverExpensePaymentSource;
  onChange: (value: DriverExpensePaymentSource) => void;
}) {
  const options: { value: DriverExpensePaymentSource; label: string }[] = [
    { value: "trip_cash", label: "Saldo da viagem" },
    { value: "company_payable", label: "A pagar pela JO" },
  ];

  return (
    <div>
      <p className="label-xs mb-2">Forma de pagamento</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left text-[13px] font-bold transition-colors",
              option.value === value
                ? "border-primary bg-primary/12 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-extrabold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  numeric,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
      <span className="label-xs">{label}</span>
      <input
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-muted-foreground/60 disabled:opacity-70"
      />
    </label>
  );
}

function Segmented({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ExpenseCategory;
  onChange: (value: ExpenseCategory) => void;
}) {
  return (
    <div>
      <p className="label-xs mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left text-[13px] font-bold transition-colors",
              option.value === value
                ? "border-primary bg-primary/12 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
