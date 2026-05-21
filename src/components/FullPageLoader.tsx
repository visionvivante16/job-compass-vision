import { Loader2 } from "lucide-react";

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
