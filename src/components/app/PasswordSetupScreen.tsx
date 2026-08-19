import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PasswordSetupScreen({
  driverName,
  onComplete,
}: {
  driverName: string;
  onComplete: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error("Crie uma senha com pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas nao conferem");
      return;
    }

    setLoading(true);
    try {
      await onComplete(password);
      toast.success("Senha criada com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar a senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="font-display text-[27px] leading-none font-extrabold tracking-tight">
          frota<span className="text-primary">k</span>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/12 text-primary">
          <LockKeyhole className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-10">
        <p className="label-xs">Primeiro acesso</p>
        <h1 className="mt-2 text-[28px] leading-tight font-extrabold tracking-tight">
          Crie sua senha
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Ola, {driverName || "motorista"}. A senha 1234 e temporaria. Defina sua senha pessoal para
          continuar usando o aplicativo.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="label-xs mb-2 block">Nova senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-14 w-full rounded-2xl border border-border bg-surface-2/50 px-4 text-[16px] font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Minimo 6 caracteres"
            autoComplete="new-password"
          />
        </label>

        <label className="block">
          <span className="label-xs mb-2 block">Confirmar senha</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-14 w-full rounded-2xl border border-border bg-surface-2/50 px-4 text-[16px] font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Digite novamente"
            autoComplete="new-password"
          />
        </label>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className={cn(
            "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-[15px] font-extrabold text-primary-foreground shadow-[var(--shadow-soft)]",
            loading && "opacity-75",
          )}
        >
          {loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
          Salvar senha
        </motion.button>
      </form>
    </div>
  );
}
