import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Play,
  Plus,
  Trash2,
  Sparkles,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useJSearchSeeds,
  useJSearchRuns,
  useToggleSeed,
  useAddSeed,
  useDeleteSeed,
  useRunIngest,
  useUpdateSeedQuery,
} from "@/hooks/useJSearchIngest";

export function JSearchIngestPanel() {
  const { data: seeds = [], isLoading: seedsLoading } = useJSearchSeeds();
  const { data: runs = [] } = useJSearchRuns();
  const toggleSeed = useToggleSeed();
  const addSeed = useAddSeed();
  const deleteSeed = useDeleteSeed();
  const runIngest = useRunIngest();
  const updateQuery = useUpdateSeedQuery();

  const [newQuery, setNewQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const activeCount = seeds.filter((s) => s.is_active).length;
  const lastRun = runs[0];

  const handleAdd = async () => {
    if (!newQuery.trim()) return;
    await addSeed.mutateAsync(newQuery.trim());
    setNewQuery("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    await updateQuery.mutateAsync({ id, query: editValue.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="p-6 border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">JSearch Auto-Ingest</h2>
              <p className="text-sm text-muted-foreground">
                {activeCount} active queries • Pulls live USA jobs from LinkedIn, Indeed, Glassdoor & 20+ sources
              </p>
            </div>
          </div>
          <Button
            onClick={() => runIngest.mutate(undefined)}
            disabled={runIngest.isPending || activeCount === 0}
            className="gap-2"
          >
            {runIngest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run All Active Now
          </Button>
        </div>

        {lastRun && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">Last fetched</div>
              <div className="font-bold text-foreground">{lastRun.total_fetched}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="text-xs text-muted-foreground">Imported</div>
              <div className="font-bold text-green-600 dark:text-green-400">{lastRun.total_imported}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <div className="text-xs text-muted-foreground">Filtered out</div>
              <div className="font-bold text-yellow-600 dark:text-yellow-400">{lastRun.total_filtered}</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <div className="text-xs text-muted-foreground">Duplicates</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">
                {lastRun.total_skipped + lastRun.duplicates_removed}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">When</div>
              <div className="font-medium text-foreground text-xs">
                {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Seeds */}
      <Card className="p-6 border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Search Queries
          </h3>
          <Badge variant="outline">{seeds.length} total</Badge>
        </div>

        {/* Add new */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="e.g. data engineer entry level visa sponsorship usa"
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            variant="outline"
            onClick={handleAdd}
            disabled={!newQuery.trim() || addSeed.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {seedsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {seeds.map((seed) => (
              <div
                key={seed.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <Switch
                  checked={seed.is_active}
                  onCheckedChange={(checked) => toggleSeed.mutate({ id: seed.id, is_active: checked })}
                />
                <div className="flex-1 min-w-0">
                  {editingId === seed.id ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(seed.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleSaveEdit(seed.id)}
                      autoFocus
                      className="h-8"
                    />
                  ) : (
                    <button
                      className="text-left w-full text-sm font-medium text-foreground truncate hover:text-primary"
                      onClick={() => {
                        setEditingId(seed.id);
                        setEditValue(seed.query);
                      }}
                    >
                      {seed.query}
                    </button>
                  )}
                  {seed.last_run_at && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Last: {formatDistanceToNow(new Date(seed.last_run_at), { addSuffix: true })}
                      {seed.last_imported_count !== null && (
                        <span className="ml-2">• {seed.last_imported_count} imported</span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => runIngest.mutate(seed.id)}
                  disabled={runIngest.isPending}
                  title="Run only this query"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSeed.mutate(seed.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Run history */}
      <Card className="p-6 border-border/60">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Runs
        </h3>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No runs yet</p>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 10).map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 text-sm"
              >
                {run.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : run.status === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">
                    {run.total_imported} imported
                    <span className="text-muted-foreground font-normal ml-2">
                      • {run.total_fetched} fetched • {run.total_filtered} filtered
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.trigger_type} • {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    {run.duration_ms && ` • ${(run.duration_ms / 1000).toFixed(1)}s`}
                  </div>
                </div>
                <Badge variant={run.status === "completed" ? "secondary" : "outline"} className="text-xs">
                  {run.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
