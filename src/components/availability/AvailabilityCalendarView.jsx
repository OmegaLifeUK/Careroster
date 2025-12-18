import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  getDay,
  parseISO,
  isWithinInterval,
  addMonths,
  subMonths,
  getWeek
} from "date-fns";

export default function AvailabilityCalendarView({ carerId, availability = [], leaveRequests = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const workingHours = availability.filter(a => a.availability_type === 'working_hours');
  const unavailability = availability.filter(a => 
    a.availability_type === 'unavailable' || a.availability_type === 'day_off'
  );
  const approvedLeave = leaveRequests.filter(l => l.status === 'approved');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month
  const startDay = getDay(monthStart);
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const getDayStatus = (date) => {
    if (!date) return null;
    
    const dayOfWeek = getDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');

    // Check if on leave
    const onLeave = approvedLeave.some(leave => {
      const start = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      return isWithinInterval(date, { start, end });
    });
    if (onLeave) return { status: 'leave', label: 'On Leave', color: 'bg-purple-500' };

    // Check unavailability
    const isUnavailable = unavailability.some(u => {
      if (u.specific_date === dateStr) return true;
      if (u.date_range_start && u.date_range_end) {
        const start = parseISO(u.date_range_start);
        const end = parseISO(u.date_range_end);
        return isWithinInterval(date, { start, end });
      }
      return false;
    });
    if (isUnavailable) return { status: 'unavailable', label: 'Unavailable', color: 'bg-orange-500' };

    // Check working hours - handle all patterns
    const hasAlternateWeeks = workingHours.some(w => 
      w.schedule_pattern === 'alternate_week_1' || w.schedule_pattern === 'alternate_week_2'
    );
    
    const hasSpecificDates = workingHours.some(w => w.schedule_pattern === 'specific_date');
    
    let hours = null;
    
    // Check specific dates first
    if (hasSpecificDates) {
      const specificDateMatch = workingHours.find(w => 
        w.schedule_pattern === 'specific_date' && w.specific_date === dateStr
      );
      if (specificDateMatch) {
        hours = specificDateMatch;
      }
    }
    
    // If no specific date match, check recurring patterns
    if (!hours && hasAlternateWeeks) {
      // Determine which week pattern this date falls into
      const weekNumber = getWeek(date, { weekStartsOn: 1 });
      const isWeek1 = weekNumber % 2 === 1;
      const targetPattern = isWeek1 ? 'alternate_week_1' : 'alternate_week_2';
      
      hours = workingHours.find(w => 
        w.day_of_week === dayOfWeek && w.schedule_pattern === targetPattern
      );
    } else if (!hours) {
      // Standard weekly pattern
      hours = workingHours.find(w => 
        w.day_of_week === dayOfWeek && w.schedule_pattern === 'weekly'
      );
    }
    
    if (hours) {
      return { 
        status: 'working', 
        label: `${hours.start_time} - ${hours.end_time}`,
        color: 'bg-green-500'
      };
    }

    return { status: 'off', label: 'Day Off', color: 'bg-gray-300' };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Availability Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-32 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Working</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300"></div>
            <span>Day Off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            <span>On Leave</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          
          {paddedDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="h-24"></div>;
            }

            const status = getDayStatus(date);
            const today = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`h-24 p-2 border rounded-lg transition-all ${
                  today ? 'ring-2 ring-blue-500' : ''
                } ${
                  isSameMonth(date, currentMonth) ? 'bg-white' : 'bg-gray-50'
                } ${
                  status?.status === 'working' ? 'bg-green-50 border-green-200' : ''
                } ${
                  status?.status === 'leave' ? 'bg-purple-50 border-purple-200' : ''
                } ${
                  status?.status === 'unavailable' ? 'bg-orange-50 border-orange-200' : ''
                }`}
              >
                <div className="flex flex-col h-full">
                  <span className={`text-sm font-semibold mb-1 ${
                    today ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  {status && status.status === 'working' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <Badge className="bg-green-600 text-white text-xs px-1 py-0.5 mb-1">
                        Working
                      </Badge>
                      <span className="text-xs font-semibold text-green-700 text-center leading-tight">
                        {status.label}
                      </span>
                    </div>
                  )}
                  {status && status.status === 'leave' && (
                    <div className="flex-1 flex items-center justify-center">
                      <Badge className="bg-purple-600 text-white text-xs">
                        On Leave
                      </Badge>
                    </div>
                  )}
                  {status && status.status === 'unavailable' && (
                    <div className="flex-1 flex items-center justify-center">
                      <Badge className="bg-orange-600 text-white text-xs">
                        Unavailable
                      </Badge>
                    </div>
                  )}
                  {status && status.status === 'off' && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Day Off</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}