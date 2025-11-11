import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  UserCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  Edit
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const ActivityFeed = ({ activities, isLoading }) => {
  const getIcon = (type) => {
    const icons = {
      shift_created: Calendar,
      shift_updated: Edit,
      shift_completed: CheckCircle,
      shift_cancelled: XCircle,
      carer_added: Users,
      client_added: UserCircle,
      leave_requested: Clock,
      incident_reported: AlertCircle,
    };
    return icons[type] || Clock;
  };

  const getColor = (type) => {
    const colors = {
      shift_created: "text-blue-600 bg-blue-50",
      shift_updated: "text-purple-600 bg-purple-50",
      shift_completed: "text-green-600 bg-green-50",
      shift_cancelled: "text-red-600 bg-red-50",
      carer_added: "text-blue-600 bg-blue-50",
      client_added: "text-green-600 bg-green-50",
      leave_requested: "text-orange-600 bg-orange-50",
      incident_reported: "text-red-600 bg-red-50",
    };
    return colors[type] || "text-gray-600 bg-gray-50";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity, index) => {
              const Icon = getIcon(activity.type);
              const colorClass = getColor(activity.type);
              
              return (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};