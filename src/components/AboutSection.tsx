import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Search,
  FileCheck,
  Send,
  BarChart3,
  FileText,
  Sparkles,
} from "lucide-react";
import { CompanyLogoMarquee } from "@/components/CompanyLogoMarquee";

const aboutFeatures = [
  {
    icon: Search,
    title: "Smart Job Search",
    desc: "Browse curated listings with powerful filters — by role, location, experience, and visa sponsorship.",
  },
  {
    icon: FileCheck,
    title: "ATS Score Check",
    desc: "Upload your resume and get an instant ATS compatibility score with actionable improvement tips.",
  },
  {
    icon: FileText,
    title: "Tailored Resumes & Cover Letters",
    desc: "Generate job-specific resumes and cover letters powered by AI — perfectly matched to every listing.",
  },
  {
    icon: Send,
    title: "One-Click Apply",
    desc: "Apply to jobs instantly with a single click. Track every application in your personal dashboard.",
  },
  {
    icon: BarChart3,
    title: "Landing Probability",
    desc: "See your real-time match score for every job based on your skills, experience, and resume.",
  },
  {
    icon: Sparkles,
    title: "Interview Prep & Insights",
    desc: "Get AI-powered interview questions, market alerts, and hiring trends — all in one place.",
  },
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

export function AboutSection() {
  return (
    <section className="py-24 relative overflow-hidden" id="about">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <ScrollReveal>
          <p className="text-center text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Helping candidates land roles at the world's top companies
          </p>
          <CompanyLogoMarquee />
        </ScrollReveal>

        <ScrollReveal>
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4 border border-accent/20">
              About Sociax.tech
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your all-in-one job search companion
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              Sociax.tech is built to help job seekers find, apply, and land jobs faster. From smart search to AI-powered resume tools — everything you need is right here.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {aboutFeatures.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 0.08}>
              <div className="p-6 rounded-2xl bg-card border border-border/50 card-glow tilt-card group h-full">
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:shadow-[0_0_20px_hsl(var(--accent)/0.15)] transition-all duration-300">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-bold text-foreground text-base mb-1.5">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
