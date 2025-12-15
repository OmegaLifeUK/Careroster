import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarOff, AlertCircle } from "lucide-react";
import { parseISO, isAfter, isBefore, addDays } from "date-fns";

export default function CarerAvailabilitySummary({ availability = [], leaveRequests = [] }) {
  const workingHours = availability.filter(a => a.availability_type === 'working_hours');
  const unavailability = availability.filter(a => 
    a.availability_type === 'unavailable' || a.availability_type === 'day_off'
  );
  
  const today = new Date();
  const nextWeek = addDays(today, 7);

  // Count working days
  const workingDays = workingHours.length;

  // Calculate weekly hours
  const weeklyHours = workingHours.reduce((total, wh) => {
    if (wh.start_time && wh.end_time) {
      const [startH, startM] = wh.start_time.split(':').map(Number);
      const [endH, endM] = wh.end_time.split(':').map(Number);
      return total + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
    }
    return total;
  }, 0);

  // Count upcoming unavailability
  const upcomingUnavailable = unavailability.filter(u => {
    try {
      const dateStr = u.specific_date || u.date_range_start;
      if (!dateStr) return false;
      const date = parseISO(dateStr);
      return isAfter(date, today) && isBefore(date, nextWeek);
    } catch {
      return false;
    }
  }).length;

  // Count upcoming leave
  const upcomingLeave = leaveRequests.filter(l => {
    if (l.status !== 'approved' || !l.start_date || !l.end_date) return false;
    try {
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      return isAfter(start, today) || (isBefore(start, today) && isAfter(end, today));
    } catch {
      return false;
    }
  }).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
        <Clock className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">
          {workingDays} days • {weeklyHours.toFixed(0)}h/week
        </span>
      </div>

      {upcomingUnavailable > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200">
          <CalendarOff className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">
            {upcomingUnavailable} upcoming
          </span>
        </div>
      )}

      {upcomingLeave > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
          <AlertCircle className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">
            On leave
          </span>
        </div>
      )}

      {workingDays === 0 && (
        <Badge className="bg-gray-100 text-gray-600">
          No working hours set
        </Badge>
      )}
    </div>
  );
}