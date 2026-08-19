import { motion } from "motion/react";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SectionTitle } from "./primitives";
import type { DriverDocument } from "@/lib/driverApi";

export function DocsScreen({
  documents,
  onDocument,
}: {
  documents: DriverDocument[];
  onDocument: (kind: string, fileName: string) => Promise<void>;
}) {
  const docs = documents.length
    ? documents.map((document) => ({
        name: document.file_name,
        meta: `${document.kind} - ${document.status}`,
        state: "ok" as const,
      }))
    : [{ name: "Nenhum documento anexado", meta: "Aguardando envio", state: "pending" as const }];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-4 pb-3">
      <h1 className="shrink-0 text-[24px] leading-tight font-extrabold">Documentos</h1>
      <p className="mt-1 shrink-0 text-[14px] text-muted-foreground">
        Tudo da viagem atual em um so lugar.
      </p>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={async () => {
          await onDocument("canhoto", "documento-motorista.jpg");
          toast.success("Documento enviado para a central");
        }}
        className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Upload className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[14px] font-bold">Enviar novo documento</span>
          <span className="block text-xs text-muted-foreground">Foto, PDF ou canhoto assinado</span>
        </span>
      </motion.button>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        <SectionTitle>Arquivos do frete</SectionTitle>
        <div className="space-y-2">
          {docs.map((d) => (
            <motion.div
              key={d.name}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold">{d.name}</span>
                <span className="block text-xs text-muted-foreground">{d.meta}</span>
              </span>
              {d.state === "ok" ? (
                <button
                  onClick={() => toast.success(`${d.name} baixado`)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"
                  aria-label="Baixar"
                >
                  <Download className="h-4.5 w-4.5" />
                </button>
              ) : (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-warning" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
