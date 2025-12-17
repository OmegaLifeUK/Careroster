import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";

export default function AvailabilityConflictDetector({ 
  carerId, 
  availability = [], 
  leaveRequests = [],
  shifts = [],
  visits = []
}) {
  const conflicts = useMemo(() => {
    if (!carerId) return [];
    
    const detected = [];
    
    // Combine shifts and visits
    const allShifts = [...shifts, ...visits].filter(s => 
      s && (s.carer_id === carerId || s.staff_id === carerId || s.assigned_staff_id === carerId) &&
      s.status !== 'cancelled'
    );

    // Check for shifts scheduled during leave
    leaveRequests
      .filter(lr => lr && lr.carer_id === carerId && lr.status === 'approved')
      .forEach(leave => {
        try {
          const leaveStart = parseISO(leave.start_date);
          const leaveEnd = parseISO(leave.end_date);
          
          allShifts.forEach(shift => {
            const shiftDate = parseISO(shift.date || shift.scheduled_start);
            if (isWithinInterval(shiftDate, { start: leaveStart, end: leaveEnd })) {
            detected.push({
              type: 'shift_during_leave',
              severity: 'high',
              message: `Shift scheduled during approved leave period`,
              shiftId: shift.id,
              leaveId: leave.id,
              date: format(shiftDate, 'MMM d, yyyy'),
              details: `${leave.leave_type} leave from ${format(leaveStart, 'MMM d')} to ${format(leaveEnd, 'MMM d')}`
              });
            }
          });
        } catch (err) {
          console.error('Error checking leave conflicts:', err);
        }
      });

    // Check for unavailability conflicts
    availability
      .filter(a => a && a.carer_id === carerId && a.availability_type === 'unavailable')
      .forEach(unavail => {
        try {
          if (unavail.specific_date) {
            const unavailDate = unavail.specific_date;
            allShifts.forEach(shift => {
              const shiftDateStr = format(parseISO(shift.date || shift.scheduled_start), 'yyyy-MM-dd');
              if (shiftDateStr === unavailDate) {
              detected.push({
                type: 'shift_during_unavailability',
                severity: 'medium',
                message: `Shift scheduled when staff is unavailable`,
                shiftId: shift.id,
                date: format(parseISO(unavailDate), 'MMM d, yyyy'),
                details: unavail.reason || 'Marked as unavailable'
                });
              }
            });
          }
        } catch (err) {
          console.error('Error checking unavailability conflicts:', err);
        }
      });

    // Check for working hours violations
    const workingHours = availability.filter(a => 
      a && a.carer_id === carerId && a.availability_type === 'working_hours'
    );
    
    allShifts.forEach(shift => {
      try {
        const shiftStart = shift.scheduled_start || shift.start_time;
        if (!shiftStart) return;
        
        const shiftDate = new Date(shiftStart);
        const dayOfWeek = shiftDate.getDay();
        const shiftTime = format(shiftDate, 'HH:mm');
        
        const dayWorkingHours = workingHours.find(wh => wh && wh.day_of_week === dayOfWeek);
        
        if (dayWorkingHours && dayWorkingHours.start_time && dayWorkingHours.end_time) {
          if (shiftTime < dayWorkingHours.start_time || shiftTime > dayWorkingHours.end_time) {
          detected.push({
            type: 'outside_working_hours',
            severity: 'low',
            message: `Shift outside preferred working hours`,
            shiftId: shift.id,
            date: format(shiftDate, 'MMM d, yyyy'),
            details: `Preferred hours: ${dayWorkingHours.start_time} - ${dayWorkingHours.end_time}, Shift: ${shiftTime}`
            });
          }
        }
      } catch (err) {
        console.error('Error checking working hours:', err);
      }
    });

    return detected;
  }, [carerId, availability, leaveRequests, shifts, visits]);

  if (conflicts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">✓</span>
            </div>
            <span className="font-semibold">No conflicts detected</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severityColors = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-600' },
    medium: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-600' },
    low: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', badge: 'bg-yellow-600' }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="w-5 h-5" />
          {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {conflicts.map((conflict, idx) => {
          const colors = severityColors[conflict.severity];
          return (
            <div key={idx} className={`p-3 ${colors.bg} ${colors.border} border rounded-lg`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={`${colors.badge} text-white text-xs`}>
                    {conflict.severity.toUpperCase()}
                  </Badge>
                  <span className={`font-semibold text-sm ${colors.text}`}>
                    {conflict.message}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                <Calendar className="w-3 h-3" />
                <span>{conflict.date}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{conflict.details}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}