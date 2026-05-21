import { memo } from "react";
import { TopHiringsPanelDisplay } from "./TopHiringsPanelDisplay";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  onFilterByRole?: (role: string) => void;
  className?: string;
}

export const RightSidebar = memo(function RightSidebar({ onFilterByRole, className }: RightSidebarProps) {
  return (
    <aside className={cn("flex flex-col gap-2", className)} data-tour="right-sidebar">
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopHiringsPanelDisplay onFilterByRole={onFilterByRole} />
      </div>
    </aside>
  );
});
