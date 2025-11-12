import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  unfilled: "bg-orange-100 text-orange-800",
};

export default function TodayShifts({ shifts = [], carers = [], clients = [], isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCarerName = (carerId) => {
    if (!carerId || !Array.isArray(carers)) return "Unassigned";
    const carer = carers.find(c => c && c.id === carerId);
    return carer?.full_name || "Unassigned";
  };

  const getClientName = (clientId) => {
    if (!clientId || !Array.isArray(clients)) return "Unknown Client";
    const client = clients.find(c => c && c.id === clientId);
    return client?.full_name || "Unknown Client";
  };

  const sortedShifts = Array.isArray(shifts) ? [...shifts].sort((a, b) => {
    const timeA = a?.start_time || "00:00";
    const timeB = b?.start_time || "00:00";
    return timeA.localeCompare(timeB);
  }) : [];

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Today's Shifts</CardTitle>
          <Link 
            to={createPageUrl("Schedule")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Full Schedule →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {sortedShifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No shifts scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedShifts.map((shift) => {
              if (!shift) return null;
              
              return (
                <div 
                  key={shift.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">
                        {shift.start_time || 'N/A'} - {shift.end_time || 'N/A'}
                      </span>
                    </div>
                    <Badge className={statusColors[shift.status] || statusColors.scheduled}>
                      {shift.status?.replace('_', ' ') || 'scheduled'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">Carer:</span>
                      <span className="font-medium">{getCarerName(shift.carer_id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{getClientName(shift.client_id)}</span>
                    </div>
                  </div>

                  {shift.tasks && Array.isArray(shift.tasks) && shift.tasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-1">Tasks:</p>
                      <div className="flex flex-wrap gap-1">
                        {shift.tasks.slice(0, 3).map((task, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {task}
                          </Badge>
                        ))}
                        {shift.tasks.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{shift.tasks.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}