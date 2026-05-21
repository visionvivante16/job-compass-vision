import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, Send, Loader2, Search, BellOff, Bell } from "lucide-react";
import { useAllEmailPrefs, useToggleUserDigest, useSendDigestNow } from "@/hooks/useEmailNotificationPrefs";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface UserEmailPanelProps {
  users: { id: string; email: string; full_name: string | null }[];
}

export function EmailNotificationManager({ users }: UserEmailPanelProps) {
  const { data: prefs = [], isLoading } = useAllEmailPrefs();
  const toggleDigest = useToggleUserDigest();
  const sendDigest = useSendDigestNow();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Realtime: auto-refresh when any user unsubscribes
  useEffect(() => {
    const channel = supabase
      .channel("email-prefs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_notification_preferences" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-email-prefs"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const prefsMap = new Map(prefs.map((p) => [p.user_id, p]));

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
  });

  const subscribedCount = prefs.filter((p) => p.daily_digest_enabled && !p.unsubscribed_at).length;
  const unsubscribedCount = prefs.filter((p) => !p.daily_digest_enabled || p.unsubscribed_at).length;

  return (
    <Card className="p-6 border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Email Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Manage daily job digest emails for all users
            </p>
          </div>
        </div>
        <Button
          onClick={() => sendDigest.mutate()}
          disabled={sendDigest.isPending}
          size="sm"
          className="gap-2"
        >
          {sendDigest.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Digest Now
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <Badge variant="secondary" className="gap-1">
          <Bell className="h-3 w-3" />
          {subscribedCount} subscribed
        </Badge>
        <Badge variant="outline" className="gap-1">
          <BellOff className="h-3 w-3" />
          {unsubscribedCount} unsubscribed
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.slice(0, 50).map((user) => {
            const pref = prefsMap.get(user.id);
            const isEnabled = pref ? pref.daily_digest_enabled && !pref.unsubscribed_at : true;

            return (
              <div
                key={user.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pref?.unsubscribed_at && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <BellOff className="h-3 w-3" />
                      User opted out
                    </Badge>
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      toggleDigest.mutate({ userId: user.id, enabled: checked })
                    }
                    disabled={toggleDigest.isPending || !pref}
                  />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
          )}
        </div>
      )}
    </Card>
  );
}
