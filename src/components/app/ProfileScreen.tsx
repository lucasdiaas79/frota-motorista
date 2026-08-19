import { motion } from "motion/react";
import { Truck, ShieldCheck, Gauge, History, LogOut, ChevronRight, Sun, Moon } from "lucide-react";
import { SectionTitle } from "./primitives";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { DriverTrip } from "@/lib/driverApi";

const THEME_OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
];

export function ProfileScreen({ trip, onLogout }: { trip: DriverTrip; onLogout: () => void }) {
  const { theme, setTheme } = useTheme();
  const initials = trip.driver
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-4 pb-3">
      <div className="flex shrink-0 items-center gap-3">
        <div className="grid h-13 w-13 shrink-0 place-items-center rounded-3xl bg-gradient-primary text-[20px] font-extrabold text-primary-foreground">
          {initials || "FK"}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-extrabold">{trip.driver}</h1>
          <p className="truncate text-xs text-muted-foreground">{trip.plate}</p>
        </div>
      </div>

      <div className="mt-4 grid shrink-0 grid-cols-3 gap-2.5">
        {[
          { k: "Viagens", v: "128" },
          { k: "Km rodados", v: "94k" },
          { k: "Pontualidade", v: "98%" },
        ].map((s) => (
          <div
            key={s.k}
            className="rounded-2xl border border-border bg-surface-2/40 p-3 text-center"
          >
            <p className="text-[18px] font-extrabold">{s.v}</p>
            <p className="label-xs mt-1">{s.k}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 shrink-0">
        <SectionTitle>Meu conjunto</SectionTitle>
        <div className="rounded-2xl border border-border bg-surface-2/40 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <Truck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{trip.plate}</p>
              <p className="truncate text-xs text-muted-foreground">
                {trip.cargo} - {trip.trailer}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <SectionTitle>Aparencia</SectionTitle>
        <div className="rounded-2xl border border-border bg-surface-2/40 p-3">
          <p className="text-[12px] text-muted-foreground">
            Escolha o modo de exibicao do aplicativo.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-background/60 p-1.5">
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
              const active = theme === id;
              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTheme(id)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors",
                    active ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="themepill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-gradient-primary"
                    />
                  )}
                  <Icon className="relative h-4 w-4" />
                  <span className="relative">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        <SectionTitle>Conta</SectionTitle>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2/40">
          {[
            { icon: <History className="h-4.5 w-4.5" />, label: "Historico de viagens" },
            { icon: <Gauge className="h-4.5 w-4.5" />, label: "Abastecimentos" },
            { icon: <ShieldCheck className="h-4.5 w-4.5" />, label: "Documentos pessoais" },
            { icon: <LogOut className="h-4.5 w-4.5" />, label: "Sair da conta", action: onLogout },
          ].map((i) => (
            <motion.button
              key={i.label}
              whileTap={{ scale: 0.99 }}
              onClick={i.action}
              className="flex w-full items-center gap-3 px-3 py-3 text-left"
            >
              <span className="text-primary">{i.icon}</span>
              <span className="flex-1 text-[14px] font-semibold">{i.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
