import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileBadge,
  FlaskConical,
  Fuel,
  Moon,
  RotateCcw,
  ShieldAlert,
  Siren,
  Sun,
  Trophy,
  Truck,
  User,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { resetDemo, setSim, useDemo } from "../store";
import { BigButton, IconChip, Pill, Segmented, Toggle, dayLabel } from "./kit";
import { FuelFormPage, FuelHistoryPage } from "./FuelPages";
import { ChecklistPage, DocsPage, EmergencyPage, NoticesPage, OccurrencePage } from "./SafetyPages";
import { ScorePage } from "./ScorePage";
import type { Navigate } from "./DemoApp";

export type MorePage =
  | "fuel"
  | "fuel-new"
  | "score"
  | "checklist"
  | "checklist-chegada"
  | "occurrence"
  | "emergency"
  | "docs"
  | "notices"
  | "schedule"
  | "profile"
  | "demo";

const TITLES: Record<MorePage, string> = {
  fuel: "Abastecimentos e km/l",
  "fuel-new": "Novo abastecimento",
  score: "Meu desempenho",
  checklist: "Checklist de saida",
  "checklist-chegada": "Checklist de chegada",
  occurrence: "Ocorrencias",
  emergency: "Emergencia",
  docs: "Meus documentos",
  notices: "Avisos da empresa",
  schedule: "Minha escala",
  profile: "Perfil",
  demo: "Painel da demonstracao",
};

export function MoreScreen({ page, onPage, navigate }: { page: MorePage | null; onPage: (p: MorePage | null) => void; navigate: Navigate }) {
  if (page) {
    return (
      <div className="px-4 pt-3 pb-24">
        <button onClick={() => onPage(null)} className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-primary">
          <ArrowLeft className="h-4 w-4" /> Mais
        </button>
        <h1 className="mb-3 text-[22px] font-extrabold">{TITLES[page]}</h1>
        {page === "fuel" && <FuelHistoryPage onNew={() => onPage("fuel-new")} />}
        {page === "fuel-new" && <FuelFormPage onDone={() => onPage("fuel")} />}
        {page === "score" && <ScorePage />}
        {page === "checklist" && <ChecklistPage moment="saida" onDone={() => navigate("route")} />}
        {page === "checklist-chegada" && <ChecklistPage moment="chegada" onDone={() => navigate("route")} />}
        {page === "occurrence" && <OccurrencePage />}
        {page === "emergency" && <EmergencyPage onDone={() => navigate("day")} />}
        {page === "docs" && <DocsPage />}
        {page === "notices" && <NoticesPage />}
        {page === "schedule" && <SchedulePage />}
        {page === "profile" && <ProfilePage />}
        {page === "demo" && <DemoPanel />}
      </div>
    );
  }

  return <MoreMenu onPage={onPage} />;
}

