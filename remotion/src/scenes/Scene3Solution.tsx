import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { colors } from "../styles";

const { fontFamily } = loadFont("normal", { weights: ["700", "400"], subsets: ["latin"] });
const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] });

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo "S" animation
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 150 } });
  const logoRotate = interpolate(frame, [5, 35], [-180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Introducing" text
  const introOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const introY = spring({ frame: frame - 20, fps, config: { damping: 20 } });

  // Brand name
  const nameOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nameScale = spring({ frame: frame - 35, fps, config: { damping: 12, stiffness: 100 } });

  // Tagline
  const tagOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Glow pulse
  const glowSize = interpolate(frame, [35, 90], [0, 400]);
  const glowOpacity = interpolate(frame, [35, 60, 90], [0, 0.4, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Glow burst */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}60 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: 32,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          boxShadow: `0 0 60px ${colors.primary}50`,
          marginBottom: 40,
        }}
      >
        <span
          style={{
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: 80,
            color: "white",
          }}
        >
          S
        </span>
      </div>

      {/* Introducing */}
      <div
        style={{
          fontFamily,
          fontSize: 28,
          color: colors.textMuted,
          letterSpacing: 6,
          textTransform: "uppercase",
          opacity: introOpacity,
          transform: `translateY(${interpolate(introY, [0, 1], [20, 0])}px)`,
          marginBottom: 16,
        }}
      >
        Introducing
      </div>

      {/* Brand name */}
      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 700,
          fontSize: 72,
          opacity: nameOpacity,
          transform: `scale(${nameScale})`,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Sociax.tech
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily,
          fontSize: 26,
          color: colors.textMuted,
          marginTop: 20,
          opacity: tagOpacity,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Your all-in-one job search companion
      </div>
    </AbsoluteFill>
  );
};
