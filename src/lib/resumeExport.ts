import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import {
  EditableResume,
  buildResumeFilename,
  resumeToPlainText,
  stripHtml,
} from "./resumeEditor";
import { getTemplate, ResumeTemplateId, ResumeTemplate } from "./resumeTemplates";

/* Plain text export */
export function exportResumeAsText(
  resume: EditableResume,
  jobTitle: string,
  company: string,
) {
  const text = resumeToPlainText(resume);
  const filename = buildResumeFilename(resume.header.full_name, jobTitle, company, "txt");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

export async function copyResumeToClipboard(resume: EditableResume): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
    return true;
  } catch {
    return false;
  }
}

/* PDF — direct text via jsPDF, styled per template. */
const PT_PER_IN = 72;
const PAGE_W = 8.5 * PT_PER_IN;
const PAGE_H = 11 * PT_PER_IN;

export function exportResumeAsPdf(
  resume: EditableResume,
  jobTitle: string,
  company: string,
  templateId?: ResumeTemplateId,
) {
  const tpl = getTemplate(templateId);
  const isCompact = tpl.id === "compact";
  const MARGIN_X = (isCompact ? 0.4 : 0.5) * PT_PER_IN;
  const MARGIN_Y = (isCompact ? 0.4 : 0.5) * PT_PER_IN;
  const lineMul = tpl.spacing === "tight" ? 1.18 : tpl.spacing === "loose" ? 1.32 : 1.25;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setProperties({ title: "" });

  let y = MARGIN_Y;

  const ensureRoom = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_Y) {
      doc.addPage();
      y = MARGIN_Y;
    }
  };

  const writeWrapped = (
    text: string,
    opts: { size: number; bold?: boolean; indent?: number; gap?: number },
  ) => {
    if (!text) return;
    doc.setFont(tpl.pdfFont, opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size);
    doc.setTextColor(0, 0, 0);
    const indent = opts.indent || 0;
    const maxW = PAGE_W - MARGIN_X * 2 - indent;
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureRoom(opts.size + 2);
      doc.text(line, MARGIN_X + indent, y);
      y += opts.size * lineMul;
    }
    if (opts.gap) y += opts.gap;
  };

  const sectionTitle = (title: string) => {
    ensureRoom(28);
    y += isCompact ? 2 : 4;
    doc.setFont(tpl.pdfFont, "bold");
    doc.setFontSize(tpl.id === "modern" ? 11.5 : 11);
    if (tpl.headerStyle === "underline-allcaps") {
      doc.setTextColor(0, 0, 0);
      doc.text(title.toUpperCase(), MARGIN_X, y);
      y += 3;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
      y += 10;
    } else if (tpl.headerStyle === "left-accent-bar") {
      const [r, g, b] = tpl.accentRgb;
      doc.setFillColor(r, g, b);
      doc.rect(MARGIN_X, y - 9, 3, 11, "F");
      doc.setTextColor(r, g, b);
      doc.text(title.toUpperCase(), MARGIN_X + 8, y);
      y += 12;
    } else {
      // thin grey divider
      doc.setTextColor(0, 0, 0);
      doc.text(title.toUpperCase(), MARGIN_X, y);
      y += 2;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
      y += 8;
    }
  };

  // Header
  doc.setTextColor(0, 0, 0);
  if (tpl.id === "modern") {
    const [r, g, b] = tpl.accentRgb;
    doc.setTextColor(r, g, b);
  }
  doc.setFont(tpl.pdfFont, "bold");
  doc.setFontSize(tpl.nameSize);
  const nameW = doc.getTextWidth(resume.header.full_name || "");
  const nameX = tpl.id === "modern" ? MARGIN_X : (PAGE_W - nameW) / 2;
  doc.text(resume.header.full_name || "", nameX, y + tpl.nameSize * 0.75);
  y += tpl.nameSize + 4;

  doc.setTextColor(0, 0, 0);
  if (resume.header.contact_line) {
    doc.setFont(tpl.pdfFont, "normal");
    doc.setFontSize(9.5);
    const contactW = doc.getTextWidth(resume.header.contact_line);
    const cX = tpl.id === "modern" ? MARGIN_X : (PAGE_W - contactW) / 2;
    doc.text(resume.header.contact_line, cX, y + 8);
    y += 16;
  }
  y += isCompact ? 0 : 4;

  const sectionsById = new Map(resume.sections.map((s) => [s.id, s]));

  const renderSummary = () => {
    if (!resume.visibility.summary || !resume.summary?.trim()) return;
    sectionTitle("Summary");
    writeWrapped(stripHtml(resume.summary).trim(), { size: tpl.bodySize, gap: 4 });
  };

  const renderSkills = () => {
    if (!resume.visibility.skills || !resume.skills.length) return;
    sectionTitle("Skills");
    writeWrapped(resume.skills.join(" • "), { size: tpl.bodySize, gap: 4 });
  };

  const renderCustom = (sectionId: string) => {
    const section = sectionsById.get(sectionId);
    if (!section || !section.visible || !section.items.length) return;
    sectionTitle(section.title);
    for (const item of section.items) {
      ensureRoom(28);
      const headerLeft = [item.heading, item.subheading].filter(Boolean).join(" — ");
      doc.setFont(tpl.pdfFont, "bold");
      doc.setFontSize(tpl.bodySize);
      doc.setTextColor(0, 0, 0);
      doc.text(headerLeft, MARGIN_X, y);
      if (item.date) {
        doc.setFont(tpl.pdfFont, "normal");
        doc.setFontSize(9.5);
        const dW = doc.getTextWidth(item.date);
        doc.text(item.date, PAGE_W - MARGIN_X - dW, y);
      }
      y += 12;
      for (const b of item.bullets) {
        const text = stripHtml(b.text).trim();
        if (!text) continue;
        ensureRoom(13);
        doc.setFont(tpl.pdfFont, "normal");
        doc.setFontSize(tpl.bodySize - 0.5);
        // Draw bullet glyph as a shape so it renders consistently across PDF fonts
        if (tpl.id === "modern") {
          const [r, g, b2] = tpl.accentRgb;
          doc.setFillColor(r, g, b2);
          doc.rect(MARGIN_X + 6, y - 5, 4, 4, "F");
        } else if (tpl.id === "compact") {
          doc.setFillColor(0, 0, 0);
          doc.circle(MARGIN_X + 8, y - 3, 1.1, "F");
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text("–", MARGIN_X + 6, y);
        }
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(text, PAGE_W - MARGIN_X * 2 - 18);
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) ensureRoom(11);
          doc.text(lines[i], MARGIN_X + 18, y);
          y += isCompact ? 10 : 11;
        }
      }
      y += isCompact ? 2 : 3;
    }
  };

  for (const tok of resume.order || []) {
    if (tok === "summary") renderSummary();
    else if (tok === "skills") renderSkills();
    else renderCustom(tok.sectionId);
  }

  const filename = buildResumeFilename(resume.header.full_name, jobTitle, company, "pdf");
  doc.save(filename);
}

