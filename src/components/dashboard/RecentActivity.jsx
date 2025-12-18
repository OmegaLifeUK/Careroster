import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Calendar, ClipboardList, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentActivity({ shifts = [], leaveRequests = [], carers = [], clients = [], isLoading }) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCarerName = (carerId) => {
    if (!carerId) return "Unknown";
    const carer = Array.isArray(carers) ? carers.find(c => c && c.id === carerId) : null;
    return carer?.full_name || "Unknown";
  };

  const getClientName = (clientId) => {
    if (!clientId) return "Unknown";
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === clientId) : null;
    return client?.full_name || "Unknown";
  };

  const shiftsArray = Array.isArray(shifts) ? shifts.filter(s => s) : [];
  const leaveRequestsArray = Array.isArray(leaveRequests) ? leaveRequests.filter(r => r) : [];

  const activities = [
    ...shiftsArray.map(shift => ({
      type: 'shift',
      date: shift.created_date,
      title: `Shift ${shift.status}`,
      description: `${getCarerName(shift.carer_id)} → ${getClientName(shift.client_id)}`,
      status: shift.status,
      icon: Calendar,
      data: shift,
      onClick: () => navigate(createPageUrl('Schedule'), { state: { selectedShiftId: shift.id } })
    })),
    ...leaveRequestsArray.map(request => ({
      type: 'leave',
      date: request.created_date,
      title: `${request.leave_type} request`,
      description: getCarerName(request.carer_id),
      status: request.status,
      icon: ClipboardList,
      data: request,
      onClick: () => navigate(createPageUrl('LeaveRequests'))
    })),
  ]
    .sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch {
        return 0;
      }
    })
    .slice(0, 8);

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-800",
    unfilled: "bg-orange-100 text-orange-800",
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, idx) => {
              if (!activity) return null;
              
              return (
                <div 
                  key={idx}
                  onClick={activity.onClick}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-all cursor-pointer card-interactive"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'shift' 
                      ? 'bg-blue-100' 
                      : 'bg-purple-100'
                  }`}>
                    <activity.icon className={`w-5 h-5 ${
                      activity.type === 'shift' 
                        ? 'text-blue-600' 
                        : 'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <Badge className={`${statusColors[activity.status]} text-xs`}>
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    {activity.date && (
                      <p className="text-xs text-gray-400 mt-1">
                        {format(parseISO(activity.date), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}