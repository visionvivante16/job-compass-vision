import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Play,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Plus,
  Trash2,
  Power,
  PowerOff,
  ChevronUp,
  ChevronDown,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAtsCompanies,
  useAtsDiscoveryRuns,
  useAtsIngestRuns,
  useRunAtsDiscovery,
  useRunAtsIngest,
  useAddAtsCompany,
  useUpdateAtsCompanyStatus,
  useUpdateAtsCompanyTier,
  useDeleteAtsCompany,
} from "@/hooks/useAtsCompanies";

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: "Tier 1 · every 4h",
  2: "Tier 2 · every 12h",
  3: "Tier 3 · daily",
};

const TIER_BADGE: Record<1 | 2 | 3, string> = {
  1: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  2: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  3: "bg-muted text-muted-foreground border-border",
};

export function CompanyDiscoveryPanel() {
  const { data: companies = [], isLoading: companiesLoading } = useAtsCompanies();
  const { data: discoveryRuns = [] } = useAtsDiscoveryRuns();
  const { data: ingestRuns = [] } = useAtsIngestRuns();

  const runDiscovery = useRunAtsDiscovery();
  const runIngest = useRunAtsIngest();
  const addCompany = useAddAtsCompany();
  const updateStatus = useUpdateAtsCompanyStatus();
  const updateTier = useUpdateAtsCompanyTier();
  const deleteCompany = useDeleteAtsCompany();

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState<"greenhouse" | "lever" | "ashby">("greenhouse");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);

  // Stats
  const total = companies.length;
  const active = companies.filter((c) => c.status === "active").length;
  const inactive = companies.filter((c) => c.status === "inactive").length;
  const pending = companies.filter((c) => c.status === "pending").length;
  const tier1 = companies.filter((c) => c.tier === 1 && c.status === "active").length;
  const tier2 = companies.filter((c) => c.tier === 2 && c.status === "active").length;
  const tier3 = companies.filter((c) => c.tier === 3 && c.status === "active").length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = companies.filter((c) => new Date(c.date_added).getTime() > oneWeekAgo).length;
  const autoDiscovered = companies.filter((c) => c.auto_discovered).length;

  const lastDiscovery = discoveryRuns[0];
  const lastIngest = ingestRuns[0];

  const filtered = companies.filter((c) => {
    if (filterPlatform !== "all" && c.ats_platform !== filterPlatform) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterTier !== "all" && String(c.tier) !== filterTier) return false;
    return true;
  });

  const handleAdd = () => {
    if (!newSlug.trim() || !newName.trim()) return;
    addCompany.mutate(
      { slug: newSlug, company_name: newName, ats_platform: newPlatform },
      {
        onSuccess: () => {
          setNewSlug("");
          setNewName("");
        },
      }
    );
  };

  const handleTestNow = (companyId: string) => {
    setPendingCompanyId(companyId);
    runIngest.mutate({ companyId }, {
      onSettled: () => setTimeout(() => setPendingCompanyId(null), 4000),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="p-6 border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Company Discovery</h2>
              <p className="text-sm text-muted-foreground">
                Tiered polling: Tier 1 every 4h, Tier 2 every 12h, Tier 3 daily. Companies auto-promote/demote based on output.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => runDiscovery.mutate()}
              disabled={runDiscovery.isPending}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {runDiscovery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Run Discovery
            </Button>
            <Button
              onClick={() => runIngest.mutate({ tier: 1 })}
              disabled={runIngest.isPending || tier1 === 0}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Tier 1 ({tier1})
            </Button>
            <Button
              onClick={() => runIngest.mutate({ tier: 2 })}
              disabled={runIngest.isPending || tier2 === 0}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Tier 2 ({tier2})
            </Button>
            <Button
              onClick={() => runIngest.mutate({ tier: 3 })}
              disabled={runIngest.isPending || tier3 === 0}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Tier 3 ({tier3})
            </Button>
            <Button
              onClick={() => runIngest.mutate(undefined)}
              disabled={runIngest.isPending || active === 0}
              size="sm"
              className="gap-2"
            >
              {runIngest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run All Active
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-xs text-muted-foreground">Tier 1 active</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tier1}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">checking every 4h</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-xs text-muted-foreground">Tier 2 active</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tier2}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">checking every 12h</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Tier 3 active</div>
            <div className="text-2xl font-bold text-foreground">{tier3}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">checking daily</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-xs text-muted-foreground">Auto-discovered (7d)</div>
            <div className="text-2xl font-bold text-primary">{newThisWeek}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{autoDiscovered} total auto</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Total tracked</div>
            <div className="text-xl font-bold text-foreground">{total}</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{active}</div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{pending}</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10">
            <div className="text-xs text-muted-foreground">Inactive</div>
            <div className="text-xl font-bold text-destructive">{inactive}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {lastDiscovery && (
            <div className="p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Last discovery run</div>
              <div className="font-medium">
                {lastDiscovery.total_validated} validated, {lastDiscovery.total_activated} activated, {lastDiscovery.total_deactivated} deactivated
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastDiscovery.started_at), { addSuffix: true })} • {lastDiscovery.status}
              </div>
            </div>
          )}
          {lastIngest && (
            <div className="p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Last ingest run</div>
              <div className="font-medium">
                {lastIngest.total_imported} imported across {lastIngest.companies_processed} companies
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastIngest.started_at), { addSuffix: true })} • {lastIngest.status}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Add company manually */}
      <Card className="p-6 border-border/60">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Add Company Manually
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Slug (e.g. stripe)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="font-mono"
          />
          <Input
            placeholder="Company name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as "greenhouse" | "lever" | "ashby") }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="greenhouse">Greenhouse</SelectItem>
              <SelectItem value="lever">Lever</SelectItem>
              <SelectItem value="ashby">Ashby</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!newSlug.trim() || !newName.trim() || addCompany.isPending}>
            {addCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Company"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          New companies start as <strong>pending · Tier 2</strong>. Run discovery to auto-validate. After ingest, top performers automatically promote to Tier 1.
        </p>
      </Card>

      {/* Companies table */}
      <Card className="p-6 border-border/60">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Tracked Companies ({filtered.length} of {total})
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="1">Tier 1</SelectItem>
                <SelectItem value="2">Tier 2</SelectItem>
                <SelectItem value="3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="ashby">Ashby</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {companiesLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No companies match the filter</p>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center" title="Jobs imported on the last run">Last run</TableHead>
                  <TableHead className="text-center" title="Jobs imported in the past 7 days">7d</TableHead>
                  <TableHead className="text-center" title="Consecutive runs with 0 imports">Empty</TableHead>
                  <TableHead>Last checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.company_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                      {c.auto_discovered && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">auto-discovered</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.ats_platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TIER_BADGE[c.tier]} title={TIER_LABEL[c.tier]}>
                        T{c.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          c.status === "active"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : c.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            : "bg-destructive/10 text-destructive"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{c.jobs_last_run}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{c.jobs_last_7days}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className={c.consecutive_empty_runs >= 10 ? "text-destructive" : "text-muted-foreground"}>
                        {c.consecutive_empty_runs}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_checked
                        ? formatDistanceToNow(new Date(c.last_checked), { addSuffix: true })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Test now (run only this company)"
                          disabled={runIngest.isPending}
                          onClick={() => handleTestNow(c.id)}
                        >
                          {pendingCompanyId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                        </Button>
                        {c.tier > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title={`Promote to Tier ${c.tier - 1}`}
                            onClick={() => updateTier.mutate({ id: c.id, tier: (c.tier - 1) as 1 | 2 })}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        )}
                        {c.tier < 3 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title={`Demote to Tier ${c.tier + 1}`}
                            onClick={() => updateTier.mutate({ id: c.id, tier: (c.tier + 1) as 2 | 3 })}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status === "active" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Deactivate"
                            onClick={() => updateStatus.mutate({ id: c.id, status: "inactive" })}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Activate"
                            onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Remove ${c.company_name} from tracking?`)) deleteCompany.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {autoDiscovered} of {total} were auto-discovered. Showing first 200 rows.
        </p>
      </Card>

      {/* Recent runs */}
      <Card className="p-6 border-border/60">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Ingest Runs
        </h3>
        {ingestRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No ingest runs yet</p>
        ) : (
          <div className="space-y-2">
            {ingestRuns.slice(0, 10).map((run) => (
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
                      • {run.companies_processed} companies • {run.total_fetched} fetched • {run.total_filtered} filtered
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.trigger_type} •{" "}
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    {run.duration_ms && ` • ${(run.duration_ms / 1000).toFixed(1)}s`}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{run.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
