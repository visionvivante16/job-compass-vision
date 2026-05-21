import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { colors } from "../styles";

const { fontFamily } = loadFont("normal", { weights: ["700", "600", "400"], subsets: ["latin"] });

export const Scene5Extension: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Browser mockup
  const browserScale = spring({ frame: frame - 5, fps, config: { damping: 18 } });
  const browserOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Auto-fill animation - fields filling one by one
  const field1Fill = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const field2Fill = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const field3Fill = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Check marks
  const check1 = spring({ frame: frame - 42, fps, config: { damping: 10 } });
  const check2 = spring({ frame: frame - 52, fps, config: { damping: 10 } });
  const check3 = spring({ frame: frame - 62, fps, config: { damping: 10 } });

  // CTA text
  const ctaOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fields = [
    { label: "Full Name", value: "Alex Johnson", fill: field1Fill, check: check1 },
    { label: "Email", value: "alex@email.com", fill: field2Fill, check: check2 },
    { label: "Resume", value: "resume_v3.pdf", fill: field3Fill, check: check3 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 50 }}>
      {/* Header */}
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 42,
          color: colors.text,
          textAlign: "center",
          marginBottom: 16,
          opacity: browserOpacity,
        }}
      >
        Apply in seconds ⚡
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 24,
          color: colors.textMuted,
          textAlign: "center",
          marginBottom: 50,
          opacity: browserOpacity,
        }}
      >
        Chrome Extension Auto-Fill
      </div>

      {/* Browser mockup */}
      <div
        style={{
          width: 850,
          opacity: browserOpacity,
          transform: `scale(${browserScale})`,
          borderRadius: 20,
          overflow: "hidden",
          border: `1px solid ${colors.primary}30`,
          boxShadow: `0 20px 60px ${colors.bg}80`,
        }}
      >
        {/* Browser bar */}
        <div
          style={{
            background: colors.bgLight,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#EF4444" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#F59E0B" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#22C55E" }} />
          </div>
          <div
            style={{
              flex: 1,
              background: `${colors.bg}80`,
              borderRadius: 8,
              padding: "8px 16px",
              fontFamily,
              fontSize: 16,
              color: colors.textMuted,
            }}
          >
            careers.company.com/apply
          </div>
        </div>

        {/* Form area */}
        <div style={{ background: colors.cardBg, padding: "32px 36px" }}>
          <div style={{ fontFamily, fontWeight: 600, fontSize: 24, color: colors.text, marginBottom: 28 }}>
            Application Form
          </div>

          {fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily, fontSize: 16, color: colors.textMuted, marginBottom: 6 }}>{f.label}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: `${colors.bg}60`,
                  border: `1px solid ${f.fill > 0.5 ? colors.accent : colors.primary}30`,
                  borderRadius: 10,
                  padding: "14px 18px",
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: 20,
                    color: colors.text,
                    opacity: f.fill,
                    flex: 1,
                  }}
                >
                  {f.value}
                </span>
                <span style={{ fontSize: 22, opacity: f.check, transform: `scale(${f.check})`, color: colors.accent }}>
                  ✓
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Speed badge */}
      <div
        style={{
          marginTop: 40,
          opacity: ctaOpacity,
          fontFamily,
          fontWeight: 600,
          fontSize: 22,
          color: colors.accent,
          background: `${colors.accent}15`,
          border: `1px solid ${colors.accent}30`,
          padding: "12px 28px",
          borderRadius: 40,
        }}
      >
        🚀 3 seconds to apply
      </div>
    </AbsoluteFill>
  );
};
