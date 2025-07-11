import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Database, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const queryClient = useQueryClient();

  // Reset testing data mutation
  const resetDataMutation = useMutation({
    mutationFn: async (options: Record<string, boolean>) => {
      const response = await apiRequest("/api/admin/reset-testing-data", {
        method: "POST",
        body: JSON.stringify(options),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response;
    },
    onSuccess: (data) => {
      setLastResult(data);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
    },
  });

  // Clear all prospects mutation (legacy method)
  const clearProspectsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/admin/clear-prospects", {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data) => {
      setLastResult({
        success: true,
        cleared: ["prospects", "owners", "signatures"],
        counts: { prospects: data.deleted?.prospects || 0 },
        message: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
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
      <div>
        <h1 className="text-3xl font-bold">Testing Utilities</h1>
        <p className="text-muted-foreground mt-2">
          Development tools for resetting test data and cleaning up the database.
        </p>
      </div>

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
    </div>
  );
}