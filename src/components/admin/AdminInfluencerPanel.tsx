import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/hooks/useAuditLog";
import { cn } from "@/lib/utils";

interface Influencer {
  id: string;
  user_id: string;
  promo_code: string;
  name: string | null;
  commission_rate: number;
  total_earned: number;
  pending_balance: number;
  stripe_connect_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface AdminInfluencerPanelProps {
  isReadOnly?: boolean;
}

export function AdminInfluencerPanel({ isReadOnly = false }: AdminInfluencerPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [processingPayouts, setProcessingPayouts] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newInfluencer, setNewInfluencer] = useState({ email: "", name: "", promoCode: "", commissionRate: 0.10 });
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Generate a random promo code
  const generatePromoCode = useCallback(() => {
    const prefixes = ["PET", "VET", "CARE", "PAWS", "FUR"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const numbers = Math.floor(Math.random() * 90 + 10); // 10-99
    const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    return `${prefix}${numbers}${suffix}`;
  }, []);

  // Auto-generate promo code when dialog opens
  useEffect(() => {
    if (addDialogOpen && !newInfluencer.promoCode) {
      setNewInfluencer(prev => ({ ...prev, promoCode: generatePromoCode() }));
    }
  }, [addDialogOpen, generatePromoCode]);

  const handleRegenerateCode = () => {
    setNewInfluencer(prev => ({ ...prev, promoCode: generatePromoCode() }));
  };

  const fetchInfluencers = async () => {
    try {
      const { data, error } = await supabase
        .from("influencers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setInfluencers(data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load influencers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const handleProcessPayouts = async () => {
    if (isReadOnly) {
      toast({
        title: "Read Only",
        description: "You don't have permission to process payouts",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayouts(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-influencer-payouts");
      
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "payout_process",
        newValues: { 
          processed: data.processed, 
          successful: data.successful, 
          totalPaid: data.totalPaid 
        },
      });
      
      toast({
        title: "Payouts Processed",
        description: `${data.successful} of ${data.processed} payouts completed. Total: $${data.totalPaid.toFixed(2)}`,
      });
      
      fetchInfluencers(); // Refresh data
    } catch {
      toast({
        title: "Error",
        description: "Failed to process payouts",
        variant: "destructive",
      });
    } finally {
      setProcessingPayouts(false);
    }
  };

  const handleAddInfluencer = async () => {
    if (!newInfluencer.email || !newInfluencer.promoCode || !newInfluencer.name) {
      toast({
        title: "Error",
        description: "Name, email and promo code are required",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-add-influencer", {
        body: {
          email: newInfluencer.email,
          name: newInfluencer.name,
          promoCode: newInfluencer.promoCode,
          commissionRate: newInfluencer.commissionRate,
        },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      
      // Log the action
      await logAdminAction({
        actionType: "influencer_add",
        targetId: data.influencer.userId,
        newValues: { 
          name: data.influencer.name,
          promoCode: data.influencer.promoCode,
          commissionRate: data.influencer.commissionRate,
          email: newInfluencer.email,
        },
      });
      
      toast({
        title: "Success",
        description: `Influencer "${newInfluencer.name}" created with code: ${data.influencer.promoCode}. They can now log in and view their dashboard at /influencer`,
      });
      
      setNewInfluencer({ email: "", name: "", promoCode: generatePromoCode(), commissionRate: 0.10 });
      setAddDialogOpen(false);
      fetchInfluencers(); // Refresh the list
    } catch {
      toast({
        title: "Error",
        description: "Failed to add influencer",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (influencer: Influencer) => {
    if (isReadOnly) return;

    try {
      const { error } = await supabase
        .from("influencers")
        .update({ is_active: !influencer.is_active })
        .eq("id", influencer.id);
      
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "influencer_toggle",
        targetId: influencer.id,
        previousValues: { is_active: influencer.is_active },
        newValues: { is_active: !influencer.is_active },
      });
      
      toast({
        title: "Updated",
        description: `Influencer ${influencer.is_active ? "deactivated" : "activated"}`,
      });
      
      fetchInfluencers();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update influencer status",
        variant: "destructive",
      });
    }
  };

  // Filter influencers based on search query
  const filteredInfluencers = useMemo(() => {
    if (!searchQuery.trim()) return influencers;
    const query = searchQuery.toLowerCase();
    return influencers.filter(inf => 
      (inf.name?.toLowerCase().includes(query)) ||
      inf.promo_code.toLowerCase().includes(query)
    );
  }, [influencers, searchQuery]);

  // Memoize calculated totals for performance at scale
  const { totalPending, totalEarned, activeCount, eligibleForPayout } = useMemo(() => {
    let pending = 0;
    let earned = 0;
    let active = 0;
    let eligible = 0;
    
    for (const inf of influencers) {
      const balance = Number(inf.pending_balance);
      pending += balance;
      earned += Number(inf.total_earned);
      if (inf.is_active) active++;
      if (balance >= 50) eligible++;
    }
    
    return { totalPending: pending, totalEarned: earned, activeCount: active, eligibleForPayout: eligible };
  }, [influencers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Influencers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Pending Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalEarned.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{eligibleForPayout}</p>
                <p className="text-xs text-muted-foreground">Ready for Payout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Influencer Management</h3>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isReadOnly}>
                <Plus className="h-4 w-4 mr-2" />
                Add Influencer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Influencer</DialogTitle>
                <DialogDescription>
                  Register a new user as an influencer partner.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Influencer Name</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={newInfluencer.name}
                    onChange={(e) => setNewInfluencer(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name for the influencer
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    placeholder="partner@example.com"
                    value={newInfluencer.email}
                    onChange={(e) => setNewInfluencer(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match an existing user's email
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promoCode"
                      placeholder="VET10"
                      value={newInfluencer.promoCode}
                      onChange={(e) => setNewInfluencer(prev => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
                      className="uppercase flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={handleRegenerateCode}
                      title="Generate new code"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-generated. Click refresh to generate a new code.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate</Label>
                  <div className="flex gap-2">
                    {[0.05, 0.10, 0.15, 0.20].map((rate) => (
                      <Button
                        key={rate}
                        type="button"
                        variant={newInfluencer.commissionRate === rate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewInfluencer(prev => ({ ...prev, commissionRate: rate }))}
                        className="flex-1"
                      >
                        {Math.round(rate * 100)}%
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Percentage of net sale paid to influencer.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddInfluencer} disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Influencer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleProcessPayouts} 
            disabled={processingPayouts || isReadOnly || eligibleForPayout === 0}
          >
            {processingPayouts ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4 mr-2" />
            )}
            Process Monthly Payouts
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Total Earned</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInfluencers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No influencers match your search" : "No influencers registered yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredInfluencers.map((influencer) => (
                <TableRow key={influencer.id}>
                  <TableCell className="font-medium">
                    {influencer.name || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {influencer.promo_code}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      influencer.is_active 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {influencer.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {influencer.stripe_connect_id ? (
                      <CheckCircle className="h-4 w-4 text-safe-green" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(influencer.pending_balance).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(influencer.total_earned).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Math.round(Number(influencer.commission_rate) * 100)}%
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(influencer)}
                      disabled={isReadOnly}
                    >
                      {influencer.is_active ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
