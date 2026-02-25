import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditActionType =
  | "premium_toggle"
  | "role_add"
  | "role_remove"
  | "message_send"
  | "message_broadcast"
  | "influencer_add"
  | "influencer_toggle"
  | "triage_rule_update"
  | "triage_priority_override"
  | "data_export"
  | "user_impersonate"
  | "payout_process"
  | "waitlist_remove"
  | "user_bulk_delete";

interface AuditLogParams {
  actionType: AuditActionType;
  targetId?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export async function logAdminAction({
  actionType,
  targetId,
  previousValues,
  newValues,
}: AuditLogParams): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      console.warn("No authenticated user for audit log");
      return;
    }

    const { error } = await supabase.from("admin_audit_logs").insert({
      admin_id: session.session.user.id,
      action_type: actionType,
      target_id: targetId || null,
      previous_values: (previousValues as Json) || null,
      new_values: (newValues as Json) || null,
    });

    if (error) {
      console.error("Failed to create audit log:", error.message);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}
