import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Crown,
  Eye,
  MoreHorizontal,
  User,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Trash2,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface TriageRecord {
  result_status: string;
  created_at: string;
}

interface UserData {
  user_id: string;
  email: string | null;
  is_premium: boolean;
  triage_count: number;
  created_at: string;
  pets?: Pet[];
  lastTriage?: TriageRecord | null;
}

interface UserManagementTableProps {
  users: UserData[];
  onTogglePremium: (data: { userId: string; isPremium: boolean }) => void;
  onImpersonate: (userId: string) => void;
  onBulkDelete?: (userIds: string[]) => void;
  isLoading?: boolean;
  isDeletingUsers?: boolean;
}

type SortField = "email" | "created_at" | "triage_count";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

const speciesIcons: Record<string, React.ElementType> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
};

export function UserManagementTable({
  users,
  onTogglePremium,
  onImpersonate,
  onBulkDelete,
  isLoading = false,
  isDeletingUsers = false,
}: UserManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === users.length) return new Set();
      return new Set(users.map((u) => u.user_id));
    });
  }, [users]);

  // Get unique species from all users' pets
  const allSpecies = useMemo(() => {
    const species = new Set<string>();
    users.forEach((user) => {
      user.pets?.forEach((pet) => species.add(pet.species.toLowerCase()));
    });
    return Array.from(species);
  }, [users]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.email?.toLowerCase().includes(query) ||
          user.pets?.some((pet) => pet.name.toLowerCase().includes(query))
      );
    }

    // Species filter
    if (speciesFilter !== "all") {
      result = result.filter((user) =>
        user.pets?.some((pet) => pet.species.toLowerCase() === speciesFilter)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "triage_count":
          comparison = a.triage_count - b.triage_count;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [users, searchQuery, speciesFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusLower = status.toLowerCase();
    if (statusLower === "red" || statusLower === "emergency") {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
    }
    if (statusLower === "yellow" || statusLower === "urgent") {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Urgent</Badge>;
    }
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Stable</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters & Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by email or pet name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white placeholder:text-slate-500"
          />
        </div>
        <Select
          value={speciesFilter}
          onValueChange={(val) => {
            setSpeciesFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-40 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
            <Filter className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Species" />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <SelectItem value="all" className="text-white hover:bg-[hsl(217,33%,22%)]">
              All Species
            </SelectItem>
            {allSpecies.map((species) => (
              <SelectItem
                key={species}
                value={species}
                className="text-white hover:bg-[hsl(217,33%,22%)] capitalize"
              >
                {species}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onBulkDelete && selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }}
            disabled={isDeletingUsers}
            className="shrink-0"
          >
            {isDeletingUsers ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(217,33%,22%)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[hsl(222,47%,11%)]">
            <TableRow className="border-[hsl(217,33%,22%)] hover:bg-transparent">
              {onBulkDelete && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-600"
                    aria-label="Select all users"
                  />
                </TableHead>
              )}
              <TableHead
                className="text-slate-400 cursor-pointer hover:text-white"
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center gap-1">
                  User
                  <SortIcon field="email" />
                </div>
              </TableHead>
              <TableHead className="text-slate-400">Pet</TableHead>
              <TableHead className="text-slate-400">Subscription</TableHead>
              <TableHead
                className="text-slate-400 cursor-pointer hover:text-white"
                onClick={() => handleSort("triage_count")}
              >
                <div className="flex items-center gap-1">
                  Triages
                  <SortIcon field="triage_count" />
                </div>
              </TableHead>
              <TableHead className="text-slate-400">Last Result</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-[hsl(217,33%,22%)]">
                  <TableCell colSpan={onBulkDelete ? 7 : 6}>
                    <div className="h-12 bg-[hsl(217,33%,17%)] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedUsers.length === 0 ? (
              <TableRow className="border-[hsl(217,33%,22%)]">
                <TableCell colSpan={onBulkDelete ? 7 : 6} className="text-center text-slate-400 py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => {
                const primaryPet = user.pets?.[0];
                const SpeciesIcon = primaryPet
                  ? speciesIcons[primaryPet.species.toLowerCase()] || User
                  : User;

                return (
                  <TableRow
                    key={user.user_id}
                    className="border-[hsl(217,33%,22%)] hover:bg-[hsl(217,33%,17%)]"
                  >
                    {onBulkDelete && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.user_id)}
                          onChange={() => toggleSelect(user.user_id)}
                          className="rounded border-slate-600"
                          aria-label={`Select ${user.email}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm truncate max-w-[200px]">
                            {user.email || "No email"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {primaryPet ? (
                        <div className="flex items-center gap-2">
                          <SpeciesIcon className="h-4 w-4 text-slate-400" />
                          <span className="text-white text-sm">{primaryPet.name}</span>
                          {(user.pets?.length || 0) > 1 && (
                            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                              +{(user.pets?.length || 0) - 1}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">No pets</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_premium ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            <Crown className="h-3 w-3 mr-1" />
                            Pro
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            Free
                          </Badge>
                        )}
                        <Switch
                          checked={user.is_premium}
                          onCheckedChange={(checked) => onTogglePremium({ userId: user.user_id, isPremium: checked })}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-white text-sm">{user.triage_count}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.lastTriage?.result_status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white hover:bg-[hsl(217,33%,22%)]"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]"
                        >
                          <DropdownMenuItem
                            className="text-white hover:bg-[hsl(217,33%,22%)] cursor-pointer"
                            onClick={() => onImpersonate(user.user_id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Impersonate User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
          </p>
          <Pagination>
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "text-slate-400 hover:text-white hover:bg-[hsl(217,33%,22%)] border-[hsl(217,33%,22%)]",
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const page = i + 1;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className={cn(
                        "border-[hsl(217,33%,22%)]",
                        currentPage === page
                          ? "bg-primary text-white"
                          : "text-slate-400 hover:text-white hover:bg-[hsl(217,33%,22%)]"
                      )}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                    "text-slate-400 hover:text-white hover:bg-[hsl(217,33%,22%)] border-[hsl(217,33%,22%)]",
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
