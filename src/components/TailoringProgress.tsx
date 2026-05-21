import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { label: "Reading your resume…", target: 20 },
  { label: "Analysing job requirements…", target: 40 },
  { label: "Matching your experience to the role…", target: 60 },
  { label: "Optimising for ATS keywords…", target: 80 },
  { label: "Finalising your tailored resume…", target: 95 },
];

/** Animated progress + cycling messages while AI generation runs. */
export function TailoringProgress() {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(2);

  useEffect(() => {
    const t = setInterval(() => {
      setPct((p) => {
        const target = STEPS[step].target;
        if (p < target) return Math.min(target, p + 1);
        if (step < STEPS.length - 1) {
          setStep((s) => s + 1);
        }
        return p;
      });
    }, 250);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div className="max-w-md mx-auto text-center py-12 px-6">
      <div className="relative mx-auto mb-5 h-14 w-14">
        <div className="absolute inset-0 rounded-full bg-[hsl(174_72%_42%)]/20 blur-xl animate-pulse" />
        <Loader2 className="relative h-14 w-14 text-[hsl(174_72%_55%)] animate-spin mx-auto" />
      </div>
      <div className="text-lg font-semibold text-white mb-1 tracking-tight">{STEPS[step].label}</div>
      <div className="text-xs text-slate-400 mb-5">Crafting your perfectly tailored resume</div>
      <Progress
        value={pct}
        className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[hsl(174_72%_42%)] [&>div]:to-[hsl(174_72%_60%)] [&>div]:shadow-[0_0_12px_hsl(174_72%_50%/0.6)]"
      />
      <div className="text-sm font-semibold text-[hsl(174_72%_60%)] mt-3 tabular-nums">{pct}%</div>
    </div>
  );
}
