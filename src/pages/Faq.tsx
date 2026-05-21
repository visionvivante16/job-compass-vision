import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { HelpCircle } from "lucide-react";
import { Layout } from "@/components/Layout";

const faqs = [
  {
    q: "Is Sociax really free to use?",
    a: "Yes. Searching jobs, saving roles, tracking applications, and our core AI tools (resume tailoring, cover letters, ATS scoring) are free. We only charge for premium add-ons like unlimited applications and advanced auto-apply.",
  },
  {
    q: "Where do the job listings come from?",
    a: "We aggregate roles directly from company career pages and trusted sources. Every apply link is verified daily, so you go straight to the company — no recruiter middlemen, no dead links.",
  },
  {
    q: "Who is Sociax built for?",
    a: "Job hunters with 0–5 years of experience — fresh grads, early-career professionals, career switchers, and international students looking for global opportunities.",
  },
  {
    q: "How does the AI resume and cover letter work?",
    a: "Upload your resume once. Our AI tailors it to each role you apply to, optimizes it for ATS systems, and can generate matching cover letters in seconds.",
  },
  {
    q: "Do you sell my data?",
    a: "Never. We do not sell your data, share it with recruiters, or send you spam. Your profile and resume stay private to you.",
  },
  {
    q: "How often are new jobs added?",
    a: "Thousands of new roles are ingested every day. We continuously refresh listings so you always see what is actively hiring.",
  },
  {
    q: "Can I get notified about new jobs?",
    a: "Yes. Set up daily or weekly digests for your favorite roles and locations, and we will email you the freshest matches.",
  },
];

export default function Faq() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <Layout>
      <section id="faq" className="py-24 border-y border-border/30 bg-secondary/20">
        <div className="container max-w-3xl mx-auto px-4">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-medium mb-5 border border-accent/20">
              <HelpCircle className="h-3.5 w-3.5" />
              <span style={{ letterSpacing: "2px" }}>FAQ</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Frequently asked <span className="hero-gradient-text">questions</span>
            </h2>
            <p className="text-muted-foreground">Everything you need to know before you start.</p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/50 rounded-xl bg-card px-5 card-glow"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline py-5">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </Layout>
  );
}