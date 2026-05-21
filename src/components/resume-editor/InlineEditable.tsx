import { cn } from "@/lib/utils";
import {
  forwardRef,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";

interface InlineEditableProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  ariaLabel?: string;
  onEnter?: () => void;
}

/**
 * Lightweight contentEditable input. Used for the small single-line fields
 * (name, contact, headings, dates) where TipTap would be overkill.
 *
 * The DOM is treated as the source of truth while editing — the parent state
 * is only synced on blur and on every input event (debounced by React).
 */
export const InlineEditable = forwardRef<HTMLDivElement, InlineEditableProps>(
  (
    {
      value,
      onChange,
      placeholder,
      className,
      multiline = false,
      ariaLabel,
      onEnter,
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLDivElement | null>(null);

    // Keep the DOM in sync only when the external value diverges (e.g. drag/reorder),
    // never while the user is actively editing — to avoid caret jumps.
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      if (document.activeElement === el) return;
      if (el.innerText !== value) el.innerText = value || "";
    }, [value]);

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLDivElement).blur();
        onEnter?.();
      }
    };

    return (
      <div
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as any).current = el;
        }}
        role="textbox"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder={placeholder}
        onKeyDown={handleKeyDown}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerText)}
        className={cn(
          "outline-none rounded px-0.5 -mx-0.5 transition-colors text-black",
          "hover:bg-[#e0faf5]/40 focus:bg-[#e0faf5]/60",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic",
          // Allow wrapping by default — overflow-ellipsis only when explicitly desired
          // via className. (Skills used to be clipped because of nowrap.)
          className,
        )}
      />
    );
  },
);
InlineEditable.displayName = "InlineEditable";
