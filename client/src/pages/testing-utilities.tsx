import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import TestingDashboard from "@/components/TestingDashboard";
import { Trash2, RefreshCw, Database, CheckCircle, X, Server, Shield, ShieldCheck, TestTube, Settings, Play, Pause, BarChart3, FileText, AlertCircle, Clock, ArrowRight } from "lucide-react";

interface ResetResult {
  success: boolean;
  cleared: string[];
  counts: Record<string, number>;
  message?: string;
}

export default function TestingUtilities() {
  const [selectedOptions, setSelectedOptions] = useState({
    prospects: false,
    campaigns: false,
    equipment: false,
    signatures: false,
    formData: false,
  });
  const [lastResult, setLastResult] = useState<ResetResult | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedDbEnv, setSelectedDbEnv] = useState<string>('default');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [syncConfig, setSyncConfig] = useState({
    fromEnvironment: 'production',
    toEnvironment: 'development',
    syncType: 'drizzle-push'
  });
  const queryClient = useQueryClient();

  // Query to get current database environment
  const { data: dbEnvironment, refetch: refetchDbEnvironment } = useQuery({
    queryKey: ["/api/admin/db-environment", selectedDbEnv],
    queryFn: async () => {
      const url = selectedDbEnv !== 'default' 
        ? `/api/admin/db-environment?db=${selectedDbEnv}`
        : "/api/admin/db-environment";
      
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch database environment");
      return response.json();
    },
  });

  // Function to handle database environment change
  const handleDbEnvChange = (newEnv: string) => {
    setSelectedDbEnv(newEnv);
    
    // Store database environment selection in localStorage
    if (newEnv !== 'default') {
      localStorage.setItem('selectedDbEnvironment', newEnv);
    } else {
      localStorage.removeItem('selectedDbEnvironment');
    }
    
    // Update URL to reflect database environment
    const url = new URL(window.location.href);
    if (newEnv !== 'default') {
      url.searchParams.set('db', newEnv);
    } else {
      url.searchParams.delete('db');
    }
    window.history.replaceState({}, '', url.toString());
    
    // Dispatch custom event to notify header about database environment change
    window.dispatchEvent(new CustomEvent('dbEnvironmentChanged', { 
      detail: { environment: newEnv } 
    }));
    
    // Refetch environment status
    refetchDbEnvironment();
  };

  // Initialize selected environment from current session database environment
  useEffect(() => {
    if (dbEnvironment?.environment) {
      // Sync dropdown with actual session database environment
      const currentEnv = dbEnvironment.environment;
      if (currentEnv === 'dev' || currentEnv === 'test') {
        setSelectedDbEnv(currentEnv);
      } else {
        setSelectedDbEnv('default');
      }
    } else {
      // Fallback to URL parameter or localStorage if no session data yet
      const urlParams = new URLSearchParams(window.location.search);
      const dbParam = urlParams.get('db');
      const storedEnv = localStorage.getItem('selectedDbEnvironment');
      
      if (dbParam && ['test', 'dev'].includes(dbParam)) {
        setSelectedDbEnv(dbParam);
      } else if (storedEnv && ['test', 'dev'].includes(storedEnv)) {
        setSelectedDbEnv(storedEnv);
      } else {
        setSelectedDbEnv('default');
      }
    }
  }, [dbEnvironment]);

  // Reset testing data mutation
  const resetDataMutation = useMutation({
    mutationFn: async (options: Record<string, boolean>) => {
      const url = selectedDbEnv !== 'default' 
        ? `/api/admin/reset-testing-data?db=${selectedDbEnv}`
        : "/api/admin/reset-testing-data";
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || "Failed to reset testing data");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      setShowAuditModal(true);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
    },
  });

  // Clear all prospects mutation (legacy method)
  const clearProspectsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/clear-prospects", {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || "Failed to clear prospects");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLastResult({
        success: true,
        cleared: ["prospects", "owners", "signatures"],
        counts: { prospects: data.deleted?.prospects || 0 },
        message: data.message
      });
      setShowAuditModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
    },
  });

  // Schema sync mutation
  const schemaSyncMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/admin/schema-sync', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || "Failed to sync schemas");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🔄 Schema Sync Results:', data);
      
      let message = `Schema Sync Complete!\n\n`;
      message += `From: ${data.fromEnvironment} → To: ${data.toEnvironment}\n`;
      message += `Sync Type: ${data.syncType}\n\n`;
      
      if (data.operations.length > 0) {
        message += `Successful Operations:\n`;
        data.operations.forEach((op: any) => {
          if (op.type === 'drizzle-push') {
            message += `✅ Drizzle push to ${op.target}\n`;
          } else if (op.type === 'table-sync') {
            message += `✅ Table ${op.table} ${op.operation}\n`;
          }
        });
      }
      
      if (data.errors.length > 0) {
        message += `\nErrors:\n`;
        data.errors.forEach((err: any) => {
          message += `❌ ${err.operation}: ${err.error}\n`;
        });
      }
      
      message += `\nCheck console for detailed logs.`;
      alert(message);
      setShowSyncModal(false);
    },
    onError: (error) => {
      console.error('Schema sync failed:', error);
      alert(`Schema sync failed: ${error.message}`);
    }
  });

  const handleOptionChange = (option: string, checked: boolean) => {
    setSelectedOptions(prev => ({
      ...prev,
      [option]: checked
    }));
  };

  const handleResetData = () => {
    const filteredOptions = Object.fromEntries(
      Object.entries(selectedOptions).filter(([_, value]) => value)
    );
    
    if (Object.keys(filteredOptions).length === 0) {
      alert("Please select at least one option to reset.");
      return;
    }
    
    resetDataMutation.mutate(filteredOptions);
  };

  const handleClearAllProspects = () => {
    if (confirm("Are you sure you want to clear ALL prospect data? This cannot be undone.")) {
      clearProspectsMutation.mutate();
    }
  };

  const resetOptions = [
    {
      key: "prospects",
      label: "Clear All Prospects",
      description: "Completely removes all prospect records from database",
      danger: true
    },
    {
      key: "signatures",
      label: "Clear Signatures Only",
      description: "Removes all prospect signatures while keeping prospects",
      danger: false
    },
    {
      key: "formData",
      label: "Reset Form Data",
      description: "Clears form data and resets all prospects to pending status",
      danger: false
    },
    {
      key: "campaigns",
      label: "Clear Campaign Assignments",
      description: "Removes prospect-campaign links while keeping campaigns",
      danger: false
    },
    {
      key: "equipment",
      label: "Clear Equipment Assignments",
      description: "Removes campaign-equipment links while keeping equipment",
      danger: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Tabs for Testing Features */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Dashboard
          </TabsTrigger>
          <TabsTrigger value="utilities" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Utilities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <TestingDashboard />
        </TabsContent>

        <TabsContent value="utilities" className="space-y-6">

      {/* Database Environment Selector - Only show in development builds */}
      {!import.meta.env.PROD && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Database Environment
            </CardTitle>
            <CardDescription>
              Select which database environment to operate on. URL-driven switching allows ?db=test parameter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dbEnvironment && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Environment: {dbEnvironment.environment}</p>
                    <p className="text-sm text-muted-foreground">{dbEnvironment.message}</p>
                  </div>
                  <Badge variant={dbEnvironment.isUsingCustomDB ? "secondary" : "default"}>
                    {dbEnvironment.isUsingCustomDB ? "Custom DB" : "Default"}
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Target Database:</label>
                  <Select value={selectedDbEnv} onValueChange={handleDbEnvChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select database environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (Production)</SelectItem>
                      <SelectItem value="test">Test Database (?db=test)</SelectItem>
                      <SelectItem value="dev">Development Database (?db=dev)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const url = selectedDbEnv !== 'default' 
                        ? `/api/admin/db-diagnostics?db=${selectedDbEnv}`
                        : '/api/admin/db-diagnostics';
                      
                      const response = await fetch(url, {
                        credentials: 'include',
                        mode: 'cors',
                      });
                      
                      if (response.ok) {
                        const diagnostics = await response.json();
                        console.log('🔍 Database Connection Diagnostics:');
                        console.log('Environment:', diagnostics.environment);
                        console.log('Requested:', diagnostics.requestedEnv);
                        console.log('URLs:', diagnostics.databaseUrls);
                        console.log('Current Connection:', diagnostics.currentConnection);
                        
                        alert(`Database Diagnostics:
Environment: ${diagnostics.environment}
User Count: ${diagnostics.currentConnection.userCount}
URL: ${diagnostics.currentConnection.url}

Check console for full details.`);
                      } else {
                        console.error('Failed to fetch diagnostics:', response.status);
                      }
                    } catch (error) {
                      console.error('Error fetching diagnostics:', error);
                    }
                  }}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Database Diagnostics
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/schema-compare', {
                        credentials: 'include',
                        mode: 'cors',
                      });
                      
                      if (response.ok) {
                        const schemaComparison = await response.json();
                        console.log('📊 Schema Comparison Results:');
                        console.log('Available Environments:', schemaComparison.summary.availableEnvironments);
                        console.log('Unavailable Environments:', schemaComparison.summary.unavailableEnvironments);
                        console.log('Full Comparison:', schemaComparison);
                        
                        setSchemaData(schemaComparison);
                        setShowSyncModal(true);
                        
                      } else {
                        console.error('Failed to fetch schema comparison:', response.status);
                        alert('Failed to fetch schema comparison. Check console for details.');
                      }
                    } catch (error) {
                      console.error('Error fetching schema comparison:', error);
                      alert('Error fetching schema comparison. Check console for details.');
                    }
                  }}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Compare & Sync Schemas
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                You can also use URL parameters: ?db=test or ?db=dev
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production warning if database environment switching is attempted */}
      {import.meta.env.PROD && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Production Database
            </CardTitle>
            <CardDescription>
              In production deployments, the application always uses the production database for security and consistency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <ShieldCheck className="h-4 w-4" />
                <p className="font-medium">Production Mode Active</p>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Database environment switching is disabled in production builds for security. All operations use the production database.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Selective Reset Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Selective Data Reset
            </CardTitle>
            <CardDescription>
              Choose specific data types to reset for targeted testing scenarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {resetOptions.map((option) => (
                <div key={option.key} className="flex items-start space-x-3">
                  <Checkbox
                    id={option.key}
                    checked={selectedOptions[option.key as keyof typeof selectedOptions]}
                    onCheckedChange={(checked) => 
                      handleOptionChange(option.key, checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={option.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      {option.label}
                      {option.danger && <Badge variant="destructive">Destructive</Badge>}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleResetData}
              disabled={resetDataMutation.isPending || Object.values(selectedOptions).every(v => !v)}
              className="w-full"
            >
              {resetDataMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Data...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Reset Selected Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common testing scenarios with pre-configured options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="destructive"
                onClick={handleClearAllProspects}
                disabled={clearProspectsMutation.isPending}
                className="w-full"
              >
                {clearProspectsMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Prospect Data
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOptions({
                    prospects: false,
                    campaigns: false,
                    equipment: false,
                    signatures: true,
                    formData: true,
                  });
                }}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset for Fresh Applications
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOptions({
                    prospects: false,
                    campaigns: true,
                    equipment: true,
                    signatures: false,
                    formData: false,
                  });
                }}
                className="w-full"
              >
                <Database className="mr-2 h-4 w-4" />
                Reset Campaign Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Display */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Last Operation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{lastResult.message || "Operation completed successfully"}</p>
                  {lastResult.cleared.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Data cleared:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lastResult.cleared.map((item) => (
                          <Badge key={item} variant="outline">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(lastResult.counts).length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Records affected:</p>
                      <div className="text-xs text-muted-foreground">
                        {Object.entries(lastResult.counts).map(([key, value]) => (
                          <span key={key} className="mr-3">{key}: {value}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Audit Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Data Reset Complete
            </DialogTitle>
            <DialogDescription>
              The following data has been successfully removed from the database:
            </DialogDescription>
          </DialogHeader>
          
          {lastResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-center">
                  {lastResult.message || "Operation completed successfully"}
                </p>
              </div>

              {/* Audit Table */}
              {Object.keys(lastResult.counts).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Records Removed:</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table Name</TableHead>
                          <TableHead className="text-right">Rows Deleted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(lastResult.counts).map(([tableName, count]) => (
                          <TableRow key={tableName}>
                            <TableCell className="font-medium">{tableName}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Categories Cleared */}
              {lastResult.cleared.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Data Categories Cleared:</h4>
                  <div className="flex flex-wrap gap-1">
                    {lastResult.cleared.map((item) => (
                      <Badge key={item} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setShowAuditModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schema Sync Modal */}
      <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Schema Comparison & Synchronization
            </DialogTitle>
            <DialogDescription>
              Compare database schemas across environments and sync differences
            </DialogDescription>
          </DialogHeader>
          
          {schemaData && (
            <div className="space-y-6">
              {/* Environment Status */}
              <div className="grid grid-cols-3 gap-4">
                {['production', 'development', 'test'].map((env) => {
                  const schema = schemaData.schemas[env];
                  const tableCount = schema?.available ? 
                    [...new Set(schema.tables.map((t: any) => t.table_name))].length : 0;
                  
                  return (
                    <div key={env} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${schema?.available ? 'bg-green-500' : 'bg-red-500'}`} />
                        <h3 className="font-medium capitalize">{env}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {schema?.available ? `${tableCount} tables` : 'Unavailable'}
                      </p>
                      {schema?.error && (
                        <p className="text-xs text-red-600 mt-1">{schema.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sync Configuration */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium">Synchronization Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From Environment:</label>
                    <Select 
                      value={syncConfig.fromEnvironment} 
                      onValueChange={(value) => setSyncConfig(prev => ({...prev, fromEnvironment: value}))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Environment:</label>
                    <Select 
                      value={syncConfig.toEnvironment} 
                      onValueChange={(value) => setSyncConfig(prev => ({...prev, toEnvironment: value}))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Sync Method:</label>
                  <Select 
                    value={syncConfig.syncType} 
                    onValueChange={(value) => setSyncConfig(prev => ({...prev, syncType: value}))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drizzle-push">Drizzle Push (Recommended)</SelectItem>
                      <SelectItem value="selective">Selective Table Sync</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drizzle Push applies the current schema definition to the target environment
                  </p>
                </div>
              </div>

              {/* Schema Differences */}
              <div className="space-y-4">
                <h3 className="font-medium">Schema Differences</h3>
                {Object.entries(schemaData.comparisons).map(([comparison, differences]) => {
                  if (!differences) return null;
                  
                  const diff = differences as any;
                  const totalDiffs = diff.missingTables.length + diff.extraTables.length + diff.columnDifferences.length;
                  
                  if (totalDiffs === 0) return null;
                  
                  return (
                    <div key={comparison} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2 capitalize">
                        {comparison.replace('-vs-', ' vs ').replace('-', ' ')}
                      </h4>
                      
                      {diff.missingTables.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-orange-600">Missing Tables:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {diff.missingTables.map((table: string) => (
                              <Badge key={table} variant="destructive">{table}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {diff.extraTables.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-blue-600">Extra Tables:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {diff.extraTables.map((table: string) => (
                              <Badge key={table} variant="secondary">{table}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {diff.columnDifferences.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-yellow-600">
                            Column Differences: {diff.columnDifferences.length}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowSyncModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (syncConfig.fromEnvironment === syncConfig.toEnvironment) {
                      alert('Source and target environments cannot be the same');
                      return;
                    }
                    schemaSyncMutation.mutate(syncConfig);
                  }}
                  disabled={schemaSyncMutation.isPending}
                  className="flex-1"
                >
                  {schemaSyncMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Sync Schema
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Data Reset Complete
            </DialogTitle>
            <DialogDescription>
              The following data has been successfully removed from the database:
            </DialogDescription>
          </DialogHeader>
          
          {lastResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-center">
                  {lastResult.message || "Operation completed successfully"}
                </p>
              </div>

              {/* Audit Table */}
              {Object.keys(lastResult.counts).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Records Removed:</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table Name</TableHead>
                          <TableHead className="text-right">Rows Deleted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(lastResult.counts).map(([tableName, count]) => (
                          <TableRow key={tableName}>
                            <TableCell className="font-medium">{tableName}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Categories Cleared */}
              {lastResult.cleared.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Data Categories Cleared:</h4>
                  <div className="flex flex-wrap gap-1">
                    {lastResult.cleared.map((item) => (
                      <Badge key={item} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setShowAuditModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}