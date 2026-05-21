import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { loadBadgeState, BadgeTier } from "@/hooks/useWidgetTracker";
import { useMemo } from "react";

interface ProfileAvatarProps {
  size?: "sm" | "md";
  showPicker?: boolean;
  showBadge?: boolean;
}

const TIER_CONFIG: Record<BadgeTier, { ring: string; icon: string; glow: string }> = {
  bronze: { ring: "ring-amber-700", icon: "🥉", glow: "shadow-[0_0_8px_rgba(180,83,9,0.4)]" },
  silver: { ring: "ring-gray-300", icon: "🥈", glow: "shadow-[0_0_8px_rgba(156,163,175,0.5)]" },
  gold: { ring: "ring-yellow-400", icon: "🥇", glow: "shadow-[0_0_10px_rgba(250,204,21,0.5)]" },
  platinum: { ring: "ring-cyan-400", icon: "💎", glow: "shadow-[0_0_12px_rgba(34,211,238,0.5)]" },
};

export function ProfileAvatar({ size = "sm", showBadge = true }: ProfileAvatarProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const badge = useMemo(() => {
    const state = loadBadgeState();
    return state.totalCompletions > 0 ? state : null;
  }, []);

  const avatarUrl = (profile as any)?.avatar_url as string | null;
  const initials = getInitials(profile?.full_name || profile?.first_name || user?.email || "");
  const sizeClass = size === "md" ? "h-10 w-10" : "h-7 w-7";
  const textSize = size === "md" ? "text-sm" : "text-[10px]";

  const tierCfg = badge ? TIER_CONFIG[badge.tier] : null;
  const ringClass = showBadge && tierCfg ? `ring-2 ${tierCfg.ring} ${tierCfg.glow}` : "";

  return (
    <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="relative">
      <Avatar className={`${sizeClass} border border-border shadow-soft cursor-pointer ${ringClass}`}>
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
        )}
        <AvatarFallback className={`${textSize} bg-secondary text-foreground font-medium`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {showBadge && tierCfg && (
        <span
          className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none select-none pointer-events-none"
          title={`${badge!.tier.charAt(0).toUpperCase() + badge!.tier.slice(1)} badge`}
        >
          {tierCfg.icon}
        </span>
      )}
    </motion.div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}
