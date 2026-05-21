import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  KeywordHighlight,
  applyKeywordHighlights,
} from "./keywordHighlight";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  /** Lower-cased keywords to visually highlight inside this editor (preview-only). */
  keywords?: string[];
}

/**
 * TipTap-powered rich text editor used for the bullets and the summary.
 * Outputs HTML; export utilities strip <mark data-kw> tags + remaining tags.
 *
 * Highlights:
 * - `keywords` is applied via a custom `keywordHighlight` mark.
 * - Clicking a highlighted span removes just that highlight (per spec).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 22,
  keywords,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        codeBlock: false,
        blockquote: false,
      }),
      Placeholder.configure({ placeholder: placeholder || "" }),
      KeywordHighlight,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        // Solid black text — no `text-foreground` (which is theme-coloured), no
        // `prose` (which adds muted greys). The canvas-wide CSS rule enforces #000.
        class: "max-w-none focus:outline-none leading-snug",
      },
      handleClickOn: (view, pos, node, _nodePos, event) => {
        // Click a highlight to remove just that one — per requirements.
        const target = event.target as HTMLElement | null;
        if (!target) return false;
        const markEl = target.closest?.("mark[data-kw]") as HTMLElement | null;
        if (!markEl) return false;
        const $pos = view.state.doc.resolve(pos);
        // Find the range of the mark covering this position.
        const mark = view.state.schema.marks.keywordHighlight;
        if (!mark) return false;
        const parent = $pos.parent;
        const offset = $pos.parentOffset;
        let from = pos - offset;
        let to = from + parent.content.size;
        let cursor = 0;
        parent.forEach((child: any, childOffset: number) => {
          const childFrom = pos - offset + childOffset;
          const childTo = childFrom + child.nodeSize;
          if (
            child.isText &&
            pos >= childFrom &&
            pos <= childTo &&
            child.marks.some((mk: any) => mk.type === mark)
          ) {
            from = childFrom;
            to = childTo;
          }
          cursor++;
        });
        const tr = view.state.tr.removeMark(from, to, mark);
        view.dispatch(tr);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap emits <p></p> for empty content — collapse that to "".
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value changes when not focused.
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    const current = editor.getHTML();
    if (current !== (value || "<p></p>") && current !== value) {
      editor.commands.setContent(value || "", false);
      // After re-setting content, re-apply highlights so they survive prop sync.
      if (keywords?.length) applyKeywordHighlights(editor, keywords);
    }
  }, [value, editor, keywords]);

  // Apply / refresh highlights whenever the keyword list changes.
  useEffect(() => {
    if (!editor) return;
    applyKeywordHighlights(editor, keywords || []);
  }, [editor, keywords]);

  return (
    <EditorContent
      editor={editor}
      className={cn(
        "rounded px-0.5 -mx-0.5 transition-colors",
        "hover:bg-[#e0faf5]/40 focus-within:bg-[#e0faf5]/60",
        className,
      )}
      style={{ minHeight, color: "#000" }}
    />
  );
}
