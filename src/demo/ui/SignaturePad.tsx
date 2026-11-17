import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/** Assinatura do recebedor na tela. Devolve a imagem em data URL. */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | undefined) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(canvas).color || "#111";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="h-36 w-full touch-none rounded-2xl border border-dashed border-border bg-background text-foreground"
        onPointerDown={(e) => {
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          const p = point(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          setEmpty(false);
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      {empty ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] font-semibold text-muted-foreground">
          Recebedor assina aqui com o dedo
        </span>
      ) : (
        <button
          onClick={() => {
            const c = ref.current;
            const ctx = c?.getContext("2d");
            if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
            setEmpty(true);
            onChange(undefined);
          }}
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold"
        >
          <Eraser className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </div>
  );
}
