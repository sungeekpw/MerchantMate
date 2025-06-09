import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, BarChart3, CreditCard } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">CoreCRM</h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional payment processing and customer relationship management
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-700">
            Sign In with Replit
          </Button>
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