/* DOCX — styled per template */
function p(opts: {
  text: string;
  bold?: boolean;
  size?: number;
  alignment?: keyof typeof AlignmentType;
  spacingBefore?: number;
  spacingAfter?: number;
  bullet?: boolean;
  font?: string;
  color?: string;
}) {
  return new Paragraph({
    alignment: AlignmentType[opts.alignment || "LEFT"] as any,
    spacing: { before: opts.spacingBefore || 0, after: opts.spacingAfter || 0 },
    bullet: opts.bullet ? { level: 0 } : undefined,
    children: [
      new TextRun({
        text: opts.text,
        bold: opts.bold,
        size: opts.size || 22,
        font: opts.font || "Calibri",
        color: opts.color || "000000",
      }),
    ],
  });
}

function sectionHeader(title: string, tpl: ResumeTemplate): Paragraph {
  if (tpl.headerStyle === "left-accent-bar") {
    return new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 24,
          font: tpl.docxFont,
          color: tpl.accentHex,
        }),
      ],
    });
  }
  if (tpl.headerStyle === "thin-grey-divider") {
    return new Paragraph({
      spacing: { before: 140, after: 60 },
      border: {
        bottom: { color: "BBBBBB", style: BorderStyle.SINGLE, size: 4, space: 1 },
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 20,
          font: tpl.docxFont,
          color: "000000",
        }),
      ],
    });
  }
  // underline-allcaps (classic)
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: {
      bottom: { color: "000000", style: BorderStyle.SINGLE, size: 6, space: 1 },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22,
        font: tpl.docxFont,
        color: "000000",
        characterSpacing: 24,
      }),
    ],
  });
}

