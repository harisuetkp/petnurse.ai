import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/hooks/useAuditLog";

export interface AdminMessage {
  id: string;
  sender_id: string | null;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export function useAdminMessages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user's session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Fetch user's messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["user-messages", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdminMessage[];
    },
    enabled: !!session?.user?.id,
  });

  // Count unread messages
  const unreadCount = messages.filter((m) => !m.is_read).length;

  // Mark message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("admin_messages")
        .update({ is_read: true })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-messages"] });
    },
  });

  // Send message (admin only)
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      recipientId,
      subject,
      content,
    }: {
      recipientId: string;
      subject: string;
      content: string;
    }) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("admin_messages").insert({
        sender_id: session.user.id,
        recipient_id: recipientId,
        subject,
        content,
      });
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "message_send",
        targetId: recipientId,
        newValues: { subject, content_length: content.length },
      });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-messages-all"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Broadcast message to all users (admin only)
  const broadcastMessageMutation = useMutation({
    mutationFn: async ({
      userIds,
      subject,
      content,
    }: {
      userIds: string[];
      subject: string;
      content: string;
    }) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const messages = userIds.map((recipientId) => ({
        sender_id: session.user.id,
        recipient_id: recipientId,
        subject,
        content,
      }));
      const { error } = await supabase.from("admin_messages").insert(messages);
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "message_broadcast",
        newValues: { recipient_count: userIds.length, subject },
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Broadcast sent",
        description: `Message sent to ${variables.userIds.length} user(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-messages-all"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to broadcast message: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch all messages (admin view)
  const { data: allMessages = [], isLoading: loadingAllMessages } = useQuery({
    queryKey: ["admin-messages-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AdminMessage[];
    },
  });

  return {
    messages,
    unreadCount,
    loadingMessages,
    markAsRead: markAsReadMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    broadcastMessage: broadcastMessageMutation.mutate,
    isSending: sendMessageMutation.isPending || broadcastMessageMutation.isPending,
    allMessages,
    loadingAllMessages,
  };
}
