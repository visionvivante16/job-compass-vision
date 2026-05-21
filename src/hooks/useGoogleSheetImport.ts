import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportError {
  row: number;
  message: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  row_count?: number;
  columns?: string[];
  found_columns?: string[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  total_rows: number;
  error?: string;
}

interface ImportHistoryRow {
  id: string;
  sheet_url: string;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: unknown;
  created_at: string;
}

export function useImportHistory() {
  return useQuery({
    queryKey: ["import-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        errors: (Array.isArray(row.errors) ? row.errors : []) as unknown as ImportError[],
      }));
    },
  });
}

export function useTestSheetConnection() {
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async (sheetUrl: string): Promise<TestResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-google-sheet", {
        body: { sheet_url: sheetUrl, action: "test" },
      });

      if (error) throw error;
      
      if (!data.success) {
        return {
          success: false,
          error: data.error,
          found_columns: data.found_columns,
        };
      }

      return {
        success: true,
        message: data.message,
        row_count: data.row_count,
        columns: data.columns,
      };
    } catch (err: any) {
      console.error("Test connection error:", err);
      return {
        success: false,
        error: err.message || "Failed to connect to sheet",
      };
    } finally {
      setIsLoading(false);
    }
  };

  return { testConnection, isLoading };
}

export function useImportSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheetUrl: string): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("import-google-sheet", {
        body: { sheet_url: sheetUrl, action: "import" },
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data as ImportResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["import-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      
      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} jobs!`);
      }
      if (data.skipped > 0) {
        toast.info(`Skipped ${data.skipped} duplicate jobs`);
      }
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} rows had errors`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
