import { useState } from "react";
import { motion } from "motion/react";
import { Fuel, Loader2, ReceiptText } from "lucide-react";
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

export function ExpenseSheet({
  open,
  onClose,
  onFuel,
  onSave,
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
}) {
  const [category, setCategory] = useState<ExpenseCategory>("pedagio");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsedAmount = parseFloat(amount.replace(",", "."));
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
      setDescription("");
      setAmount("");
      setNotes("");
      setCategory("pedagio");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Registrar despesa">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onFuel}
        className="flex w-full items-center gap-3 rounded-3xl bg-gradient-primary px-5 py-4.5 text-left text-primary-foreground shadow-[var(--shadow-glow)]"
      >
        <Fuel className="h-6 w-6 shrink-0" />
        <span>
          <span className="block text-[15px] font-bold">Abastecimento</span>
          <span className="block text-[12px] opacity-80">Diesel ou Arla entram no frete atual</span>
        </span>
      </motion.button>

      <div className="mt-5 space-y-3">
        <Segmented
          label="Tipo de despesa"
          value={category}
          onChange={(value) => setCategory(value)}
        />
        <Field
          label="Descricao"
          placeholder="Ex: pedagio BR-101"
          value={description}
          onChange={setDescription}
        />
        <Field label="Valor" placeholder="R$ 0,00" value={amount} onChange={setAmount} numeric />
        <Field label="Observacoes" placeholder="Opcional" value={notes} onChange={setNotes} />

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
          {saving ? "Salvando..." : "Salvar despesa"}
        </ActionButton>
      </div>
    </Sheet>
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
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {CATEGORIES.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2.5 text-[13px] font-bold transition-colors",
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
