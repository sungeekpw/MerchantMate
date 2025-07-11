import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, AlertTriangle, Clock, MapPin, Monitor, User, Search, Filter, Download, Eye, AlertCircle, Activity } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { formatDateInUserTimezone } from "@/lib/timezone";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/header";

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

interface AuditLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  sessionId: string | null;
  ipAddress: string;
  userAgent: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string | null;
  endpoint: string | null;
  statusCode: number | null;
  responseTime: number | null;
  riskLevel: string;
  dataClassification: string | null;
  environment: string | null;
  notes: string | null;
  createdAt: string;
}

interface SecurityEvent {
  id: number;
  auditLogId: number | null;
  eventType: string;
  severity: string;
  alertStatus: string | null;
  detectionMethod: string | null;
  detectedAt: string;
  detectedBy: string | null;
  assignedTo: string | null;
  investigationNotes: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  affectedUsers: any | null;
  affectedResources: any | null;
  createdAt: string;
}

interface AuditSearchParams {
  search?: string;
  action?: string;
  resource?: string;
  riskLevel?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export default function Security() {
  const { user } = useAuth();
  const [auditSearchParams, setAuditSearchParams] = useState<AuditSearchParams>({
    limit: 50,
    offset: 0,
  });
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const { data: loginAttempts = [], isLoading: attemptsLoading } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/security/login-attempts"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<SecurityMetrics>({
    queryKey: ["/api/security/metrics"],
  });

  // Enhanced audit logs query with search functionality
  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAudit } = useQuery<AuditLog[]>({
    queryKey: ["/api/security/audit-logs", auditSearchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(auditSearchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/security/audit-logs?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
  });

  // Security events query
  const { data: securityEvents = [], isLoading: eventsLoading } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security/events"],
    queryFn: async () => {
      const response = await fetch("/api/security/events", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch security events");
      return response.json();
    },
  });

  // Enhanced metrics for audit dashboard
  const { data: auditMetrics, isLoading: auditMetricsLoading } = useQuery({
    queryKey: ["/api/security/audit-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/security/audit-metrics", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch audit metrics");
      return response.json();
    },
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

  const handleAuditSearch = (params: Partial<AuditSearchParams>) => {
    setAuditSearchParams(prev => ({ ...prev, ...params, offset: 0 }));
  };

  const handleExportAudit = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(auditSearchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/security/audit-logs/export?${params.toString()}`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    return <Badge className={variants[riskLevel] || variants.low}>{riskLevel.toUpperCase()}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      info: "bg-blue-100 text-blue-800",
      warning: "bg-yellow-100 text-yellow-800",
      error: "bg-orange-100 text-orange-800", 
      critical: "bg-red-100 text-red-800"
    };
    return <Badge className={variants[severity] || variants.info}>{severity.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Header title="Security & Compliance" />
      
      <div className="p-6 space-y-6">
        {/* Enhanced Security Metrics with Audit Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {auditMetricsLoading ? "..." : auditMetrics?.totalLogs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Actions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {auditMetricsLoading ? "..." : auditMetrics?.highRiskActions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {eventsLoading ? "..." : securityEvents.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active incidents
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
              <Monitor className="h-4 w-4 text-red-600" />
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
        </div>

        {/* Enhanced Tabbed Interface */}
        <Tabs defaultValue="audit-logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="security-events">Security Events</TabsTrigger>
            <TabsTrigger value="login-attempts">Login Attempts</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* Comprehensive Audit Logs Tab */}
          <TabsContent value="audit-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>
                      Complete system activity log for SOC2 compliance
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportAudit}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search users, actions, resources..."
                      className="pl-10"
                      value={auditSearchParams.search || ''}
                      onChange={(e) => handleAuditSearch({ search: e.target.value })}
                    />
                  </div>
                  
                  <Select value={auditSearchParams.action || ''} onValueChange={(value) => handleAuditSearch({ action: value || undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={auditSearchParams.riskLevel || ''} onValueChange={(value) => handleAuditSearch({ riskLevel: value || undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Risk Levels</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={auditSearchParams.resource || ''} onValueChange={(value) => handleAuditSearch({ resource: value || undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Resources</SelectItem>
                      <SelectItem value="prospects">Prospects</SelectItem>
                      <SelectItem value="campaigns">Campaigns</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="users">Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Audit Logs Table */}
                {auditLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading audit logs...</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.userEmail || log.userId || 'System'}</div>
                              {log.sessionId && (
                                <div className="text-xs text-gray-500">Session: {log.sessionId.slice(-8)}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.action}</div>
                              <div className="text-xs text-gray-500">{log.method} {log.endpoint}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.resource}</div>
                              {log.resourceId && (
                                <div className="text-xs text-gray-500">ID: {log.resourceId}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRiskBadge(log.riskLevel)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="font-mono text-sm">{log.ipAddress}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.statusCode && log.statusCode >= 400 ? "destructive" : "default"}>
                              {log.statusCode || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDateTime(log.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedAuditLog(log)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Audit Log Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for audit log #{log.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">User</label>
                                      <div className="text-sm">{log.userEmail || log.userId || 'System'}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Action</label>
                                      <div className="text-sm">{log.action}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Resource</label>
                                      <div className="text-sm">{log.resource}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Risk Level</label>
                                      <div className="text-sm">{getRiskBadge(log.riskLevel)}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">IP Address</label>
                                      <div className="text-sm">{log.ipAddress}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Status Code</label>
                                      <div className="text-sm">{log.statusCode || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Environment</label>
                                      <div className="text-sm">{log.environment || 'production'}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Response Time</label>
                                      <div className="text-sm">{log.responseTime ? `${log.responseTime}ms` : 'N/A'}</div>
                                    </div>
                                  </div>
                                  {log.notes && (
                                    <div>
                                      <label className="text-sm font-medium">Notes</label>
                                      <div className="text-sm bg-gray-50 p-2 rounded">{log.notes}</div>
                                    </div>
                                  )}
                                  {log.userAgent && (
                                    <div>
                                      <label className="text-sm font-medium">User Agent</label>
                                      <div className="text-sm bg-gray-50 p-2 rounded text-xs">{log.userAgent}</div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Events Tab */}
          <TabsContent value="security-events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>
                  High-priority security incidents requiring investigation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading security events...</div>
                  </div>
                ) : securityEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <div className="text-lg font-medium">No Security Events</div>
                    <div className="text-sm text-gray-500">All systems operating normally</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Detected</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {securityEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="font-medium">{event.eventType}</div>
                            <div className="text-xs text-gray-500">
                              {event.detectionMethod} detection
                            </div>
                          </TableCell>
                          <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                          <TableCell>
                            <Badge variant={event.alertStatus === 'resolved' ? 'default' : 'destructive'}>
                              {event.alertStatus || 'new'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDateTime(event.detectedAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              by {event.detectedBy || 'system'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {event.assignedTo || 'Unassigned'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login Attempts Tab (existing functionality) */}
          <TabsContent value="login-attempts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Login Attempts
                </CardTitle>
                <CardDescription>
                  Authentication activity and security monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attemptsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading login attempts...</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{attempt.username || "Unknown"}</div>
                                {attempt.email && (
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
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SOC2 Compliance Status</CardTitle>
                  <CardDescription>
                    Current compliance metrics and audit readiness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Audit Log Retention</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Access Controls</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Classification</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Incident Response</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Retention</CardTitle>
                  <CardDescription>
                    Audit log retention and purging policies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Audit Logs</span>
                    <span className="text-sm text-gray-600">7 years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Security Events</span>
                    <span className="text-sm text-gray-600">5 years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Login Attempts</span>
                    <span className="text-sm text-gray-600">2 years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Access Logs</span>
                    <span className="text-sm text-gray-600">3 years</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}