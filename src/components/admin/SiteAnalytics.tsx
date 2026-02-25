import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, TrendingUp, Clock, Globe, Smartphone, BookOpen } from "lucide-react";
import { subDays, startOfDay, format, isAfter } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

interface PageView {
  id: string;
  path: string;
  user_id: string | null;
  visitor_id: string;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

export function SiteAnalytics() {
  const { data: pageViews = [], isLoading } = useQuery({
    queryKey: ["admin-page-views"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data as PageView[];
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnMount: "always",
    refetchInterval: 60000, // Auto-refresh every 60s
    refetchOnWindowFocus: true,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = subDays(today, 1);
    const weekAgo = subDays(today, 7);

    const todayViews = pageViews.filter((v) => isAfter(new Date(v.created_at), today));
    const yesterdayViews = pageViews.filter(
      (v) => isAfter(new Date(v.created_at), yesterday) && !isAfter(new Date(v.created_at), today)
    );
    const weekViews = pageViews.filter((v) => isAfter(new Date(v.created_at), weekAgo));

    // Unique visitors
    const todayVisitors = new Set(todayViews.map((v) => v.visitor_id)).size;
    const weekVisitors = new Set(weekViews.map((v) => v.visitor_id)).size;

    // Daily change
    const viewsChange = yesterdayViews.length > 0
      ? Math.round(((todayViews.length - yesterdayViews.length) / yesterdayViews.length) * 100)
      : todayViews.length > 0 ? 100 : 0;

    return {
      totalViews: pageViews.length,
      todayViews: todayViews.length,
      todayVisitors,
      weekViews: weekViews.length,
      weekVisitors,
      viewsChange,
    };
  }, [pageViews]);

  // Chart data - last 7 days
  const chartData = useMemo(() => {
    const days: { date: string; views: number; visitors: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = startOfDay(subDays(day, -1));
      
      const dayViews = pageViews.filter(
        (v) => isAfter(new Date(v.created_at), dayStart) && !isAfter(new Date(v.created_at), dayEnd)
      );
      
      days.push({
        date: format(day, "EEE"),
        views: dayViews.length,
        visitors: new Set(dayViews.map((v) => v.visitor_id)).size,
      });
    }
    return days;
  }, [pageViews]);

  // Top pages
  const topPages = useMemo(() => {
    const pageCounts: Record<string, number> = {};
    pageViews.forEach((v) => {
      pageCounts[v.path] = (pageCounts[v.path] || 0) + 1;
    });
    return Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  }, [pageViews]);

  // Blog-specific analytics
  const blogStats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = subDays(today, 1);
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    const blogViews = pageViews.filter((v) => v.path.startsWith("/blog"));
    const todayBlog = blogViews.filter((v) => isAfter(new Date(v.created_at), today));
    const yesterdayBlog = blogViews.filter(
      (v) => isAfter(new Date(v.created_at), yesterday) && !isAfter(new Date(v.created_at), today)
    );
    const weekBlog = blogViews.filter((v) => isAfter(new Date(v.created_at), weekAgo));
    const monthBlog = blogViews.filter((v) => isAfter(new Date(v.created_at), monthAgo));

    const dailyChange = yesterdayBlog.length > 0
      ? Math.round(((todayBlog.length - yesterdayBlog.length) / yesterdayBlog.length) * 100)
      : todayBlog.length > 0 ? 100 : 0;

    // Top blog posts
    const postCounts: Record<string, number> = {};
    blogViews.forEach((v) => {
      postCounts[v.path] = (postCounts[v.path] || 0) + 1;
    });
    const topPosts = Object.entries(postCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, count]) => ({ path, count }));

    // Blog traffic chart - last 7 days
    const blogChartData: { date: string; views: number; visitors: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = startOfDay(subDays(day, -1));
      const dayViews = blogViews.filter(
        (v) => isAfter(new Date(v.created_at), dayStart) && !isAfter(new Date(v.created_at), dayEnd)
      );
      blogChartData.push({
        date: format(day, "EEE"),
        views: dayViews.length,
        visitors: new Set(dayViews.map((v) => v.visitor_id)).size,
      });
    }

