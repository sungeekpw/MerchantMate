import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Edit, Trash2, Filter, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { merchantsApi } from "@/lib/api";
import { MerchantModal } from "@/components/modals/merchant-modal";
import { useAuth } from "@/hooks/useAuth";
import type { Merchant } from "@shared/schema";

export default function Merchants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | undefined>();
  const [expandedMerchants, setExpandedMerchants] = useState<Set<number>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ["/api/merchants", searchQuery],
    queryFn: () => merchantsApi.getAll(searchQuery || undefined),
  });

  // Fetch locations for expanded merchants
  const expandedMerchantIds = Array.from(expandedMerchants);
  const { data: locationsData = {} } = useQuery({
    queryKey: ["/api/locations", expandedMerchantIds],
    queryFn: async () => {
      const results: Record<number, any[]> = {};
      await Promise.all(
        expandedMerchantIds.map(async (merchantId) => {
          try {
            const response = await fetch(`/api/merchants/${merchantId}/locations`);
            if (response.ok) {
              results[merchantId] = await response.json();
            }
          } catch (error) {
            console.error(`Failed to fetch locations for merchant ${merchantId}:`, error);
          }
        })
      );
      return results;
    },
    enabled: expandedMerchantIds.length > 0
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => merchantsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Success",
        description: "Merchant deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete merchant",
        variant: "destructive",
      });
    },
  });

  const filteredMerchants = merchants.filter((merchant) => {
    if (statusFilter === "all") return true;
    return merchant.status === statusFilter;
  });

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setIsModalOpen(true);
  };

  const handleDelete = (merchant: Merchant) => {
    if (window.confirm(`Are you sure you want to delete ${merchant.businessName}?`)) {
      deleteMutation.mutate(merchant.id);
    }
  };

  const handleAddNew = () => {
    setEditingMerchant(undefined);
    setIsModalOpen(true);
  };

  const toggleMerchantExpansion = (merchantId: number) => {
    const newExpanded = new Set(expandedMerchants);
    if (newExpanded.has(merchantId)) {
      newExpanded.delete(merchantId);
    } else {
      newExpanded.add(merchantId);
    }
    setExpandedMerchants(newExpanded);
  };

  const getMerchantLocationCount = (merchantId: number) => {
    const locations = locationsData[merchantId] || [];
    return locations.length;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(isNaN(num) ? 0 : num);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMerchant(undefined);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "corecrm-status-active",
      pending: "corecrm-status-pending",
      suspended: "corecrm-status-suspended",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="corecrm-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Merchants</CardTitle>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Merchant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Monthly Volume</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMerchants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchQuery || statusFilter !== "all" ? "No merchants found matching your filters" : "No merchants found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <TableRow key={merchant.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {merchant.businessName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{merchant.businessName}</div>
                            <div className="text-sm text-gray-500">{merchant.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">{merchant.businessType}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(merchant.monthlyVolume || "0")}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {merchant.agent ? `${merchant.agent.firstName} ${merchant.agent.lastName}` : "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`corecrm-status-badge ${getStatusBadge(merchant.status)}`}>
                          {merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(merchant)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(merchant)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination placeholder */}
          {filteredMerchants.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {filteredMerchants.length} of {merchants.length} merchants
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MerchantModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        merchant={editingMerchant}
      />
    </div>
  );
}
