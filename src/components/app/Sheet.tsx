import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, i) => i.offset.y > 90 && onClose()}
            className="surface-card absolute inset-x-0 bottom-0 z-50 max-h-[86%] overflow-hidden rounded-t-[28px]"
          >
            <div className="flex flex-col items-center pt-3">
              <span className="h-1.5 w-11 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
              <h2 className="text-[20px] font-extrabold">{title}</h2>
              <button
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="no-scrollbar max-h-[70vh] overflow-y-auto px-5 pb-8">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
