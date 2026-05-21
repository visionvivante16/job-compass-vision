import { useState } from "react";
import { useErrorLogs, useClearErrorLogs, useDeleteErrorLog } from "@/hooks/useErrorLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bug, Globe, Wifi, Trash2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ERROR_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  uncaught_error: { label: "JS Error", icon: Bug, color: "destructive" },
  unhandled_rejection: { label: "Promise Rejection", icon: AlertTriangle, color: "destructive" },
  edge_function_error: { label: "Edge Function", icon: Globe, color: "secondary" },
  network_error: { label: "Network", icon: Wifi, color: "outline" },
  runtime: { label: "Runtime", icon: Bug, color: "destructive" },
};

export function ErrorLogsPanel() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { data: logs = [], isLoading, refetch } = useErrorLogs({ error_type: typeFilter });
  const clearLogs = useClearErrorLogs();
  const deleteLog = useDeleteErrorLog();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Logs
            {logs.length > 0 && (
              <Badge variant="destructive" className="ml-2">{logs.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="uncaught_error">JS Errors</SelectItem>
                <SelectItem value="unhandled_rejection">Promise Rejections</SelectItem>
                <SelectItem value="edge_function_error">Edge Functions</SelectItem>
                <SelectItem value="network_error">Network</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {logs.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setShowClearConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading logs...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bug className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No errors logged — everything looks clean! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((log) => {
              const config = ERROR_TYPE_CONFIG[log.error_type] ?? ERROR_TYPE_CONFIG.runtime;
              const Icon = config.icon;
              const isExpanded = expandedId === log.id;

              return (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={config.color as any} className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">{log.message}</p>
                        {log.page_url && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {log.page_url}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); deleteLog.mutate(log.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 text-xs border-t pt-3">
                      {log.user_id && (
                        <div><strong>User ID:</strong> <code className="bg-muted px-1 rounded">{log.user_id}</code></div>
                      )}
                      {log.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 p-2 bg-muted rounded text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </div>
                      )}
                      {log.user_agent && (
                        <div><strong>Browser:</strong> {log.user_agent.substring(0, 150)}</div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <strong>Metadata:</strong>
                          <pre className="mt-1 p-2 bg-muted rounded text-[11px]">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Error Logs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all error logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { clearLogs.mutate(); setShowClearConfirm(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
