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
import { Trash2, RefreshCw, Database, CheckCircle, X, Server, Shield, ShieldCheck, TestTube, Settings, Play, Pause, BarChart3, FileText, AlertCircle, Clock, Copy, Terminal, ArrowLeftRight, Download, Upload, Eye, List } from "lucide-react";

interface ResetResult {
  success: boolean;
  cleared: string[];
  counts: Record<string, number>;
  message?: string;
}

interface DataSyncComparison {
  table: string;
  status: 'identical' | 'different';
  env1Count: number;
  env2Count: number;
  difference: number;
}

interface DataSyncResult {
  success: boolean;
  exportName?: string;
  tables?: number;
  totalRows?: number;
  sourceEnvironment?: string;
  targetEnvironment?: string;
  importedTables?: Array<{ table: string; rows: number }>;
  dryRun?: boolean;
  comparisons?: DataSyncComparison[];
  env1?: string;
  env2?: string;
  output?: string;
  error?: string;
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
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [schemaData, setSchemaData] = useState<any>(null);
  
  // Data Sync State
  const [dataSyncResult, setDataSyncResult] = useState<DataSyncResult | null>(null);
  const [showDataSyncModal, setShowDataSyncModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('development');
  const [selectedTarget, setSelectedTarget] = useState<string>('test');
  const [selectedExport, setSelectedExport] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);
  const [clearFirst, setClearFirst] = useState(false);

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const queryClient = useQueryClient();

