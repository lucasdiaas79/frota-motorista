import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Fuel, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { ActionButton } from "./primitives";
import { cn } from "@/lib/utils";
import type { DriverCashEntryStation, DriverExpensePaymentSource } from "@/lib/driverApi";

const CATEGORIES = [
  { value: "pedagio", label: "Pedagio" },
  { value: "alimentacao", label: "Alimentacao" },
  { value: "estacionamento", label: "Estacionamento" },
  { value: "manutencao", label: "Manutencao" },
  { value: "outros", label: "Outros" },
] as const;

type ExpenseCategory = (typeof CATEGORIES)[number]["value"];
type SheetMode = "entry" | "expense";

export function ExpenseSheet({
  open,
  onClose,
  onFuel,
  onSave,
  onSaveEntry,
  financeScope,
  stations,
  stationsLoading,
}: {
  open: boolean;
  onClose: () => void;
  onFuel: () => void;
  financeScope: "freight" | "trip";
  stations: DriverCashEntryStation[];
  stationsLoading: boolean;
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
  const scopeLabel = financeScope === "trip" ? "na viagem atual" : "no frete atual";

  useEffect(() => {
    if (open) {
      setPaymentSource(financeScope === "trip" ? "trip_cash" : "company_payable");
    }
  }, [financeScope, open]);

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

  const save = mode === "entry" ? saveEntry : saveExpense;

  return (
    <Sheet open={open} onClose={onClose} title="Entradas e despesas">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2/60 p-1">
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
        ) : (
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
        )}

        <ActionButton
          className="mt-1 py-5 text-[16px]"
          icon={
            saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ReceiptText className="h-5 w-5" />
            )
          }
          onClick={save}
          disabled={
            saving || (mode === "entry" && financeScope === "trip" && stations.length === 0)
          }
        >
          {saving ? "Salvando..." : mode === "entry" ? "Salvar entrada" : "Salvar despesa"}
        </ActionButton>
      </div>
    </Sheet>
  );
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
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
}) {
  return (
    <label className="block rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
      <span className="label-xs">{label}</span>
      <input
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-muted-foreground/60"
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
