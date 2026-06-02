import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Briefcase, Upload, X, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "sociax_onboarding_wizard_done";
const SHOW_WITHIN_DAYS = 1; // only first 24h
const DELAY_MS = 4000; // small delay so user lands first

type Step = 0 | 1 | 2;

export function OnboardingWizard() {
  const { user } = useAuth();
  const { profile, updateProfile, isLoading } = useProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || isLoading) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Only show for accounts created recently
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    const ageMs = Date.now() - createdAt;
    if (ageMs > SHOW_WITHIN_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.setItem(STORAGE_KEY, "skipped-old-account");
      return;
    }

    // Already has the basics? skip.
    if (profile?.current_title && profile?.location && profile?.resume_url) {
      localStorage.setItem(STORAGE_KEY, "already-complete");
      return;
    }

    // Pre-fill from existing profile
    setRole(profile?.current_title || "");
    setLocation(profile?.location || profile?.city || "");

    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [user, profile, isLoading]);

  const close = (markDone = true) => {
    if (markDone) localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!role.trim()) return;
      setSaving(true);
      try {
        await updateProfile({ current_title: role.trim() } as any);
      } finally {
        setSaving(false);
      }
      setStep(1);
    } else if (step === 1) {
      if (!location.trim()) return;
      setSaving(true);
      try {
        await updateProfile({ location: location.trim() } as any);
      } finally {
        setSaving(false);
      }
      setStep(2);
    } else {
      close(true);
      navigate("/profile");
    }
  };

  const skipStep = () => {
    if (step < 2) setStep((step + 1) as Step);
    else close(true);
  };

  const stepInfo = [
    { icon: Briefcase, label: "Your role", title: "What role are you targeting?" },
    { icon: MapPin, label: "Location", title: "Where are you looking?" },
    { icon: Upload, label: "Resume", title: "Upload your resume" },
  ][step];

  // console.log("OnboardingWizard render", { saving, visible, step, role, location });  

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={`relative w-full ${isMobile ? "max-w-[360px]" : "max-w-[440px]"} rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-6`}
          >
            <button
              onClick={() => close(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">
                Step {step + 1} of 3 — {stepInfo.label}
              </span>
            </div>
            <Progress value={((step + 1) / 3) * 100} className="h-1.5 mb-5" />

            {/* Step content */}
            <div className="flex items-center gap-2 mb-1.5">
              <stepInfo.icon className="h-4 w-4 text-accent" />
              <h3 className="text-base font-semibold text-foreground">{stepInfo.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {step === 0 && "We'll use this to match you with the right jobs."}
              {step === 1 && "City, state, or country — wherever you want to work."}
              {step === 2 && "Upload your resume on the profile page to unlock tailored recommendations, cover letters, and interview prep."}
            </p>

            {step === 0 && (
              <Input
                autoFocus
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Data Analyst, Software Engineer"
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="mb-4"
              />
            )}
            {step === 1 && (
              <Input
                autoFocus
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, NY or Remote"
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="mb-4"
              />
            )}
            {step === 2 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3">
                <Check className="h-4 w-4 text-accent shrink-0" />
                <p className="text-xs text-muted-foreground">
                  You're almost done — finish by uploading your resume on the next page.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handleNext}
                disabled={
                  saving ||
                  (step === 0 && !role.trim()) ||
                  (step === 1 && !location.trim())
                }
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {step === 2 ? "Go to profile" : "Continue"}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={skipStep} className="text-xs">
                Skip
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
