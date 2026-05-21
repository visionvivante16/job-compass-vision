import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { colors } from "../styles";

const { fontFamily } = loadFont("normal", { weights: ["700", "400"], subsets: ["latin"] });
const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] });

export const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo
  const logoSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  // Main CTA
  const ctaOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaY = spring({ frame: frame - 15, fps, config: { damping: 18 } });

  // URL
  const urlOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlScale = spring({ frame: frame - 30, fps, config: { damping: 15 } });

  // Button
  const btnOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnScale = spring({ frame: frame - 45, fps, config: { damping: 10 } });

  // Floating particles
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const radius = interpolate(frame, [0, 90], [100, 350]);
    const x = Math.cos(angle + frame * 0.02) * radius;
    const y = Math.sin(angle + frame * 0.02) * radius;
    const opacity = interpolate(frame, [10, 30, 70, 90], [0, 0.5, 0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { x, y, opacity, size: 6 + i * 2 };
  });

  // Pulsing glow on CTA
  const pulseGlow = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.3, 0.7]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: i % 2 === 0 ? colors.primary : colors.accent,
            left: 540 + p.x,
            top: 960 + p.y,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Logo */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoSpring})`,
          boxShadow: `0 0 80px ${colors.primary}40`,
          marginBottom: 30,
        }}
      >
        <span style={{ fontFamily: displayFont, fontWeight: 700, fontSize: 56, color: "white" }}>
          S
        </span>
      </div>

      {/* CTA text */}
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 50,
          color: colors.text,
          textAlign: "center",
          opacity: ctaOpacity,
          transform: `translateY(${interpolate(ctaY, [0, 1], [30, 0])}px)`,
          marginBottom: 30,
          lineHeight: 1.3,
        }}
      >
        Start applying{"\n"}
        <span
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          smarter today
        </span>
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          transform: `scale(${urlScale})`,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
          padding: "18px 50px",
          borderRadius: 50,
          boxShadow: `0 0 ${40 * pulseGlow}px ${colors.primary}60`,
          marginBottom: 30,
        }}
      >
        <span style={{ fontFamily: displayFont, fontWeight: 700, fontSize: 36, color: "white" }}>
          sociax.tech
        </span>
      </div>

      {/* Free badge */}
      <div
        style={{
          opacity: btnOpacity,
          transform: `scale(${btnScale})`,
          fontFamily,
          fontSize: 22,
          color: colors.textMuted,
        }}
      >
        Free to use • No credit card needed
      </div>
    </AbsoluteFill>
  );
};
