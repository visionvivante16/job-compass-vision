import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getTodayChallenge,
  loadChallengeState,
  saveChallengeState,
  loadStreakState,
  saveStreakState,
  loadBadgeState,
  saveBadgeState,
  getBadgeTier,
  onWidgetEvent,
  ChallengeState,
  BadgeTier,
} from "@/hooks/useWidgetTracker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const BADGE_EMOJIS: Record<BadgeTier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

const BADGE_LABELS: Record<BadgeTier, string> = {
  bronze: "Bronze (1–5)",
  silver: "Silver (6–15)",
  gold: "Gold (16–30)",
  platinum: "Platinum (31+)",
};

function ConfettiBurst() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 200,
    y: -(Math.random() * 120 + 40),
    rotate: Math.random() * 360,
    color: ["#00e5ff", "#ff6b6b", "#ffd700", "#00c48c", "#a78bfa"][i % 5],
    size: Math.random() * 6 + 4,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: "50%", y: "50%", opacity: 1, scale: 1 }}
          animate={{
            x: `calc(50% + ${p.x}px)`,
            y: `calc(50% + ${p.y}px)`,
            opacity: 0,
            scale: 0.3,
            rotate: p.rotate,
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

export function DailyChallengeCard() {
  const [challenge] = useState(getTodayChallenge);
  const [state, setState] = useState<ChallengeState>(loadChallengeState);
  const [streak, setStreak] = useState(loadStreakState);
  const [badges, setBadges] = useState(loadBadgeState);
  const [showConfetti, setShowConfetti] = useState(false);
  const justCompletedRef = useRef(false);

  // Listen for apply/save events
  useEffect(() => {
    const unsub = onWidgetEvent((type) => {
      setState((prev) => {
        if (prev.completed) return prev;
        if (
          (prev.type === "apply" && type === "apply") ||
          (prev.type === "save" && type === "save") ||
          (prev.type === "explore" && type === "apply") ||
          (prev.type === "profile" && type === "apply")
        ) {
          const newProgress = Math.min(prev.progress + 1, prev.goal);
          const completed = newProgress >= prev.goal;
          const newState = { ...prev, progress: newProgress, completed };
          saveChallengeState(newState);

          if (completed && !justCompletedRef.current) {
            justCompletedRef.current = true;
            const today = new Date().toISOString().split("T")[0];
            setStreak((s) => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split("T")[0];
              const newStreak =
                s.lastCompletedDate === yesterdayStr
                  ? s.currentStreak + 1
                  : s.lastCompletedDate === today
                    ? s.currentStreak
                    : 1;
              const ns = { currentStreak: newStreak, lastCompletedDate: today };
              saveStreakState(ns);
              return ns;
            });
            setBadges((b) => {
              const total = b.totalCompletions + 1;
              const nb = {
                totalCompletions: total,
                tier: getBadgeTier(total),
                history: [...b.history, today].slice(-30),
              };
              saveBadgeState(nb);
              return nb;
            });
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 1500);
          }
          return newState;
        }
        return prev;
      });
    });
    return () => { unsub(); };
  }, []);

  const progressPct = state.goal > 0 ? (state.progress / state.goal) * 100 : 0;

  // Recent badge history (last 5)
  const recentBadges = badges.history.slice(-5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: state.completed
          ? "linear-gradient(135deg, #0a1a0f 0%, #13151f 50%)"
          : "#13151f",
        border: state.completed
          ? "1px solid rgba(0, 196, 140, 0.25)"
          : "1px solid rgba(0, 229, 255, 0.15)",
        boxShadow: state.completed
          ? "0 -2px 20px rgba(0, 196, 140, 0.12)"
          : "0 -2px 20px rgba(0, 229, 255, 0.08)",
      }}
    >
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span className="text-sm font-bold text-white">Daily Challenge</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#f59e0b" }}>
          <span>🔥</span>
          <span>{streak.currentStreak} day streak</span>
        </div>
      </div>

      {/* Challenge text */}
      <AnimatePresence mode="wait">
        {state.completed ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3"
          >
            <p className="text-sm font-medium" style={{ color: "#00c48c" }}>
              Challenge Complete! ✦ Come back tomorrow
            </p>
            {/* Badge flip */}
            <motion.div
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(0, 196, 140, 0.15)",
                color: "#00c48c",
              }}
            >
              {BADGE_EMOJIS[badges.tier]} {BADGE_LABELS[badges.tier]}
            </motion.div>
          </motion.div>
        ) : (
          <motion.p
            key="challenge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-300 mb-3"
          >
            {challenge.text}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">
            {state.progress} / {state.goal}{" "}
            {state.type === "save" ? "saved" : "applied"}
          </span>
          <span className="text-gray-500">{Math.round(progressPct)}%</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background: state.completed
                ? "linear-gradient(90deg, #00c48c, #00e5a0)"
                : "linear-gradient(90deg, #00e5ff, #00b4d8)",
            }}
          />
        </div>
      </div>

      {/* Badge history row */}
      {recentBadges.length > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {recentBadges.map((date, i) => (
            <Tooltip key={date + i}>
              <TooltipTrigger asChild>
                <span className="text-sm cursor-default opacity-60 hover:opacity-100 transition-opacity">
                  {BADGE_EMOJIS[getBadgeTier(i + 1)]}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Completed {date}
              </TooltipContent>
            </Tooltip>
          ))}
          {badges.history.length > 5 && (
            <span className="text-[10px] text-gray-500 ml-1">
              +{badges.history.length - 5} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
