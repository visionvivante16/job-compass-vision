import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import introImage from "@/assets/intro-splash.png";

interface IntroSplashProps {
  children: React.ReactNode;
}

export function IntroSplash({ children }: IntroSplashProps) {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("sociax_intro_seen");
  });

  useEffect(() => {
    if (!showSplash) return;
    // Faster splash — 1.8s total instead of 2.6s
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("sociax_intro_seen", "1");
    }, 1800);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a] overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glow pulse behind image */}
            <motion.div
              className="absolute w-48 h-48 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--accent) / 0.3) 0%, transparent 70%)",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.6, 1.2],
                opacity: [0, 0.7, 0.35],
              }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />

            {/* Intro image */}
            <motion.img
              src={introImage}
              alt="Loading"
              className="relative z-10 w-28 h-28 object-contain select-none pointer-events-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [0.5, 1.08, 1] }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Brand name */}
            <motion.span
              className="absolute bottom-[38%] font-display text-xl font-bold text-white/90 tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Sociax.tech
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={showSplash ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: showSplash ? 1.8 : 0,
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </>
  );
}
