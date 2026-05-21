import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SupportTicket {
  id: string;
  user_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  screenshot_url: string | null;
  status: "open" | "in_progress" | "closed";
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  name: string;
  email: string;
  subject: string;
  message: string;
  screenshot?: File;
}

export function useSupportTickets() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tickets - users see their own, admins see all
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", user?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      if (!user) throw new Error("Not authenticated");

      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (ticketData.screenshot) {
        const fileName = `${user.id}/${Date.now()}-${ticketData.screenshot.name}`;
        const { error: uploadError } = await supabase.storage
          .from("support-screenshots")
          .upload(fileName, ticketData.screenshot);

        if (uploadError) throw uploadError;
        screenshotUrl = fileName;
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        name: ticketData.name,
        email: ticketData.email,
        subject: ticketData.subject,
        message: ticketData.message,
        screenshot_url: screenshotUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({
        title: "Request submitted",
        description: "Your request has been sent. Our team will reply within 24 hours.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update ticket (admin only)
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportTicket> & { id: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reply to ticket (admin only) + send email notification
  const replyToTicket = async (ticketId: string, reply: string) => {
    // Find the ticket to get user details for the email
    const ticket = tickets?.find((t) => t.id === ticketId);

    await updateTicketMutation.mutateAsync({
      id: ticketId,
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      status: "in_progress",
    });

    // Fire-and-forget email notification
    if (ticket) {
      supabase.functions
        .invoke("ticket-reply-notification", {
          body: {
            ticket_id: ticketId,
            reply_text: reply,
            user_email: ticket.email,
            user_name: ticket.name,
            ticket_subject: ticket.subject,
          },
        })
        .then(({ error }) => {
          if (error) console.error("Email notification failed:", error);
        });
    }
  };

  // Close ticket (admin only)
  const closeTicket = async (ticketId: string) => {
    await updateTicketMutation.mutateAsync({
      id: ticketId,
      status: "closed",
    });
  };

  return {
    tickets,
    isLoading,
    createTicket: createTicketMutation.mutate,
    isCreating: createTicketMutation.isPending,
    replyToTicket,
    closeTicket,
    updateTicket: updateTicketMutation.mutate,
    isUpdating: updateTicketMutation.isPending,
  };
}