function MoreMenu({ onPage }: { onPage: (p: MorePage) => void }) {
  const pendingNotices = useDemo((s) => s.notices.filter((n) => n.requiresAck && !n.ackAt).length);
  const openOcc = useDemo((s) => s.occurrences.filter((o) => o.status !== "resolvida").length);
  const tenant = useDemo((s) => s.tenant);
  const items: { page: MorePage; label: string; hint: string; icon: typeof Fuel; badge?: number; danger?: boolean }[] = [
    { page: "fuel", label: "Abastecimentos e km/l", hint: "Historico, media e meta", icon: Fuel },
    { page: "score", label: "Meu desempenho", hint: "Nota, ranking e premio", icon: Trophy },
    { page: "checklist", label: "Checklist do veiculo", hint: "Saida e chegada com foto", icon: ClipboardCheck },
    { page: "occurrence", label: "Ocorrencias", hint: "Pneu, quebra, avaria, atraso", icon: ShieldAlert, badge: openOcc },
    { page: "docs", label: "Meus documentos", hint: "CNH, toxicologico, ASO, cursos", icon: FileBadge },
    { page: "notices", label: "Avisos da empresa", hint: "DDS e regras do cliente", icon: Bell, badge: pendingNotices },
    { page: "schedule", label: "Minha escala", hint: "Proximas viagens e folgas", icon: CalendarDays },
    { page: "emergency", label: "Emergencia", hint: "Alerta com posicao para a central", icon: Siren, danger: true },
    { page: "profile", label: "Perfil", hint: "Dados, veiculo e tema", icon: User },
    { page: "demo", label: "Painel da demonstracao", hint: "Simular sem internet, movimento, trocar operacao", icon: FlaskConical },
  ];
  return (
    <div className="space-y-2 px-4 pt-3 pb-24">
      <p className="label-xs">{tenant.name}</p>
      <h1 className="mb-1 text-[24px] font-extrabold">Mais</h1>
      {items.map((i) => (
        <button key={i.page} onClick={() => onPage(i.page)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left">
          <IconChip tone={i.danger ? "danger" : i.page === "demo" ? "info" : "primary"}>
            <i.icon className="h-5 w-5" />
          </IconChip>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-extrabold">{i.label}</span>
            <span className="block truncate text-[12px] text-muted-foreground">{i.hint}</span>
          </span>
          {i.badge ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-black text-white">{i.badge}</span> : null}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

function SchedulePage() {
  const schedule = useDemo((s) => s.schedule);
  return (
    <div className="space-y-2">
      {schedule.map((e) => (
        <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border p-3.5">
          <IconChip tone={e.kind === "folga" ? "muted" : e.kind === "treinamento" ? "info" : "primary"}>
            {e.kind === "viagem" ? <Truck className="h-5 w-5" /> : e.kind === "treinamento" ? <ClipboardCheck className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </IconChip>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-muted-foreground capitalize">
              {e.label} - {dayLabel(`${e.date}T12:00:00`)}
            </p>
            <p className="text-[14px] font-extrabold">{e.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfilePage() {
  const driver = useDemo((s) => s.driver);
  const vehicle = useDemo((s) => s.vehicle);
  const tenant = useDemo((s) => s.tenant);
  const { theme, toggleTheme } = useTheme();
  const rows = [
    ["Motorista", driver.name],
    ["CPF", driver.cpf],
    ["Telefone", driver.phone],
    ["Equipe", driver.team],
    ["Empresa", tenant.name],
    ["Operacao", tenant.operation],
    ["Veiculo", `${vehicle.plate} - ${vehicle.model}`],
    ...(vehicle.trailer ? [["Carreta", vehicle.trailer]] : []),
    ["Tanque", `${vehicle.tankLiters} L`],
  ];
  return (
    <div className="space-y-3">
      <div className="surface-card divide-y divide-border rounded-[22px] px-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-3 text-[13.5px]">
            <span className="label-xs self-center">{k}</span>
            <span className="truncate text-right font-bold">{v}</span>
          </div>
        ))}
      </div>
      <BigButton tone="ghost" icon={theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} onClick={toggleTheme}>
        Tema {theme === "dark" ? "claro" : "escuro"}
      </BigButton>
    </div>
  );
}

function DemoPanel() {
  const sim = useDemo((s) => s.sim);
  const kind = useDemo((s) => s.operationKind);
  const queue = useDemo((s) => s.queue);
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-sky-500/10 p-3 text-[12.5px] font-semibold text-sky-700 dark:text-sky-300">
        Estes controles existem so na demonstracao, para mostrar ao cliente o que acontece na estrada.
      </p>
      <div>
        <p className="label-xs mb-1.5">Tipo de operacao</p>
        <Segmented
          value={kind}
          onChange={(v) => {
            resetDemo(v);
            toast.success(v === "distribuicao" ? "Operacao de distribuicao carregada" : "Operacao de transferencia carregada");
          }}
          options={[
            { value: "distribuicao", label: "Distribuicao" },
            { value: "transferencia", label: "Transferencia" },
          ]}
        />
      </div>
      <Toggle
        checked={sim.offline}
        onChange={(v) => {
          setSim({ offline: v });
          if (!v && queue.length) toast.success(`${queue.length} registros enviados`, { description: "Com a hora em que aconteceram" });
        }}
        label="Simular sem internet"
        hint="Tudo continua funcionando e fica na fila do celular"
      />
      {queue.length ? (
        <div className="rounded-2xl border border-warning/40 p-3">
          <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-warning">
            <WifiOff className="h-4 w-4" /> Na fila ({queue.length})
          </p>
          {queue.map((q) => (
            <p key={q.id} className="mt-1 text-[12px] text-muted-foreground">
              {new Date(q.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {q.label}
            </p>
          ))}
        </div>
      ) : null}
      <Toggle
        checked={sim.moving}
        onChange={(v) => setSim({ moving: v, speedKmh: v ? 62 : 0 })}
        label="Simular caminhao em movimento"
        hint="Trava a tela: so botoes grandes e voz"
      />
      <div className={cn("flex items-center justify-between rounded-2xl border border-border p-3.5")}>
        <span>
          <span className="block text-[14px] font-bold">Km do rastreador desde o ultimo abastecimento</span>
          <span className="block text-[12px] text-muted-foreground">Usado para conferir o odometro digitado</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSim({ trackerKmSinceLastFuel: Math.max(0, sim.trackerKmSinceLastFuel - 20) })} className="h-8 w-8 rounded-lg bg-surface-2 font-black">-</button>
          <Pill tone="info">{sim.trackerKmSinceLastFuel} km</Pill>
          <button onClick={() => setSim({ trackerKmSinceLastFuel: sim.trackerKmSinceLastFuel + 20 })} className="h-8 w-8 rounded-lg bg-surface-2 font-black">+</button>
        </div>
      </div>
      <BigButton
        tone="outline"
        icon={<RotateCcw className="h-5 w-5" />}
        onClick={() => {
          resetDemo(kind);
          toast.success("Demonstracao reiniciada");
        }}
      >
        Reiniciar o dia
      </BigButton>
    </div>
  );
}
