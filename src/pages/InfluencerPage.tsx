import { useState, useEffect, forwardRef, useCallback } from "react";
import { 
  Copy, 
  Check, 
  TrendingUp, 
  Users, 
  MousePointer, 
  DollarSign,
  Wallet,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Link2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import petnurseLogo from "@/assets/petnurse-logo-v2.png";
import { useNavigate } from "react-router-dom";
import { FinancialStatsCard } from "@/components/influencer/FinancialStatsCard";
import { EarningsChart } from "@/components/influencer/EarningsChart";
import { CommissionTable } from "@/components/influencer/CommissionTable";
import { BalanceCard } from "@/components/influencer/BalanceCard";

interface InfluencerStats {
  totalClicks: number;
  totalSignups: number;
  activeReferrals: number;
  conversionRate: number;
  pendingBalance: number;
  totalEarned: number;
}

interface Commission {
  amount: number;
  status: string;
  date: string;
}

interface InfluencerData {
  isInfluencer: boolean;
  influencer?: {
    subscriptionKey: string;
    name: string | null;
    promoCodeDisplay: string;
    commissionPercent: number;
    isActive: boolean;
    memberSince: string;
    stripeConnected: boolean;
  };
  stats?: InfluencerStats;
  referralUrl?: string;
  recentCommissions?: Commission[];
}

// Projected earnings based on typical growth curve
const getProjectedEarningsData = (currentEarnings: number) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const baseMultiplier = currentEarnings > 0 ? currentEarnings / 100 : 1;
  
  return months.map((month, index) => ({
    month,
    earnings: index <= currentMonth 
      ? Math.round(baseMultiplier * (index + 1) * 50) 
      : Math.round(baseMultiplier * (index + 1) * 75),
  }));
};