    return {
      todayViews: todayBlog.length,
      weekViews: weekBlog.length,
      monthViews: monthBlog.length,
      totalViews: blogViews.length,
      todayVisitors: new Set(todayBlog.map((v) => v.visitor_id)).size,
      weekVisitors: new Set(weekBlog.map((v) => v.visitor_id)).size,
      dailyChange,
      topPosts,
      chartData: blogChartData,
    };
  }, [pageViews]);

  // Device breakdown
  const deviceBreakdown = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    pageViews.forEach((v) => {
      if (v.user_agent?.toLowerCase().includes("mobile")) {
        mobile++;
      } else {
        desktop++;
      }
    });
    return [
      { name: "Desktop", value: desktop, fill: "hsl(var(--primary))" },
      { name: "Mobile", value: mobile, fill: "hsl(var(--chart-2))" },
    ];
  }, [pageViews]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.todayViews}</p>
                <p className="text-xs text-slate-400">Page Views Today</p>
              </div>
            </div>
            {stats.viewsChange !== 0 && (
              <p className={`text-xs mt-2 ${stats.viewsChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {stats.viewsChange >= 0 ? "+" : ""}{stats.viewsChange}% vs yesterday
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.todayVisitors}</p>
                <p className="text-xs text-slate-400">Unique Visitors Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.weekViews}</p>
                <p className="text-xs text-slate-400">Views This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalViews}</p>
                <p className="text-xs text-slate-400">Total (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <Card className="lg:col-span-2 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Traffic (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(217, 33%, 17%)",
                      border: "1px solid hsl(217, 33%, 22%)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#viewsGradient)"
                    name="Page Views"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="transparent"
                    name="Unique Visitors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Device Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceBreakdown} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(217, 33%, 17%)",
                      border: "1px solid hsl(217, 33%, 22%)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm text-slate-300">Desktop</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-300">Mobile</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm font-medium">Top Pages (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPages.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No page views recorded yet</p>
            ) : (
              topPages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-4">{index + 1}.</span>
                    <span className="text-sm text-white font-mono">{page.path}</span>
                  </div>
                  <span className="text-sm text-slate-400">{page.count.toLocaleString()} views</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blog Traffic Section */}
      <div className="space-y-4">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Blog Traffic
        </h3>

        {/* Blog Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{blogStats.todayViews}</p>
                  <p className="text-xs text-slate-400">Blog Views Today</p>
                </div>
              </div>
              {blogStats.dailyChange !== 0 && (
                <p className={`text-xs mt-2 ${blogStats.dailyChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {blogStats.dailyChange >= 0 ? "+" : ""}{blogStats.dailyChange}% vs yesterday
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{blogStats.todayVisitors}</p>
                  <p className="text-xs text-slate-400">Blog Visitors Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{blogStats.weekViews}</p>
                  <p className="text-xs text-slate-400">Blog Views This Week</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{blogStats.weekVisitors} unique visitors</p>
            </CardContent>
          </Card>

          <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clock className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{blogStats.totalViews}</p>
                  <p className="text-xs text-slate-400">Total Blog Views (30d)</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{blogStats.monthViews} this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Blog Traffic Chart */}
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Blog Traffic (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={blogStats.chartData}>
                  <defs>
                    <linearGradient id="blogGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(217, 33%, 17%)",
                      border: "1px solid hsl(217, 33%, 22%)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} fill="url(#blogGradient)" name="Blog Views" />
                  <Area type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2} fill="transparent" name="Unique Visitors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Blog Posts */}
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Top Blog Posts (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blogStats.topPosts.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No blog views recorded yet</p>
              ) : (
                blogStats.topPosts.map((post, index) => (
                  <div key={post.path} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-4">{index + 1}.</span>
                      <span className="text-sm text-white font-mono truncate max-w-[300px]">{post.path}</span>
                    </div>
                    <span className="text-sm text-slate-400 shrink-0">{post.count.toLocaleString()} views</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
