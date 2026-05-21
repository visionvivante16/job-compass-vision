import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { colors } from "../styles";

const { fontFamily } = loadFont("normal", { weights: ["700", "600"], subsets: ["latin"] });

const problems = [
  { emoji: "🚫", text: "Fake jobs", delay: 0 },
  { emoji: "⏰", text: "Expired listings", delay: 12 },
  { emoji: "🔄", text: "Endless redirects", delay: 24 },
  { emoji: "📄", text: "No ATS feedback", delay: 36 },
];

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headerY = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Header */}
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 48,
          color: colors.text,
          textAlign: "center",
          marginBottom: 60,
          opacity: headerOpacity,
          transform: `translateY(${interpolate(headerY, [0, 1], [30, 0])}px)`,
        }}
      >
        The job search is{" "}
        <span style={{ color: colors.danger }}>broken</span>
      </div>

      {/* Problem cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 800 }}>
        {problems.map((p, i) => {
          const cardSpring = spring({ frame: frame - p.delay - 10, fps, config: { damping: 15 } });
          const cardOpacity = interpolate(frame, [p.delay + 10, p.delay + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const strikeWidth = interpolate(frame, [p.delay + 30, p.delay + 45], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                opacity: cardOpacity,
                transform: `translateX(${interpolate(cardSpring, [0, 1], [-60, 0])}px)`,
                background: `${colors.danger}12`,
                border: `1px solid ${colors.danger}30`,
                borderRadius: 16,
                padding: "22px 32px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                position: "relative",
              }}
            >
              <span style={{ fontSize: 36 }}>{p.emoji}</span>
              <span
                style={{
                  fontFamily,
                  fontWeight: 600,
                  fontSize: 32,
                  color: colors.text,
                }}
              >
                {p.text}
              </span>
              {/* Strike-through */}
              <div
                style={{
                  position: "absolute",
                  left: 90,
                  top: "50%",
                  height: 3,
                  width: `${strikeWidth}%`,
                  background: colors.danger,
                  borderRadius: 2,
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
