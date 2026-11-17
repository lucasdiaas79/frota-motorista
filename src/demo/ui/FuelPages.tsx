import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Ban, Check, Fuel, Gauge, MapPin, ScanLine, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { addFuel, useDemo, getState } from "../store";
import { PAYMENT_LABEL, fullToFull, lastRecord, nearestStations, validateFuel } from "../fuel";
import { captureGeo } from "../geo";
import { CDD } from "../seed";
import type { FuelPayment, GeoPoint } from "../types";
import { BigButton, Field, Pill, PhotoSlot, Segmented, Stat, TextInput, Toggle, dayLabel, money, num, parseNum } from "./kit";

export function FuelHistoryPage({ onNew }: { onNew: () => void }) {
  const records = useDemo((s) => s.fuelRecords);
  const vehicle = useDemo((s) => s.vehicle);
  const ftf = useMemo(() => fullToFull(records), [records]);
  const sorted = [...records].sort((a, b) => b.odometer - a.odometer);
  const intervals = ftf.intervals.slice(-8);
  const max = Math.max(vehicle.kmPerLiterTarget * 1.2, ...intervals.map((i) => i.kmPerLiter));
  const month = records.filter((r) => Date.now() - new Date(r.at).getTime() < 30 * 86_400_000);
  const spent = month.reduce((s, r) => s + r.dieselLiters * r.dieselPrice + r.arlaLiters * r.arlaPrice, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Media" value={ftf.average ? num(ftf.average, 2) : "--"} sub="km/l tanque cheio" tone={ftf.average && ftf.average < vehicle.kmPerLiterTarget ? "warning" : "primary"} />
        <Stat label="Meta" value={num(vehicle.kmPerLiterTarget, 1)} sub={vehicle.model.split(" ").slice(0, 2).join(" ")} />
        <Stat label="30 dias" value={money(spent).replace(",00", "")} sub={`${month.length} abastecimentos`} />
      </div>

      <div className="surface-card rounded-[22px] p-4">
        <p className="label-xs">Km/l por trecho (tanque cheio a tanque cheio)</p>
        <div className="mt-3 flex h-36 items-end gap-1.5">
          {intervals.map((i) => {
            const below = i.kmPerLiter < vehicle.kmPerLiterTarget;
            return (
              <div key={i.to.id} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[9.5px] font-extrabold text-muted-foreground">{num(i.kmPerLiter, 1)}</span>
                <div className={cn("w-full rounded-t-lg", below ? "bg-warning/70" : "bg-primary/80")} style={{ height: `${(i.kmPerLiter / max) * 100}%` }} />
                <span className="text-[9px] text-muted-foreground">{new Date(i.to.at).getDate()}</span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-1 h-px bg-border" />
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          Barras amarelas ficaram abaixo da meta. Abastecimento parcial nao distorce: os litros entram no trecho seguinte.
        </p>
      </div>

      <BigButton icon={<Fuel className="h-5 w-5" />} onClick={onNew}>
        Registrar abastecimento
      </BigButton>

      <div className="space-y-2">
        {sorted.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-surface-2/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-extrabold">{r.stationName}</p>
                <p className="text-[12px] text-muted-foreground capitalize">
                  {dayLabel(r.at)} - {num(r.odometer)} km - {PAYMENT_LABEL[r.payment]}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[15px] font-extrabold">{num(r.dieselLiters, 1)} L</p>
                <p className="text-[11px] text-muted-foreground">R$ {r.dieselPrice.toFixed(2)}/L</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.tankFull ? <Pill tone="primary">Tanque cheio</Pill> : <Pill tone="warning">Parcial</Pill>}
              {r.arlaLiters ? <Pill>ARLA {num(r.arlaLiters, 1)} L</Pill> : null}
              {r.readBy === "leitura_automatica" ? (
                <Pill tone="info">
                  <Sparkles className="h-3 w-3" /> lido da foto
                </Pill>
              ) : null}
              {!r.synced ? <Pill tone="warning">na fila</Pill> : null}
              {r.alerts.map((a) => (
                <Pill key={a.code} tone={a.level === "bloqueio" ? "danger" : "warning"}>
                  <AlertTriangle className="h-3 w-3" /> {a.code.replace(/_/g, " ")}
                </Pill>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FuelFormPage({ onDone }: { onDone: () => void }) {
  const state = useDemo((s) => s);
  const [geo, setGeo] = useState<GeoPoint>();
  const [stationId, setStationId] = useState<string>();
  const [odo, setOdo] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [arla, setArla] = useState("");
  const [arlaPrice, setArlaPrice] = useState("");
  const [tankFull, setTankFull] = useState(true);
  const [payment, setPayment] = useState<FuelPayment>("a_prazo_posto");
  const [photos, setPhotos] = useState({ pump: false, receipt: false, panel: false });
  const [reading, setReading] = useState(false);
  const [readBy, setReadBy] = useState<"manual" | "leitura_automatica">("manual");

  useEffect(() => {
    void captureGeo(CDD.geo).then(setGeo);
  }, []);

  const stations = nearestStations(state.stations, geo);
  const station = state.stations.find((s) => s.id === stationId);
  const last = lastRecord(state.fuelRecords);

  useEffect(() => {
    if (!station) return;
    setPayment(station.paymentTerms.includes("Cartao") ? "cartao_frota" : "a_prazo_posto");
  }, [station]);

  const input = {
    ...(stationId ? { stationId } : {}),
    stationName: station?.name ?? "Posto nao credenciado",
    odometer: parseNum(odo) ?? 0,
    dieselLiters: parseNum(liters) ?? 0,
    dieselPrice: parseNum(price) ?? 0,
    arlaLiters: parseNum(arla) ?? 0,
    arlaPrice: parseNum(arlaPrice) ?? 0,
    tankFull,
    at: Date.now(),
  };
  const filled = input.odometer > 0 && input.dieselLiters > 0 && input.dieselPrice > 0;
  const alerts = filled ? validateFuel(input, state) : [];
  const blocked = alerts.some((a) => a.level === "bloqueio");
  const total = input.dieselLiters * input.dieselPrice + input.arlaLiters * input.arlaPrice;

  const readReceipt = () => {
    if (!station) {
      toast.error("Escolha o posto primeiro");
      return;
    }
    setReading(true);
    setPhotos((p) => ({ ...p, receipt: true, pump: true }));
    window.setTimeout(() => {
      const km = state.sim.trackerKmSinceLastFuel || 180;
      const l = Math.round((km / state.vehicle.kmPerLiterTarget) * (0.95 + Math.random() * 0.1) * 10) / 10;
      setLiters(String(l).replace(".", ","));
      setPrice(station.negotiatedDieselPrice.toFixed(2).replace(".", ","));
      setArla(String(Math.round(l * 0.045 * 10) / 10).replace(".", ","));
      setArlaPrice(station.negotiatedArlaPrice.toFixed(2).replace(".", ","));
      if (!odo && last) setOdo(String(last.odometer + km));
      setReading(false);
      setReadBy("leitura_automatica");
      toast.success("Cupom lido", { description: "Litros, preco e ARLA preenchidos. Confira antes de salvar." });
    }, 1400);
  };

  const save = async () => {
    if (!filled) {
      toast.error("Preencha odometro, litros e preco");
      return;
    }
    if (blocked) {
      toast.error("Corrija os itens em vermelho antes de salvar");
      return;
    }
    if (!photos.receipt) {
      toast.error("Fotografe o cupom fiscal");
      return;
    }
    const at = new Date().toISOString();
    addFuel({
      at,
      ...(stationId ? { stationId } : {}),
      stationName: input.stationName,
      odometer: input.odometer,
      dieselLiters: input.dieselLiters,
      dieselPrice: input.dieselPrice,
      arlaLiters: input.arlaLiters,
      arlaPrice: input.arlaPrice,
      tankFull,
      payment,
      photos,
      readBy,
      ...(geo ? { geo } : {}),
      alerts,
    });
    const after = fullToFull(getState().fuelRecords).intervals.at(-1);
    onDone();
    toast.success("Abastecimento salvo", {
      description: tankFull && after && after.to.odometer === input.odometer ? `Este trecho: ${num(after.kmPerLiter, 2)} km/l (meta ${num(state.vehicle.kmPerLiterTarget, 1)})` : "Parcial: o km/l sai no proximo tanque cheio",
    });
  };

  return (
    <div className="space-y-3.5">
      <Field label="Posto" hint={geo ? "Ordenados pelo mais perto de voce" : "Buscando sua posicao..."}>
        <div className="space-y-1.5">
          {stations.map(({ station: s, km }) => (
            <button
              key={s.id}
              onClick={() => setStationId(s.id)}
              className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left", stationId === s.id ? "border-primary bg-primary/8" : "border-border")}
            >
              <MapPin className={cn("h-5 w-5 shrink-0", stationId === s.id ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-extrabold">{s.name}</span>
                <span className="block text-[11.5px] text-muted-foreground">
                  {km != null ? `${num(km, 1)} km - ` : ""}diesel combinado R$ {s.negotiatedDieselPrice.toFixed(2)} - {s.paymentTerms}
                </span>
              </span>
              {s.accredited ? <Star className="h-4 w-4 text-warning" /> : null}
            </button>
          ))}
        </div>
      </Field>

      <button
        onClick={readReceipt}
        className="flex w-full items-center gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/8 p-3.5 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-background text-sky-600 dark:text-sky-400">
          <ScanLine className={cn("h-5 w-5", reading && "animate-pulse")} />
        </span>
        <span className="flex-1">
          <span className="block text-[14px] font-extrabold">{reading ? "Lendo o cupom..." : "Fotografar cupom e preencher sozinho"}</span>
          <span className="block text-[11.5px] text-muted-foreground">Leitura por IA (simulada nesta versao)</span>
        </span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        <PhotoSlot label="Bomba" taken={photos.pump} onTaken={() => setPhotos((p) => ({ ...p, pump: true }))} compact />
        <PhotoSlot label="Cupom" taken={photos.receipt} onTaken={() => setPhotos((p) => ({ ...p, receipt: true }))} compact />
        <PhotoSlot label="Painel" taken={photos.panel} onTaken={() => setPhotos((p) => ({ ...p, panel: true }))} compact />
      </div>

      <Field label="Odometro" hint={last ? `Ultimo: ${num(last.odometer)} km. Rastreador: +${state.sim.trackerKmSinceLastFuel} km desde entao` : undefined}>
        <TextInput value={odo} onChange={setOdo} inputMode="numeric" suffix="km" placeholder={last ? String(last.odometer + state.sim.trackerKmSinceLastFuel) : ""} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Diesel S10">
          <TextInput value={liters} onChange={setLiters} inputMode="decimal" suffix="L" />
        </Field>
        <Field label="Preco por litro">
          <TextInput value={price} onChange={setPrice} inputMode="decimal" suffix="R$" />
        </Field>
        <Field label="ARLA 32">
          <TextInput value={arla} onChange={setArla} inputMode="decimal" suffix="L" />
        </Field>
        <Field label="Preco ARLA">
          <TextInput value={arlaPrice} onChange={setArlaPrice} inputMode="decimal" suffix="R$" />
        </Field>
      </div>
      <Toggle checked={tankFull} onChange={setTankFull} label="Completou o tanque?" hint="So tanque cheio fecha o calculo de km/l" />
      <Field label="Pagamento">
        <Segmented
          value={payment}
          onChange={setPayment}
          options={[
            { value: "a_prazo_posto", label: "A prazo" },
            { value: "cartao_frota", label: "Cartao" },
            { value: "pix", label: "PIX" },
            { value: "adiantamento", label: "Dinheiro" },
          ]}
        />
      </Field>

      {alerts.length ? (
        <div className="space-y-1.5">
          {alerts.map((a) => (
            <div key={a.code} className={cn("flex gap-2 rounded-2xl p-3 text-[12.5px] font-semibold", a.level === "bloqueio" ? "bg-destructive/10 text-destructive" : "bg-warning/12 text-warning")}>
              {a.level === "bloqueio" ? <Ban className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {a.message}
            </div>
          ))}
        </div>
      ) : filled ? (
        <div className="flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-[12.5px] font-semibold text-primary">
          <Check className="h-4 w-4" /> Odometro, tanque, preco e rastreador conferidos
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl bg-surface-2/60 p-3">
        <span className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground">
          <Gauge className="h-4 w-4" /> Total
        </span>
        <span className="font-display text-[19px] font-extrabold">{money(total)}</span>
      </div>

      <BigButton disabled={blocked} onClick={() => void save()} icon={<Fuel className="h-5 w-5" />}>
        Salvar abastecimento
      </BigButton>
    </div>
  );
}
