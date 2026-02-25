import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Shield,
  Eye,
  Users,
  Trash2,
  Search,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/hooks/useAuditLog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import type { UserPermissions } from "@/hooks/useUserRole";

interface UserWithRoles {
  user_id: string;
  email: string | null;
  roles: string[];
  created_at: string;
}

interface RoleManagementProps {
  permissions: UserPermissions;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Shield,
  moderator: Users,
  viewer: Eye,
  user: Crown,
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  moderator: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  viewer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  user: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access to all features and settings",
  moderator: "Can view and manage users, send messages",
  viewer: "Read-only access to admin dashboard",
  user: "Standard user without admin access",
};

export function RoleManagement({ permissions }: RoleManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("viewer");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Get all admin users first
      const { data: adminUsers, error: usersError } = await supabase.rpc("get_users_for_admin");
      if (usersError) throw usersError;

      // Get all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      // Combine user data with roles
      const usersWithRoles: UserWithRoles[] = adminUsers.map((user: { user_id: string; email: string; created_at: string }) => ({
        user_id: user.user_id,
        email: user.email,
        created_at: user.created_at,
        roles: allRoles
          .filter((r) => r.user_id === user.user_id)
          .map((r) => r.role),
      }));

      return usersWithRoles;
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "role_add",
        targetId: userId,
        newValues: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Role added", description: "User role has been updated successfully." });
      setIsAddDialogOpen(false);
      setSelectedEmail("");
      setSelectedRole("viewer");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message.includes("duplicate")
          ? "User already has this role"
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "role_remove",
        targetId: userId,
        previousValues: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Role removed", description: "User role has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter users with admin-related roles
  const adminUsers = users.filter(
    (user) =>
      user.roles.length > 0 &&
      user.roles.some((r) => ["admin", "moderator", "viewer"].includes(r))
  );

  // Filter by search
  const filteredUsers = adminUsers.filter(
    (user) =>
      !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find user by email for adding role
  const handleAddRole = () => {
    const user = users.find(
      (u) => u.email?.toLowerCase() === selectedEmail.toLowerCase()
    );
    if (!user) {
      toast({
        title: "User not found",
        description: "Please enter a valid registered email address.",
        variant: "destructive",
      });
      return;
    }
    addRoleMutation.mutate({ userId: user.user_id, role: selectedRole });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Role & Permission Management</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage admin access and permissions for users
          </p>
        </div>
        {permissions.canEditRoles && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
              <DialogHeader>
                <DialogTitle className="text-white">Add Admin User</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Grant admin access to an existing user by their email address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-white">User Email</Label>
                  <Input
                    placeholder="user@example.com"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    className="bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
                      <SelectItem value="admin" className="text-white hover:bg-[hsl(217,33%,22%)]">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-red-400" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                      <SelectItem value="moderator" className="text-white hover:bg-[hsl(217,33%,22%)]">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-amber-400" />
                          Moderator - Manage users
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer" className="text-white hover:bg-[hsl(217,33%,22%)]">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-blue-400" />
                          Viewer - Read only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {ROLE_DESCRIPTIONS[selectedRole]}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRole}
                  disabled={!selectedEmail || addRoleMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {addRoleMutation.isPending ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search admin users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white placeholder:text-slate-500"
        />
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]">
        {["admin", "moderator", "viewer"].map((role) => {
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role} className="flex items-center gap-2">
              <Badge className={ROLE_COLORS[role]}>
                <Icon className="h-3 w-3 mr-1" />
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
              <span className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[role]}</span>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-[hsl(217,33%,22%)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[hsl(222,47%,11%)]">
            <TableRow className="border-[hsl(217,33%,22%)] hover:bg-transparent">
              <TableHead className="text-slate-400">User</TableHead>
              <TableHead className="text-slate-400">Roles</TableHead>
              {permissions.canEditRoles && (
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-[hsl(217,33%,22%)]">
                  <TableCell colSpan={3}>
                    <div className="h-12 bg-[hsl(217,33%,17%)] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow className="border-[hsl(217,33%,22%)]">
                <TableCell colSpan={3} className="text-center text-slate-400 py-8">
                  No admin users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.user_id}
                  className="border-[hsl(217,33%,22%)] hover:bg-[hsl(217,33%,17%)]"
                >
                  <TableCell>
                    <p className="text-white font-medium">{user.email || "No email"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => {
                        const Icon = ROLE_ICONS[role] || Crown;
                        return (
                          <Badge key={role} className={cn(ROLE_COLORS[role] || ROLE_COLORS.user)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {role}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  {permissions.canEditRoles && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.roles
                          .filter((r) => ["admin", "moderator", "viewer"].includes(r))
                          .map((role) => (
                            <Button
                              key={role}
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeRoleMutation.mutate({ userId: user.user_id, role })
                              }
                              disabled={removeRoleMutation.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
