import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO,
  addMonths,
  startOfWeek,
  endOfWeek,
  isSameMonth
} from "date-fns";

export default function MonthCalendar({ shifts, carers, clients, onShiftClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => {
      try {
        return isSameDay(parseISO(shift.date), date);
      } catch {
        return false;
      }
    });
  };

  const statusColors = {
    completed: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    scheduled: 'bg-purple-500',
    published: 'bg-blue-500',
    unfilled: 'bg-orange-500',
    cancelled: 'bg-red-500',
    draft: 'bg-gray-400',
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, -1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const dayShifts = getShiftsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border rounded-lg p-2 ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`text-sm font-semibold mb-1 ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayShifts.slice(0, 3).map((shift) => (
                      <div
                        key={shift.id}
                        className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                          statusColors[shift.status] || 'bg-gray-400'
                        } text-white truncate`}
                        onClick={() => onShiftClick && onShiftClick(shift)}
                        title={`${shift.start_time} - ${
                          carers.find(c => c.id === shift.carer_id)?.full_name || 'Unassigned'
                        }`}
                      >
                        {shift.start_time} {shift.carer_id ? '✓' : '!'}
                      </div>
                    ))}
                    {dayShifts.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayShifts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-gray-600 mb-2">Legend:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1 text-xs">
                  <div className={`w-3 h-3 rounded ${color}`}></div>
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}