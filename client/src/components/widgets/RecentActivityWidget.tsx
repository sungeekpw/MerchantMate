import { BaseWidget } from "./BaseWidget";
import { WidgetProps } from "./widget-types";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, User, FileText } from "lucide-react";

export function RecentActivityWidget(props: WidgetProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/analytics/recent-activity'],
    enabled: props.preference.isVisible
  });

  const limit = props.preference.configuration?.limit || 5;
  const activityTypes = props.preference.configuration?.activityTypes || ['all'];

  const filteredActivities = (activities as any[])?.filter((activity: any) => 
    activityTypes.includes('all') || activityTypes.includes(activity.type)
  ).slice(0, limit) || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return User;
      case 'transaction': return Activity;
      case 'form_submission': return FileText;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'text-blue-600';
      case 'transaction': return 'text-green-600';
      case 'form_submission': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'transaction': return 'bg-green-100 text-green-800';
      case 'form_submission': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <BaseWidget {...props} isLoading={isLoading}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Recent Activity</span>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity: any, index: number) => {
              const IconComponent = getActivityIcon(activity.type);
              return (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg border bg-gray-50">
                  <div className={`p-1 rounded-full bg-white`}>
                    <IconComponent className={`h-3 w-3 ${getActivityColor(activity.type)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <Badge className={`${getActivityBadgeColor(activity.type)} text-xs`}>
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                      {activity.userName && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{activity.userName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}