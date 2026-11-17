import { motion } from "motion/react";
import { toast } from "sonner";
import { Hourglass, Mic, OctagonAlert, Siren } from "lucide-react";
import { setActivity, setSim, useDemo } from "../store";
import { captureGeo } from "../geo";
import { CDD } from "../seed";
import type { Navigate } from "./DemoApp";
import { useJourney } from "./JourneyCard";
import { fmtMin } from "../jornada";
import { startListening } from "./VoiceButton";

/**
 * Com o caminhao andando (velocidade do rastreador ou do GPS), a tela trava.
 * Ficam so tres botoes grandes e a voz. Regra comum em embarcadores de bebidas.
 */
export function DrivingLock({ navigate }: { navigate: Navigate }) {
  const speed = useDemo((s) => s.sim.speedKmh);
  const journey = useJourney();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[60] flex flex-col bg-background/97 px-6 pt-10 pb-6 backdrop-blur-xl"
    >
      <div className="text-center">
        <OctagonAlert className="mx-auto h-10 w-10 text-warning" />
        <p className="mt-3 font-display text-[44px] leading-none font-extrabold">{speed} km/h</p>
        <p className="mt-2 text-[16px] font-extrabold">Caminhao em movimento</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Pare em local seguro para usar o app. Direcao continua: {fmtMin(journey.continuousDrivingMin)}.</p>
      </div>
      <div className="mt-auto space-y-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => startListening(navigate)}
          className="flex h-20 w-full items-center justify-center gap-3 rounded-3xl bg-primary text-[18px] font-black text-primary-foreground"
        >
          <Mic className="h-7 w-7" /> Falar com a Frotak
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const geo = await captureGeo(CDD.geo);
            setSim({ moving: false, speedKmh: 0 });
            setActivity("espera", "motorista", "Parado em fila ou transito", geo);
            toast.success("Ponto: espera");
          }}
          className="flex h-20 w-full items-center justify-center gap-3 rounded-3xl bg-warning text-[18px] font-black text-warning-foreground"
        >
          <Hourglass className="h-7 w-7" /> Parei: fila ou espera
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setSim({ moving: false, speedKmh: 0 });
            navigate("more", "emergency");
          }}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-3xl border-2 border-destructive text-[16px] font-black text-destructive"
        >
          <Siren className="h-6 w-6" /> Emergencia
        </motion.button>
        <button onClick={() => setSim({ moving: false, speedKmh: 0 })} className="w-full py-2 text-[12px] font-bold text-muted-foreground">
          (demonstracao) Parar o caminhao
        </button>
      </div>
    </motion.div>
  );
}
