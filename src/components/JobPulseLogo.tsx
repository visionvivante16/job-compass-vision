import { cn } from "@/lib/utils";

interface JobPulseLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function JobPulseLogo({ size = "md", className, showText = true }: JobPulseLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-0.5", className)}>
      {/* Logo Icon - "S" in rounded square */}
      <div className={cn(sizeClasses[size], "relative")}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="sociaxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
              <stop offset="100%" stopColor="hsl(221, 83%, 53%)" />
            </linearGradient>
          </defs>
          
          {/* Rounded square */}
          <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#sociaxGradient)" />
          
          {/* Letter S */}
          <text
            x="20"
            y="28"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
            fontSize="24"
            fill="white"
          >
            S
          </text>
        </svg>
      </div>
      
      {showText && (
        <span className={cn("font-bold text-foreground", textSizes[size])}>
          Sociax.tech
        </span>
      )}
    </div>
  );
}