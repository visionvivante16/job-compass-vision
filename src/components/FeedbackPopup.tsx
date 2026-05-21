import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbackPrompt, FeedbackTrigger } from "@/hooks/useFeedbackPrompt";
import { useToast } from "@/hooks/use-toast";

const TRIGGER_COPY: Record<FeedbackTrigger, { title: string; subtitle: string }> = {
  apply: {
    title: "How's your job hunt going?",
    subtitle: "You've applied to a few roles — we'd love your quick feedback.",
  },
  ats: {
    title: "How was your ATS Check?",
    subtitle: "Was the analysis helpful for improving your profile?",
  },
  cover_letter: {
    title: "How's your cover letter?",
    subtitle: "Did the AI draft give you a useful starting point?",
  },
};

export function FeedbackPopup() {
  const { isOpen, activeTrigger, submit, dismiss } = useFeedbackPrompt();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await submit(rating, comment);
      toast({ title: "Thanks for your feedback! 💛", description: "It helps us make Sociax better." });
      setRating(0);
      setComment("");
    } catch (err: any) {
      toast({
        title: "Couldn't submit",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    await dismiss();
    setRating(0);
    setComment("");
  };

  const copy = activeTrigger ? TRIGGER_COPY[activeTrigger] : null;

  return (
    <AnimatePresence>
      {isOpen && copy && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed bottom-4 left-4 z-[60] w-[340px] max-w-[calc(100vw-2rem)] pointer-events-auto"
          role="region"
          aria-label="Feedback prompt"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-card border border-border/60 rounded-2xl shadow-2xl p-4 backdrop-blur-sm">
            <button
              onClick={handleClose}
              aria-label="Close feedback"
              className="absolute top-2.5 right-2.5 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-6">
              <h4 className="font-display font-semibold text-foreground text-sm leading-tight">
                {copy.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-1 mt-3" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= (hoverRating || rating);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    className="p-1 rounded-md hover:scale-110 transition-transform active:scale-95"
                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        filled
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <Textarea
              placeholder="Anything you'd like to share? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-3 text-xs resize-none rounded-xl border-border/60"
            />

            <div className="flex items-center justify-end gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
                className="h-8 text-xs rounded-lg"
              >
                Not now
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="h-8 text-xs rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