const InfluencerPage = forwardRef<HTMLDivElement>(function InfluencerPage(_props, ref) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InfluencerData | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("get-influencer-data");
      
      if (error) throw error;
      
      setData(result);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load influencer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!data?.influencer?.subscriptionKey) return;

    const subscriptionKey = data.influencer.subscriptionKey;

    const clicksChannel = supabase
      .channel(`clicks-${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_clicks',
        },
        () => {
          setData(prev => prev && prev.stats ? {
            ...prev,
            stats: {
              ...prev.stats,
              totalClicks: prev.stats.totalClicks + 1,
            }
          } : prev);
          
          toast({
            title: "🎯 New Click!",
            description: "Someone clicked your referral link",
          });
        }
      )
      .subscribe();

    const referralsChannel = supabase
      .channel(`referrals-${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
        },
        () => {
          setData(prev => prev && prev.stats ? {
            ...prev,
            stats: {
              ...prev.stats,
              totalSignups: prev.stats.totalSignups + 1,
              conversionRate: prev.stats.totalClicks > 0 
                ? Math.round(((prev.stats.totalSignups + 1) / prev.stats.totalClicks) * 100 * 100) / 100
                : 0,
            }
          } : prev);
          
          toast({
            title: "🎉 New Sign-up!",
            description: "A new user signed up using your referral",
          });
        }
      )
      .subscribe();

    const commissionsChannel = supabase
      .channel(`commissions-${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commissions',
        },
        (payload) => {
          const newCommission = payload.new as { amount: number; status: string; created_at: string };
          
          setData(prev => prev && prev.stats ? {
            ...prev,
            stats: {
              ...prev.stats,
              pendingBalance: prev.stats.pendingBalance + Number(newCommission.amount),
              activeReferrals: prev.stats.activeReferrals + 1,
            },
            recentCommissions: [
              { 
                amount: newCommission.amount, 
                status: newCommission.status, 
                date: new Date(newCommission.created_at).toLocaleDateString() 
              }, 
              ...(prev.recentCommissions || []).slice(0, 9)
            ],
          } : prev);
          
          toast({
            title: "💰 New Commission!",
            description: `You earned $${Number(newCommission.amount).toFixed(2)}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clicksChannel);
      supabase.removeChannel(referralsChannel);
      supabase.removeChannel(commissionsChannel);
    };
  }, [data?.influencer?.subscriptionKey, toast]);

  const handleCopyLink = async () => {
    if (!data?.referralUrl) return;
    
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Your referral link is ready to share",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("create-connect-onboarding");
      
      if (error) throw error;
      
      if (result?.url) {
        window.open(result.url, "_blank");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to connect Stripe account",
        variant: "destructive",
      });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data?.isInfluencer) {
    return (
      <div className="min-h-screen bg-background">
        <header className="safe-area-top border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-40">
          <div className="flex items-center gap-4 px-6 py-4 max-w-6xl mx-auto">
            <img src={petnurseLogo} alt="PetNurse AI" className="h-10 w-10 rounded-xl object-cover" />
            <h1 className="text-lg font-semibold text-foreground">Partner Portal</h1>
          </div>
        </header>
        
        <div className="px-6 py-20 max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Join Our Partner Program</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            You're not currently registered as a partner. Contact us to join and start earning{" "}
            <span className="text-primary font-semibold">10% commission</span> on every referral.
          </p>
          <Button onClick={() => navigate("/")} size="lg" className="gap-2">
            Return Home
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const { influencer, stats, referralUrl, recentCommissions } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <header className="safe-area-top border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <img 
                src={petnurseLogo} 
                alt="PetNurse AI" 
                className="h-10 w-10 rounded-xl object-cover ring-1 ring-border/50" 
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-safe-green rounded-full ring-2 ring-background" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-foreground">
                {influencer?.name ? influencer.name : "Partner Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Partner since {influencer?.memberSince}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex gap-1.5 text-xs font-medium">
              <Activity className="h-3 w-3 text-safe-green" />
              Live
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              disabled={refreshing} 
              className="rounded-xl h-9 w-9"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 safe-area-bottom">
        
        {/* Commission Banner - Clean & Minimal */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium opacity-80 mb-1">Your Commission Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-bold tracking-tight">10%</span>
                <span className="text-lg opacity-80">recurring</span>
              </div>
              <p className="text-sm opacity-70 mt-2 max-w-sm">
                Earn on every subscription payment, forever. No caps.
              </p>
            </div>
            
            <div className="flex flex-col items-start sm:items-end gap-1 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <span className="text-xs opacity-70">Potential Monthly</span>
              <span className="text-2xl font-bold">$500+</span>
            </div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 dark:bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Referral Link</h2>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {influencer?.promoCodeDisplay}
            </Badge>
          </div>
          
          <div 
            className="group flex items-center gap-3 bg-muted/40 hover:bg-muted/60 rounded-xl px-4 py-3.5 cursor-pointer transition-all border border-transparent hover:border-primary/20"
            onClick={handleCopyLink}
          >
            <p className="flex-1 font-mono text-sm text-foreground truncate">
              {referralUrl}
            </p>
            <Button 
              size="sm" 
              className={`shrink-0 gap-2 rounded-lg transition-all ${copied ? "bg-safe-green hover:bg-safe-green" : ""}`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            Share on Instagram, YouTube, TikTok, or directly with pet owners
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FinancialStatsCard
            title="Link Clicks"
            value={stats?.totalClicks || 0}
            icon={MousePointer}
            variant="primary"
          />
          <FinancialStatsCard
            title="Sign-ups"
            value={stats?.totalSignups || 0}
            icon={Users}
            variant="primary"
          />
          <FinancialStatsCard
            title="Conversion"
            value={`${stats?.conversionRate || 0}%`}
            icon={TrendingUp}
            variant="success"
          />
          <FinancialStatsCard
            title="Active Subs"
            value={stats?.activeReferrals || 0}
            icon={DollarSign}
            variant="warning"
          />
        </div>

        {/* Balance Cards */}
        <BalanceCard 
          available={stats?.pendingBalance || 0}
          lifetime={stats?.totalEarned || 0}
        />

        {/* Connect Bank CTA */}
        {!influencer?.stripeConnected && (
          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 dark:from-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 w-fit">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Connect Your Bank</h3>
                <p className="text-sm text-muted-foreground">
                  Link your bank account to receive commission payouts
                </p>
              </div>
              <Button 
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                size="lg"
                className="gap-2 rounded-xl w-full sm:w-auto"
              >
                {connectingStripe ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                Connect via Stripe
              </Button>
            </div>
          </div>
        )}

        {/* Bank Connected State */}
        {influencer?.stripeConnected && (
          <div className="rounded-2xl border border-safe-green/30 bg-card p-5 dark:bg-card/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-safe-green/10">
                  <Wallet className="h-5 w-5 text-safe-green" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">Bank Connected</h3>
                    <Badge className="bg-safe-green/10 text-safe-green border-0 text-xs">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatic payouts enabled
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                variant="outline"
                className="gap-2 rounded-xl"
              >
                {connectingStripe ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage
              </Button>
            </div>
          </div>
        )}

        {/* Projected Earnings Chart */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 dark:bg-card/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Projected Earnings</h2>
            </div>
            <Badge variant="outline" className="text-xs">
              Sample Growth
            </Badge>
          </div>
          
          <EarningsChart data={getProjectedEarningsData(stats?.totalEarned || 0)} />
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Based on 10-15 new referrals per month
          </p>
        </div>

        {/* Recent Commissions */}
        {recentCommissions && recentCommissions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
            </div>
            <CommissionTable commissions={recentCommissions} />
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">
            Questions? Contact support@petnurseai.com
          </p>
        </div>
      </div>
    </div>
  );
});

export default InfluencerPage;
