import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { getUserPrice } from "@/lib/pricing";
import { motion } from "framer-motion";

export function PremiumUpgradeBanner() {
  const { profile, isLoading } = useProfile();
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const price = getUserPrice(user?.created_at);

  // Wait for profile to load before deciding — prevents flash of upgrade prompt for premium users
  if (!user || isLoading || profile?.is_premium) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-card p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Premium
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500 border border-yellow-500/20">
            Early Birds
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 -mt-1 mb-1 italic">Limited slots</p>

        <p className="text-sm font-medium text-foreground leading-snug mb-1">
          Unlock full access & unlimited job applications
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          for just <span className="font-semibold text-foreground">{price}/month</span>
        </p>

        <button
          onClick={() => setShowUpgrade(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Sparkles className="h-3 w-3" />
          Upgrade Now
          <ArrowRight className="h-3 w-3" />
        </button>
      </motion.div>

      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  );
}
