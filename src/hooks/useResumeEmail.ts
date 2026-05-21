import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const SENT_KEY = "sociax_resume_email_sent";

/**
 * Sends a one-time welcome/recommendation email after first login or resume upload.
 * Uses localStorage to avoid sending multiple times per session.
 */
export function useResumeEmail() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const sentRef = useRef(false);

  useEffect(() => {
    if (!user || isLoading || !profile || sentRef.current) return;

    // Build a key unique to the user + resume state
    const hasResume = !!profile.resume_url;
    const stateKey = `${SENT_KEY}_${user.id}_${hasResume ? "rec" : "remind"}`;

    // Check if we already sent this type of email for this user
    if (localStorage.getItem(stateKey)) return;

    sentRef.current = true;

    // Fire and forget — don't block the UI
    const sendEmail = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;

        await supabase.functions.invoke("send-resume-email", {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        localStorage.setItem(stateKey, new Date().toISOString());
      } catch {
        // Silently fail — this is a background enhancement
        sentRef.current = false;
      }
    };

    // Small delay so it doesn't compete with initial page load
    const timer = setTimeout(sendEmail, 3000);
    return () => clearTimeout(timer);
  }, [user, profile, isLoading]);
}
