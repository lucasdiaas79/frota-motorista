import { useState } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Fuel, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { ActionButton } from "./primitives";
import { cn } from "@/lib/utils";

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
}: {
  open: boolean;
  onClose: () => void;
  onFuel: () => void;
  onSave: (input: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
  onSaveEntry: (input: {
    origin: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
}) {
  const [mode, setMode] = useState<SheetMode>("entry");
  const [category, setCategory] = useState<ExpenseCategory>("pedagio");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryOrigin, setEntryOrigin] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetExpense = () => {
    setDescription("");
    setAmount("");
    setNotes("");
    setCategory("pedagio");
  };

  const resetEntry = () => {
    setEntryOrigin("");
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
    if (!entryOrigin.trim() || !parsedAmount || parsedAmount <= 0) {
      toast.error("Informe origem e valor da entrada");
      return;
    }

    setSaving(true);
    try {
      await onSaveEntry({
        origin: entryOrigin.trim(),
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
            <Field
              label="Origem do dinheiro"
              placeholder="Ex: adiantamento da central"
              value={entryOrigin}
              onChange={setEntryOrigin}
            />
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
                  Diesel ou Arla entram no frete atual
                </span>
              </span>
            </motion.button>

            <Segmented
              label="Tipo de despesa"
              value={category}
              onChange={(value) => setCategory(value)}
            />
            <Field
              label="Descricao"
              placeholder={category === "outros" ? "Ex: despesa diversa" : "Ex: pedagio BR-101"}
              value={description}
              onChange={setDescription}
            />
            <Field label="Valor" placeholder="R$ 0,00" value={amount} onChange={setAmount} numeric />
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
          disabled={saving}
        >
          {saving ? "Salvando..." : mode === "entry" ? "Salvar entrada" : "Salvar despesa"}
        </ActionButton>
      </div>
    </Sheet>
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
