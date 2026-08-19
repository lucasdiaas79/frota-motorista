import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Camera, CheckCircle2, Clock, Fuel, MapPin, Receipt, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { ActionButton, SectionTitle } from "./primitives";
import { cn } from "@/lib/utils";

const FUELS = ["Diesel S10", "Arla 32"];
const PAYMENTS = ["Cartao frota", "Pix", "Dinheiro", "Faturado"];

const HISTORY = [
  { post: "Posto Petrobras BR-101", date: "02/08 - 14:20", liters: 320, value: "R$ 1.984,00" },
  { post: "Posto Ipiranga Estancia", date: "28/07 - 08:05", liters: 285, value: "R$ 1.767,00" },
  { post: "Posto Shell Aracaju", date: "21/07 - 19:40", liters: 340, value: "R$ 2.108,00" },
];

export function FuelSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: {
    station: string;
    fuelType: "diesel_s10" | "arla";
    liters: number;
    amount: number;
    odometer: number;
    notes?: string;
  }) => Promise<void>;
}) {
  const [station, setStation] = useState("");
  const [liters, setLiters] = useState("");
  const [value, setValue] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [fuel, setFuel] = useState(FUELS[0]!);
  const [payment, setPayment] = useState(PAYMENTS[0]!);
  const [pumpPhoto, setPumpPhoto] = useState(false);
  const [receiptPhoto, setReceiptPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const perLiter = useMemo(() => {
    const l = parseFloat(liters.replace(",", "."));
    const v = parseFloat(value.replace(",", "."));
    if (!l || !v) return "-";
    return `R$ ${(v / l).toFixed(2).replace(".", ",")}`;
  }, [liters, value]);

  const now = new Date();
  const stamp = now.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const save = async () => {
    const parsedLiters = parseFloat(liters.replace(",", "."));
    const parsedValue = parseFloat(value.replace(",", "."));
    const parsedOdometer = parseFloat(odometer.replace(",", "."));

    if (!station.trim() || !parsedLiters || !parsedValue || !parsedOdometer) {
      toast.error("Preencha posto, litros, valor e odometro");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        station: station.trim(),
        fuelType: fuel === "Arla 32" ? "arla" : "diesel_s10",
        liters: parsedLiters,
        amount: parsedValue,
        odometer: parsedOdometer,
        notes: notes.trim() || undefined,
      });

      onClose();
      toast.success("Abastecimento registrado");
      setStation("");
      setLiters("");
      setValue("");
      setOdometer("");
      setNotes("");
      setPumpPhoto(false);
      setReceiptPhoto(false);
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
        <Metric label="Valor total" value="R$ 5.859" />
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Litros" placeholder="0" value={liters} onChange={setLiters} numeric />
          <Field
            label="Valor total"
            placeholder="R$ 0,00"
            value={value}
            onChange={setValue}
            numeric
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-surface-2/40 px-4 py-3.5">
          <span className="label-xs">Preco por litro</span>
          <span className="text-[15px] font-bold text-primary">{perLiter}</span>
        </div>

        <Field
          label="Odometro"
          placeholder="Km atual"
          value={odometer}
          onChange={setOdometer}
          numeric
        />

        <Segmented label="Combustivel" options={FUELS} value={fuel} onChange={setFuel} />
        <Segmented label="Pagamento" options={PAYMENTS} value={payment} onChange={setPayment} />

        <div className="grid grid-cols-2 gap-3">
          <PhotoTile
            label="Foto da bomba"
            icon={<Camera className="h-6 w-6" />}
            done={pumpPhoto}
            onClick={() => setPumpPhoto(true)}
          />
          <PhotoTile
            label="Foto do cupom"
            icon={<Receipt className="h-6 w-6" />}
            done={receiptPhoto}
            onClick={() => setReceiptPhoto(true)}
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

function Field({
  label,
  placeholder,
  value,
  onChange,
  numeric,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <label className="block rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
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
  done,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-6",
        done
          ? "border-primary/40 bg-primary/8 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      {done ? <CheckCircle2 className="h-6 w-6" /> : icon}
      <span className="text-[12px] font-bold">{done ? "Anexada" : label}</span>
    </motion.button>
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
