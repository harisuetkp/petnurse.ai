-- Enable realtime for influencer-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_clicks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commissions;