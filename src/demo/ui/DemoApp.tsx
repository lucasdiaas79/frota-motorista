import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock3, Home, LayoutGrid, Route as RouteIcon, WifiOff } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useDemo } from "../store";
import { DayScreen } from "./DayScreen";
import { RouteScreen } from "./RouteScreen";
import { PontoScreen } from "./PontoScreen";
import { MoreScreen, type MorePage } from "./MoreScreen";
import { DrivingLock } from "./DrivingLock";
import { VoiceButton } from "./VoiceButton";

export type DemoTab = "day" | "route" | "ponto" | "more";

const TABS: { id: DemoTab; label: string; icon: typeof Home }[] = [
  { id: "day", label: "Hoje", icon: Home },
  { id: "route", label: "Rota", icon: RouteIcon },
  { id: "ponto", label: "Ponto", icon: Clock3 },
  { id: "more", label: "Mais", icon: LayoutGrid },
];

export type Navigate = (tab: DemoTab, page?: MorePage) => void;

export function DemoApp() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<DemoTab>("day");
  const [morePage, setMorePage] = useState<MorePage | null>(null);
  const offline = useDemo((s) => s.sim.offline);
  const queue = useDemo((s) => s.queue.length);
  const moving = useDemo((s) => s.sim.moving);
  const unackedNotices = useDemo((s) => s.notices.filter((n) => n.requiresAck && !n.ackAt).length);

  const navigate: Navigate = (next, page) => {
    setTab(next);
    setMorePage(next === "more" ? (page ?? null) : null);
  };

  useEffect(() => {
    if (tab !== "more") setMorePage(null);
  }, [tab]);

  return (
    <main className="relative mx-auto flex h-dvh max-w-[520px] flex-col overflow-hidden bg-background">
      <AnimatePresence>
        {offline ? (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="shrink-0 overflow-hidden bg-warning text-warning-foreground"
          >
            <div className="flex items-center gap-2 px-4 py-2 text-[12.5px] font-extrabold">
              <WifiOff className="h-4 w-4" />
              Sem internet. {queue} registro{queue === 1 ? "" : "s"} guardado{queue === 1 ? "" : "s"} no celular, com a hora certa.
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + (morePage ?? "")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="no-scrollbar absolute inset-0 overflow-y-auto"
          >
            {tab === "day" && <DayScreen navigate={navigate} />}
            {tab === "route" && <RouteScreen navigate={navigate} />}
            {tab === "ponto" && <PontoScreen />}
            {tab === "more" && <MoreScreen page={morePage} onPage={setMorePage} navigate={navigate} />}
          </motion.div>
        </AnimatePresence>
        <VoiceButton navigate={navigate} />
        {moving ? <DrivingLock navigate={navigate} /> : null}
      </div>

      <nav className="relative z-30 grid shrink-0 grid-cols-4 border-t border-border bg-background/90 px-2 pt-1.5 pb-3 backdrop-blur-xl">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => navigate(id)} className="relative flex flex-col items-center gap-1 py-1.5">
              {active ? (
                <motion.span
                  layoutId="demo-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-x-4 inset-y-0 rounded-2xl bg-primary/10"
                />
              ) : null}
              <span className="relative">
                <Icon className={cn("h-5.5 w-5.5", active ? "text-primary" : "text-muted-foreground")} />
                {id === "more" && unackedNotices > 0 ? (
                  <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-black text-white">
                    {unackedNotices}
                  </span>
                ) : null}
              </span>
              <span className={cn("relative text-[10px] font-bold tracking-wide", active ? "text-primary" : "text-muted-foreground")}>
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
