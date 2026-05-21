import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function PaymentSuccess() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(true);

  const handleGoToJobs = () => {
    navigate("/dashboard?premium=true");
  };

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const syncPremiumAccess = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (cancelled) return;

        const { data, error } = await supabase.functions.invoke("check-subscription");

        if (error || data?.error || data?.fallback) {
          if (!cancelled) {
            setIsSyncing(false);
          }
          return;
        }

        if (data?.subscribed) {
          queryClient.removeQueries({ queryKey: ["profile", user.id] });
          queryClient.removeQueries({ queryKey: ["my-subscription", user.id] });
          navigate("/dashboard?premium=true", { replace: true });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setIsSyncing(false);
      }
    };

    syncPremiumAccess();

    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient, user?.id]);

  return (
    <Layout>
      <div className="container max-w-md mx-auto px-6 py-24 text-center">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Thank you for upgrading!
        </h1>
        <p className="text-muted-foreground mb-2">
          {isSyncing
            ? "Your premium subscription is being activated. This may take a few moments."
            : "Your payment went through. If Premium still hasn't appeared, you can continue to the dashboard and refresh once."}
        </p>
        <p className="text-sm text-muted-foreground mb-8 flex items-center justify-center gap-1.5">
          <RefreshCw className={isSyncing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {isSyncing ? "Syncing your Premium access now..." : "If your status hasn't updated yet, try refreshing the page."}
        </p>
        <Button
          className="w-full rounded-xl"
          onClick={handleGoToJobs}
          disabled={isSyncing}
        >
          {isSyncing ? "Activating Premium..." : "Go to Job Board"}
        </Button>
      </div>
    </Layout>
  );
}
