import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";

type Article = {
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
  url: string;
};

const articles: Article[] = [
  {
    title: "Indeed Alternatives That Actually Deliver in 2026",
    excerpt:
      "Duplicate listings, ghost jobs, and a feed so cluttered it feels like a needle in a haystack. Here's what actually works.",
    category: "Company Rankings",
    readTime: "6 min read",
    date: "Apr 21, 2026",
    image:
      "https://firebasestorage.googleapis.com/v0/b/joinnextdev.firebasestorage.app/o/blogImages%2F6KL74MDbX1vABlo1Shwh%2Findeed-alternatives-that-actually-deliver-in-2026.png?alt=media&token=2f226dd1-88e9-470a-965c-483753e42388",
    url: "https://www.withnextseo.com/sociax/indeed-alternatives-that-actually-deliver-in-2026",
  },
  {
    title: "LinkedIn vs Sociax: Which Wins for Job Seekers?",
    excerpt:
      "LinkedIn is the default reflex in 2026. But is it actually the best place to find your next role? We break it down.",
    category: "Competitor Analysis",
    readTime: "6 min read",
    date: "Apr 20, 2026",
    image:
      "https://firebasestorage.googleapis.com/v0/b/joinnextdev.firebasestorage.app/o/blogImages%2F6KL74MDbX1vABlo1Shwh%2Flinkedin-vs-sociax-which-wins-for-job-seekers.png?alt=media&token=851fbcb5-95dd-4d21-8290-9240f9657b17",
    url: "https://www.withnextseo.com/sociax/linkedin-vs-sociax-which-wins-for-job-seekers",
  },
  {
    title: "Glassdoor vs Sociax: Which Wins for Job Seekers?",
    excerpt:
      "Glassdoor built its name on salary transparency and reviews. But for actually applying to jobs in 2026, here's how it stacks up.",
    category: "Competitor Analysis",
    readTime: "7 min read",
    date: "Apr 19, 2026",
    image:
      "https://firebasestorage.googleapis.com/v0/b/joinnextdev.firebasestorage.app/o/blogImages%2F6KL74MDbX1vABlo1Shwh%2Fglassdoor-vs-sociax-which-wins-for-job-seekers.png?alt=media&token=73786f03-95a1-4c0d-96ad-1250c1c20f6d",
    url: "https://www.withnextseo.com/sociax/glassdoor-vs-sociax-which-wins-for-job-seekers",
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

export function InsightsSection() {
  return (
    <section className="py-24 border-y border-border/30">
      <div className="container max-w-6xl mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
              <BookOpen className="h-3.5 w-3.5" />
              Insights & Analysis
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Curated job search strategies
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Tips, comparisons, and insights to help you find the right role and apply smarter.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((article, i) => (
            <ScrollReveal key={article.url} delay={0.1 + i * 0.1}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-accent/40 hover:shadow-[0_0_30px_-10px_hsl(var(--accent)/0.2)] transition-all duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={article.image}
                    alt={article.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex flex-col h-[calc(100%-theme(spacing.40))]">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                      {article.category}
                    </span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="font-display font-bold text-foreground text-lg mb-2 leading-snug group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                    {article.excerpt}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    Read article
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.4}>
          <div className="text-center mt-10">
            <a
              href="https://www.withnextseo.com/sociax"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-accent transition-colors"
            >
              View all articles
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
