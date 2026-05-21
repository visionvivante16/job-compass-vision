import { Layout } from "@/components/Layout";
import { ErrorLogsPanel } from "@/components/admin/ErrorLogsPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ErrorLogs() {
  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Error Logs</h1>
        </div>
        <ErrorLogsPanel />
      </div>
    </Layout>
  );
}
