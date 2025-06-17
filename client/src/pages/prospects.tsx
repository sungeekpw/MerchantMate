import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Edit, Trash2, Mail, Calendar, User, Send } from "lucide-react";
import { insertMerchantProspectSchema, type MerchantProspectWithAgent, type Agent } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function Prospects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<MerchantProspectWithAgent | undefined>();
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["/api/prospects", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/prospects${searchQuery ? `?search=${searchQuery}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch prospects');
      return response.json() as Promise<MerchantProspectWithAgent[]>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete prospect');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({
        title: "Success",
        description: "Prospect deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete prospect",
        variant: "destructive",
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/prospects/${id}/resend-invitation`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to resend invitation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation email sent successfully",
      });
      setResendingEmail(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation email",
        variant: "destructive",
      });
      setResendingEmail(null);
    },
  });

  const filteredProspects = prospects.filter((prospect) => {
    if (statusFilter !== "all" && prospect.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleDelete = (prospect: MerchantProspectWithAgent) => {
    if (confirm(`Are you sure you want to delete ${prospect.firstName} ${prospect.lastName}?`)) {
      deleteMutation.mutate(prospect.id);
    }
  };

  const handleEdit = (prospect: MerchantProspectWithAgent) => {
    if (prospect.status !== 'pending') {
      toast({
        title: "Cannot Edit",
        description: "Only prospects with 'pending' status can be edited.",
        variant: "destructive",
      });
      return;
    }
    setEditingProspect(prospect);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProspect(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProspect(undefined);
  };

  const handleResendInvitation = (prospect: MerchantProspectWithAgent) => {
    setResendingEmail(prospect.id);
    resendInvitationMutation.mutate(prospect.id);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      contacted: "bg-blue-100 text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      applied: "bg-purple-100 text-purple-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  const copyProspectLink = (prospect: MerchantProspectWithAgent) => {
    const link = `${window.location.origin}/prospect-validation?token=${prospect.validationToken}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Prospect validation link copied to clipboard",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="corecrm-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Merchant Prospects</CardTitle>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Prospect
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
                  placeholder="Search prospects..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Validated</TableHead>
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
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchQuery || statusFilter !== "all" ? "No prospects found matching your filters" : "No prospects found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProspects.map((prospect) => (
                    <TableRow key={prospect.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="font-medium text-gray-900">
                            {prospect.firstName} {prospect.lastName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">{prospect.email}</TableCell>
                      <TableCell className="text-gray-500">
                        {prospect.agent ? `${prospect.agent.firstName} ${prospect.agent.lastName}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getStatusBadge(prospect.status)}`}>
                          {prospect.status === 'in_progress' ? 'In Progress' : prospect.status.charAt(0).toUpperCase() + prospect.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        <div className="flex items-center text-sm">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(prospect.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {prospect.validatedAt ? (
                          <div className="flex items-center text-sm text-green-600">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(prospect.validatedAt).toLocaleDateString()}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(prospect)}
                            disabled={resendingEmail === prospect.id || resendInvitationMutation.isPending}
                            title="Resend invitation email"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyProspectLink(prospect)}
                            title="Copy validation link"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(prospect)}
                            disabled={prospect.status !== 'pending'}
                            title={prospect.status !== 'pending' ? 'Can only edit prospects with pending status' : 'Edit prospect'}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(prospect)}
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
          {filteredProspects.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {filteredProspects.length} of {prospects.length} prospects
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProspectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        prospect={editingProspect}
      />
    </div>
  );
}

// Inline Prospect Modal Component
const formSchema = insertMerchantProspectSchema.extend({
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect?: MerchantProspectWithAgent;
}

function ProspectModal({ isOpen, onClose, prospect }: ProspectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Agent role detection and display logic
  const isAgent = user?.role === 'agent';
  const agentDefaultId = isAgent ? 2 : 1; // Use agent ID 2 for Mike Chen
  const agentDisplayValue = isAgent && user ? `${user.firstName} ${user.lastName} (${user.email})` : '';



  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      agentId: agentDefaultId,
      status: "pending",
      notes: "",
    },
  });

  // Reset form when prospect data changes
  useEffect(() => {
    if (prospect) {
      form.reset({
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        agentId: prospect.agentId,
        status: prospect.status,
        notes: prospect.notes || "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        agentId: agentDefaultId,
        status: "pending",
        notes: "",
      });
    }
  }, [prospect, form, agentDefaultId]);

  // Fetch agents for the dropdown
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json() as Promise<Agent[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create prospect');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({
        title: "Success",
        description: "Prospect created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create prospect",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/prospects/${prospect!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update prospect');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({
        title: "Success",
        description: "Prospect updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update prospect",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (prospect) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {prospect ? "Edit Prospect" : "Add New Prospect"}
          </DialogTitle>
          <DialogDescription>
            {prospect 
              ? "Update the prospect information below." 
              : "Enter the basic contact information for the new merchant prospect."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Agent</FormLabel>
                  {isAgent ? (
                    <FormControl>
                      <Input 
                        value={agentDisplayValue}
                        readOnly
                        className="bg-gray-50 text-gray-700"
                      />
                    </FormControl>
                  ) : (
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.firstName} {agent.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this prospect..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                {isSubmitting ? "Saving..." : prospect ? "Update Prospect" : "Create Prospect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}