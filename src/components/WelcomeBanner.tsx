import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function WelcomeBanner() {
  const { user } = useAuth();
  const { profile } = useProfile();

  if (!user) return null;

  const firstName = profile?.first_name || profile?.full_name?.split(" ")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-5 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5 p-4 md:p-5 relative overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              Welcome back, {firstName}! 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tailor your resume, run ATS checks, and apply smarter.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
