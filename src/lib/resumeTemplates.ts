/**
 * Resume template definitions.
 * Each template controls fonts, accent colors, spacing, and section header style
 * for both preview (ResumeCanvas) and exported PDF/DOCX.
 */

export type ResumeTemplateId = "classic" | "modern" | "compact";

export interface ResumeTemplate {
  id: ResumeTemplateId;
  label: string;
  tagline: string;
  /** rgb tuple for accent color (used by jsPDF) */
  accentRgb: [number, number, number];
  /** hex without # for DOCX */
  accentHex: string;
  /** css color */
  accentCss: string;
  /** primary font family for preview */
  fontFamily: string;
  /** docx font name */
  docxFont: string;
  /** jsPDF font name (must be one of helvetica/times/courier) */
  pdfFont: "helvetica" | "times" | "courier";
  /** base body font size in pt */
  bodySize: number;
  /** name size in pt */
  nameSize: number;
  /** section header style */
  headerStyle: "underline-allcaps" | "left-accent-bar" | "thin-grey-divider";
  /** bullet glyph for preview */
  bulletGlyph: string;
  /** how tight the spacing is — multiplier for line gap */
  spacing: "tight" | "normal" | "loose";
}

export const RESUME_TEMPLATES: Record<ResumeTemplateId, ResumeTemplate> = {
  classic: {
    id: "classic",
    label: "Classic",
    tagline: "Best for Finance, Law, Consulting",
    accentRgb: [0, 0, 0],
    accentHex: "000000",
    accentCss: "#000000",
    fontFamily: "Georgia, 'Times New Roman', serif",
    docxFont: "Georgia",
    pdfFont: "times",
    bodySize: 11,
    nameSize: 24,
    headerStyle: "underline-allcaps",
    bulletGlyph: "–",
    spacing: "normal",
  },
  modern: {
    id: "modern",
    label: "Modern",
    tagline: "Best for Tech, Product, Design",
    accentRgb: [13, 148, 136], // teal-600
    accentHex: "0D9488",
    accentCss: "hsl(174 72% 42%)",
    fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
    docxFont: "Inter",
    pdfFont: "helvetica",
    bodySize: 11,
    nameSize: 26,
    headerStyle: "left-accent-bar",
    bulletGlyph: "▪",
    spacing: "loose",
  },
  compact: {
    id: "compact",
    label: "Compact",
    tagline: "Best for experienced candidates",
    accentRgb: [80, 80, 80],
    accentHex: "555555",
    accentCss: "#555555",
    fontFamily: "Calibri, 'Helvetica Neue', Arial, sans-serif",
    docxFont: "Calibri",
    pdfFont: "helvetica",
    bodySize: 9,
    nameSize: 16,
    headerStyle: "thin-grey-divider",
    bulletGlyph: "·",
    spacing: "tight",
  },
};

export const DEFAULT_TEMPLATE_ID: ResumeTemplateId = "modern";

export function getTemplate(id: string | null | undefined): ResumeTemplate {
  if (id && id in RESUME_TEMPLATES) return RESUME_TEMPLATES[id as ResumeTemplateId];
  return RESUME_TEMPLATES[DEFAULT_TEMPLATE_ID];
}
