import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, Check, Loader2 } from "lucide-react";
import { countries } from "@/data/countries";

interface CountrySelectDialogProps {
  open: boolean;
  onSelect: (country: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export function CountrySelectDialog({ open, onSelect, onClose, isLoading }: CountrySelectDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("United States");

  const filtered = countries.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Select your country
          </DialogTitle>
          <DialogDescription>
            This helps us personalize your experience. You can change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-64 rounded-lg border">
          <div className="p-1">
            {filtered.map((country) => (
              <button
                key={country}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected === country
                    ? "bg-accent/10 text-accent font-medium"
                    : "hover:bg-secondary text-foreground"
                }`}
                onClick={() => setSelected(country)}
              >
                <span className="flex items-center justify-between">
                  {country}
                  {selected === country && <Check className="h-4 w-4 text-accent" />}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No countries found</p>
            )}
          </div>
        </ScrollArea>

        <Button
          onClick={() => onSelect(selected)}
          className="w-full"
          variant="accent"
          disabled={!selected || isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
