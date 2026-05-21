import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useImportHistory, useTestSheetConnection, useImportSheet } from "@/hooks/useGoogleSheetImport";
import { 
  Loader2, 
  Shield, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { JSearchIngestPanel } from "@/components/admin/JSearchIngestPanel";

import { CompanyDiscoveryPanel } from "@/components/admin/CompanyDiscoveryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminImport() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { data: importHistory = [], isLoading: historyLoading } = useImportHistory();
  const { testConnection, isLoading: testLoading } = useTestSheetConnection();
  const importSheet = useImportSheet();

  const [sheetUrl, setSheetUrl] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    row_count?: number;
    columns?: string[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTestConnection = async () => {
    if (!sheetUrl.trim()) return;
    setTestResult(null);
    setImportResult(null);
    const result = await testConnection(sheetUrl);
    setTestResult(result);
  };

  const handleImport = async () => {
    if (!sheetUrl.trim()) return;
    setImportResult(null);
    try {
      const result = await importSheet.mutateAsync(sheetUrl);
      setImportResult({
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      });
    } catch (err) {
      // Error is handled by the mutation
    }
  };

  const requiredColumns = [
    "posted_date", "title", "company", "location", 
    "description_short", "description_full", "apply_link"
  ];
  
  const optionalColumns = [
    "job_type", "experience_years", "salary", "skills",
    "actively_reviewing", "company_logo_url", "is_published"
  ];

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Job Import
              </h1>
              <p className="text-muted-foreground">Auto-ingest from JSearch or bulk import via Google Sheets</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="jsearch" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="jsearch">🌐 JSearch</TabsTrigger>
            <TabsTrigger value="discovery">🏢 Company Discovery</TabsTrigger>
            <TabsTrigger value="sheets">📋 Google Sheets</TabsTrigger>
          </TabsList>

          <TabsContent value="discovery">
            <CompanyDiscoveryPanel />
          </TabsContent>

          <TabsContent value="jsearch">
            <JSearchIngestPanel />
          </TabsContent>

          <TabsContent value="sheets">
        {/* Import Form */}
        <Card className="p-6 mb-8 border-border/60">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Google Sheet URL
              </label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Sheet must be publicly accessible (Anyone with link can view)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!sheetUrl.trim() || testLoading}
              >
                {testLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              <Button
                variant="accent"
                onClick={handleImport}
                disabled={!sheetUrl.trim() || importSheet.isPending || !testResult?.success}
              >
                {importSheet.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Import from Sheet
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success 
                  ? "bg-green-500/10 border-green-500/30" 
                  : "bg-destructive/10 border-destructive/30"
              }`}>
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {testResult.success ? (
                      <>
                        <p className="font-medium text-green-700 dark:text-green-400">
                          {testResult.message}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Found {testResult.row_count} rows ready to import
                        </p>
                        {testResult.columns && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {testResult.columns.map((col) => (
                              <Badge key={col} variant="secondary" className="text-xs">
                                {col}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-destructive">
                          {testResult.error}
                        </p>
                        {testResult.columns && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Found columns: {testResult.columns.join(", ")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="p-4 rounded-lg border bg-muted/50 border-border">
                <h4 className="font-semibold text-foreground mb-3">Import Summary</h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.imported}
                    </div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {importResult.skipped}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-destructive/10">
                    <div className="text-2xl font-bold text-destructive">
                      {importResult.errors.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <Collapsible open={showErrors} onOpenChange={setShowErrors}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {showErrors ? "Hide" : "Show"} Error Details
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                        {importResult.errors.map((err, i) => (
                          <div key={i} className="p-2 rounded bg-destructive/5 text-destructive">
                            Row {err.row}: {err.message}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Column Reference */}
        <Card className="p-6 mb-8 border-border/60">
          <h3 className="font-semibold text-foreground mb-4">Required Sheet Columns</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {requiredColumns.map((col) => (
              <Badge key={col} variant="default" className="font-mono text-xs">
                {col}
              </Badge>
            ))}
          </div>
          <h4 className="font-medium text-muted-foreground mb-2 mt-4">Optional Columns</h4>
          <div className="flex flex-wrap gap-2">
            {optionalColumns.map((col) => (
              <Badge key={col} variant="outline" className="font-mono text-xs">
                {col}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Note: Imports are limited to 500 rows per click. Duplicates are detected by apply_link or title+company+posted_date combination.
          </p>
        </Card>

        {/* Import History */}
        <Card className="border-border/60">
          <div className="p-6 border-b border-border/60">
            <h3 className="font-semibold text-foreground">Import History</h3>
          </div>
          
          {historyLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : importHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No imports yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sheet URL</TableHead>
                  <TableHead className="text-center">Imported</TableHead>
                  <TableHead className="text-center">Skipped</TableHead>
                  <TableHead className="text-center">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">
                        {format(new Date(item.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <a 
                        href={item.sheet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.sheet_url}</span>
                      </a>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                        {item.imported_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        {item.skipped_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={item.error_count > 0 ? "bg-destructive/10 text-destructive" : ""}>
                        {item.error_count}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
