import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PRICE_NEW, STRIPE_LINK_NEW } from "@/lib/pricing";

const freeFeatures = [
  "Browse & search all jobs",
  "Save jobs for later",
  "One-click apply",
  "Application tracking",
  "Market alerts & hiring signals",
];

const premiumFeatures = [
  "Everything in Free",
  "ATS score check",
  "AI-tailored resumes",
  "AI cover letters",
  "Landing probability scores",
  "Interview prep & insights",
  "LinkedIn message generator",
  "Priority support",
];

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

export function PricingSection() {
  return (
    <section className="py-24 border-y border-border/30">
      <div className="container max-w-5xl mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Start free. Upgrade when you're ready to supercharge your job search.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Tier */}
          <ScrollReveal delay={0.1}>
            <div className="relative p-7 rounded-2xl bg-card border border-border/50 h-full flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display font-bold text-foreground text-xl">Free</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-display text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-muted-foreground text-sm">Everything you need to start</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-border/60 hover:bg-secondary"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Premium Tier */}
          <ScrollReveal delay={0.2}>
            <div className="relative p-7 rounded-2xl bg-card border border-accent/40 h-full flex flex-col shadow-[0_0_30px_-10px_hsl(var(--accent)/0.15)]">
              <div className="absolute -top-3 left-7">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground text-xl">Premium</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-display text-4xl font-bold text-foreground">{PRICE_NEW}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-muted-foreground text-sm">AI-powered tools to land faster</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <a href={STRIPE_LINK_NEW} target="_blank" rel="noopener noreferrer">
                <Button className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow btn-glow">
                  Upgrade Now
                </Button>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
