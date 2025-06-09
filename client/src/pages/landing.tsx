import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, BarChart3, CreditCard } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleDevLogin = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user to login as",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/dev-login", { userId: selectedUser });
      
      // Invalidate and refetch auth data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Login Successful",
        description: "Redirecting to dashboard...",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Unable to login with selected user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">CoreCRM</h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional payment processing and customer relationship management
          </p>
          
          {isDevelopment ? (
            <div className="space-y-4">
              <div className="max-w-md mx-auto">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user to login as..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_super_admin_1">System Administrator (Super Admin)</SelectItem>
                    <SelectItem value="user_admin_1">Sarah Wilson (Agent)</SelectItem>
                    <SelectItem value="user_agent_1">Mike Chen (Agent)</SelectItem>
                    <SelectItem value="user_merchant_1">Tech Mart (Merchant)</SelectItem>
                    <SelectItem value="user_corporate_1">Corporate Manager (Corporate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleDevLogin} 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Development Login"}
              </Button>
              <p className="text-sm text-gray-500">Development mode - Select a user role to test</p>
            </div>
          ) : (
            <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-700">
              Sign In with Replit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="text-center">
              <CreditCard className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <CardTitle className="text-lg">Payment Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure transaction management with real-time processing and comprehensive reporting
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Users className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <CardTitle className="text-lg">Merchant Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Complete merchant onboarding and relationship management with agent assignment
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-purple-600 mb-2" />
              <CardTitle className="text-lg">Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced analytics dashboard with revenue tracking and performance metrics
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto text-red-600 mb-2" />
              <CardTitle className="text-lg">Secure Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Role-based access controls with merchant, agent, and admin permission levels
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-gray-500">
          <p>Secure • Scalable • Professional</p>
        </div>
      </div>
    </div>
  );
}