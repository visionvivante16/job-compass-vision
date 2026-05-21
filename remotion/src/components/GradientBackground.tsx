import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors } from "../styles";

export const GradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const hueShift = interpolate(frame, [0, 720], [0, 30]);
  const orbX = interpolate(frame, [0, 720], [-100, 200], { extrapolateRight: "clamp" });
  const orbY = interpolate(frame, [0, 360, 720], [400, 800, 500]);
  const orb2X = interpolate(frame, [0, 720], [800, 400]);
  const orb2Y = interpolate(frame, [0, 360, 720], [1400, 1000, 1500]);

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      {/* Gradient orbs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}33 0%, transparent 70%)`,
          left: orbX,
          top: orbY,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}28 0%, transparent 70%)`,
          left: orb2X,
          top: orb2Y,
          filter: "blur(80px)",
        }}
      />
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${colors.primary}08 1px, transparent 1px), linear-gradient(90deg, ${colors.primary}08 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: interpolate(frame, [0, 30], [0, 0.5], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
};
