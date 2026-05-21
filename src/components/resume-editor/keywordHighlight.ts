import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Custom TipTap mark used purely for visual keyword highlighting in the editor preview.
 *
 * Important properties:
 * - Renders as `<mark data-kw="1">` so it's easy to strip from the exported HTML/plain
 *   text — see `stripKeywordHighlights` below and the `stripHtml` helper used by exports.
 * - Click the mark to remove just that highlighted span.
 */
export const KeywordHighlight = Mark.create({
  name: "keywordHighlight",
  inclusive: false,
  spanning: false,

  parseHTML() {
    return [{ tag: "mark[data-kw]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes, {
        "data-kw": "1",
        class: "resume-kw-highlight",
      }),
      0,
    ];
  },
});

/**
 * Strip our keyword `<mark data-kw>` tags from an HTML string while keeping the
 * inner text. Used right before export so the PDF / DOCX / clipboard outputs are
 * always clean black & white.
 */
export function stripKeywordHighlights(html: string): string {
  if (!html) return html;
  return html.replace(
    /<mark\b[^>]*data-kw[^>]*>([\s\S]*?)<\/mark>/gi,
    "$1",
  );
}

/**
 * Walk a TipTap editor's document and apply the `keywordHighlight` mark to every
 * occurrence of any of the supplied keywords (case-insensitive, whole-word).
 *
 * - Existing highlight marks are removed first so changes to the keyword list
 *   (or to the underlying text) are reflected cleanly.
 * - Skips text that is already inside a `<mark data-kw>` from the user manually
 *   keeping one — `inclusive: false` on the mark makes that easy.
 */
export function applyKeywordHighlights(editor: any, keywords: string[]) {
  if (!editor || editor.isDestroyed) return;
  const cleaned = (keywords || [])
    .map((k) => (k || "").trim())
    .filter((k) => k.length >= 2);
  if (!cleaned.length) {
    // Just clear existing highlights and bail
    const { tr } = editor.state;
    tr.removeMark(0, editor.state.doc.content.size, editor.schema.marks.keywordHighlight);
    if (tr.docChanged || tr.steps.length) editor.view.dispatch(tr);
    return;
  }

  // Build one regex matching any keyword as a whole word (case-insensitive)
  const escaped = cleaned
    .sort((a, b) => b.length - a.length) // longer phrases first
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const { state, view } = editor;
  const mark = state.schema.marks.keywordHighlight;
  if (!mark) return;

  let tr = state.tr;
  // First: remove all previous highlight marks across the doc.
  tr = tr.removeMark(0, state.doc.content.size, mark);

  // Then: walk every text node and add the mark to every match range.
  state.doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return;
    const text: string = node.text;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const from = pos + m.index;
      const to = from + m[0].length;
      tr = tr.addMark(from, to, mark.create());
    }
  });

  if (tr.docChanged || tr.steps.length) {
    view.dispatch(tr.setMeta("addToHistory", false));
  }
}
