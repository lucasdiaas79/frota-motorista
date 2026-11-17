import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Mic, Sparkles } from "lucide-react";
import { Sheet } from "@/components/app/Sheet";
import { activeTrip, arriveStop, getState, setActivity, setSim, startDay } from "../store";
import { captureGeo } from "../geo";
import { CDD } from "../seed";
import type { Navigate } from "./DemoApp";

const EXAMPLES = ["Comecei a jornada", "Cheguei no cliente", "Parei para almocar", "Estou na fila", "Abasteci", "Pneu furou", "Emergencia"];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const EVENT = "frotak-voice-open";

export function startListening(navigate: Navigate) {
  window.dispatchEvent(new CustomEvent(EVENT));
  void navigate;
}

/** Entende o que o motorista falou e executa. Sem internet de IA, usa palavras-chave. */
async function execute(text: string, navigate: Navigate) {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const s = getState();
  const trip = activeTrip(s);
  const stop = trip?.stops[trip.currentStopIndex];
  const geo = await captureGeo(stop?.geo ?? CDD.geo);

  if (/emergencia|socorro|assalto/.test(t)) {
    setSim({ moving: false, speedKmh: 0 });
    navigate("more", "emergency");
    return "Abrindo emergencia. Segure o botao vermelho.";
  }
  if (/comec|inici/.test(t) && /jornada|trabalho|dia/.test(t)) {
    startDay(geo, false);
    return "Jornada iniciada com sua posicao.";
  }
  if (/cheguei|chegou|to no|estou no/.test(t) && !/fila/.test(t)) {
    if (stop && stop.status === "a_caminho") {
      arriveStop(stop.id, "motorista", geo);
      return `Chegada registrada em ${stop.name.replace(" (exemplo)", "")}. Ponto em espera.`;
    }
    navigate("route");
    return "Abri a rota para voce confirmar a etapa.";
  }
  if (/almoc|refeic|comer|janta/.test(t)) {
    setActivity("refeicao", "voz", "Refeicao (por voz)", geo);
    return "Ponto marcado: refeicao. Bom almoco.";
  }
  if (/descans|pausa|dormir/.test(t)) {
    setActivity("descanso", "voz", "Descanso (por voz)", geo);
    return "Ponto marcado: descanso.";
  }
  if (/fila|espera|aguard|parado/.test(t)) {
    setActivity("espera", "voz", "Espera (por voz)", geo);
    return "Ponto marcado: espera.";
  }
  if (/seguindo|sai|voltei a dirigir|dirigindo/.test(t)) {
    setActivity("direcao", "voz", "Direcao (por voz)", geo);
    return "Ponto marcado: direcao. Boa viagem.";
  }
  if (/abasteci|abastecer|diesel|posto/.test(t)) {
    navigate("more", "fuel-new");
    return "Abrindo o abastecimento. Fotografe o cupom que eu preencho.";
  }
  if (/pneu|quebr|avaria|acidente|ocorrencia|problema/.test(t)) {
    navigate("more", "occurrence");
    return "Abrindo ocorrencia. A central sera avisada.";
  }
  return "Nao entendi. Tente: cheguei, estou na fila, abasteci, pneu furou.";
}

export function VoiceButton({ navigate }: { navigate: Navigate }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const rec = useRef<SpeechRecognitionLike | null>(null);

  const handle = async (text: string) => {
    setHeard(text);
    const reply = await execute(text, navigate);
    setAnswer(reply);
    toast(reply);
    try {
      const u = new SpeechSynthesisUtterance(reply);
      u.lang = "pt-BR";
      window.speechSynthesis?.speak(u);
    } catch {
      // sem voz no navegador
    }
  };

  const listen = () => {
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    setOpen(true);
    setHeard("");
    setAnswer("");
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "pt-BR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) void handle(text);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };

  useEffect(() => {
    const fn = () => listen();
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
  });

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={listen}
        className="absolute right-4 bottom-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]"
        aria-label="Falar com a Frotak"
      >
        <Mic className="h-6 w-6" />
      </motion.button>
      <Sheet
        open={open}
        onClose={() => {
          rec.current?.stop();
          setOpen(false);
        }}
        title="Falar com a Frotak"
      >
        <div className="space-y-3">
          <div className="grid place-items-center py-3">
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-primary/12 text-primary">
              <AnimatePresence>
                {listening ? (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="absolute inset-0 rounded-full bg-primary/30"
                  />
                ) : null}
              </AnimatePresence>
              <Mic className="h-8 w-8" />
            </span>
            <p className="mt-2 text-[13px] font-bold text-muted-foreground">{listening ? "Ouvindo..." : "Toque num exemplo ou fale"}</p>
          </div>
          {heard ? <p className="rounded-2xl bg-surface-2 p-3 text-[14px] font-bold">"{heard}"</p> : null}
          {answer ? (
            <p className="flex gap-2 rounded-2xl border border-primary/25 bg-primary/8 p-3 text-[14px] font-semibold">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" /> {answer}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => void handle(e)} className="rounded-full border border-border px-3 py-2 text-[12.5px] font-bold">
                {e}
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}
