import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { RoleRequestModal } from "./RoleRequestModal";

export function RoleRequestBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => setModalOpen(true)}
        data-tour="role-request"
        className="relative w-full rounded-xl p-[1.5px] group cursor-pointer text-left overflow-hidden"
      >
        {/* Animated gradient border */}
        <div
          className="absolute inset-0 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "conic-gradient(from var(--border-angle, 0deg), hsl(var(--accent)) 0%, hsl(220 80% 60%) 25%, hsl(270 60% 55%) 50%, hsl(var(--accent)) 75%, hsl(220 80% 60%) 100%)",
            animation: "rotateBorder 3s linear infinite",
          }}
        />

        {/* Glow layer */}
        <div
          className="absolute inset-0 rounded-xl opacity-20 group-hover:opacity-40 blur-sm transition-opacity duration-300"
          style={{
            background:
              "conic-gradient(from var(--border-angle, 0deg), hsl(var(--accent)) 0%, hsl(220 80% 60%) 25%, hsl(270 60% 55%) 50%, hsl(var(--accent)) 75%, hsl(220 80% 60%) 100%)",
            animation: "rotateBorder 3s linear infinite",
          }}
        />

        {/* Inner content */}
        <div className="relative flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] bg-accent/5 group-hover:bg-accent/10 transition-colors">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-foreground">
              Not finding your role?{" "}
              <span className="text-accent">Request it</span>
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-accent group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </motion.button>

      <RoleRequestModal open={modalOpen} onOpenChange={setModalOpen} />

      <style>{`
        @property --border-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rotateBorder {
          to { --border-angle: 360deg; }
        }
      `}</style>
    </>
  );
}