export async function exportResumeAsDocx(
  resume: EditableResume,
  jobTitle: string,
  company: string,
  templateId?: ResumeTemplateId,
) {
  const tpl = getTemplate(templateId);
  const bodySize = Math.round(tpl.bodySize * 2);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: tpl.id === "modern" ? AlignmentType.LEFT : AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: resume.header.full_name || "",
          bold: true,
          size: Math.round(tpl.nameSize * 2),
          font: tpl.docxFont,
          color: tpl.id === "modern" ? tpl.accentHex : "000000",
        }),
      ],
    }),
  );
  if (resume.header.contact_line) {
    children.push(
      new Paragraph({
        alignment: tpl.id === "modern" ? AlignmentType.LEFT : AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: resume.header.contact_line,
            size: 19,
            font: tpl.docxFont,
            color: "000000",
          }),
        ],
      }),
    );
  }

  const sectionsById = new Map(resume.sections.map((s) => [s.id, s]));

  const renderSummary = () => {
    if (!resume.visibility.summary || !resume.summary?.trim()) return;
    children.push(sectionHeader("Summary", tpl));
    children.push(p({ text: stripHtml(resume.summary).trim(), size: bodySize, font: tpl.docxFont }));
  };

  const renderSkills = () => {
    if (!resume.visibility.skills || !resume.skills.length) return;
    children.push(sectionHeader("Skills", tpl));
    children.push(p({ text: resume.skills.join(" • "), size: bodySize, font: tpl.docxFont }));
  };

  const renderCustom = (sectionId: string) => {
    const section = sectionsById.get(sectionId);
    if (!section || !section.visible || !section.items.length) return;
    children.push(sectionHeader(section.title, tpl));
    for (const item of section.items) {
      const headerLeft = [item.heading, item.subheading].filter(Boolean).join(" — ");
      const headerRight = item.date || "";
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 30 },
          tabStops: [{ type: "right" as any, position: 9000 }],
          children: [
            new TextRun({
              text: headerLeft,
              bold: true,
              size: bodySize,
              font: tpl.docxFont,
              color: "000000",
            }),
            ...(headerRight
              ? [
                  new TextRun({
                    text: `\t${headerRight}`,
                    size: bodySize - 2,
                    font: tpl.docxFont,
                    color: "000000",
                  }),
                ]
              : []),
          ],
        }),
      );
      for (const b of item.bullets) {
        const t = stripHtml(b.text).trim();
        if (!t) continue;
        children.push(p({ text: t, size: bodySize - 1, bullet: true, font: tpl.docxFont }));
      }
    }
  };

  for (const tok of resume.order || []) {
    if (tok === "summary") renderSummary();
    else if (tok === "skills") renderSkills();
    else renderCustom(tok.sectionId);
  }

  const margin = tpl.id === "compact" ? 576 : 720;

  const doc = new Document({
    creator: resume.header.full_name || "Resume",
    title: "",
    styles: {
      default: { document: { run: { font: tpl.docxFont, size: bodySize, color: "000000" } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: margin, bottom: margin, left: margin, right: margin },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = buildResumeFilename(resume.header.full_name, jobTitle, company, "docx");
  saveAs(blob, filename);
}
