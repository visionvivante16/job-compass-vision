import { Component, ReactNode, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/FullPageLoader";
import { AlertCircle, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  error: Error | null;
}

class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const msg = String(error?.message || "");
    const isChunkError =
      /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        msg,
      );
    // Auto-recover from stale-deploy chunk errors by hard-reloading once.
    if (isChunkError && !sessionStorage.getItem("__chunk_reload__")) {
      sessionStorage.setItem("__chunk_reload__", "1");
      window.location.reload();
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem("__chunk_reload__");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">This page couldn't load</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              A network hiccup or a recent update may be the cause. Please retry.
            </p>
          </div>
          <Button onClick={this.handleRetry} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}
