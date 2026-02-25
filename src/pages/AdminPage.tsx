import { useState, useMemo, forwardRef } from "react";
import { Shield, DollarSign, Activity, TrendingUp, AlertTriangle, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdminData } from "@/hooks/useAdminData";
import { useUserRole } from "@/hooks/useUserRole";
import { logAdminAction } from "@/hooks/useAuditLog";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StatsCard } from "@/components/admin/StatsCard";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { LiveTriageFeed } from "@/components/admin/LiveTriageFeed";
import { ServiceStatus } from "@/components/admin/ServiceStatus";
import { ToxinTrendingMap } from "@/components/admin/ToxinTrendingMap";
import { TriageOverrides } from "@/components/admin/TriageOverrides";
import { TriageOverridePanel } from "@/components/admin/TriageOverridePanel";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { AdminMessaging } from "@/components/admin/AdminMessaging";
import { AdminInfluencerPanel } from "@/components/admin/AdminInfluencerPanel";
import { WebhookLogsViewer } from "@/components/admin/WebhookLogsViewer";
import { DataExport } from "@/components/admin/DataExport";
import { AuditLogsViewer } from "@/components/admin/AuditLogsViewer";
import { ApiKeysPanel } from "@/components/admin/ApiKeysPanel";
import { RevenueAnalytics } from "@/components/admin/RevenueAnalytics";
import { SiteAnalytics } from "@/components/admin/SiteAnalytics";
import { AdminReviewsPanel } from "@/components/admin/AdminReviewsPanel";
import { CommunityWaitlistPanel } from "@/components/admin/CommunityWaitlistPanel";
import { AdminBlogCMS } from "@/components/admin/AdminBlogCMS";
import { TopicQueuePanel } from "@/components/admin/TopicQueuePanel";
import { SkeletonAdminDashboard } from "@/components/ui/skeleton-card";

