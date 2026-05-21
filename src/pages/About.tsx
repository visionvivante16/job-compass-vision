import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  ChevronDown,
  Sparkles,
  Heart,
  Compass,
  Hammer,
  Users,
  Coffee,
  Rocket,
  Mail,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ParticleField } from "@/components/about/ParticleField";

export default function About() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "About — Sociax | Built for Job Hunters";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  const scrollToStory = () => {
    document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @keyframes about-bounce-arrow {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(8px); opacity: 1; }
        }
        @keyframes about-cta-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        {/* SECTION 1 — Hero */}
        <section className="relative h-screen w-full overflow-hidden hero-mesh-bg">
          <ParticleField />
          <div className="absolute top-10 left-[10%] w-[500px] h-[500px] bg-accent/20 dark:bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
          <div
            className="absolute bottom-0 right-[10%] w-[600px] h-[600px] bg-accent/15 dark:bg-accent/5 rounded-full blur-[150px] pointer-events-none animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 border border-accent/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                <span style={{ letterSpacing: "3px", fontSize: "11px" }}>OUR STORY</span>
              </div>

              <h1 className="font-display font-bold tracking-[-0.02em] leading-[1.08] max-w-[820px] mx-auto">
                <span className="block text-foreground text-[36px] sm:text-[52px] md:text-[64px]">
                  Two job hunters
                </span>
                <span className="block text-foreground text-[36px] sm:text-[52px] md:text-[64px]">
                  who got tired of
                </span>
                <span className="block hero-gradient-text italic text-[36px] sm:text-[52px] md:text-[64px]">
                  waiting for a callback.
                </span>
              </h1>

              <p className="mt-8 mx-auto text-lg text-muted-foreground max-w-[560px] leading-relaxed">
                So we stopped applying. And started building.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToStory}
                  className="rounded-full px-8 border-border/60 hover:bg-secondary backdrop-blur-sm"
                >
                  Read the story
                  <ArrowDown className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <ChevronDown
              className="h-6 w-6 text-muted-foreground/50"
              style={{ animation: "about-bounce-arrow 1.6s ease-in-out infinite" }}
            />
          </div>
        </section>

        {/* SECTION 2 — Origin story (narrative) */}
        <section id="our-story" className="py-28 px-6">
          <div className="max-w-[680px] mx-auto">
            <p className="text-accent font-medium text-sm uppercase tracking-[3px] text-center mb-6">
              How it started
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-12 leading-tight">
              We were sending 200 applications a week and{" "}
              <span className="hero-gradient-text">hearing nothing back.</span>
            </h2>
            <div className="space-y-6 text-muted-foreground text-[17px] leading-[1.8]">
              <p>
                It was 2024. Both of us were fresh out of school, sitting in cafés with cold coffee
                and warm laptops, refreshing inboxes that never refreshed back.
              </p>
              <p>
                Every job board promised the same thing — opportunity. What they delivered was
                spam from staffing agencies, six-year-old listings still marked "new", and apply
                buttons that pointed to dead pages.
              </p>
              <p>
                The tools meant to help us were worse. AI resume builders behind paywalls. ATS
                checkers that scored a blank page at 80%. Cover letter generators that could not
                spell the company name.
              </p>
              <p className="text-foreground font-medium">
                One night we stopped applying. We opened an editor instead, and started writing
                the platform we wished existed.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — Timeline */}
        <section className="py-28 px-6 border-y border-border/30 bg-secondary/20">
          <div className="max-w-[820px] mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-16">
              The journey, <span className="hero-gradient-text">so far.</span>
            </h2>
            <div className="relative">
              <div className="absolute left-[15px] md:left-1/2 top-2 bottom-2 w-px bg-border md:-translate-x-px" />
              {[
                { when: "January 2026", title: "First commit", body: "A barebones job scraper running on a personal laptop. 12 jobs. All broken links." },
                { when: "February 2026", title: "Apply links that actually work", body: "Built the verification layer. Every link tested daily. No more dead ends." },
                { when: "March 2026", title: "AI tools, free tier", body: "Resume tailoring, cover letters, ATS scoring — opened to anyone, no card required." },
                { when: "April 2026", title: "First 1,000 hunters", body: "Word spread on Reddit and Discord. Real people landing real interviews." },
                { when: "Now", title: "50,000+ live roles", body: "Built for 0–5 years experience. Global. And still completely free to start." },
              ].map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative pl-12 md:pl-0 md:grid md:grid-cols-2 md:gap-12 mb-10 last:mb-0"
                >
                  <div className={`md:text-right ${i % 2 === 0 ? "" : "md:order-2 md:text-left"}`}>
                    <div className="text-accent text-xs font-semibold uppercase tracking-[2px] mb-1">{m.when}</div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">{m.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{m.body}</p>
                  </div>
                  <div className="absolute left-0 top-1 md:left-1/2 md:-translate-x-1/2 h-8 w-8 rounded-full bg-accent flex items-center justify-center shadow-glow ring-4 ring-background">
                    <div className="h-2 w-2 rounded-full bg-accent-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4 — What we believe */}
        <section className="py-28 px-6">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-accent font-medium text-sm uppercase tracking-[3px] text-center mb-4">
              What we believe
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-14">
              The principles we build by.
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  icon: Heart,
                  title: "Candidates first. Always.",
                  body: "We do not sell your data. We do not lock essential tools behind paywalls. If it helps you get hired, it should be free.",
                },
                {
                  icon: Compass,
                  title: "Direct or nothing.",
                  body: "Every apply link goes to the company itself. No middlemen, no recruiter spam, no listings stolen from somewhere else.",
                },
                {
                  icon: Hammer,
                  title: "Ship weekly, not yearly.",
                  body: "We talk to job hunters every week and ship what they ask for. The product you see today did not exist last month.",
                },
                {
                  icon: Users,
                  title: "Built for the underdogs.",
                  body: "Fresh grads. Career switchers. International students. The people other platforms forgot — that is who we build for.",
                },
              ].map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="p-7 rounded-2xl bg-card border border-border/50 card-glow flex gap-5 items-start"
                  >
                    <div className="shrink-0 h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground text-lg mb-2">{p.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-[15px]">{p.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 5 — Behind the scenes */}
        <section className="py-28 px-6 border-y border-border/30 bg-secondary/20">
          <div className="max-w-[1000px] mx-auto">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              {[
                { icon: Coffee, stat: "2", label: "People on the team" },
                { icon: Rocket, stat: "47", label: "Shipped releases this year" },
                { icon: Mail, stat: "< 12h", label: "Average support reply time" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="p-8"
                  >
                    <Icon className="h-7 w-7 text-accent mx-auto mb-4" />
                    <div className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">{s.stat}</div>
                    <div className="text-muted-foreground text-sm uppercase tracking-[2px]">{s.label}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 6 — Team */}
        <section className="py-28 px-6">
          <div className="max-w-[1000px] mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              The two of us. <span className="hero-gradient-text">That is the whole team.</span>
            </h2>
            <p className="text-muted-foreground max-w-[620px] mx-auto mb-14">
              No investors. No marketing department. Just two builders, a backlog, and a lot of coffee.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { name: "Anil Kumar", role: "Founder", title: "Builder" },
                { name: "Karthik Reddy", role: "Co-founder", title: "Growth" },
              ].map((p, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-8 text-center bg-card border border-border/50 card-glow tilt-card transition-all duration-300"
                >
                  <div className="mx-auto h-24 w-24 rounded-full mb-5 flex items-center justify-center text-2xl font-bold bg-accent text-accent-foreground shadow-glow ring-2 ring-accent/30 ring-offset-2 ring-offset-card">
                    {p.name[0]}
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground">{p.name}</h3>
                  <div className="text-sm text-accent mt-1">{p.role}</div>
                  <div className="text-sm text-muted-foreground mt-1">{p.title}</div>
                </div>
              ))}
            </div>
            <p className="mt-14 text-muted-foreground">
              Want to say hi, share feedback, or just vent about job hunting? →{" "}
              <a href="mailto:hello@sociax.tech" className="text-accent hover:underline font-medium">
                hello@sociax.tech
              </a>
            </p>
          </div>
        </section>

        {/* SECTION 7 — Final CTA */}
        <section
          className="py-28 px-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--accent) / 0.25) 50%, hsl(var(--background)) 100%)",
            backgroundSize: "400% 400%",
            animation: "about-cta-flow 8s ease infinite",
          }}
        >
          <div className="relative z-10 max-w-[800px] mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight tracking-[-0.02em]">
              Now go land that role.
            </h2>
            <p className="mt-5 text-muted-foreground text-lg">
              The platform we wished existed is waiting for you.
            </p>
            <Link to="/" className="inline-block mt-10">
              <Button
                size="lg"
                className="rounded-full px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.4)] transition-all duration-300 group btn-glow"
              >
                Start for free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
