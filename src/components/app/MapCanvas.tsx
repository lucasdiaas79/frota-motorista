import { motion } from "motion/react";
import { Navigation, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stylised live route canvas — the visual protagonist of the trip screen. */
export function MapCanvas({
  progress,
  moving,
  className,
}: {
  progress: number; // 0..1
  moving: boolean;
  className?: string;
}) {
  const path = "M 30 330 C 90 300, 70 240, 130 220 S 250 210, 260 150 S 300 70, 360 40";
  return (
    <div className={cn("relative overflow-hidden bg-background", className)}>
      {/* terrain */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_65%)]" />
      <svg
        viewBox="0 0 390 380"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.78 0.19 148)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.9 0.19 152)" />
          </linearGradient>
        </defs>
        {/* grid streets */}
        <g stroke="oklch(0.3 0.01 160)" strokeWidth="1" opacity="0.7">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 46} x2="390" y2={i * 46 - 40} />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48 + 40} y2="380" />
          ))}
        </g>
        <g stroke="oklch(0.26 0.011 160)" strokeWidth="10" strokeLinecap="round" opacity="0.9">
          <path d="M -20 250 C 120 240, 220 300, 420 250" fill="none" />
          <path d="M 120 -20 C 150 120, 90 240, 140 400" fill="none" />
        </g>

        <path
          d={path}
          fill="none"
          stroke="oklch(0.26 0.011 160)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={path}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="14 10"
          style={{ animation: moving ? "dash-flow 6s linear infinite" : undefined }}
        />
        <motion.circle
          r="7"
          fill="oklch(0.98 0 0)"
          animate={{ opacity: 1 }}
          style={{ offsetPath: `path("${path}")`, offsetDistance: `${progress * 100}%` }}
        />
      </svg>

      {/* vehicle puck */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <span className="absolute inset-0 rounded-full bg-primary/30 [animation:pulse-ring_2.4s_ease-out_infinite]" />
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
          {moving ? <Navigation className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
        </div>
      </motion.div>

      <div className="absolute left-4 top-16 flex items-center gap-2 rounded-full glass px-3 py-2 text-[11px] font-bold uppercase tracking-wider">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        BR-101 · Sentido norte
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[var(--gradient-fade)]" />
    </div>
  );
}
