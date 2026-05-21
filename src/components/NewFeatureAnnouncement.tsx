import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

const BANNER_KEY = "sociax_role_request_banner_seen";

export function NewFeatureAnnouncement({ onRequestRole }: { onRequestRole: () => void }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const storageKey = user ? `${BANNER_KEY}_${user.id}` : BANNER_KEY;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4"
        >
          <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <span className="font-semibold">✨ New:</span> Request any role you're looking for — we'll get it live in 24hrs!{" "}
              <button
                onClick={() => { onRequestRole(); dismiss(); }}
                className="text-accent font-medium hover:underline"
              >
                Try it now →
              </button>
            </p>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
