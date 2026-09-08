import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Camera, CheckCircle2, Clock, Fuel, MapPin, Receipt, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { ActionButton, SectionTitle } from "./primitives";
import { cn } from "@/lib/utils";

const PAYMENTS = ["Cartao frota", "Pix", "Dinheiro", "Faturado"];

const HISTORY = [
  { post: "Posto Petrobras BR-101", date: "02/08 - 14:20", liters: 320, value: "R$ 1.984,00" },
  { post: "Posto Ipiranga Estancia", date: "28/07 - 08:05", liters: 285, value: "R$ 1.767,00" },
  { post: "Posto Shell Aracaju", date: "21/07 - 19:40", liters: 340, value: "R$ 2.108,00" },
];

type FuelDraft = {
  liters: string;
  amount: string;
};

type FuelItem = {
  liters: number;
  amount: number;
};

export function FuelSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: {
    station: string;
    diesel?: FuelItem;
    arla?: FuelItem;
    odometer: number;
    notes?: string;
    paymentMethod?: string;
    pumpPhoto?: File;
    receiptPhoto?: File;
  }) => Promise<void>;
}) {
  const [station, setStation] = useState("");
  const [diesel, setDiesel] = useState<FuelDraft>({ liters: "", amount: "" });
  const [arla, setArla] = useState<FuelDraft>({ liters: "", amount: "" });
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState(PAYMENTS[0]!);
  const [pumpPhoto, setPumpPhoto] = useState<File>();
  const [receiptPhoto, setReceiptPhoto] = useState<File>();
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => {
    const dieselAmount = parseDecimal(diesel.amount) ?? 0;
    const arlaAmount = parseDecimal(arla.amount) ?? 0;
    const amount = dieselAmount + arlaAmount;
    return amount > 0 ? money(amount) : "-";
  }, [arla.amount, diesel.amount]);

  const now = new Date();
  const stamp = now.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reset = () => {
    setStation("");
    setDiesel({ liters: "", amount: "" });
    setArla({ liters: "", amount: "" });
    setOdometer("");
    setNotes("");
    setPayment(PAYMENTS[0]!);
    setPumpPhoto(undefined);
    setReceiptPhoto(undefined);
  };

  const save = async () => {
    const parsedOdometer = parseDecimal(odometer);
    const dieselItem = parseFuelItem("Diesel S10", diesel);
    const arlaItem = parseFuelItem("Arla 32", arla);

    if (!station.trim() || !parsedOdometer) {
      toast.error("Preencha posto e odometro.");
      return;
    }

    if (dieselItem.error || arlaItem.error) {
      toast.error(dieselItem.error ?? arlaItem.error);
      return;
    }

    if (!dieselItem.value && !arlaItem.value) {
      toast.error("Informe Diesel, Arla ou os dois.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        station: station.trim(),
        diesel: dieselItem.value,
        arla: arlaItem.value,
        odometer: parsedOdometer,
        notes: notes.trim() || undefined,
        paymentMethod: payment,
        pumpPhoto,
        receiptPhoto,
      });

      onClose();
      toast.success("Abastecimento registrado");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Abastecimento">
      <div className="grid grid-cols-3 gap-2.5">
        <Metric label="Litros no mes" value="945" />
        <Metric label="Valor total" value={total} />
        <Metric label="Ultimo" value="02/08" />
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.success("Cupom lido - campos preenchidos")}
        className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-gradient-primary px-5 py-4.5 text-left text-primary-foreground shadow-[var(--shadow-glow)]"
      >
        <ScanLine className="h-6 w-6 shrink-0" />
        <span>
          <span className="block text-[15px] font-bold">Escanear cupom fiscal</span>
          <span className="block text-[12px] opacity-80">Preenchimento automatico em segundos</span>
        </span>
      </motion.button>

      <div className="mt-5 space-y-3">
        <Field label="Posto" placeholder="Nome do posto" value={station} onChange={setStation} />

        <FuelProduct title="Diesel S10" accent="diesel" value={diesel} onChange={setDiesel} />
        <FuelProduct title="Arla 32" accent="arla" value={arla} onChange={setArla} />

        <Field
          label="Odometro"
          placeholder="Km atual"
          value={odometer}
          onChange={setOdometer}
          numeric
        />

        <Segmented label="Pagamento" options={PAYMENTS} value={payment} onChange={setPayment} />

        <div className="grid grid-cols-2 gap-3">
          <PhotoTile
            label="Foto da bomba"
            icon={<Camera className="h-6 w-6" />}
            file={pumpPhoto}
            onFile={setPumpPhoto}
          />
          <PhotoTile
            label="Foto do cupom"
            icon={<Receipt className="h-6 w-6" />}
            file={receiptPhoto}
            onFile={setReceiptPhoto}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Info icon={<MapPin className="h-4 w-4" />} label="Local" value="Local atual" />
          <Info icon={<Clock className="h-4 w-4" />} label="Data e hora" value={stamp} />
        </div>

        <Field label="Observacoes" placeholder="Opcional" value={notes} onChange={setNotes} />

        <ActionButton
          className="mt-1 py-5 text-[16px]"
          icon={<Fuel className="h-5 w-5" />}
          onClick={save}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar abastecimento"}
        </ActionButton>
      </div>

      <div className="mt-8">
        <SectionTitle>Historico de abastecimentos</SectionTitle>
        <div className="divide-y divide-border rounded-3xl bg-surface-2/40 px-4">
          {HISTORY.map((h) => (
            <div key={h.post + h.date} className="flex items-center gap-3 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-primary">
                <Fuel className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{h.post}</p>
                <p className="text-xs text-muted-foreground">
                  {h.date} - {h.liters} L
                </p>
              </div>
              <span className="text-[13px] font-bold">{h.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function parseDecimal(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(,|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFuelItem(label: string, draft: FuelDraft): { value?: FuelItem; error?: string } {
  const hasLiters = draft.liters.trim().length > 0;
  const hasAmount = draft.amount.trim().length > 0;
  if (!hasLiters && !hasAmount) return {};

  const liters = parseDecimal(draft.liters);
  const amount = parseDecimal(draft.amount);
  if (!liters || !amount) {
    return { error: `Preencha litros e valor do ${label}, ou deixe ambos vazios.` };
  }
  if (liters <= 0 || amount <= 0) {
    return { error: `${label} precisa ter litros e valor maiores que zero.` };
  }
  return { value: { liters, amount } };
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function pricePerLiter(draft: FuelDraft) {
  const liters = parseDecimal(draft.liters);
  const amount = parseDecimal(draft.amount);
  if (!liters || !amount) return "-";
  return `R$ ${(amount / liters).toFixed(2).replace(".", ",")}/L`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/50 px-3 py-3.5 text-center">
      <p className="text-[17px] font-extrabold">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold tracking-wide uppercase text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function FuelProduct({
  title,
  accent,
  value,
  onChange,
}: {
  title: string;
  accent: "diesel" | "arla";
  value: FuelDraft;
  onChange: (value: FuelDraft) => void;
}) {
  const filled = Boolean(value.liters.trim() || value.amount.trim());

  return (
    <section
      className={cn(
        "rounded-3xl border p-3.5",
        filled
          ? "border-primary/30 bg-primary/8"
          : accent === "diesel"
            ? "border-border bg-surface-2/40"
            : "border-border bg-background/40",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-2xl",
              accent === "diesel" ? "bg-primary/12 text-primary" : "bg-surface-2 text-muted-foreground",
            )}
          >
            <Fuel className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[15px] font-extrabold">{title}</p>
            <p className="text-[11px] font-bold text-muted-foreground">Litros e valor</p>
          </div>
        </div>
        <span className="rounded-full bg-background/70 px-3 py-1 text-[11px] font-extrabold text-primary">
          {pricePerLiter(value)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          compact
          label="Litros"
          placeholder="0"
          value={value.liters}
          onChange={(liters) => onChange({ ...value, liters })}
          numeric
        />
        <Field
          compact
          label="Valor"
          placeholder="R$ 0,00"
          value={value.amount}
          onChange={(amount) => onChange({ ...value, amount })}
          numeric
        />
      </div>
    </section>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  numeric,
  compact,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  numeric?: boolean;
  compact?: boolean;
}) {
  return (
    <label className={cn("block rounded-2xl border border-border bg-surface-2/40 px-4", compact ? "py-2.5" : "py-3")}>
      <span className="label-xs">{label}</span>
      <input
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-muted-foreground/60"
      />
    </label>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="label-xs mb-2">{label}</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2.5 text-[13px] font-bold transition-colors",
              o === value
                ? "border-primary bg-primary/12 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoTile({
  label,
  icon,
  file,
  onFile,
}: {
  label: string;
  icon: React.ReactNode;
  file?: File;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <motion.label
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-5 text-center",
        file
          ? "border-primary/40 bg-primary/8 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => onFile(event.currentTarget.files?.[0])}
      />
      {file ? <CheckCircle2 className="h-6 w-6" /> : icon}
      <span className="max-w-full truncate text-[12px] font-bold">{file ? file.name : label}</span>
    </motion.label>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/40 px-4 py-3">
      <span className="label-xs flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <p className="mt-1 truncate text-[13px] font-semibold">{value}</p>
    </div>
  );
}
