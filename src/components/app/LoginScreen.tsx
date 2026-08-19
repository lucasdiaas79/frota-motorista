import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, LockKeyhole, Phone, Truck } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "./primitives";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (phone: string, password: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!phone.trim() || !password.trim()) {
      toast.error("Informe telefone e senha para continuar");
      return;
    }

    setLoading(true);
    try {
      await onLogin(phone, password);
      toast.success("Login realizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-5 pt-7 pb-5">
      <header className="shrink-0">
        <div className="font-display text-[34px] leading-none font-extrabold tracking-tight">
          frota<span className="text-primary">k</span>
        </div>
        <p className="label-xs mt-4">Sistema motorista</p>
        <h1 className="mt-2 text-[28px] leading-tight font-extrabold">Acesse sua viagem</h1>
        <p className="mt-2 max-w-[310px] text-[14px] leading-relaxed text-muted-foreground">
          Entre com seu telefone cadastrado para acompanhar demandas, documentos e etapas do frete.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 items-center">
        <form onSubmit={submit} className="w-full space-y-3">
          <Field
            icon={<Phone className="h-4.5 w-4.5" />}
            label="Telefone"
            placeholder="(79) 99999-9999"
            inputMode="tel"
            value={phone}
            onChange={setPhone}
          />

          <Field
            icon={<LockKeyhole className="h-4.5 w-4.5" />}
            label="Senha"
            placeholder="Sua senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            action={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            }
          />

          <ActionButton
            className="mt-2 py-4 text-[15px]"
            icon={<Truck className="h-5 w-5" />}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar no aplicativo"}
          </ActionButton>

          <button
            type="button"
            onClick={() => toast("A central pode redefinir sua senha")}
            className="w-full py-2 text-center text-[13px] font-bold text-primary"
          >
            Esqueci minha senha
          </button>
        </form>
      </div>

      <footer className="shrink-0 rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Use o telefone informado no cadastro do motorista.
        </p>
      </footer>
    </div>
  );
}

function Field({
  icon,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  inputMode,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  action?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="label-xs block">{label}</span>
        <input
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full bg-transparent text-[16px] font-bold outline-none placeholder:text-muted-foreground/55"
        />
      </span>
      {action}
    </label>
  );
}
