-- Add database indexes for query performance optimization at scale (100k+ users)

-- Index on profiles table for user lookups and premium status queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium) WHERE is_premium = true;

-- Index on triage_history for user history and admin analytics
CREATE INDEX IF NOT EXISTS idx_triage_history_user_id ON public.triage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_history_created_at ON public.triage_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_history_result_status ON public.triage_history(result_status);

-- Index on pets for owner lookups
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON public.pets(created_at DESC);

-- Index on referral_clicks for influencer analytics
CREATE INDEX IF NOT EXISTS idx_referral_clicks_influencer_id ON public.referral_clicks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created_at ON public.referral_clicks(created_at DESC);

-- Index on referrals for influencer dashboards
CREATE INDEX IF NOT EXISTS idx_referrals_influencer_id ON public.referrals(influencer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Index on commissions for payout processing
CREATE INDEX IF NOT EXISTS idx_commissions_influencer_id ON public.commissions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON public.commissions(created_at DESC);

-- Index on webhook_logs for admin monitoring
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON public.webhook_logs(processed) WHERE processed = false;

-- Index on admin_audit_logs for audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.admin_audit_logs(action_type);