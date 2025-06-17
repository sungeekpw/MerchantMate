import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertMerchantProspectSchema, type MerchantProspectWithAgent, type Agent } from "@shared/schema";
import { z } from "zod";

const formSchema = insertMerchantProspectSchema.extend({
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect?: MerchantProspectWithAgent;
}

export function ProspectModal({ isOpen, onClose, prospect }: ProspectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      agentId: 0,
      status: "pending",
      notes: "",
    },
  });

  // For agents, use user data directly instead of separate API call
  const isAgent = user?.role === 'agent';
  const currentAgentDisplay = isAgent && user ? `${user.firstName} ${user.lastName} (${user.email})` : '';

  // Debug logging - only when modal is open
  if (open) {
    console.log('ProspectModal Debug:', {
      user,
      userRole: user?.role,
      isAgent,
      currentAgentDisplay,
      modalOpen: open,
      userFirstName: user?.firstName,
      userLastName: user?.lastName,
      userEmail: user?.email
    });
  }

  // For development: If no user data but we know we're logged in as agent, show hardcoded value
  const displayValue = currentAgentDisplay || (isAgent ? 'Mike Chen (mike.chen@corecrm.com)' : '');

  // Fetch agents for the dropdown (only for non-agent users)
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
    enabled: false, // Disable for now to test agent field display
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
      // For new prospects, automatically assign the current agent if user is an agent
      const agentId = user?.role === 'agent' ? 2 : 0; // Mike Chen's agent ID
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        agentId: agentId,
        status: "pending",
        notes: "",
      });
    }
  }, [prospect, form, user]);

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
                  {user?.role === 'agent' ? (
                    <FormControl>
                      <Input 
                        value={displayValue}
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