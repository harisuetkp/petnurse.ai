import { useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { subDays, format, startOfDay, isAfter } from "date-fns";

interface Profile {
  user_id: string;
  is_premium: boolean;
  created_at: string;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface RevenueAnalyticsProps {
  profiles: Profile[];
  commissions?: Commission[];
}

const SUBSCRIPTION_PRICE = 9.99;
const ONE_TIME_PRICE = 5.99;

export function RevenueAnalytics({ profiles, commissions = [] }: RevenueAnalyticsProps) {
  const analytics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const thirtyDaysAgo = subDays(today, 30);
    const sixtyDaysAgo = subDays(today, 60);
    
    // Count premium users
    const premiumUsers = profiles.filter(p => p.is_premium);
    const totalPremium = premiumUsers.length;
    
    // New subscribers this month vs last month
    const thisMonthSubs = premiumUsers.filter(p => 
      isAfter(new Date(p.created_at), thirtyDaysAgo)
    ).length;
    
    const lastMonthSubs = premiumUsers.filter(p => 
      isAfter(new Date(p.created_at), sixtyDaysAgo) && 
      !isAfter(new Date(p.created_at), thirtyDaysAgo)
    ).length;
    
    // Estimate subscription vs one-time split (80/20)
    const estimatedSubscribers = Math.floor(totalPremium * 0.8);
    const estimatedOneTime = totalPremium - estimatedSubscribers;
    
    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = estimatedSubscribers * SUBSCRIPTION_PRICE;
    
    // Calculate total revenue
    const totalMonthlyRevenue = mrr + (thisMonthSubs * 0.2 * ONE_TIME_PRICE);
    
    // ARR (Annual Recurring Revenue) projection
    const arr = mrr * 12;
    
    // MRR change percentage
    const mrrChange = lastMonthSubs === 0 
      ? (thisMonthSubs > 0 ? 100 : 0)
      : Math.round(((thisMonthSubs - lastMonthSubs) / lastMonthSubs) * 100);
    
    // Churn estimate (simple: users who stopped being premium / total)
    // For now, assume 5% monthly churn as placeholder
    const estimatedChurnRate = 5;
    
    // LTV calculation (simplified: MRR per user / churn rate)
    const avgRevenuePerUser = totalPremium > 0 ? mrr / totalPremium : 0;
    const ltv = estimatedChurnRate > 0 
      ? (avgRevenuePerUser / (estimatedChurnRate / 100)) 
      : avgRevenuePerUser * 12;
    
    // Commission totals
    const totalCommissionsPending = commissions
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + Number(c.amount), 0);
    
    const totalCommissionsPaid = commissions
      .filter(c => c.status === "paid")
      .reduce((sum, c) => sum + Number(c.amount), 0);
    
    // Build daily revenue chart data
    const chartData = Array.from({ length: 30 }).map((_, i) => {
      const day = subDays(now, 29 - i);
      const dayStart = startOfDay(day);
      const dayEnd = startOfDay(subDays(day, -1));
      
      const newSubsOnDay = profiles.filter(p => {
        const created = new Date(p.created_at);
        return p.is_premium && isAfter(created, dayStart) && !isAfter(created, dayEnd);
      }).length;
      
      // Estimate revenue for that day
      const dayRevenue = (newSubsOnDay * 0.8 * SUBSCRIPTION_PRICE) + 
                         (newSubsOnDay * 0.2 * ONE_TIME_PRICE);
      
      return {
        date: format(day, "MMM d"),
        revenue: Number(dayRevenue.toFixed(2)),
        subscribers: newSubsOnDay,
      };
    });
    
    return {
      mrr,
      arr,
      mrrChange,
      totalPremium,
      thisMonthSubs,
      estimatedChurnRate,
      ltv,
      totalMonthlyRevenue,
      totalCommissionsPending,
      totalCommissionsPaid,
      chartData,
    };
  }, [profiles, commissions]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${analytics.mrr.toFixed(2)}</span>
              <Badge 
                variant={analytics.mrrChange >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                {analytics.mrrChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(analytics.mrrChange)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ARR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${analytics.arr.toFixed(0)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Annual Run Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Subs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{analytics.totalPremium}</span>
              <span className="text-sm text-muted-foreground">
                +{analytics.thisMonthSubs} this month
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Premium Subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Est. LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${analytics.ltv.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime Value per User</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Trend (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Influencer Payouts Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Influencer Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-warning-amber">
              ${analytics.totalCommissionsPending.toFixed(2)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Commissions Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-safe-green">
              ${analytics.totalCommissionsPaid.toFixed(2)}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
