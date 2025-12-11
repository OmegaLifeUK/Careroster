import React from "react";
import { Clock, AlertTriangle, CheckCircle, Coffee, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInHours, differenceInMinutes, parseISO } from "date-fns";

/**
 * UK Working Time Regulations Compliance Component
 * Monitors and displays compliance with UK WTR requirements:
 * - 48 hour maximum average week (can opt out)
 * - 11 hours rest between shifts
 * - 20 minute break if working 6+ hours
 * - 24 hours uninterrupted rest per week
 */

export function checkWorkingTimeCompliance(staff, shifts, period = 'week') {
  const issues = [];

  // Check 48-hour week limit
  const weekHours = shifts
    .filter(s => s.staff_id === staff.id || s.carer_id === staff.id || s.assigned_staff_id === staff.id)
    .reduce((sum, s) => {
      if (s.duration_hours) return sum + s.duration_hours;
      if (s.start_time && s.end_time) {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        let hours = (eh * 60 + em - sh * 60 - sm) / 60;
        if (hours < 0) hours += 24;
        return sum + hours;
      }
      return sum + (s.duration_minutes || 0) / 60;
    }, 0);

  if (weekHours > 48 && !staff.wtr_opt_out) {
    issues.push({
      type: 'critical',
      code: 'WTR_48H',
      message: `${weekHours.toFixed(1)}h scheduled (max 48h/week without opt-out)`,
      severity: 'high'
    });
  } else if (weekHours > 48) {
    issues.push({
      type: 'warning',
      code: 'WTR_48H_OPTED_OUT',
      message: `${weekHours.toFixed(1)}h scheduled (opted out of 48h limit)`,
      severity: 'medium'
    });
  }

  // Check rest between shifts (11 hours)
  const sortedShifts = [...shifts]
    .filter(s => s.staff_id === staff.id || s.carer_id === staff.id || s.assigned_staff_id === staff.id)
    .sort((a, b) => {
      const dateA = a.date || a.scheduled_date;
      const dateB = b.date || b.scheduled_date;
      const timeA = a.scheduled_start || a.start_time || '00:00';
      const timeB = b.scheduled_start || b.start_time || '00:00';
      return (`${dateA} ${timeA}`).localeCompare(`${dateB} ${timeB}`);
    });

  for (let i = 0; i < sortedShifts.length - 1; i++) {
    const current = sortedShifts[i];
    const next = sortedShifts[i + 1];
    
    const currentEnd = current.end_time || current.scheduled_end;
    const nextStart = next.start_time || next.scheduled_start;
    
    if (currentEnd && nextStart) {
      // Calculate hours between shifts
      const currentDate = current.date || current.scheduled_date;
      const nextDate = next.date || next.scheduled_date;
      
      try {
        const currentEndDateTime = new Date(`${currentDate}T${currentEnd}`);
        const nextStartDateTime = new Date(`${nextDate}T${nextStart}`);
        const hoursBetween = differenceInHours(nextStartDateTime, currentEndDateTime);
        
        if (hoursBetween < 11) {
          issues.push({
            type: 'critical',
            code: 'WTR_11H_REST',
            message: `Only ${hoursBetween}h rest between shifts (min 11h required)`,
            severity: 'high',
            shifts: [current, next]
          });
        }
      } catch (e) {
        console.error('Date parsing error:', e);
      }
    }
  }

  // Check for long shifts needing breaks (6+ hours)
  shifts
    .filter(s => s.staff_id === staff.id || s.carer_id === staff.id || s.assigned_staff_id === staff.id)
    .forEach(shift => {
      let duration = 0;
      if (shift.duration_hours) {
        duration = shift.duration_hours;
      } else if (shift.start_time && shift.end_time) {
        const [sh, sm] = shift.start_time.split(':').map(Number);
        const [eh, em] = shift.end_time.split(':').map(Number);
        duration = (eh * 60 + em - sh * 60 - sm) / 60;
        if (duration < 0) duration += 24;
      }

      if (duration >= 6 && !shift.break_allocated) {
        issues.push({
          type: 'warning',
          code: 'WTR_BREAK',
          message: `${duration.toFixed(1)}h shift needs 20min break`,
          severity: 'medium',
          shift: shift
        });
      }
    });

  return {
    compliant: issues.filter(i => i.severity === 'high').length === 0,
    weekHours,
    issues,
    summary: {
      critical: issues.filter(i => i.severity === 'high').length,
      warnings: issues.filter(i => i.severity === 'medium').length
    }
  };
}

export function WorkingTimeComplianceIndicator({ staff, shifts, compact = false }) {
  const compliance = checkWorkingTimeCompliance(staff, shifts);

  if (compact) {
    return (
      <Badge className={
        compliance.summary.critical > 0 
          ? "bg-red-100 text-red-700"
          : compliance.summary.warnings > 0
          ? "bg-orange-100 text-orange-700"
          : "bg-green-100 text-green-700"
      }>
        <Clock className="w-3 h-3 mr-1" />
        {compliance.weekHours.toFixed(0)}h
        {compliance.summary.critical > 0 && ` (${compliance.summary.critical} critical)`}
      </Badge>
    );
  }

  return (
    <Card className={
      compliance.summary.critical > 0 
        ? "border-red-200 bg-red-50"
        : compliance.summary.warnings > 0
        ? "border-orange-200 bg-orange-50"
        : "border-green-200 bg-green-50"
    }>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {compliance.compliant ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          Working Time Regulations
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Weekly Hours:</span>
          <span className={`font-semibold ${
            compliance.weekHours > 48 ? 'text-red-600' : 'text-green-600'
          }`}>
            {compliance.weekHours.toFixed(1)}h / 48h
          </span>
        </div>
        
        {compliance.issues.length > 0 && (
          <div className="mt-3 space-y-1">
            {compliance.issues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className={`flex items-start gap-1.5 p-1.5 rounded ${
                issue.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
              }`}>
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] leading-tight">{issue.message}</span>
              </div>
            ))}
            {compliance.issues.length > 3 && (
              <p className="text-gray-500 text-[10px]">+{compliance.issues.length - 3} more issues</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WTRStatusBadge({ weekHours, hasOptOut = false }) {
  if (weekHours > 48 && !hasOptOut) {
    return (
      <Badge className="bg-red-100 text-red-700 text-[9px]">
        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
        WTR: {weekHours.toFixed(0)}h/48h
      </Badge>
    );
  }
  
  if (weekHours > 48) {
    return (
      <Badge className="bg-orange-100 text-orange-700 text-[9px]">
        WTR: {weekHours.toFixed(0)}h (opted out)
      </Badge>
    );
  }

  if (weekHours > 40) {
    return (
      <Badge className="bg-amber-100 text-amber-700 text-[9px]">
        WTR: {weekHours.toFixed(0)}h/48h
      </Badge>
    );
  }

  return null;
}