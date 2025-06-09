import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  FileDown, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Filter
} from "lucide-react";

export default function Reports() {
  const reportTypes = [
    {
      title: "Revenue Report",
      description: "Monthly and yearly revenue breakdown by merchants",
      icon: DollarSign,
      status: "available",
      lastGenerated: "2 hours ago",
    },
    {
      title: "Transaction Analysis",
      description: "Detailed analysis of transaction patterns and trends",
      icon: BarChart3,
      status: "available",
      lastGenerated: "1 day ago",
    },
    {
      title: "Merchant Performance",
      description: "Performance metrics for all active merchants",
      icon: TrendingUp,
      status: "available",
      lastGenerated: "3 hours ago",
    },
    {
      title: "Agent Commission",
      description: "Commission calculations and agent performance",
      icon: Calendar,
      status: "generating",
      lastGenerated: "In progress...",
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === "available") {
      return "paycrm-status-completed";
    } else if (status === "generating") {
      return "paycrm-status-pending";
    }
    return "bg-gray-100 text-gray-800";
  };

  const handleGenerateReport = (reportTitle: string) => {
    // This would trigger report generation
    console.log(`Generating ${reportTitle}...`);
  };

  const handleDownloadReport = (reportTitle: string) => {
    // This would download the report
    console.log(`Downloading ${reportTitle}...`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Generate and download business reports</p>
        </div>
        <Button>
          <Filter className="w-4 h-4 mr-2" />
          Custom Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="paycrm-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileDown className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="paycrm-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="paycrm-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Automated</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="paycrm-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Data Points</p>
                <p className="text-2xl font-bold text-gray-900">1.2M</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="paycrm-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{report.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                    </div>
                  </div>
                  <Badge className={`paycrm-status-badge ${getStatusBadge(report.status)}`}>
                    {report.status === "available" ? "Ready" : "Generating"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Last generated: {report.lastGenerated}
                  </div>
                  <div className="flex items-center space-x-2">
                    {report.status === "available" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(report.title)}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleGenerateReport(report.title)}
                      disabled={report.status === "generating"}
                    >
                      {report.status === "generating" ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card className="paycrm-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Monthly Revenue - December 2023", type: "Revenue", generated: "2 hours ago", size: "2.4 MB" },
              { name: "Transaction Analysis - Q4 2023", type: "Analytics", generated: "1 day ago", size: "1.8 MB" },
              { name: "Merchant Performance - December", type: "Performance", generated: "3 hours ago", size: "950 KB" },
              { name: "Agent Commission - November 2023", type: "Commission", generated: "2 days ago", size: "1.2 MB" },
            ].map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileDown className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{file.type}</span>
                      <span>•</span>
                      <span>{file.generated}</span>
                      <span>•</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <FileDown className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
