import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export function Chip({
  children,
  tone = "primary",
  pulse = false,
  className,
}: {
  children: ReactNode;
  tone?: "primary" | "warning" | "muted" | "danger";
  pulse?: boolean;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary/12 text-primary border-primary/25",
    warning: "bg-warning/12 text-warning border-warning/25",
    muted: "bg-muted text-muted-foreground border-border",
    danger: "bg-destructive/12 text-destructive border-destructive/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current [animation:pulse-ring_1.8s_ease-out_infinite]" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ActionButton({
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
  tone?: "primary" | "ghost" | "outline" | "warning";
  icon?: ReactNode;
  hint?: string | undefined;
  disabled?: boolean;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
    warning: "bg-warning text-warning-foreground",
    ghost: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-transparent text-foreground",
  };
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-[14px] font-bold disabled:opacity-40",
        tones[tone],
        className,
      )}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{children}</span>
        {hint && <span className="text-[11px] font-medium opacity-70">{hint}</span>}
      </span>
    </motion.button>
  );
}

export function Row({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <span className="label-xs truncate">{label}</span>
      </div>
      <span className="truncate text-right text-[13px] font-semibold">{value}</span>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-4">
      <h3 className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">
        {children}
      </h3>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/8 to-transparent [animation:shimmer_1.6s_infinite]" />
    </div>
  );
}
