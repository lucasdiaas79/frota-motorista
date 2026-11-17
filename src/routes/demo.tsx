import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DemoApp } from "@/demo/ui/DemoApp";

// Previa do app motorista da operacao Ambev SE, com dados ficticios no navegador.
// O app real (rota "/") usa os mesmos componentes quando o tenant tem os modulos ligados.
export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "FrotaK Motorista - Demonstracao operacao Ambev SE" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoRoute,
});

function DemoRoute() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <main className="grid h-dvh place-items-center bg-background">
        <div className="font-display text-[34px] font-extrabold">
          frota<span className="text-primary">k</span>
        </div>
      </main>
    );
  }
  return <DemoApp />;
}
