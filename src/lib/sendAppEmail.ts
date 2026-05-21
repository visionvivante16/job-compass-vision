import { supabase } from "@/integrations/supabase/client";

export type AppEmailTemplate =
  | "welcome"
  | "job_alert"
  | "payment_success"
  | "payment_failure"
  | "product_update"
  | "support_message";

export type AppEmailSender = "support" | "update";

export interface SendAppEmailArgs {
  to: string;
  template: AppEmailTemplate;
  data?: Record<string, any>;
  /** Optional override. By default, each template picks its own sender. */
  sender_override?: AppEmailSender;
}

/**
 * Send a transactional email through the unified Sociax sender.
 * Routes to support@sociax.tech or info@sociax.tech based on template.
 *
 * Non-admin users can only send to their own email (server-enforced).
 */
export async function sendAppEmail(args: SendAppEmailArgs) {
  const { data, error } = await supabase.functions.invoke("send-app-email", {
    body: args,
  });
  if (error) throw error;
  return data as { success: true; id: string; sender: AppEmailSender };
}
