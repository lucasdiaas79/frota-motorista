import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Home, Route as RouteIcon, FileText, User, Sparkles } from "lucide-react";
import { Toaster, toast } from "sonner";
import { HomeScreen } from "@/components/app/HomeScreen";
import { TripScreen } from "@/components/app/TripScreen";
import { DocsScreen } from "@/components/app/DocsScreen";
import { ProfileScreen } from "@/components/app/ProfileScreen";
import { LoginScreen } from "@/components/app/LoginScreen";
import { PasswordSetupScreen } from "@/components/app/PasswordSetupScreen";
import { Sheet } from "@/components/app/Sheet";
import { FuelSheet } from "@/components/app/FuelSheet";
import { ExpenseSheet } from "@/components/app/ExpenseSheet";

import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import {
  advanceDriverStage,
  completeDriverPasswordSetup,
  FALLBACK_STAGE,
  FALLBACK_TRIP,
  getInitialSession,
  loadDriverContext,
  registerDriverDocument,
  registerDriverExpense,
  registerDriverFuel,
  signInDriver,
  signOutDriver,
  stageFromContext,
  subscribeDriverOperationalChanges,
  tripFromContext,
  type DriverAppContext,
} from "@/lib/driverApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FrotaK Motorista - Sua viagem, do jeito simples" },
      {
        name: "description",
        content:
          "Aplicativo oficial do motorista FrotaK: acompanhe a viagem, confirme etapas, envie documentos e fale com a central em poucos toques.",
      },
      { property: "og:title", content: "FrotaK Motorista" },
      {
        property: "og:description",
        content:
          "Operacao em campo em uma experiencia continua: mapa ao vivo, etapas guiadas e documentos na palma da mao.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "home" | "trip" | "docs" | "profile";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "trip", label: "Viagem", icon: RouteIcon },
  { id: "docs", label: "Docs", icon: FileText },
  { id: "profile", label: "Perfil", icon: User },
];

const SUGGESTIONS = [
  "Qual a proxima etapa da minha viagem?",
  "Onde abastecer mais barato na BR-101?",
  "Avisar a central sobre atraso",
  "Como anexar a nota fiscal?",
];

