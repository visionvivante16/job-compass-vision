import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, TrendingUp, Sparkles } from "lucide-react";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

interface ResumeIntelligenceCardProps {
  intelligence: ResumeIntelligence | null;
  isAnalyzing?: boolean;
}

const levelColors: Record<string, string> = {
  fresher: "bg-muted text-muted-foreground",
  junior: "bg-accent/10 text-accent",
  mid: "bg-primary/10 text-primary",
  senior: "bg-success/10 text-success",
  lead: "bg-warning/10 text-warning",
};

export function ResumeIntelligenceCard({ intelligence, isAnalyzing }: ResumeIntelligenceCardProps) {
  if (isAnalyzing) {
    return (
      <Card className="rounded-3xl border-border/50 bg-card/80 backdrop-blur-sm col-span-1 md:col-span-2">
        <CardContent className="p-5 flex items-center gap-3">
          <Brain className="h-5 w-5 text-accent animate-pulse" />
          <span className="text-sm text-muted-foreground">Analyzing your resume with AI...</span>
        </CardContent>
      </Card>
    );
  }

  if (!intelligence) return null;

  return (
    <Card className="rounded-3xl border-border/50 bg-card/80 backdrop-blur-sm col-span-1 md:col-span-2">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground text-sm">Career Intelligence</h3>
          <Badge className={`ml-auto text-xs ${levelColors[intelligence.experienceLevel] || "bg-muted text-muted-foreground"}`}>
            {intelligence.experienceLevel}
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Primary Role */}
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{intelligence.primaryRole}</p>
              <p className="text-xs text-muted-foreground">{intelligence.careerTrajectory}</p>
            </div>
          </div>

          {/* Primary Stack */}
          <div className="flex flex-wrap gap-1.5">
            {intelligence.primaryStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs rounded-full">
                {tech}
              </Badge>
            ))}
          </div>

          {/* Strength Summary */}
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{intelligence.strengthSummary}</p>
          </div>

          {/* Target Roles */}
          {intelligence.jobTitlesToTarget.length > 0 && (
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {intelligence.jobTitlesToTarget.slice(0, 5).map((title) => (
                  <span key={title} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Salary Range */}
          {intelligence.salaryRange && (
            <p className="text-xs text-muted-foreground">
              💰 Est. range: ${(intelligence.salaryRange.min / 1000).toFixed(0)}k – ${(intelligence.salaryRange.max / 1000).toFixed(0)}k {intelligence.salaryRange.currency}
            </p>
          )}

          {/* Improvement Areas */}
          {intelligence.improvementAreas && intelligence.improvementAreas.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Areas to grow:</p>
              <div className="flex flex-wrap gap-1">
                {intelligence.improvementAreas.slice(0, 4).map((area) => (
                  <span key={area} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
