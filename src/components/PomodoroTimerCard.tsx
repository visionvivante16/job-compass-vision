import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadPomodoroState,
  savePomodoroState,
  onWidgetEvent,
  PomodoroState,
} from "@/hooks/useWidgetTracker";

const PRESETS = [
  { label: "🍅 25 min", seconds: 25 * 60 },
  { label: "☕ 15 min", seconds: 15 * 60 },
  { label: "⚡ 10 min", seconds: 10 * 60 },
];

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CircularProgress({
  progress,
  isBreak,
  size = 140,
  strokeWidth = 6,
}: {
  progress: number;
  isBreak: boolean;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isBreak ? "#00c48c" : "#ff6b6b"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
}

function ConfettiBurst() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 180,
    y: -(Math.random() * 100 + 30),
    color: ["#ff6b6b", "#ffd700", "#00c48c", "#00e5ff", "#a78bfa"][i % 5],
    size: Math.random() * 5 + 3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: "50%", y: "50%", opacity: 1 }}
          animate={{
            x: `calc(50% + ${p.x}px)`,
            y: `calc(50% + ${p.y}px)`,
            opacity: 0,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
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

export function PomodoroTimerCard() {
  const [state, setState] = useState<PomodoroState>(loadPomodoroState);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Persist state on change
  useEffect(() => {
    savePomodoroState(state);
  }, [state]);

  // Timer tick
  useEffect(() => {
    if (state.isRunning && state.remainingSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setState((prev) => {
          const next = prev.remainingSeconds - 1;
          if (next <= 0) {
            // Timer complete
            playChime();
            return {
              ...prev,
              remainingSeconds: 0,
              isRunning: false,
              sessionsToday: prev.isBreak ? prev.sessionsToday : prev.sessionsToday + 1,
            };
          }
          return { ...prev, remainingSeconds: next };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.remainingSeconds]);

  // Show results when timer hits 0
  useEffect(() => {
    if (state.remainingSeconds === 0 && !state.isRunning) {
      if (!state.isBreak) {
        setShowConfetti(true);
        setShowResults(true);
        setTimeout(() => setShowConfetti(false), 1500);
      }
    }
  }, [state.remainingSeconds, state.isRunning, state.isBreak]);

  // Listen for apply events during running timer
  useEffect(() => {
    const unsub = onWidgetEvent((type) => {
      if (type === "apply") {
        setState((prev) => ({
          ...prev,
          sessionApplied: prev.isRunning ? prev.sessionApplied + 1 : prev.sessionApplied,
          totalAppliedToday: prev.totalAppliedToday + 1,
        }));
      }
    });
    return () => { unsub(); };
  }, []);

  const handlePreset = (seconds: number) => {
    setState((prev) => ({
      ...prev,
      remainingSeconds: seconds,
      totalSeconds: seconds,
      isRunning: false,
      isBreak: false,
      sessionApplied: 0,
    }));
    setShowResults(false);
  };

  const handleStart = () => {
    setState((prev) => ({ ...prev, isRunning: true }));
    setShowResults(false);
  };

  const handlePause = () => {
    setState((prev) => ({ ...prev, isRunning: false }));
  };

  const handleReset = () => {
    setState((prev) => ({
      ...prev,
      remainingSeconds: prev.totalSeconds,
      isRunning: false,
      isBreak: false,
      sessionApplied: 0,
    }));
    setShowResults(false);
  };

  const handleBreak = () => {
    setState((prev) => ({
      ...prev,
      remainingSeconds: 5 * 60,
      totalSeconds: 5 * 60,
      isRunning: true,
      isBreak: true,
      sessionApplied: 0,
    }));
    setShowResults(false);
  };

  const handleNewSession = () => {
    setState((prev) => ({
      ...prev,
      remainingSeconds: 25 * 60,
      totalSeconds: 25 * 60,
      isRunning: false,
      isBreak: false,
      sessionApplied: 0,
    }));
    setShowResults(false);
  };

  const handleGoalChange = (delta: number) => {
    setState((prev) => ({
      ...prev,
      sessionGoal: Math.max(1, Math.min(10, prev.sessionGoal + delta)),
    }));
  };

  const progress =
    state.totalSeconds > 0
      ? state.remainingSeconds / state.totalSeconds
      : 0;

  const timerDone = state.remainingSeconds === 0 && !state.isRunning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: timerDone && !state.isBreak
          ? "linear-gradient(135deg, #0a1a0f 0%, #13151f 50%)"
          : "#13151f",
        border: "1px solid rgba(255, 107, 107, 0.2)",
        boxShadow: "0 -2px 20px rgba(255, 107, 107, 0.06)",
      }}
    >
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🍅</span>
          <span className="text-sm font-bold text-white">Focus Session</span>
        </div>
        <span className="text-[11px] text-gray-500">
          {state.sessionsToday + (state.isRunning && !state.isBreak ? 1 : 0)} session{(state.sessionsToday + (state.isRunning && !state.isBreak ? 1 : 0)) !== 1 ? "s" : ""} today
        </span>
      </div>

      {/* Results overlay */}
      <AnimatePresence>
        {showResults && !state.isBreak && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center py-2"
          >
            <p className="text-sm font-bold text-white mb-1">Session Complete! 🎉</p>
            <p className="text-xs text-gray-400 mb-1">
              ✅ You applied to {state.sessionApplied} job{state.sessionApplied !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              ⏱ {Math.round(state.totalSeconds / 60)} minutes of focused work
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBreak}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                style={{
                  background: "rgba(0, 196, 140, 0.15)",
                  color: "#00c48c",
                  border: "1px solid rgba(0, 196, 140, 0.3)",
                }}
              >
                Start Break ☕ 5 min
              </button>
              <button
                onClick={handleNewSession}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                style={{
                  background: "rgba(255, 107, 107, 0.15)",
                  color: "#ff6b6b",
                  border: "1px solid rgba(255, 107, 107, 0.3)",
                }}
              >
                New Session 🍅
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer display (hidden during results) */}
      {!showResults && (
        <>
          {/* Circular timer */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative">
              <CircularProgress
                progress={progress}
                isBreak={state.isBreak}
                size={130}
                strokeWidth={5}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: state.isBreak ? "#00c48c" : "#fff" }}
                >
                  {formatTime(state.remainingSeconds)}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  {state.isBreak
                    ? "Take a breath!"
                    : state.isRunning
                      ? "Stay focused!"
                      : "Ready?"}
                </span>
              </div>
            </div>
          </div>

          {/* Presets */}
          {!state.isRunning && !state.isBreak && (
            <div className="flex items-center justify-center gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => handlePreset(p.seconds)}
                  className="px-3 py-1 text-[11px] font-medium rounded-full transition-colors"
                  style={{
                    background:
                      state.totalSeconds === p.seconds
                        ? "rgba(255, 107, 107, 0.2)"
                        : "rgba(255,255,255,0.05)",
                    color:
                      state.totalSeconds === p.seconds ? "#ff6b6b" : "#9ca3af",
                    border: `1px solid ${state.totalSeconds === p.seconds ? "rgba(255,107,107,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Session goal */}
          {!state.isBreak && (
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-[11px] text-gray-500">Goal:</span>
              <button
                onClick={() => handleGoalChange(-1)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-gray-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                −
              </button>
              <span className="text-xs font-medium text-white tabular-nums w-4 text-center">
                {state.sessionGoal}
              </span>
              <button
                onClick={() => handleGoalChange(1)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-gray-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                +
              </button>
              <span className="text-[11px] text-gray-500">jobs</span>
            </div>
          )}

          {/* Applied counter during session */}
          {state.isRunning && !state.isBreak && (
            <p className="text-center text-xs text-gray-400 mb-3">
              ✅ {state.sessionApplied} of {state.sessionGoal} applied this session
            </p>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            {!state.isRunning ? (
              <button
                onClick={handleStart}
                className="px-5 py-2 text-xs font-semibold rounded-full transition-all hover:brightness-110"
                style={{
                  background: state.isBreak
                    ? "linear-gradient(135deg, #00c48c, #00a87a)"
                    : "linear-gradient(135deg, #ff6b6b, #e05555)",
                  color: "#fff",
                }}
              >
                {state.isBreak ? "Start Break ☕" : "Start Focus 🍅"}
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-5 py-2 text-xs font-semibold rounded-full"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Pause ⏸
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-2 text-[11px] text-gray-500 hover:text-gray-300 transition-colors rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Reset
            </button>
          </div>
        </>
      )}

      {/* Stats */}
      <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[10px] text-gray-600">
          Today: {state.sessionsToday} session{state.sessionsToday !== 1 ? "s" : ""} •{" "}
          {state.totalAppliedToday} job{state.totalAppliedToday !== 1 ? "s" : ""} applied
        </span>
      </div>
    </motion.div>
  );
}