const AdminPage = forwardRef<HTMLDivElement>(function AdminPage(_props, ref) {
  const [activeSection, setActiveSection] = useState("overview");
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const { toast } = useToast();

  const {
    session,
    enrichedUsers,
    profiles,
    triageHistory,
    commissions,
    stats,
    sparklineData,
    loadingProfiles,
    togglePremium,
  } = useAdminData();

  const { permissions, hasAdminAccess, isLoading: checkingRole } = useUserRole();

  // Memoize critical alerts for performance at scale
  const criticalAlerts = useMemo(() => {
    return triageHistory
      .filter(t => {
        const status = t.result_status.toLowerCase();
        return status === "red" || status === "emergency";
      })
      .slice(0, 20);
  }, [triageHistory]);

  const handleImpersonate = async (userId: string) => {
    if (permissions.isReadOnly) {
      toast({
        title: "Read-Only Mode",
        description: "You don't have permission to impersonate users.",
        variant: "destructive",
      });
      return;
    }
    const user = enrichedUsers.find((u) => u.user_id === userId);
    
    // Log impersonation action
    await logAdminAction({
      actionType: "user_impersonate",
      targetId: userId,
      newValues: { email: user?.email },
    });
    
    toast({
      title: "Impersonation Mode",
      description: `Viewing as ${user?.email || "user"}. This is a demo - full impersonation requires additional setup.`,
    });
  };

  const handleSendToxinAlert = (region: string, message: string) => {
    if (permissions.isReadOnly) {
      toast({
        title: "Read-Only Mode",
        description: "You don't have permission to send alerts.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: `Alert Sent to ${region}`,
      description: message,
    });
  };

  const handleTriageOverride = async (promptAddition: string) => {
    if (!permissions.canEditTriageRules) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit triage rules.",
        variant: "destructive",
      });
      return;
    }
    
    // Log triage rule update
    await logAdminAction({
      actionType: "triage_rule_update",
      newValues: { rule: promptAddition.slice(0, 200) },
    });
    
    toast({
      title: "Triage Rule Updated",
      description: "The AI prompt has been updated with your custom rule.",
    });
  };

  const handleTogglePremium = (data: { userId: string; isPremium: boolean }) => {
    if (!permissions.canTogglePremium) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to change subscription status.",
        variant: "destructive",
      });
      return;
    }
    togglePremium(data);
  };

  const handleBulkDelete = async (userIds: string[]) => {
    if (permissions.isReadOnly || !permissions.canManageUsers) {
      toast({ title: "Permission Denied", description: "You don't have permission to delete users.", variant: "destructive" });
      return;
    }
    setIsDeletingUsers(true);
    try {
      const { data: { session: currentSession } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      if (!currentSession) throw new Error("Not authenticated");
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userIds }),
        }
      );
      if (!response.ok) throw new Error("Delete failed");
      const result = await response.json();
      const succeeded = result.results?.filter((r: any) => r.success).length || 0;
      
      await logAdminAction({
        actionType: "user_bulk_delete",
        newValues: { deleted_count: succeeded, requested: userIds.length },
      });

      toast({ title: "Users Deleted", description: `${succeeded} of ${userIds.length} users deleted successfully.` });
      // Refresh admin data
      const { queryClient } = await import("@tanstack/react-query").then(async () => {
        // Force refetch
        window.location.reload();
        return { queryClient: null };
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete users.", variant: "destructive" });
    } finally {
      setIsDeletingUsers(false);
    }
  };

  // Loading state
  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,11%)]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(222,47%,11%)] px-5">
        <div className="p-4 rounded-2xl bg-red-500/10 mb-6">
          <Shield className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">Authentication Required</h2>
        <p className="text-slate-400 mb-8 text-center">Please sign in to access the Command Center.</p>
        <Button
          onClick={() => (window.location.href = "/auth")}
          className="bg-primary hover:bg-primary/90"
        >
          Sign In
        </Button>
      </div>
    );
  }

  // No admin access (not admin, moderator, or viewer)
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(222,47%,11%)] px-5">
        <div className="p-4 rounded-2xl bg-red-500/10 mb-6">
          <Shield className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">Access Denied</h2>
        <p className="text-slate-400 mb-8 text-center">
          You don't have administrator privileges.
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          variant="outline"
          className="border-slate-600 text-white hover:bg-slate-800"
        >
          Return Home
        </Button>
      </div>
    );
  }

  // Prepare feed data
  const feedData = triageHistory.slice(0, 20).map((t) => ({
    id: t.id,
    symptoms: t.symptoms,
    result_status: t.result_status,
    created_at: t.created_at,
  }));

  const renderContent = () => {
    switch (activeSection) {
      case "users":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">User Management</h2>
            <UserManagementTable
              users={enrichedUsers}
              onTogglePremium={handleTogglePremium}
              onImpersonate={handleImpersonate}
              onBulkDelete={permissions.canManageUsers ? handleBulkDelete : undefined}
              isLoading={loadingProfiles}
              isDeletingUsers={isDeletingUsers}
            />
          </div>
        );

      case "roles":
        return (
          <div className="p-6">
            <RoleManagement permissions={permissions} />
          </div>
        );

      case "messaging":
        return (
          <div className="p-6">
            <AdminMessaging users={enrichedUsers} permissions={permissions} />
          </div>
        );

      case "live-feed":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Live Triage Activity</h2>
            <div className="h-[calc(100vh-200px)]">
              <LiveTriageFeed initialData={feedData} />
            </div>
          </div>
        );

      case "alerts":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Critical Alerts</h2>
            <div className="space-y-4">
              {criticalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-white font-medium">{alert.symptoms}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              {triageHistory.filter(
                (t) =>
                  t.result_status.toLowerCase() === "red" ||
                  t.result_status.toLowerCase() === "emergency"
              ).length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No critical alerts at this time.
                </div>
              )}
            </div>
          </div>
        );

      case "toxin-map":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Toxin Trending Map</h2>
            <ToxinTrendingMap onSendAlert={handleSendToxinAlert} triageHistory={triageHistory} />
          </div>
        );

      case "overrides":
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-6">Triage System Overrides</h2>
            {/* Priority Override Panel - persists to database */}
            <TriageOverridePanel />
            {/* AI Prompt Rule Overrides */}
            <TriageOverrides onUpdatePrompt={handleTriageOverride} />
          </div>
        );

      case "system":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">System Monitoring</h2>
            <div className="max-w-md">
              <ServiceStatus />
            </div>
          </div>
        );

      case "influencers":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Influencer Management</h2>
            <AdminInfluencerPanel isReadOnly={permissions.isReadOnly} />
          </div>
        );

      case "api-keys":
        return (
          <div className="p-6">
            <ApiKeysPanel />
          </div>
        );

      case "reviews":
        return (
          <div className="p-6">
            <AdminReviewsPanel isReadOnly={permissions.isReadOnly} />
          </div>
        );

      case "revenue":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Revenue Analytics</h2>
            <RevenueAnalytics profiles={profiles} commissions={commissions} />
          </div>
        );

      case "site-analytics":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Site Analytics</h2>
            <SiteAnalytics />
          </div>
        );

      case "webhook-logs":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Webhook Logs</h2>
            <WebhookLogsViewer />
          </div>
        );

      case "export":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Export Data</h2>
            <DataExport />
          </div>
        );

      case "audit-logs":
        return (
          <div className="p-6">
            <AuditLogsViewer />
          </div>
        );

      case "waitlist":
        return (
          <div className="p-6">
            <CommunityWaitlistPanel isReadOnly={permissions.isReadOnly} />
          </div>
        );

      case "blog-cms":
        return <AdminBlogCMS />;

      case "topic-queue":
        return (
          <div className="p-6">
            <TopicQueuePanel />
          </div>
        );

      case "settings":
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
            <div className="max-w-md space-y-4">
              <div className="p-4 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]">
                <h3 className="text-white font-medium mb-2">Admin Account</h3>
                <p className="text-sm text-slate-400">{session.user?.email}</p>
              </div>
              <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={() => (window.location.href = "/")}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit Command Center
              </Button>
            </div>
          </div>
        );

      default:
        // Overview - Show skeleton while loading
        if (loadingProfiles && enrichedUsers.length === 0) {
          return <SkeletonAdminDashboard />;
        }
        
        return (
          <div className="p-6 space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Est. Monthly Revenue"
                value={`$${stats.estimatedMonthlyRevenue?.toFixed(2) || "0.00"}`}
                change={stats.revenueChange}
                changeLabel="vs last month"
                icon={DollarSign}
                sparklineData={sparklineData.map((v, i) => Math.round(v * 9.99))}
                variant={stats.revenueChange >= 0 ? "success" : "danger"}
              />
              <StatsCard
                title="Active Triages (24h)"
                value={stats.activeTriages24h}
                icon={Activity}
                sparklineData={sparklineData}
                variant="default"
              />
              <StatsCard
                title="Subscriber Growth"
                value={`${stats.subscriberGrowth >= 0 ? "+" : ""}${stats.subscriberGrowth}%`}
                change={stats.subscriberGrowth}
                changeLabel="Weekly change"
                icon={TrendingUp}
                sparklineData={[12, 18, 15, 22, 28, 24, 32]}
                variant={stats.subscriberGrowth >= 0 ? "success" : "danger"}
              />
              <StatsCard
                title="Critical Alerts"
                value={stats.criticalAlerts}
                icon={AlertTriangle}
                sparklineData={[2, 1, 3, 0, 2, 1, stats.criticalAlerts]}
                variant={stats.criticalAlerts > 0 ? "danger" : "success"}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Table - Takes 2 columns */}
              <div className="lg:col-span-2">
                <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
                  <h3 className="text-white font-semibold mb-4">Recent Users</h3>
                  <UserManagementTable
                    users={enrichedUsers.slice(0, 5)}
                    onTogglePremium={handleTogglePremium}
                    onImpersonate={handleImpersonate}
                    isLoading={loadingProfiles}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Live Feed */}
                <div className="h-[350px]">
                  <LiveTriageFeed initialData={feedData} />
                </div>

                {/* Service Status */}
                <ServiceStatus />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div ref={ref} className="flex h-screen bg-[hsl(222,47%,11%)] overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        criticalAlerts={stats.criticalAlerts}
        permissions={permissions}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>
    </div>
  );
});

export default AdminPage;
