import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, parseISO } from "date-fns";
import { Clock, User } from "lucide-react";

const statusColors = {
  scheduled: "bg-blue-500",
  in_progress: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
  unfilled: "bg-orange-500",
};

export default function WeekCalendar({ weekDays, shifts, carers, clients, onEditShift, onDeleteShift, isLoading }) {
  const getShiftsForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return shifts
      .filter(shift => shift.date === dayStr)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  };

  const getCarerName = (carerId) => {
    const carer = carers.find(c => c.id === carerId);
    return carer?.full_name || "Unassigned";
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, idx) => (
          <Skeleton key={idx} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {weekDays.map((day) => {
        const dayShifts = getShiftsForDay(day);
        const isTodayDate = isToday(day);

        return (
          <Card 
            key={day.toString()}
            className={`${isTodayDate ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          >
            <div className={`p-3 border-b ${isTodayDate ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <p className={`font-medium text-sm ${isTodayDate ? 'text-blue-700' : 'text-gray-600'}`}>
                {format(day, "EEE")}
              </p>
              <p className={`text-2xl font-bold ${isTodayDate ? 'text-blue-900' : 'text-gray-900'}`}>
                {format(day, "d")}
              </p>
              {isTodayDate && (
                <Badge className="mt-1 bg-blue-600 text-white text-xs">Today</Badge>
              )}
            </div>

            <div className="p-2 space-y-2 min-h-[300px]">
              {dayShifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => onEditShift(shift)}
                  className="p-2 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[shift.status]}`} />
                    <span className="text-xs font-medium text-gray-600">
                      {shift.start_time}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3 h-3 text-blue-500" />
                      <span className="text-gray-700 truncate">
                        {getCarerName(shift.carer_id)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      → {getClientName(shift.client_id)}
                    </p>
                  </div>

                  {shift.status === 'unfilled' && (
                    <Badge className="mt-2 text-xs bg-orange-100 text-orange-800">
                      Unfilled
                    </Badge>
                  )}
                </div>
              ))}

              {dayShifts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-xs">No shifts</p>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}