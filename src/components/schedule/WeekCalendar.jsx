import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, parseISO, addDays, startOfWeek } from "date-fns";
import { Clock, User, ChevronLeft, ChevronRight } from "lucide-react";

const statusColors = {
  scheduled: "bg-blue-500",
  in_progress: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
  unfilled: "bg-orange-500",
  published: "bg-purple-500",
  draft: "bg-gray-400",
};

export default function WeekCalendar({ 
  shifts = [], 
  carers = [], 
  clients = [], 
  onShiftClick,
  onEditShift,
  onDeleteShift, 
  isLoading 
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getShiftsForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return Array.isArray(shifts) 
      ? shifts
          .filter(shift => shift && shift.date === dayStr)
          .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
      : [];
  };

  const getCarerName = (carerId) => {
    const carer = Array.isArray(carers) ? carers.find(c => c && c.id === carerId) : null;
    return carer?.full_name || "Unassigned";
  };

  const getClientName = (clientId) => {
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === clientId) : null;
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
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Week
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </h2>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
            >
              Next Week
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Week Grid */}
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
                    onClick={() => {
                      if (onShiftClick) onShiftClick(shift);
                      else if (onEditShift) onEditShift(shift);
                    }}
                    className="p-2 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-white"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${statusColors[shift.status] || 'bg-gray-400'}`} />
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
    </div>
  );
}