function App() {
  const { theme } = useTheme();
  const [authenticated, setAuthenticated] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [context, setContext] = useState<DriverAppContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stage = useMemo(() => stageFromContext(context), [context]);
  const trip = useMemo(() => tripFromContext(context), [context]);

  const refreshContext = useCallback(async () => {
    const next = await loadDriverContext();
    setContext(next);
    setLoadError(null);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void getInitialSession()
      .then(async (session) => {
        if (!active) return;
        if (!session) {
          setAuthenticated(false);
          setBooting(false);
          return;
        }
        setAuthenticated(true);
        await refreshContext();
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Nao foi possivel carregar dados");
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    return () => {
      active = false;
    };
  }, [refreshContext]);

  useEffect(() => {
    if (!authenticated) return;

    let refreshing = false;
    const refreshSafely = () => {
      if (refreshing) return;
      refreshing = true;
      void refreshContext()
        .catch((error) => {
          setLoadError(error instanceof Error ? error.message : "Nao foi possivel atualizar dados");
        })
        .finally(() => {
          refreshing = false;
        });
    };

    const unsubscribe = subscribeDriverOperationalChanges(() => {
      refreshSafely();
    });

    const interval = window.setInterval(refreshSafely, 10000);
    window.addEventListener("focus", refreshSafely);
    document.addEventListener("visibilitychange", refreshSafely);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSafely);
      document.removeEventListener("visibilitychange", refreshSafely);
    };
  }, [authenticated, refreshContext]);

  const advance = async () => {
    if (!trip.vehicleId || !stage.canDriverAdvance) {
      toast.error("Esta etapa depende da central");
      return;
    }
    try {
      const next = await advanceDriverStage(trip.vehicleId);
      setContext(next);
      toast.success(`${stage.title} confirmado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel avancar");
    }
  };

  if (booting) {
    return (
      <main className="mx-auto grid h-dvh max-w-[520px] place-items-center overflow-hidden bg-background px-6 text-center">
        <div>
          <div className="font-display text-[34px] leading-none font-extrabold tracking-tight">
            frota<span className="text-primary">k</span>
          </div>
          <p className="mt-4 text-[14px] font-semibold text-muted-foreground">Carregando app...</p>
        </div>
        <Toaster position="top-center" theme={theme} richColors />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="mx-auto flex h-dvh max-w-[520px] flex-col overflow-hidden bg-background">
        <LoginScreen
          onLogin={async (phone, password) => {
            await signInDriver(phone, password);
            await refreshContext();
            setAuthenticated(true);
            setTab("home");
          }}
        />
        <Toaster position="top-center" theme={theme} richColors />
      </main>
    );
  }

  if (context?.profile?.must_change_password) {
    return (
      <main className="mx-auto flex h-dvh max-w-[520px] flex-col overflow-hidden bg-background">
        <PasswordSetupScreen
          driverName={context.driver.name}
          onComplete={async (password) => {
            const next = await completeDriverPasswordSetup(password);
            setContext(next);
            setTab("home");
          }}
        />
        <Toaster position="top-center" theme={theme} richColors />
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-dvh max-w-[520px] flex-col overflow-hidden bg-background">
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {tab === "home" && (
              <HomeScreen
                driverName={context?.driver.name ?? "-"}
                stage={stage}
                trip={trip}
                onOpenTrip={() => setTab("trip")}
                onAssistant={() => setAiOpen(true)}
                onFuel={() => setExpenseOpen(true)}
              />
            )}
            {tab === "trip" && (
              <TripScreen
                stage={stage}
                trip={trip}
                onAdvance={() => void advance()}
                onDocument={async (kind, fileName) => {
                  const next = await registerDriverDocument({ kind, fileName });
                  setContext(next);
                }}
                onFuel={() => setExpenseOpen(true)}
                onAssistant={() => setAiOpen(true)}
              />
            )}
            {tab === "docs" && (
              <DocsScreen
                documents={context?.documents ?? []}
                onDocument={async (kind, fileName) => {
                  const next = await registerDriverDocument({ kind, fileName });
                  setContext(next);
                }}
              />
            )}
            {tab === "profile" && (
              <ProfileScreen
                trip={trip}
                onLogout={async () => {
                  await signOutDriver();
                  setAuthenticated(false);
                  setContext(null);
                  setTab("home");
                  toast("Voce saiu do aplicativo");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <FuelSheet
          open={fuelOpen}
          onClose={() => setFuelOpen(false)}
          onSave={async (input) => {
            const next = await registerDriverFuel(input);
            setContext(next);
          }}
        />

        <ExpenseSheet
          open={expenseOpen}
          onClose={() => setExpenseOpen(false)}
          onFuel={() => {
            setExpenseOpen(false);
            setFuelOpen(true);
          }}
          onSave={async (input) => {
            const next = await registerDriverExpense(input);
            setContext(next);
          }}
        />

        <Sheet open={aiOpen} onClose={() => setAiOpen(false)} title="Assistente FrotaK">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-[14px] leading-relaxed">
              Voce esta na etapa <strong>{stage.title}</strong>. {stage.subtitle} Proximo passo:{" "}
              <strong>{stage.action.toLowerCase()}</strong>.
            </p>
          </div>
          {loadError && (
            <button
              onClick={() => void refreshContext()}
              className="mt-3 w-full rounded-2xl border border-border bg-surface-2/40 p-4 text-left text-[13px] font-semibold text-muted-foreground"
            >
              Nao foi possivel atualizar os dados. Toque para tentar novamente.
            </button>
          )}
          <div className="mt-4 space-y-2">
            {SUGGESTIONS.map((s) => (
              <motion.button
                key={s}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast("Assistente respondendo...")}
                className="w-full rounded-2xl border border-border bg-surface-2/40 p-4 text-left text-[14px] font-semibold"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </Sheet>
      </div>

      <nav className="relative z-30 grid shrink-0 grid-cols-4 border-t border-border bg-background/85 px-2 pt-1.5 pb-3 backdrop-blur-xl">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative flex flex-col items-center gap-1 py-1.5"
            >
              {active && (
                <motion.span
                  layoutId="tabpill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-x-4 inset-y-0 rounded-2xl bg-primary/10"
                />
              )}
              <Icon
                className={cn(
                  "relative h-5.5 w-5.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "relative text-[10px] font-bold tracking-wide",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <Toaster position="top-center" theme={theme} richColors />
    </main>
  );
}
