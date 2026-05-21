import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

/**
 * LocationAutocomplete
 * Free OpenStreetMap (Nominatim) powered place lookup.
 * No API key required. Rate-limited to 1 req/sec per browser by Nominatim policy,
 * which we respect via a 350ms debounce + min length 3.
 *
 * On selection, calls onSelect with structured fields parsed from Nominatim's
 * `address` object so consumers can fill Address / City / State / ZIP / Country
 * atomically.
 */

export interface LocationParts {
  address: string;     // street + house number (best-effort)
  city: string;
  state: string;       // full state name
  zip: string;
  country: string;     // full country name (matches our countries.ts list when possible)
  display: string;     // full human-readable address from Nominatim
  lat?: number;
  lon?: number;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: NominatimAddress;
}

function parseNominatim(r: NominatimResult): LocationParts {
  const a = r.address || {};
  const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(" ").trim();
  const city =
    a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.neighbourhood || "";
  return {
    address: street,
    city,
    state: a.state || a.region || "",
    zip: a.postcode || "",
    country: a.country || "",
    display: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  };
}

interface LocationAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (parts: LocationParts) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Restrict suggestions to these ISO country codes (e.g. ["us"]). Optional. */
  countryCodes?: string[];
  className?: string;
}

export function LocationAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  countryCodes,
  className,
}: LocationAutocompleteProps) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  const debounced = useDebounce(value, 350);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const q = debounced.trim();
    if (q.length < 3 || disabled) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({
      q,
      format: "json",
      addressdetails: "1",
      limit: "6",
      "accept-language": "en",
    });
    if (countryCodes?.length) params.set("countrycodes", countryCodes.join(","));
    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { "Accept": "application/json" },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NominatimResult[]) => {
        if (cancelled) return;
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
        setActiveIdx(-1);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [debounced, disabled, countryCodes]);

  const handleSelect = (r: NominatimResult) => {
    const parts = parseNominatim(r);
    justSelectedRef.current = true;
    onSelect(parts);
    setOpen(false);
    setResults([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-auto"
        >
          {results.map((r, idx) => (
            <button
              type="button"
              key={r.place_id}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(r);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-start gap-2 hover:bg-accent transition-colors",
                idx === activeIdx && "bg-accent"
              )}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2 text-foreground">{r.display_name}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border bg-muted/30">
            Powered by OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
