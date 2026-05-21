import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function ResumeUploadBanner() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const navigate = useNavigate();

  // Don't show if loading, no user, or user already has resume
  if (isLoading || !user || profile?.resume_url) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-5 relative overflow-hidden"
    >
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              Upload your resume to unlock personalized matches
              <Sparkles className="h-4 w-4 text-accent" />
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Get AI-powered job recommendations, ATS scores, and tailored resumes — all based on your background.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/profile")}
          className="shrink-0"
          size="sm"
        >
          Upload Resume
        </Button>
      </div>
    </motion.div>
  );
}