  // Query to get current database environment
  const { data: dbEnvironment } = useQuery({
    queryKey: ["/api/admin/db-environment"],
    queryFn: async () => {
      const response = await fetch("/api/admin/db-environment", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch database environment");
      return response.json();
    },
  });


  // Reset testing data mutation
  const resetDataMutation = useMutation({
    mutationFn: async (options: Record<string, boolean>) => {
      const url = "/api/admin/reset-testing-data";
      
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

  // Data Sync Queries and Mutations
  
  // Get available exports
  const { data: availableExports, refetch: refetchExports } = useQuery({
    queryKey: ["/api/testing/data-sync/exports"],
    queryFn: async () => {
      const response = await fetch("/api/testing/data-sync/exports", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch exports");
      return response.json();
    },
  });

  // Compare environments mutation
  const compareEnvironmentsMutation = useMutation({
    mutationFn: async ({ env1, env2 }: { env1: string; env2: string }) => {
      const response = await fetch(`/api/testing/data-sync/compare/${env1}/${env2}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to compare environments");
      return response.json();
    },
    onSuccess: (data) => {
      setDataSyncResult(data);
      setShowDataSyncModal(true);
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async ({ env, tables }: { env: string; tables?: string[] }) => {
      const response = await fetch(`/api/testing/data-sync/export/${env}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tables }),
      });
      if (!response.ok) throw new Error("Failed to export data");
      return response.json();
    },
    onSuccess: (data) => {
      setDataSyncResult(data);
      setShowDataSyncModal(true);
      refetchExports();
    },
  });

  // Import data mutation
  const importDataMutation = useMutation({
    mutationFn: async ({ env, exportName, dryRun, clearFirst }: { env: string; exportName: string; dryRun: boolean; clearFirst: boolean }) => {
      const response = await fetch(`/api/testing/data-sync/import/${env}/${exportName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dryRun, clearFirst }),
      });
      if (!response.ok) throw new Error("Failed to import data");
      return response.json();
    },
    onSuccess: (data) => {
      setDataSyncResult(data);
      setShowDataSyncModal(true);
    },
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

      {/* Current Database Environment - Read Only Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Database Environment
          </CardTitle>
          <CardDescription>
            Current database environment for this session. Switch environments at login screen.
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
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/db-diagnostics', {
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
                    setShowComparisonModal(true);
                    
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
              Compare Schemas
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Environment selection is available at the login screen.
          </div>
        </CardContent>
      </Card>

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

      {/* Data Sync Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Lookup Data Synchronization
          </CardTitle>
          <CardDescription>
            Synchronize lookup table data (fee groups, equipment, email templates) between environments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="compare" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Compare
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import
              </TabsTrigger>
              <TabsTrigger value="exports" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Exports
              </TabsTrigger>
            </TabsList>

            {/* Compare Tab */}
            <TabsContent value="compare" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Source Environment</label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
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
                  <label className="text-sm font-medium">Target Environment</label>
                  <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                    <SelectTrigger>
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
              <Button
                onClick={() => compareEnvironmentsMutation.mutate({ env1: selectedSource, env2: selectedTarget })}
                disabled={compareEnvironmentsMutation.isPending}
                className="w-full"
              >
                {compareEnvironmentsMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Compare Data
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Source Environment</label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => exportDataMutation.mutate({ env: selectedSource })}
                disabled={exportDataMutation.isPending}
                className="w-full"
              >
                {exportDataMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Import Tab */}
            <TabsContent value="import" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Environment</label>
                  <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                    <SelectTrigger>
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
                  <label className="text-sm font-medium">Export to Import</label>
                  <Select value={selectedExport} onValueChange={setSelectedExport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select export..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableExports?.exports?.map((exportName: string) => (
                        <SelectItem key={exportName} value={exportName}>
                          {exportName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="dry-run" checked={dryRun} onCheckedChange={(checked) => setDryRun(checked as boolean)} />
                  <label htmlFor="dry-run" className="text-sm font-medium">
                    Dry Run (Preview changes only)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="clear-first" checked={clearFirst} onCheckedChange={(checked) => setClearFirst(checked as boolean)} />
                  <label htmlFor="clear-first" className="text-sm font-medium">
                    Clear existing data first
                  </label>
                </div>
              </div>

              <Button
                onClick={() => importDataMutation.mutate({ 
                  env: selectedTarget, 
                  exportName: selectedExport, 
                  dryRun, 
                  clearFirst 
                })}
                disabled={importDataMutation.isPending || !selectedExport}
                className="w-full"
              >
                {importDataMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {dryRun ? 'Previewing...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {dryRun ? 'Preview Import' : 'Import Data'}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Exports List Tab */}
            <TabsContent value="exports" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Available Exports</h4>
                {availableExports?.exports?.length ? (
                  <div className="grid gap-2">
                    {availableExports.exports.map((exportName: string) => (
                      <div key={exportName} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-mono text-sm">{exportName}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedExport(exportName)}
                        >
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No exports available</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

      {/* Schema Comparison Modal */}
      <Dialog open={showComparisonModal} onOpenChange={setShowComparisonModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Schema Comparison
            </DialogTitle>
            <DialogDescription>
              Compare database schemas across environments to identify differences
            </DialogDescription>
          </DialogHeader>
          
          {schemaData && (
            <div className="space-y-6">
              {/* Environment Status */}
              <div className="grid grid-cols-3 gap-4">
                {['production', 'development', 'test'].map((env) => {
                  const schema = schemaData.schemas[env];
                  const tableCount = schema?.available ? 
                    Array.from(new Set(schema.tables.map((t: any) => t.table_name))).length : 0;
                  
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

              {/* Migration Workflow Notice */}
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Schema Management</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Schema synchronization has been replaced with a bulletproof migration workflow. 
                  Use the migration commands to safely manage schema changes across environments.
                </p>
                <div className="bg-gray-900 dark:bg-gray-800 p-3 rounded font-mono text-sm text-green-400 overflow-x-auto">
                  tsx scripts/migration-manager.ts status
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
                        <div className="mb-4">
                          <p className="text-sm font-medium text-orange-600 mb-2">Missing Tables:</p>
                          <div className="space-y-3">
                            {diff.missingTables.map((tableItem: any, index: number) => {
                              const tableName = typeof tableItem === 'string' ? tableItem : tableItem.table;
                              const commands = tableItem.recommendedCommands || [];
                              
                              return (
                                <div key={index} className="border rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="destructive">{tableName}</Badge>
                                    <Badge variant="outline" className="text-xs">Missing Table</Badge>
                                  </div>
                                  
                                  {commands.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                        Recommended Commands:
                                      </p>
                                      <div className="space-y-1">
                                        {commands.map((cmd: any, cmdIndex: number) => (
                                          <div key={cmdIndex} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                                            <Terminal className="h-3 w-3 text-gray-500" />
                                            <code className="flex-1 font-mono text-xs">{cmd.command}</code>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0"
                                              onClick={() => copyToClipboard(cmd.command)}
                                              title="Copy command"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {diff.extraTables.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-blue-600 mb-2">Extra Tables:</p>
                          <div className="space-y-3">
                            {diff.extraTables.map((tableItem: any, index: number) => {
                              const tableName = typeof tableItem === 'string' ? tableItem : tableItem.table;
                              const commands = tableItem.recommendedCommands || [];
                              
                              return (
                                <div key={index} className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="secondary">{tableName}</Badge>
                                    <Badge variant="outline" className="text-xs">Extra Table</Badge>
                                  </div>
                                  
                                  {commands.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                        Recommended Commands:
                                      </p>
                                      <div className="space-y-1">
                                        {commands.map((cmd: any, cmdIndex: number) => (
                                          <div key={cmdIndex} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                                            <Terminal className="h-3 w-3 text-gray-500" />
                                            <code className="flex-1 font-mono text-xs">{cmd.command}</code>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0"
                                              onClick={() => copyToClipboard(cmd.command)}
                                              title="Copy command"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {diff.columnDifferences.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-yellow-600 mb-3">
                            Column Differences ({diff.columnDifferences.length}):
                          </p>
                          <div className="space-y-3">
                            {diff.columnDifferences.map((colDiff: any, index: number) => (
                              <div key={index} className="border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-mono text-sm">
                                      <span className="font-medium">{colDiff.table}</span>
                                      <span className="text-gray-500">.</span>
                                      <span className="text-blue-600 dark:text-blue-400">{colDiff.column}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {colDiff.details.data_type}
                                      {colDiff.details.is_nullable === 'NO' && (
                                        <span className="ml-2 text-red-600">NOT NULL</span>
                                      )}
                                      {colDiff.details.column_default && (
                                        <span className="ml-2 text-green-600">DEFAULT: {colDiff.details.column_default}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    {colDiff.type === 'missing_in_target' && (
                                      <Badge variant="destructive" className="text-xs">Missing in Dev</Badge>
                                    )}
                                    {colDiff.type === 'extra_in_target' && (
                                      <Badge variant="secondary" className="text-xs">Extra in Dev</Badge>
                                    )}
                                    {colDiff.type === 'different_in_target' && (
                                      <Badge variant="outline" className="text-xs">Different</Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {colDiff.recommendedCommands && colDiff.recommendedCommands.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                      Recommended Commands:
                                    </p>
                                    <div className="space-y-1">
                                      {colDiff.recommendedCommands.map((cmd: any, cmdIndex: number) => (
                                        <div key={cmdIndex} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                                          <Terminal className="h-3 w-3 text-gray-500" />
                                          <code className="flex-1 font-mono text-xs">{cmd.command}</code>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => copyToClipboard(cmd.command)}
                                            title="Copy command"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>



              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setShowComparisonModal(false)}
                  className="w-full"
                >
                  Close
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

      {/* Data Sync Results Modal */}
      <Dialog open={showDataSyncModal} onOpenChange={setShowDataSyncModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Data Sync Results
            </DialogTitle>
            <DialogDescription>
              Results from your data synchronization operation.
            </DialogDescription>
          </DialogHeader>
          
          {dataSyncResult && (
            <div className="space-y-4">
              {/* Operation Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {dataSyncResult.success ? '✅ Operation Successful' : '❌ Operation Failed'}
                  </p>
                  {dataSyncResult.dryRun && (
                    <Badge variant="outline">Dry Run</Badge>
                  )}
                </div>
                {dataSyncResult.error && (
                  <p className="text-sm text-red-600 mt-2">{dataSyncResult.error}</p>
                )}
              </div>

              {/* Export Results */}
              {dataSyncResult.exportName && (
                <div>
                  <h4 className="font-medium mb-2">Export Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Export Name:</strong> {dataSyncResult.exportName}</p>
                    <p><strong>Source:</strong> {dataSyncResult.sourceEnvironment}</p>
                    <p><strong>Tables:</strong> {dataSyncResult.tables}</p>
                    <p><strong>Total Rows:</strong> {dataSyncResult.totalRows}</p>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {dataSyncResult.importedTables && (
                <div>
                  <h4 className="font-medium mb-2">Import Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Target:</strong> {dataSyncResult.targetEnvironment}</p>
                    <p><strong>Total Rows:</strong> {dataSyncResult.totalRows}</p>
                    {dataSyncResult.importedTables.length > 0 && (
                      <div>
                        <p className="font-medium mt-2">Imported Tables:</p>
                        <div className="grid gap-2 mt-1">
                          {dataSyncResult.importedTables.map((table) => (
                            <div key={table.table} className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <span>{table.table}</span>
                              <Badge variant="outline">{table.rows} rows</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comparison Results */}
              {dataSyncResult.comparisons && (
                <div>
                  <h4 className="font-medium mb-2">Environment Comparison</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Comparing:</strong> {dataSyncResult.env1} vs {dataSyncResult.env2}</p>
                    <div className="grid gap-2 mt-2">
                      {dataSyncResult.comparisons.map((comp) => (
                        <div key={comp.table} className="flex justify-between items-center p-2 border rounded">
                          <span>{comp.table}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{comp.env1Count} | {comp.env2Count}</span>
                            <Badge variant={comp.status === 'identical' ? 'secondary' : 'destructive'}>
                              {comp.status === 'identical' ? 'Identical' : `Diff: ${comp.difference}`}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowDataSyncModal(false)}>
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