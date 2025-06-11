import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock, MapPin, Monitor, User } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { formatDateInUserTimezone } from "@/lib/timezone";
import { useAuth } from "@/hooks/useAuth";

interface LoginAttempt {
  id: number;
  username: string | null;
  email: string | null;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

interface SecurityMetrics {
  totalLoginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueIPs: number;
  recentFailedAttempts: number;
}

export default function Security() {
  const { user } = useAuth();

  const { data: loginAttempts = [], isLoading: attemptsLoading } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/security/login-attempts"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<SecurityMetrics>({
    queryKey: ["/api/security/metrics"],
  });

  const formatDateTime = (dateString: string) => {
    try {
      const timezone = user?.timezone || undefined;
      const formatted = formatDateInUserTimezone(dateString, "MMM dd, yyyy 'at' hh:mm a", timezone);
      return formatted || format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
    } catch {
      return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
    }
  };

  const getStatusBadge = (success: boolean, failureReason?: string | null) => {
    if (success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
    }
    
    const variant = failureReason === "too_many_attempts" ? "destructive" : "secondary";
    const text = failureReason === "user_not_found" ? "User Not Found" :
                 failureReason === "invalid_password" ? "Invalid Password" :
                 failureReason === "invalid_2fa" ? "Invalid 2FA" :
                 failureReason === "account_inactive" ? "Account Inactive" :
                 failureReason === "too_many_attempts" ? "Too Many Attempts" :
                 "Failed";
    
    return <Badge variant={variant}>{text}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Login Attempts</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? "..." : metrics?.totalLoginAttempts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Logins</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metricsLoading ? "..." : metrics?.successfulLogins || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics && metrics.totalLoginAttempts > 0 
                ? `${((metrics.successfulLogins / metrics.totalLoginAttempts) * 100).toFixed(1)}% success rate`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metricsLoading ? "..." : metrics?.failedLogins || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.recentFailedAttempts || 0} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique IP Addresses</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? "..." : metrics?.uniqueIPs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Different locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Login Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Login Attempts
          </CardTitle>
          <CardDescription>
            Showing the latest login attempts across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attemptsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading login attempts...</div>
          ) : loginAttempts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No login attempts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginAttempts.slice(0, 20).map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {attempt.username || attempt.email || "Unknown"}
                          </div>
                          {attempt.username && attempt.email && attempt.username !== attempt.email && (
                            <div className="text-xs text-gray-500">{attempt.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="font-mono text-sm">{attempt.ipAddress}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(attempt.success, attempt.failureReason)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDateTime(attempt.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(attempt.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-500 max-w-xs truncate">
                        {attempt.userAgent || "Unknown"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}