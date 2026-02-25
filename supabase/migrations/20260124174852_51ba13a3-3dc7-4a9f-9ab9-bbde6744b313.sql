-- Create admin_messages table for sending messages to users
CREATE TABLE public.admin_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    subject text NOT NULL,
    content text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_admin_messages_recipient ON public.admin_messages(recipient_id);
CREATE INDEX idx_admin_messages_created ON public.admin_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own messages
CREATE POLICY "Users can view their own messages"
ON public.admin_messages
FOR SELECT
USING (auth.uid() = recipient_id);

-- RLS: Users can update (mark as read) their own messages
CREATE POLICY "Users can update their own messages"
ON public.admin_messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- RLS: Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.admin_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can insert messages
CREATE POLICY "Admins can insert messages"
ON public.admin_messages
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can update messages
CREATE POLICY "Admins can update all messages"
ON public.admin_messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.admin_messages
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;