import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  AlertTriangle,
  Settings,
  Map,
  MessageSquare,
  Shield,
  ChevronLeft,
  ChevronRight,
  Zap,
  UserCog,
  Mail,
  Megaphone,
  FileText,
  Download,
  History,
  Key,
  BarChart3,
  LineChart,
  Star,
  Newspaper,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserPermissions } from "@/hooks/useUserRole";

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
  badge?: number;
  requiredPermission?: keyof UserPermissions;
}

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  criticalAlerts?: number;
  permissions?: UserPermissions;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", id: "overview" },
  { icon: BarChart3, label: "Revenue Analytics", id: "revenue", requiredPermission: "canViewAdmin" },
  { icon: LineChart, label: "Site Analytics", id: "site-analytics", requiredPermission: "canViewAdmin" },
  { icon: Users, label: "User Management", id: "users", requiredPermission: "canManageUsers" },
  { icon: UserCog, label: "Roles & Permissions", id: "roles", requiredPermission: "canViewAdmin" },
  { icon: Mail, label: "Messaging", id: "messaging", requiredPermission: "canSendMessages" },
  { icon: Activity, label: "Live Triage Feed", id: "live-feed" },
  { icon: AlertTriangle, label: "Critical Alerts", id: "alerts" },
  { icon: Map, label: "Toxin Trending", id: "toxin-map" },
  { icon: MessageSquare, label: "Triage Overrides", id: "overrides", requiredPermission: "canEditTriageRules" },
  { icon: Zap, label: "System Status", id: "system" },
  { icon: Key, label: "API Keys", id: "api-keys", requiredPermission: "canViewAdmin" },
  { icon: Star, label: "Reviews", id: "reviews", requiredPermission: "canViewAdmin" },
  { icon: Megaphone, label: "Influencers", id: "influencers", requiredPermission: "canManageUsers" },
  { icon: Users, label: "Community Waitlist", id: "waitlist", requiredPermission: "canViewAdmin" },
  { icon: FileText, label: "Webhook Logs", id: "webhook-logs", requiredPermission: "canViewAdmin" },
  { icon: Download, label: "Export Data", id: "export", requiredPermission: "canManageUsers" },
  { icon: History, label: "Audit Logs", id: "audit-logs", requiredPermission: "canViewAdmin" },
  { icon: Newspaper, label: "Blog CMS", id: "blog-cms", requiredPermission: "canViewAdmin" },
  { icon: ListOrdered, label: "Topic Queue", id: "topic-queue", requiredPermission: "canViewAdmin" },
  { icon: Settings, label: "Settings", id: "settings" },
];

export function AdminSidebar({ 
  activeSection, 
  onSectionChange, 
  criticalAlerts = 0,
  permissions,
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Filter nav items based on permissions
  const visibleItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    if (!permissions) return true;
    return permissions[item.requiredPermission];
  });

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col transition-all duration-300 border-r",
        "bg-[hsl(222,47%,11%)] border-[hsl(217,33%,17%)]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-[hsl(217,33%,17%)]",
        collapsed && "justify-center"
      )}>
        <div className="p-2 rounded-xl bg-primary/20">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-semibold text-white text-sm">Command Center</h1>
            <p className="text-[10px] text-slate-400">PetNurse Admin</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = activeSection === item.id;
          const showBadge = item.id === "alerts" && criticalAlerts > 0;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                "text-sm font-medium relative group",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-slate-400 hover:text-white hover:bg-[hsl(217,33%,17%)]",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
              {showBadge && (
                <span className={cn(
                  "px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white",
                  collapsed ? "absolute -top-1 -right-1" : "ml-auto"
                )}>
                  {criticalAlerts}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Read-Only Indicator */}
      {permissions?.isReadOnly && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 text-center font-medium">
            View Only Mode
          </p>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-[hsl(217,33%,17%)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full text-slate-400 hover:text-white hover:bg-[hsl(217,33%,17%)]",
            collapsed && "px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
