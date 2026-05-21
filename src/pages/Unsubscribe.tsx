import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");

  useEffect(() => {
    if (uid) {
      // Redirect to the edge function which handles unsubscribe and shows confirmation
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      window.location.href = `https://${projectId}.supabase.co/functions/v1/unsubscribe-email?uid=${uid}`;
    }
  }, [uid]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Processing your unsubscribe request...</p>
      </div>
    </div>
  );
}
