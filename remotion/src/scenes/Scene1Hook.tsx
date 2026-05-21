import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { colors } from "../styles";

const { fontFamily } = loadFont("normal", { weights: ["700", "400"], subsets: ["latin"] });

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Emoji animation
  const emojiScale = spring({ frame: frame - 5, fps, config: { damping: 12 } });
  const emojiRotate = interpolate(frame, [5, 30], [-10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Text line 1
  const line1Y = spring({ frame: frame - 15, fps, config: { damping: 18 } });
  const line1Opacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Text line 2
  const line2Y = spring({ frame: frame - 25, fps, config: { damping: 18 } });
  const line2Opacity = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Blinking cursor
  const cursorOpacity = Math.sin(frame * 0.3) > 0 ? 1 : 0;

  // Search bar animation
  const searchBarScale = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  const searchBarOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "No results" fade in
  const noResultsOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Frustrated emoji */}
      <div
        style={{
          fontSize: 100,
          transform: `scale(${emojiScale}) rotate(${emojiRotate}deg)`,
          marginBottom: 40,
        }}
      >
        😩
      </div>

      {/* Main text */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 56,
            color: colors.text,
            lineHeight: 1.3,
            opacity: line1Opacity,
            transform: `translateY(${interpolate(line1Y, [0, 1], [40, 0])}px)`,
          }}
        >
          Struggling to find
        </div>
        <div
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1.3,
            opacity: line2Opacity,
            transform: `translateY(${interpolate(line2Y, [0, 1], [40, 0])}px)`,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          real jobs?
        </div>
      </div>

      {/* Fake empty search bar */}
      <div
        style={{
          marginTop: 60,
          width: 800,
          opacity: searchBarOpacity,
          transform: `scale(${searchBarScale})`,
        }}
      >
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.primary}30`,
            borderRadius: 16,
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 28, opacity: 0.5 }}>🔍</span>
          <span style={{ fontFamily, fontSize: 26, color: colors.textMuted }}>
            Entry level data analyst...
            <span style={{ opacity: cursorOpacity, color: colors.primary }}>|</span>
          </span>
        </div>
        {/* No results */}
        <div
          style={{
            opacity: noResultsOpacity,
            textAlign: "center",
            marginTop: 20,
            fontFamily,
            fontSize: 22,
            color: colors.danger,
          }}
        >
          😔 0 relevant results found
        </div>
      </div>
    </AbsoluteFill>
  );
};
