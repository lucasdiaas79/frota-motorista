import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Camera, Check, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      {...(onClick ? { onClick, whileTap: { scale: 0.985 } } : {})}
      className={cn("surface-card block w-full rounded-[22px] p-4 text-left", className)}
    >
      {children}
    </Comp>
  );
}

export function IconChip({ children, tone = "primary", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", TONE_SOFT[tone], className)}>{children}</span>
  );
}

export type Tone = "primary" | "warning" | "danger" | "muted" | "info";

export const TONE_SOFT: Record<Tone, string> = {
  primary: "bg-primary/12 text-primary",
  warning: "bg-warning/14 text-warning",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-surface-2 text-muted-foreground",
  info: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
};

export function Pill({ children, tone = "muted", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide uppercase",
        TONE_SOFT[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BigButton({
  children,
  onClick,
  tone = "primary",
  icon,
  hint,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "warning" | "danger" | "ghost" | "outline";
  icon?: ReactNode;
  hint?: string | undefined;
  disabled?: boolean;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-destructive text-destructive-foreground",
    ghost: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-transparent text-foreground",
  };
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-extrabold disabled:opacity-40",
        tones[tone],
        className,
      )}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{children}</span>
        {hint ? <span className="text-[11px] font-semibold opacity-75">{hint}</span> : null}
      </span>
    </motion.button>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/45 p-3">
      <p className="label-xs">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-[20px] leading-none font-extrabold",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-warning",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-xs">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  inputMode,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "text";
  suffix?: string;
}) {
  return (
    <div className="flex items-center rounded-2xl border border-border bg-background px-3.5 focus-within:border-primary">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode ?? "text"}
        className="h-12 min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
      />
      {suffix ? <span className="text-[13px] font-bold text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}

export function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-[15px] font-semibold outline-none focus:border-primary"
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl px-2 py-2.5 text-[12.5px] font-extrabold transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/40 p-3.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-bold">{label}</span>
        {hint ? <span className="block text-[12px] text-muted-foreground">{hint}</span> : null}
      </span>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-border")}>
        <motion.span
          layout
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: checked ? 24 : 4 }}
        />
      </span>
    </button>
  );
}

/** Foto: abre a camera do celular de verdade; na demonstracao basta tocar para marcar. */
export function PhotoSlot({
  label,
  taken,
  onTaken,
  compact,
}: {
  label: string;
  taken: boolean;
  onTaken: (preview?: string) => void;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          setPreview(url);
          onTaken(url);
        }}
      />
      <button
        onClick={() => {
          if (taken) {
            ref.current?.click();
            return;
          }
          // Toque curto marca como foto tirada (demonstracao); segurar abre a camera real.
          onTaken();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          ref.current?.click();
        }}
        className={cn(
          "relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl border border-dashed p-3 text-left",
          taken ? "border-primary/50 bg-primary/8" : "border-border bg-surface-2/40",
          compact ? "min-h-[56px]" : "min-h-[72px]",
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl", taken ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
            {taken ? <Check className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-extrabold">{label}</span>
          <span className="block text-[11px] text-muted-foreground">
            {taken ? "Foto anexada" : "Toque para fotografar"}
          </span>
        </span>
        {taken && !preview ? <ImageIcon className="ml-auto h-4 w-4 text-primary" /> : null}
      </button>
    </>
  );
}

export function ProgressRing({ value, size = 64, stroke = 7, tone = "primary", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const color = tone === "danger" ? "var(--destructive)" : tone === "warning" ? "var(--warning)" : "var(--primary)";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted-foreground">{icon}</div>
      <p className="mt-3 text-[15px] font-extrabold">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

export function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v: number, digits = 0) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function parseNum(value: string) {
  const normalized = value.trim().replace(/\.(?=\d{3}(,|$))/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
