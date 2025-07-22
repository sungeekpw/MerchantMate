import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  BarChart3, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TestTube,
  Zap,
  Target,
  Activity
} from "lucide-react";

interface TestFile {
  name: string;
  path: string;
  category: string;
  describes: string[];
  tests: string[];
  testCount: number;
}

interface TestResult {
  success: boolean;
  code: number;
  results?: {
    testResults: Array<{
      testFilePath: string;
      perfStats: {
        runtime: number;
        slow: boolean;
      };
      testResults: Array<{
        title: string;
        status: 'passed' | 'failed' | 'pending';
        duration?: number;
        failureMessages?: string[];
      }>;
    }>;
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    numPendingTests: number;
    success: boolean;
    startTime: number;
    endTime: number;
  };
  timestamp: string;
}

interface CoverageSummary {
  total: {
    lines: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
  [filePath: string]: {
    lines: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
}

export default function TestingDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [selectedTestFile, setSelectedTestFile] = useState<string>('');
  const [runWithCoverage, setRunWithCoverage] = useState(false);
  const [lastRunStatus, setLastRunStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [lastRunTime, setLastRunTime] = useState<string>('');
  const [resultsHistory, setResultsHistory] = useState<TestResult[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch test files
  const { data: testFiles = [], isLoading: testFilesLoading } = useQuery<TestFile[]>({
    queryKey: ['/api/testing/test-files'],
    queryFn: async () => {
      const response = await fetch('/api/testing/test-files', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch test files');
      return response.json();
    }
  });

  // Fetch coverage summary
  const { data: coverage, refetch: refetchCoverage } = useQuery<CoverageSummary>({
    queryKey: ['/api/testing/coverage-summary'],
    queryFn: async () => {
      const response = await fetch('/api/testing/coverage-summary', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch coverage');
      return response.json();
    },
    enabled: false // Only fetch when requested
  });

  // Run tests function
  const runTests = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setLastRunStatus('running');
    setTestResults(null);
    setTestOutput([]);

    try {
      // Create Server-Sent Events connection with parameters
      const params = new URLSearchParams();
      if (selectedTestFile) params.set('testFile', selectedTestFile);
      if (runWithCoverage) params.set('coverage', 'true');
      
      eventSourceRef.current = new EventSource(`/api/testing/run-tests?${params.toString()}`, {
        withCredentials: true
      });

      const eventSource = eventSourceRef.current;
      
      // Add connection status logging
      eventSource.onopen = () => {
        console.log('EventSource connection opened');
        setTestOutput(prev => [...prev, '🔗 Connected to test runner']);
      };

      eventSource.addEventListener('start', (event) => {
        const data = JSON.parse(event.data);
        setTestOutput(prev => [...prev, `🚀 ${data.message}`]);
      });

      eventSource.addEventListener('output', (event) => {
        const data = JSON.parse(event.data);
        const output = data.output;
        
        // Format output with appropriate icons for test results
        let formattedOutput = output;
        if (output.includes('✓') || output.includes('PASS')) {
          formattedOutput = output.replace(/✓/g, '✅').replace(/PASS/g, '✅ PASS');
        } else if (output.includes('✕') || output.includes('FAIL')) {
          formattedOutput = output.replace(/✕/g, '❌').replace(/FAIL/g, '❌ FAIL');
        }
        
        setTestOutput(prev => [...prev, formattedOutput]);
      });

      eventSource.addEventListener('error', (event) => {
        const data = JSON.parse((event as any).data);
        const output = data.output;
        
        // Only show red X for actual errors, not for passed tests
        if (output.includes('✓') || output.includes('PASS')) {
          const formattedOutput = output.replace(/✓/g, '✅').replace(/PASS/g, '✅ PASS');
          setTestOutput(prev => [...prev, formattedOutput]);
        } else if (output.includes('✕') || output.includes('FAIL')) {
          const formattedOutput = output.replace(/✕/g, '❌').replace(/FAIL/g, '❌ FAIL');
          setTestOutput(prev => [...prev, formattedOutput]);
        } else {
          setTestOutput(prev => [...prev, output]);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        setTestResults(data);
        setIsRunning(false);
        
        // Update status based on results
        setLastRunStatus(data.success ? 'success' : 'failed');
        setLastRunTime(new Date(data.timestamp).toLocaleString());
        
        // Add to results history
        setResultsHistory(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 results
        
        // Clean up reference and close connection
        eventSourceRef.current = null;
        eventSource.close();
        
        // Update last run status in output
        const statusIcon = data.success ? '✅' : '❌';
        const statusText = data.success ? 'PASSED' : 'FAILED';
        setTestOutput(prev => [...prev, `${statusIcon} Test execution completed at ${data.timestamp}`]);
        setTestOutput(prev => [...prev, `📊 Result: ${statusText} (Exit code: ${data.code})`]);
        
        if (data.results) {
          const duration = data.results.endTime && data.results.startTime 
            ? `${((data.results.endTime - data.results.startTime) / 1000).toFixed(2)}s`
            : 'N/A';
          setTestOutput(prev => [...prev, `📈 Tests: ${data.results.numPassedTests} passed, ${data.results.numFailedTests} failed, ${data.results.numTotalTests} total`]);
          setTestOutput(prev => [...prev, `⏱️ Duration: ${duration}`]);
        }
        
        if (runWithCoverage) {
          refetchCoverage();
        }
      });

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        console.log('EventSource readyState:', eventSource.readyState);
        
        // Only show error if connection is actually broken
        if (eventSource.readyState === EventSource.CLOSED) {
          setIsRunning(false);
          setLastRunStatus('failed');
          setTestOutput(prev => [...prev, '❌ Connection to test runner lost - please try again']);
        }
      };

      // No additional request needed - SSE connection handles test execution

    } catch (error) {
      console.error('Error running tests:', error);
      setIsRunning(false);
      setLastRunStatus('failed');
      setTestOutput(prev => [...prev, `❌ Failed to start tests: ${error}`]);
    }
  };

  // Stop tests function
  const stopTests = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setLastRunStatus('idle');
    setTestOutput(prev => [...prev, '⏹️ Tests stopped by user']);
  };

  // Calculate test statistics
  const testStats = testFiles.reduce(
    (acc, file) => ({
      totalFiles: acc.totalFiles + 1,
      totalTests: acc.totalTests + file.testCount,
      categories: {
        ...acc.categories,
        [file.category]: (acc.categories[file.category] || 0) + 1
      }
    }),
    { totalFiles: 0, totalTests: 0, categories: {} as Record<string, number> }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6" />
            Testing Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time test execution, coverage analysis, and quality monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Last Run Status Indicator */}
          <div className="flex items-center gap-2">
            {lastRunStatus === 'idle' && <Clock className="h-4 w-4 text-gray-400" />}
            {lastRunStatus === 'running' && <Activity className="h-4 w-4 text-blue-500 animate-pulse" />}
            {lastRunStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {lastRunStatus === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
            <div className="text-sm">
              <div className="font-medium">
                {lastRunStatus === 'idle' && 'Ready to run'}
                {lastRunStatus === 'running' && 'Running...'}
                {lastRunStatus === 'success' && 'All tests passed'}
                {lastRunStatus === 'failed' && 'Tests failed'}
              </div>
              {lastRunTime && (
                <div className="text-xs text-muted-foreground">
                  Last run: {lastRunTime}
                </div>
              )}
            </div>
          </div>
          
          <Button
            onClick={runWithCoverage ? () => setRunWithCoverage(false) : () => setRunWithCoverage(true)}
            variant={runWithCoverage ? "default" : "outline"}
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {runWithCoverage ? "Coverage ON" : "Coverage OFF"}
          </Button>
          
          {isRunning ? (
            <Button onClick={stopTests} variant="destructive" size="sm">
              <Pause className="h-4 w-4 mr-2" />
              Stop Tests
            </Button>
          ) : (
            <Button onClick={runTests} size="sm">
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
          )}
        </div>
      </div>

      {/* Test Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Test Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testStats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(testStats.categories).length} categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Test Cases</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testStats.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              Individual test assertions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run Status</CardTitle>
            {lastRunStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {lastRunStatus === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
            {lastRunStatus === 'running' && <Activity className="h-4 w-4 text-blue-600 animate-pulse" />}
            {lastRunStatus === 'idle' && <Clock className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastRunStatus === 'success' && 'PASSED'}
              {lastRunStatus === 'failed' && 'FAILED'}
              {lastRunStatus === 'running' && 'RUNNING'}
              {lastRunStatus === 'idle' && 'READY'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastRunTime || 'No tests run yet'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Results</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testResults?.results ? (
                <span className={testResults.success ? 'text-green-600' : 'text-red-600'}>
                  {testResults.results.numPassedTests}/{testResults.results.numTotalTests}
                </span>
              ) : '0/0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {testResults?.results ? 
                `${testResults.results.numPassedTests} passed, ${testResults.results.numFailedTests} failed` : 
                'Passed/Total tests'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coverage?.total ? `${coverage.total.lines.pct.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Line coverage
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runner" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runner">Test Runner</TabsTrigger>
          <TabsTrigger value="files">Test Files</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Report</TabsTrigger>
          <TabsTrigger value="results">Results History</TabsTrigger>
        </TabsList>

        {/* Test Runner Tab */}
        <TabsContent value="runner" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
                <CardDescription>
                  Configure and run your test suite
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Test File Selection (optional)
                  </label>
                  <select
                    value={selectedTestFile}
                    onChange={(e) => setSelectedTestFile(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    disabled={isRunning}
                  >
                    <option value="">Run all tests</option>
                    {testFiles.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.name} ({file.testCount} tests)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="coverage"
                    checked={runWithCoverage}
                    onChange={(e) => setRunWithCoverage(e.target.checked)}
                    disabled={isRunning}
                    className="rounded"
                  />
                  <label htmlFor="coverage" className="text-sm">
                    Generate coverage report
                  </label>
                </div>

                {isRunning && testResults?.results && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Test Progress</span>
                      <span>
                        {testResults.results.numPassedTests + testResults.results.numFailedTests} / {testResults.results.numTotalTests}
                      </span>
                    </div>
                    <Progress 
                      value={((testResults.results.numPassedTests + testResults.results.numFailedTests) / testResults.results.numTotalTests) * 100} 
                      className="w-full" 
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time Output */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Real-time Output
                </CardTitle>
                <CardDescription>
                  Live test execution output
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full border rounded p-2 font-mono text-xs">
                  {testOutput.length === 0 ? (
                    <div className="text-muted-foreground">
                      Click "Run Tests" to see output here...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {testOutput.map((line, index) => (
                        <div key={index} className="whitespace-pre-wrap">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Test Results Summary */}
          {testResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Test Results Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.results && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {testResults.results.numPassedTests}
                      </div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold text-red-600">
                        {testResults.results.numFailedTests}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold text-yellow-600">
                        {testResults.results.numPendingTests}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">
                        {testResults.results.numTotalTests}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-muted-foreground">
                  Completed at {new Date(testResults.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Test Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test File Overview</CardTitle>
              <CardDescription>
                Browse all test files and their coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testFilesLoading ? (
                <div className="text-center py-8">Loading test files...</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(testStats.categories).map(([category, count]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">{category}</h4>
                        <Badge variant="outline">{count} files</Badge>
                      </div>
                      
                      <div className="grid gap-2 pl-4">
                        {testFiles
                          .filter(file => file.category === category)
                          .map(file => (
                            <div key={file.path} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium text-sm">{file.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {file.testCount} tests • {file.describes.length} describe blocks
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTestFile(file.path);
                                  runTests();
                                }}
                                disabled={isRunning}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Run
                              </Button>
                            </div>
                          ))}
                      </div>
                      
                      {category !== Object.keys(testStats.categories).slice(-1)[0] && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Coverage Report</CardTitle>
              <CardDescription>
                Test coverage metrics and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coverage?.total ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">{coverage.total.lines.pct.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Lines</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {coverage.total.lines.covered}/{coverage.total.lines.total}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">{coverage.total.statements.pct.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Statements</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {coverage.total.statements.covered}/{coverage.total.statements.total}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">{coverage.total.functions.pct.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Functions</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {coverage.total.functions.covered}/{coverage.total.functions.total}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">{coverage.total.branches.pct.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Branches</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {coverage.total.branches.covered}/{coverage.total.branches.total}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">File Coverage Details</h4>
                    <div className="space-y-2">
                      {Object.entries(coverage)
                        .filter(([key]) => key !== 'total')
                        .map(([filePath, fileCoverage]) => (
                          <div key={filePath} className="flex items-center justify-between p-2 border rounded">
                            <div className="text-sm font-mono">{filePath}</div>
                            <div className="flex items-center gap-4 text-sm">
                              <span>L: {fileCoverage.lines.pct.toFixed(1)}%</span>
                              <span>S: {fileCoverage.statements.pct.toFixed(1)}%</span>
                              <span>F: {fileCoverage.functions.pct.toFixed(1)}%</span>
                              <span>B: {fileCoverage.branches.pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div>No coverage data available</div>
                  <div className="text-sm mt-1">Run tests with coverage enabled to see detailed reports</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results History Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results History</CardTitle>
              <CardDescription>
                Recent test run results and performance history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultsHistory.length > 0 ? (
                <div className="space-y-3">
                  {resultsHistory.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                            {result.success ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      {result.results && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex gap-4">
                            <span className="text-green-600">
                              ✓ {result.results.numPassedTests} passed
                            </span>
                            <span className="text-red-600">
                              ✗ {result.results.numFailedTests} failed
                            </span>
                            <span className="text-muted-foreground">
                              Total: {result.results.numTotalTests}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {result.results.endTime && result.results.startTime ? 
                              `${((result.results.endTime - result.results.startTime) / 1000).toFixed(2)}s` : 
                              'N/A'
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test results history available.</p>
                  <p className="text-sm">Run some tests to start building your results history.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}