import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Linkedin, ArrowRight, Sparkles } from "lucide-react";
import linkedinBannerImg from "@/assets/linkedin-connect-banner.jpg";

const STORAGE_KEY = "sociax_linkedin_feature_popup_seen";

export function LinkedInFeatureBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
    // Signal that the banner is dismissed so the onboarding tour can start
    window.dispatchEvent(new CustomEvent("linkedin-banner-dismissed"));
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-xs overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={dismiss}
                className="absolute top-2 right-2 z-20 p-1 rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Image */}
              <div className="relative w-full h-[120px] overflow-hidden">
                <img
                  src={linkedinBannerImg}
                  alt="LinkedIn Connect Feature"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={1200}
                  height={512}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
              </div>

              {/* Content */}
              <div className="px-4 pb-4 pt-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent">
                    <Sparkles className="h-2.5 w-2.5" />
                    New Feature
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground mb-1 leading-tight">
                  LinkedIn Connect & Referrals
                </h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Connect with people at companies you're applying to! Look for the{" "}
                  <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                    <Linkedin className="h-2.5 w-2.5 text-[#0077b5]" /> Connect
                  </span>{" "}
                  button on any job card.
                </p>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={dismiss}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors group"
                  >
                    Got it, let me try!
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={dismiss}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
