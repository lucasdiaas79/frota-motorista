import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Ban, Check, CheckCircle2, ChevronRight, FileBadge, Megaphone, MessageSquare, Minus, Send, Siren, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ackNotice, activeTrip, addOccurrence, renewDocument, replyOccurrence, submitChecklist, useDemo } from "../store";
import { captureGeo, fmtGeo } from "../geo";
import { CDD } from "../seed";
import { fmtClock } from "../jornada";
import type { ChecklistAnswer, Occurrence, OccurrenceKind } from "../types";
import { BigButton, EmptyState, Field, Pill, PhotoSlot, TextArea, TextInput, dayLabel, parseNum } from "./kit";

// ------------------------------------------------------------------ checklist

export function ChecklistPage({ moment, onDone }: { moment: "saida" | "chegada"; onDone: () => void }) {
  const template = useDemo((s) => s.checklistTemplate);
  const trip = useDemo(activeTrip);
  const odometer = useDemo((s) => s.vehicle.odometer);
  const history = useDemo((s) => s.checklists);
  const [answers, setAnswers] = useState<Record<string, { answer: ChecklistAnswer; note?: string; photo?: boolean }>>({});
  const [odo, setOdo] = useState("");
  const groups = [...new Set(template.map((i) => i.group))];
  const answered = template.filter((i) => answers[i.id]).length;
  const criticalFail = template.filter((i) => i.critical && answers[i.id]?.answer === "nok");
  const missingNotes = template.filter((i) => answers[i.id]?.answer === "nok" && (!answers[i.id]?.note || !answers[i.id]?.photo));

  const set = (id: string, answer: ChecklistAnswer) => setAnswers((a) => ({ ...a, [id]: { ...a[id], answer } }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-surface-2/50 p-3">
        <div>
          <p className="text-[14px] font-extrabold">Checklist de {moment === "saida" ? "saida" : "chegada"}</p>
          <p className="text-[12px] text-muted-foreground">{answered} de {template.length} itens - {history.length} feitos este mes</p>
        </div>
        <button
          onClick={() => setAnswers(Object.fromEntries(template.map((i) => [i.id, { answer: "ok" as const }])))}
          className="rounded-xl bg-primary/12 px-3 py-2 text-[12px] font-extrabold text-primary"
        >
          Tudo OK
        </button>
      </div>
      <Field label="Odometro">
        <TextInput value={odo} onChange={setOdo} placeholder={String(odometer)} inputMode="numeric" suffix="km" />
      </Field>
      {groups.map((g) => (
        <div key={g}>
          <p className="label-xs mb-1.5">{g}</p>
          <div className="space-y-1.5">
            {template
              .filter((i) => i.group === g)
              .map((item) => {
                const a = answers[item.id];
                return (
                  <div key={item.id} className={cn("rounded-2xl border p-3", a?.answer === "nok" ? "border-destructive/40 bg-destructive/6" : "border-border")}>
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 text-[13.5px] font-bold">
                        {item.label}
                        {item.critical ? <span className="ml-1 text-[10px] font-black text-destructive uppercase">critico</span> : null}
                      </p>
                      <AnswerBtn active={a?.answer === "ok"} tone="ok" onClick={() => set(item.id, "ok")}>
                        <Check className="h-4 w-4" />
                      </AnswerBtn>
                      <AnswerBtn active={a?.answer === "nok"} tone="nok" onClick={() => set(item.id, "nok")}>
                        <X className="h-4 w-4" />
                      </AnswerBtn>
                      <AnswerBtn active={a?.answer === "na"} tone="na" onClick={() => set(item.id, "na")}>
                        <Minus className="h-4 w-4" />
                      </AnswerBtn>
                    </div>
                    {a?.answer === "nok" ? (
                      <div className="mt-2 space-y-2">
                        <TextInput value={a.note ?? ""} onChange={(v) => setAnswers((s) => ({ ...s, [item.id]: { ...s[item.id]!, note: v } }))} placeholder="O que esta errado?" />
                        <PhotoSlot label="Foto do problema" taken={Boolean(a.photo)} onTaken={() => setAnswers((s) => ({ ...s, [item.id]: { ...s[item.id]!, photo: true } }))} compact />
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      {criticalFail.length ? (
        <div className="flex gap-2 rounded-2xl bg-destructive/10 p-3 text-[12.5px] font-semibold text-destructive">
          <Ban className="h-4 w-4 shrink-0" /> Item critico reprovado: a viagem fica bloqueada e a manutencao e avisada.
        </div>
      ) : null}
      <BigButton
        disabled={answered < template.length}
        hint={answered < template.length ? `Faltam ${template.length - answered} itens` : undefined}
        onClick={async () => {
          if (missingNotes.length) {
            toast.error("Itens reprovados precisam de descricao e foto");
            return;
          }
          const geo = await captureGeo(CDD.geo);
          const approved = criticalFail.length === 0;
          const odoValue = parseNum(odo);
          submitChecklist({
            moment,
            ...(trip ? { tripId: trip.id } : {}),
            at: new Date().toISOString(),
            ...(odoValue ? { odometer: odoValue } : {}),
            answers,
            approved,
          });
          if (!approved) {
            addOccurrence({
              kind: "quebra",
              at: new Date().toISOString(),
              note: `Checklist reprovado: ${criticalFail.map((c) => c.label).join(", ")}`,
              photo: true,
              geo,
              severity: "alta",
              ...(trip ? { tripId: trip.id } : {}),
            });
          }
          onDone();
          toast[approved ? "success" : "error"](approved ? "Checklist aprovado" : "Checklist reprovado", {
            description: approved ? "Viagem liberada" : "Pendencia aberta para a manutencao",
          });
        }}
      >
        Enviar checklist
      </BigButton>
    </div>
  );
}

function AnswerBtn({ active, tone, onClick, children }: { active: boolean; tone: "ok" | "nok" | "na"; onClick: () => void; children: React.ReactNode }) {
  const colors = { ok: "bg-primary text-primary-foreground", nok: "bg-destructive text-white", na: "bg-muted-foreground text-background" };
  return (
    <button onClick={onClick} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? colors[tone] : "bg-surface-2 text-muted-foreground")}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ ocorrencias

export const OCC_LABEL: Record<OccurrenceKind, string> = {
  pneu: "Pneu",
  quebra: "Quebra mecanica",
  acidente: "Acidente",
  avaria_carga: "Avaria de carga",
  cliente_fechado: "Cliente fechado",
  atraso: "Atraso",
  fiscalizacao: "Fiscalizacao",
  roubo: "Roubo ou assalto",
  emergencia: "Emergencia",
  outro: "Outro",
};

const SEVERITY: Record<OccurrenceKind, Occurrence["severity"]> = {
  pneu: "media",
  quebra: "alta",
  acidente: "alta",
  avaria_carga: "media",
  cliente_fechado: "baixa",
  atraso: "baixa",
  fiscalizacao: "baixa",
  roubo: "alta",
  emergencia: "alta",
  outro: "baixa",
};

const CENTRAL_REPLY: Partial<Record<OccurrenceKind, string>> = {
  pneu: "Recebido. Borracheiro parceiro acionado, aguarde no local em seguranca.",
  quebra: "Recebido. Mecanico e guincho avaliando. Nao siga viagem.",
  acidente: "Recebido. Ligando para voce agora. Sinalize o local e ligue 193 se houver ferido.",
  avaria_carga: "Recebido. Registre fotos das caixas e siga com o que esta bom.",
  cliente_fechado: "Recebido. Siga para a proxima entrega, reagendamos com o cliente.",
  atraso: "Recebido. Avisamos o cliente da nova previsao.",
  roubo: "Recebido. Seguranca e gerenciadora de risco acionadas. Fique em local seguro.",
};

export function OccurrencePage() {
  const list = useDemo((s) => s.occurrences);
  const trip = useDemo(activeTrip);
  const [mode, setMode] = useState<"list" | "new" | string>("list");
  const [kind, setKind] = useState<OccurrenceKind>("pneu");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(false);
  const opened = list.find((o) => o.id === mode);

  if (opened) return <OccurrenceThread occ={opened} onBack={() => setMode("list")} />;

  if (mode === "new") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(OCC_LABEL) as OccurrenceKind[])
            .filter((k) => k !== "emergencia")
            .map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn("rounded-2xl border px-2 py-3 text-[12px] font-extrabold", kind === k ? "border-primary bg-primary/10 text-primary" : "border-border")}
              >
                {OCC_LABEL[k]}
              </button>
            ))}
        </div>
        <Field label="O que aconteceu">
          <TextArea value={note} onChange={setNote} placeholder="Descreva rapido. A posicao vai junto." />
        </Field>
        <PhotoSlot label="Foto" taken={photo} onTaken={() => setPhoto(true)} />
        <BigButton
          icon={<Send className="h-5 w-5" />}
          onClick={async () => {
            const stop = trip?.stops[trip.currentStopIndex];
            const geo = await captureGeo(stop?.geo ?? CDD.geo);
            const id = addOccurrence({
              kind,
              at: new Date().toISOString(),
              note: note || OCC_LABEL[kind],
              photo,
              geo,
              severity: SEVERITY[kind],
              ...(trip ? { tripId: trip.id } : {}),
              ...(stop ? { stopId: stop.id } : {}),
            });
            toast.success("Central avisada na hora", { description: "Notificacao enviada ao gestor" });
            const reply = CENTRAL_REPLY[kind];
            if (reply) window.setTimeout(() => replyOccurrence(id, reply, "central", "em_atendimento"), 4000);
            setNote("");
            setPhoto(false);
            setMode(id);
          }}
        >
          Enviar para a central
        </BigButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BigButton onClick={() => setMode("new")}>Nova ocorrencia</BigButton>
      {list.length === 0 ? <EmptyState icon={<MessageSquare />} title="Sem ocorrencias" text="Pneu, quebra, avaria ou atraso: registre aqui." /> : null}
      {list.map((o) => (
        <button key={o.id} onClick={() => setMode(o.id)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", o.status === "resolvida" ? "bg-primary" : o.severity === "alta" ? "bg-destructive" : "bg-warning")} />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold">{OCC_LABEL[o.kind]}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {dayLabel(o.at)} {fmtClock(o.at)} - {o.note}
            </span>
          </span>
          <Pill tone={o.status === "resolvida" ? "primary" : o.status === "em_atendimento" ? "info" : "warning"}>{o.status.replace("_", " ")}</Pill>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

function OccurrenceThread({ occ, onBack }: { occ: Occurrence; onBack: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-[13px] font-extrabold text-primary">Voltar</button>
      <div className="rounded-2xl bg-surface-2/50 p-3">
        <p className="text-[15px] font-extrabold">{OCC_LABEL[occ.kind]}</p>
        <p className="text-[12px] text-muted-foreground">
          {dayLabel(occ.at)} {fmtClock(occ.at)} - {fmtGeo(occ.geo)}
        </p>
        <div className="mt-2 flex gap-1.5">
          <Pill tone={occ.severity === "alta" ? "danger" : occ.severity === "media" ? "warning" : "muted"}>gravidade {occ.severity}</Pill>
          {occ.photo ? <Pill>com foto</Pill> : null}
          {!occ.synced ? <Pill tone="warning">na fila</Pill> : null}
        </div>
      </div>
      <div className="space-y-2">
        {occ.thread.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] rounded-2xl p-3 text-[13px]", m.from === "motorista" ? "ml-auto bg-primary text-primary-foreground" : "bg-surface-2")}>
            <p className="font-semibold">{m.text}</p>
            <p className="mt-1 text-[10px] opacity-70">{m.from === "central" ? "Central" : "Voce"} - {fmtClock(m.at)}</p>
          </div>
        ))}
        {occ.status === "aberta" ? <p className="text-center text-[12px] text-muted-foreground">Aguardando a central...</p> : null}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <TextInput value={text} onChange={setText} placeholder="Mensagem para a central" />
        </div>
        <button
          onClick={() => {
            if (!text.trim()) return;
            replyOccurrence(occ.id, text.trim(), "motorista");
            setText("");
          }}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ emergencia

export function EmergencyPage({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const [sent, setSent] = useState(false);
  const trip = useDemo(activeTrip);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const fire = async () => {
    setSent(true);
    const stop = trip?.stops[trip.currentStopIndex];
    const geo = await captureGeo(stop?.geo ?? CDD.geo);
    const id = addOccurrence({
      kind: "emergencia",
      at: new Date().toISOString(),
      note: "Botao de emergencia acionado",
      photo: false,
      geo,
      severity: "alta",
      ...(trip ? { tripId: trip.id } : {}),
    });
    window.setTimeout(() => replyOccurrence(id, "Recebemos o alerta. Estamos ligando para voce e acompanhando pelo rastreador.", "central", "em_atendimento"), 3000);
  };

  return (
    <div className="space-y-4 text-center">
      {sent ? (
        <>
          <CheckCircle2 className="mx-auto mt-4 h-14 w-14 text-destructive" />
          <p className="text-[20px] font-extrabold">Alerta enviado</p>
          <p className="text-[13px] text-muted-foreground">A central recebeu sua posicao e vai ligar agora. Se puder, va para um local seguro.</p>
          <a href="tel:190" className="block rounded-2xl bg-destructive py-4 text-[16px] font-extrabold text-white">Ligar 190</a>
          <a href="tel:193" className="block rounded-2xl border border-destructive py-4 text-[16px] font-extrabold text-destructive">Ligar 193</a>
          <BigButton tone="ghost" onClick={onDone}>Voltar</BigButton>
        </>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-muted-foreground">Segure o botao por 2 segundos. A central recebe sua posicao na hora.</p>
          <motion.button
            onPointerDown={() => {
              window.clearInterval(timer.current);
              const start = Date.now();
              timer.current = window.setInterval(() => {
                const p = Math.min(1, (Date.now() - start) / 2000);
                setProgress(p);
                if (p >= 1) {
                  window.clearInterval(timer.current);
                  void fire();
                }
              }, 40);
            }}
            onPointerUp={() => {
              window.clearInterval(timer.current);
              if (!sent) setProgress(0);
            }}
            onPointerLeave={() => {
              window.clearInterval(timer.current);
              if (!sent) setProgress(0);
            }}
            whileTap={{ scale: 0.96 }}
            className="relative mx-auto grid h-52 w-52 place-items-center overflow-hidden rounded-full bg-destructive text-white shadow-[0_20px_60px_-20px_var(--destructive)] select-none"
          >
            <span className="absolute inset-x-0 bottom-0 bg-black/25" style={{ height: `${progress * 100}%` }} />
            <span className="relative flex flex-col items-center gap-2">
              <Siren className="h-14 w-14" />
              <span className="text-[17px] font-black">SEGURE</span>
            </span>
          </motion.button>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ documentos

export function DocsPage() {
  const docs = useDemo((s) => s.documents);
  const now = Date.now();
  return (
    <div className="space-y-2">
      {docs.map((d) => {
        const days = Math.round((new Date(d.expiresAt).getTime() - now) / 86_400_000);
        const tone = days < 0 ? "danger" : days <= 30 ? "warning" : "primary";
        return (
          <div key={d.id} className="rounded-2xl border border-border p-3.5">
            <div className="flex items-start gap-3">
              <FileBadge className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-primary")} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold">{d.label}</p>
                <p className="text-[12px] text-muted-foreground">
                  Vence em {new Date(d.expiresAt).toLocaleDateString("pt-BR")}
                  {d.blocking ? " - obrigatorio para rodar" : ""}
                </p>
              </div>
              <Pill tone={tone}>{days < 0 ? `vencido ha ${-days}d` : `${days} dias`}</Pill>
            </div>
            {days <= 30 ? (
              <button
                onClick={() => {
                  renewDocument(d.id, new Date(now + 365 * 86_400_000).toISOString());
                  toast.success("Novo documento enviado para a central conferir");
                }}
                className="mt-2.5 w-full rounded-xl bg-primary/12 py-2.5 text-[12.5px] font-extrabold text-primary"
              >
                Enviar documento renovado (foto)
              </button>
            ) : null}
          </div>
        );
      })}
      <p className="px-1 text-[11.5px] text-muted-foreground">A central e avisada 30 dias antes de cada vencimento. Documento obrigatorio vencido bloqueia o inicio da viagem.</p>
    </div>
  );
}

// ------------------------------------------------------------------ avisos

export function NoticesPage() {
  const notices = useDemo((s) => s.notices);
  return (
    <div className="space-y-2.5">
      {notices.map((n) => (
        <div key={n.id} className={cn("rounded-2xl border p-3.5", n.requiresAck && !n.ackAt ? "border-warning/40 bg-warning/8" : "border-border")}>
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <p className="label-xs">{n.from} - {dayLabel(n.at)}</p>
          </div>
          <p className="mt-1.5 text-[15px] font-extrabold">{n.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{n.body}</p>
          {n.requiresAck ? (
            n.ackAt ? (
              <p className="mt-2 flex items-center gap-1 text-[12px] font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" /> Ciencia registrada {dayLabel(n.ackAt)} {fmtClock(n.ackAt)}
              </p>
            ) : (
              <BigButton className="mt-3" onClick={() => { ackNotice(n.id); toast.success("Ciencia registrada"); }}>
                Li e estou ciente
              </BigButton>
            )
          ) : null}
        </div>
      ))}
    </div>
  );
}
