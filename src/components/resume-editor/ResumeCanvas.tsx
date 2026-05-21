import { cn } from "@/lib/utils";
import { EditableResume, ResumeItem, ResumeSection, stripHtml } from "@/lib/resumeEditor";
import { getTemplate, ResumeTemplate, ResumeTemplateId } from "@/lib/resumeTemplates";

interface ResumeCanvasProps {
  resume: EditableResume;
  onChange?: (next: EditableResume) => void;
  keywords: string[];
  templateId?: ResumeTemplateId;
}

function highlight(text: string, keywords: string[]): React.ReactNode {
  if (!text) return text;
  const kw = (keywords || []).filter((k) => k && k.length > 1);
  if (kw.length === 0) return text;
  const escaped = kw.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} style={{ backgroundColor: "transparent", color: "inherit", fontWeight: 600 }}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function BulletText({ html, keywords }: { html: string; keywords: string[] }) {
  const text = stripHtml(html || "").trim();
  return <>{highlight(text, keywords)}</>;
}

function ItemBlock({ item, keywords, tpl }: { item: ResumeItem; keywords: string[]; tpl: ResumeTemplate }) {
  const tight = tpl.spacing === "tight";
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  // Strip subheading / date when they just duplicate the heading or each other
  // (common AI hallucination on certifications where issuer fills every column).
  let subheading = item.subheading || "";
  let date = item.date || "";
  if (norm(subheading) === norm(item.heading)) subheading = "";
  if (norm(date) === norm(item.heading) || norm(date) === norm(subheading)) date = "";
  return (
    <div className={tight ? "mb-1" : "mb-2"}>
      <div className="flex items-baseline justify-between gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap leading-tight">
            <span style={{ fontSize: `${tpl.bodySize}pt`, fontWeight: 600 }} className="text-black">
              {item.heading}
            </span>
            {subheading && (
              <>
                <span className="text-black" style={{ fontSize: `${tpl.bodySize - 0.5}pt` }}>—</span>
                <span style={{ fontSize: `${tpl.bodySize}pt` }} className="text-black">
                  {subheading}
                </span>
              </>
            )}
          </div>
        </div>
        {date && (
          <span className="text-black whitespace-nowrap text-right shrink-0 leading-tight" style={{ fontSize: `${tpl.bodySize - 1}pt` }}>
            {date}
          </span>
        )}
      </div>

      <ul
        className={cn("ml-4 mt-0.5 text-black list-outside", tight ? "space-y-0" : "space-y-0.5")}
        style={{ fontSize: `${tpl.bodySize - 0.5}pt`, listStyle: "none" }}
      >
        {item.bullets
          .map((b) => stripHtml(b.text).trim())
          .filter(Boolean)
          .map((text, i) => (
            <li key={i} className="leading-snug flex gap-1.5">
              <span style={{ color: tpl.id === "modern" ? tpl.accentCss : "#000", fontWeight: 700 }}>
                {tpl.bulletGlyph}
              </span>
              <span>{highlight(text, keywords)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

export function ResumeCanvas({ resume, keywords, templateId }: ResumeCanvasProps) {
  const tpl = getTemplate(templateId);

  const renderSummary = () =>
    resume.visibility.summary && stripHtml(resume.summary).trim() ? (
      <SectionWrap key="__summary" title="Summary" tpl={tpl}>
        <p className="leading-snug text-black" style={{ fontSize: `${tpl.bodySize - 0.5}pt` }}>
          <BulletText html={resume.summary} keywords={keywords} />
        </p>
      </SectionWrap>
    ) : null;

  const renderSkills = () =>
    resume.visibility.skills && resume.skills.length > 0 ? (
      <SectionWrap key="__skills" title="Skills" tpl={tpl}>
        {tpl.id === "modern" ? (
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="inline-flex items-center rounded-full px-2 py-0.5 leading-snug"
                style={{
                  fontSize: `${tpl.bodySize - 1}pt`,
                  border: `1px solid ${tpl.accentCss}`,
                  color: tpl.accentCss,
                  backgroundColor: "transparent",
                }}
              >
                {highlight(s, keywords)}
              </span>
            ))}
          </div>
        ) : (
          <p className="leading-snug text-black" style={{ fontSize: `${tpl.bodySize - 0.5}pt` }}>
            {resume.skills.map((s, i) => (
              <span key={`${s}-${i}`}>
                {highlight(s, keywords)}
                {i < resume.skills.length - 1 && <span className="mx-1.5">•</span>}
              </span>
            ))}
          </p>
        )}
      </SectionWrap>
    ) : null;

  const renderCustom = (section: ResumeSection) =>
    section.visible ? (
      <SectionWrap key={section.id} title={section.title} tpl={tpl}>
        {section.items.map((item) => (
          <ItemBlock key={item.id} item={item} keywords={keywords} tpl={tpl} />
        ))}
      </SectionWrap>
    ) : null;

  const sectionsById = new Map(resume.sections.map((s) => [s.id, s]));
  const orderedNodes = (resume.order || []).map((tok) => {
    if (tok === "summary") return renderSummary();
    if (tok === "skills") return renderSkills();
    const sec = sectionsById.get(tok.sectionId);
    return sec ? renderCustom(sec) : null;
  });

  const padX = tpl.id === "compact" ? "px-6" : "px-10";
  const padY = tpl.id === "compact" ? "py-4" : "py-6";
  const lineHeight = tpl.id === "compact" ? 1.2 : 1.6;

  return (
    <div
      className={cn("bg-white mx-auto rounded-sm", padX, padY)}
      style={{
        width: "min(100%, 8.5in)",
        minHeight: "11in",
        fontFamily: tpl.fontFamily,
        color: "#000",
        lineHeight,
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.08)",
      }}
      data-resume-canvas
    >
      {/* Header */}
      {tpl.id === "modern" ? (
        <div className="pb-2" style={{ borderBottom: `1px solid ${tpl.accentCss}` }}>
          <div className="flex items-stretch gap-3">
            <div style={{ width: 4, backgroundColor: tpl.accentCss, borderRadius: 2 }} />
            <div className="flex-1">
              <h1
                className="font-bold leading-tight m-0"
                style={{ fontSize: `${tpl.nameSize}pt`, color: tpl.accentCss }}
              >
                {resume.header.full_name}
              </h1>
              <p className="mt-1 text-black leading-snug whitespace-pre-wrap" style={{ fontSize: "9.5pt" }}>
                {resume.header.contact_line}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="text-center pb-1.5"
          style={tpl.id === "classic" ? { borderBottom: "2px solid #000" } : undefined}
        >
          <h1
            className="font-bold leading-tight m-0"
            style={{
              fontSize: `${tpl.nameSize}pt`,
              color: "#000",
              fontFamily: tpl.id === "classic" ? "Georgia, 'Times New Roman', serif" : tpl.fontFamily,
              letterSpacing: tpl.id === "classic" ? "0.02em" : undefined,
            }}
          >
            {resume.header.full_name}
          </h1>
          <p className="mt-0.5 text-black leading-snug whitespace-pre-wrap" style={{ fontSize: tpl.id === "compact" ? "8.5pt" : "9.5pt" }}>
            {resume.header.contact_line}
          </p>
        </div>
      )}

      {orderedNodes}
    </div>
  );
}

function SectionWrap({ title, children, tpl }: { title: string; children: React.ReactNode; tpl: ResumeTemplate }) {
  if (tpl.headerStyle === "left-accent-bar") {
    return (
      <section className="mt-3">
        <h2
          className="font-bold uppercase tracking-[0.08em] leading-tight pl-2.5 mb-1.5"
          style={{
            fontSize: `${tpl.bodySize + 1}pt`,
            color: tpl.accentCss,
            borderLeft: `3px solid ${tpl.accentCss}`,
          }}
        >
          {title}
        </h2>
        {children}
      </section>
    );
  }
  if (tpl.headerStyle === "thin-grey-divider") {
    return (
      <section className="mt-1.5">
        <h2
          className="font-bold uppercase tracking-[0.04em] leading-tight pb-0.5 mb-0.5 text-black"
          style={{ fontSize: `${tpl.bodySize}pt`, borderBottom: "1px solid #bbb" }}
        >
          {title}
        </h2>
        {children}
      </section>
    );
  }
  // underline-allcaps (classic) — full width thick black border, ALL CAPS, bold serif
  return (
    <section className="mt-3">
      <h2
        className="font-bold uppercase tracking-[0.12em] text-black pb-1 mb-1.5 leading-tight"
        style={{
          fontSize: `${tpl.bodySize + 1}pt`,
          borderBottom: "1.5px solid #000",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
