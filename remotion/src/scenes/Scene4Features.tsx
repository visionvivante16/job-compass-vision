import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { colors } from "../styles";

const { fontFamily } = loadFont("normal", { weights: ["700", "600", "400"], subsets: ["latin"] });

const features = [
  { icon: "💼", title: "10,000+ Full-Time Jobs", sub: "Curated & verified listings" },
  { icon: "🔗", title: "Direct Career Pages", sub: "No middlemen, no redirects" },
  { icon: "🛂", title: "OPT & Sponsorship", sub: "Visa-friendly job filters" },
  { icon: "📊", title: "ATS Resume Check", sub: "Score & improve your resume" },
  { icon: "📝", title: "Tailored Resumes", sub: "Human-like, job-specific" },
  { icon: "💌", title: "Cover Letters + Prep", sub: "AI interview preparation" },
];

const FeatureCard: React.FC<{ icon: string; title: string; sub: string; index: number }> = ({
  icon, title, sub, index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = index * 5;

  const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [50, 0])}px) scale(${interpolate(cardSpring, [0, 1], [0.9, 1])})`,
        background: colors.cardBg,
        border: `1px solid ${colors.primary}25`,
        borderRadius: 20,
        padding: "28px 30px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        width: "100%",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 26, color: colors.text, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontFamily, fontSize: 20, color: colors.textMuted }}>
          {sub}
        </div>
      </div>
    </div>
  );
};

export const Scene4Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, config: { damping: 20 } });
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll the features up as time progresses
  const scrollY = interpolate(frame, [30, 180], [0, -120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", padding: "80px 50px" }}>
      {/* Header */}
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 44,
          color: colors.text,
          textAlign: "center",
          marginBottom: 50,
          opacity: headerOpacity,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        Everything you need ✨
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          width: "100%",
          transform: `translateY(${scrollY}px)`,
        }}
      >
        {features.map((f, i) => (
          <Sequence key={i} from={10}>
            <FeatureCard {...f} index={i} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
