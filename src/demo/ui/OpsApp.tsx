import { useEffect, useState } from "react";
import { startLive, startLiveFromCache } from "../live";
import { DemoApp } from "./DemoApp";

/**
 * App motorista da operacao com embarcador, ligado no banco da Frotak.
 * Aparece no lugar do app antigo quando o tenant do motorista tem os modulos da operacao.
 */
export function OpsApp({ ctx }: { ctx: unknown }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ctx === "cached") startLiveFromCache();
    else startLive(ctx);
    setReady(true);
  }, [ctx]);
  if (!ready) return null;
  return <DemoApp live />;
}
