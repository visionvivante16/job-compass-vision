import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { Layout } from "@/components/Layout";
import { ParticleField } from "@/components/about/ParticleField";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useLandingStats } from "@/hooks/useLandingStats";
import { FeaturedJobCard } from "@/components/FeaturedJobCard";
import { FloatingHeroTags } from "@/components/FloatingHeroTags";
import { AboutSection } from "@/components/AboutSection";
// PROMO: app is free for everyone — pricing section hidden
// import { PricingSection } from "@/components/PricingSection";
import { InsightsSection } from "@/components/InsightsSection";
import { FAQSection } from "@/components/FAQSection";
import {
  Briefcase,
  Search,
  BookmarkCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  PieChart,
  AlertCircle,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";

const features = [
  {
    icon: Search,
    title: "Smart Search",
    description: "Find the perfect job with powerful search across titles, skills, and companies.",
  },
  {
    icon: BookmarkCheck,
    title: "Track Applications",
    description: "Automatically track every job you apply to with timestamps and easy access.",
  },
  {
    icon: Zap,
    title: "Stay Updated",
    description: "See which companies are actively reviewing applications right now.",
  },
];

const benefits = [
  "One-click apply to external job posts",
  "Save jobs for later",
  "Organized application history",
  "Mobile-friendly design",
];

const hiringSignals = [
  {
    icon: TrendingUp,
    title: "Top Hirings Today",
    description: "Shows most in-demand roles right now",
  },
  {
    icon: PieChart,
    title: "Hiring Graph",
    description: "Visual snapshot of where opportunities are growing",
  },
  {
    icon: AlertCircle,
    title: "Market Alert",
    description: "Quick updates when hiring spikes",
  },
];

const placeholderTitles = [
  "Frontend Developer",
  "Product Designer",
  "Data Scientist",
  "DevOps Engineer",
  "Marketing Manager",
];

function AnimatedPlaceholder() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const target = placeholderTitles[idx];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setText(target.slice(0, text.length + 1));
          if (text.length + 1 === target.length) {
            setTimeout(() => setIsDeleting(true), 1500);
          }
        } else {
          setText(target.slice(0, text.length - 1));
          if (text.length === 0) {
            setIsDeleting(false);
            setIdx((prev) => (prev + 1) % placeholderTitles.length);
          }
        }
      },
      isDeleting ? 40 : 80,
    );
    return () => clearTimeout(timeout);
  }, [text, isDeleting, idx]);

  return text || placeholderTitles[0].charAt(0);
}

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

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [heroSearch, setHeroSearch] = useState("");
  const [heroFocused, setHeroFocused] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const { suggestions } = useSearchSuggestions(heroSearch, heroFocused);
  const { data: landingStats } = useLandingStats();
  // console.log("landingStats", landingStats);
  const showSuggestions = heroFocused && heroSearch.trim().length >= 1 && suggestions.length > 0;

  const handleHeroSearch = useCallback((query?: string) => {
    const q = query || heroSearch.trim();
    const base = user ? "/dashboard" : "/jobs";
    if (q) {
      navigate(`${base}?search=${encodeURIComponent(q)}`);
    } else {
      navigate(base);
    }
  }, [heroSearch, navigate, user]);

  return (
    <Layout showFooter={true}>
      {/* Hero Section */}
      <section className="relative py-28 md:py-40 overflow-hidden hero-mesh-bg">
        <ParticleField interactive={false} />
        <FloatingHeroTags />

        {/* Gradient orbs */}
        <div className="absolute top-10 left-[10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        <div
          className="absolute bottom-0 right-[10%] w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-[150px] pointer-events-none animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container max-w-6xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 border border-accent/20 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              Your job search, simplified
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-[32px] sm:text-[40px] md:text-[52px] lg:text-[64px] font-bold text-foreground leading-[1.12] tracking-[-0.02em] mb-6 max-w-[700px] mx-auto"
            >
              Built for the one
              <span className="block hero-gradient-text">Who Gets the Offer.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Search curated job listings, apply with one click, and automatically track all your applications in one
              clean dashboard.
            </motion.p>

            {/* Glowing search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="max-w-xl mx-auto mb-8"
            >
              <div className="relative group" data-interactive>
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-accent/40 via-accent/20 to-purple-500/30 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 blur transition-opacity duration-500" />
                <div className="relative flex items-center h-14 bg-card/80 backdrop-blur-md border border-border/60 rounded-full px-5 shadow-elevated group-hover:border-accent/40 group-focus-within:border-accent/40 transition-all duration-300">
                  <Search className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />
                  <input
                    type="text"
                    value={heroSearch}
                    onChange={(e) => {
                      setHeroSearch(e.target.value);
                      setHighlightedIdx(-1);
                    }}
                    onFocus={() => setHeroFocused(true)}
                    onBlur={() => setTimeout(() => setHeroFocused(false), 150)}
                    onKeyDown={(e) => {
                      if (showSuggestions) {
                        if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIdx(prev => Math.min(prev + 1, suggestions.length - 1)); return; }
                        if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIdx(prev => Math.max(prev - 1, -1)); return; }
                        if (e.key === "Enter" && highlightedIdx >= 0) { e.preventDefault(); handleHeroSearch(suggestions[highlightedIdx].suggestion); return; }
                        if (e.key === "Escape") { setHeroFocused(false); return; }
                      }
                      if (e.key === "Enter") handleHeroSearch();
                    }}
                    placeholder=""
                    className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-transparent"
                    autoComplete="off"
                  />
                  {!heroSearch && (
                    <span className="absolute left-14 text-muted-foreground/60 text-base pointer-events-none truncate">
                      Search for{" "}
                      <span className="text-accent font-medium">
                        <AnimatedPlaceholder />
                      </span>
                    </span>
                  )}
                  <div className="ml-auto shrink-0">
                    <button
                      onClick={() => handleHeroSearch()}
                      className="bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium shadow-glow hover:shadow-[0_0_20px_hsl(var(--accent)/0.4)] transition-shadow"
                    >
                      Search
                    </button>
                  </div>
                </div>
                <SearchSuggestions
                  suggestions={suggestions}
                  isOpen={showSuggestions}
                  onSelect={(s) => handleHeroSearch(s)}
                  highlightedIndex={highlightedIdx}
                  query={heroSearch}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to={user ? "/dashboard" : "/jobs"}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.4)] transition-all duration-300 group btn-glow"
                >
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              </Link>
              {!user && (
                <Link to="/auth">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto rounded-full px-8 border-border/60 hover:bg-secondary backdrop-blur-sm"
                  >
                    Create Account
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>
        </div>

        {/* Stats ticker */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="container max-w-4xl mx-auto px-4 mt-16 relative z-10"
        >
          <div className="flex items-center justify-center gap-8 md:gap-12 text-sm">
            {[
              { value: landingStats?.jobCount ?? 0, label: "Jobs", suffix: "+" },
              { value: landingStats?.companyCount ?? 0, label: "Companies", suffix: "+" },
              { value: landingStats?.userCount ?? 0, label: "Users", suffix: "+" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-2">
                <span className="font-display font-bold text-lg md:text-xl text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </span>
                <span className="text-muted-foreground text-xs md:text-sm">{stat.label}</span>
                {i < 2 && <span className="text-border ml-4 md:ml-6">•</span>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-6 w-6 text-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* About Section */}
      <AboutSection />

      {/* Insights / Blog Section */}
      <InsightsSection />

      {/* PROMO: app is free for everyone — pricing section hidden */}
      {/* <PricingSection /> */}

      {/* Hiring Signals Section */}
      <section className="py-20 border-y border-border/30">
        <div className="container max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                Real-time hiring signals
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                See what's happening in the job market right now with Sociax.tech
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {hiringSignals.map((signal, index) => (
              <ScrollReveal key={signal.title} delay={index * 0.1}>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/50 card-glow tilt-card group">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                    <signal.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-sm mb-1">{signal.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{signal.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything you need to land your next role
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Stop juggling spreadsheets. Sociax.tech keeps everything organized.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 0.12}>
                <div className="p-7 rounded-2xl bg-card border border-border/50 card-glow tilt-card group">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:shadow-[0_0_20px_hsl(var(--accent)/0.15)] transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-display font-bold text-foreground text-xl mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 border-y border-border/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <ScrollReveal>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-5">
                  Streamline your job search
                </h2>
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                  Sociax.tech makes it easy to find, apply, and track opportunities so you can focus on what matters:
                  landing interviews.
                </p>
              </ScrollReveal>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <ScrollReveal key={benefit} delay={i * 0.08}>
                    <li className="flex items-center gap-3 text-foreground">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      <span className="text-lg">{benefit}</span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>
            <ScrollReveal delay={0.2}>
              <div className="flex-1 w-full max-w-md">
                <FeaturedJobCard />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 hero-mesh-bg opacity-50" />
        <ParticleField interactive={false} />
        <div className="container max-w-6xl mx-auto px-4 text-center relative z-10">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-5">
              Ready to start your job search?
            </h2>
            <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg">
              Join thousands of job seekers who use Sociax.tech to find and land their dream jobs.
            </p>
            <Link to="/dashboard">
              <Button
                size="lg"
                className="rounded-full px-10 bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.4)] transition-all duration-300 group btn-glow"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
}
