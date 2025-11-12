import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SuggestionsPanel } from "@/components/ui/smart-suggestions";
import { 
  Calendar, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  UserPlus,
  CheckCircle
} from "lucide-react";
import { format, addDays, parseISO, isAfter, isBefore, differenceInDays } from "date-fns";

export default function SmartSuggestionsWidget({ 
  shifts = [], 
  carers = [], 
  clients = [],
  leaveRequests = []
}) {
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const suggs = [];
    const today = new Date();
    const nextWeek = addDays(today, 7);

    // 1. Check for unfilled shifts in the next 7 days
    const upcomingUnfilled = shifts.filter(s => {
      if (s.status !== 'unfilled' && !s.carer_id) return false;
      if (!s.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        return isAfter(shiftDate, today) && isBefore(shiftDate, nextWeek);
      } catch {
        return false;
      }
    });

    if (upcomingUnfilled.length > 0) {
      suggs.push({
        type: 'warning',
        priority: 'high',
        title: `${upcomingUnfilled.length} Unfilled Shift${upcomingUnfilled.length > 1 ? 's' : ''} This Week`,
        description: 'Critical shifts need carer assignments soon. Use AI suggestions to auto-assign.',
        metric: upcomingUnfilled.length,
        metricLabel: upcomingUnfilled.length > 1 ? 'shifts need attention' : 'shift needs attention',
        action: () => navigate(createPageUrl("Schedule")),
        actionLabel: "Assign Carers",
        secondaryAction: () => navigate(createPageUrl("Schedule")),
        secondaryActionLabel: "Use AI"
      });
    }

    // 2. Check for overworked carers
    const carerWorkload = {};
    shifts.forEach(shift => {
      if (!shift.carer_id || shift.status === 'cancelled') return;
      if (!carerWorkload[shift.carer_id]) {
        carerWorkload[shift.carer_id] = { hours: 0, days: new Set() };
      }
      carerWorkload[shift.carer_id].hours += shift.duration_hours || 0;
      carerWorkload[shift.carer_id].days.add(shift.date);
    });

    const overworkedCarers = Object.entries(carerWorkload).filter(
      ([id, data]) => data.days.size >= 6 // 6+ consecutive days
    );

    if (overworkedCarers.length > 0) {
      const carer = carers.find(c => c.id === overworkedCarers[0][0]);
      suggs.push({
        type: 'warning',
        title: 'Carer Workload Alert',
        description: `${carer?.full_name || 'A carer'} has worked ${overworkedCarers[0][1].days.size} consecutive days. Consider scheduling time off.`,
        action: () => navigate(createPageUrl("Carers")),
        actionLabel: "View Schedule",
        icon: Users
      });
    }

    // 3. Check for pending leave requests
    const pendingLeave = leaveRequests.filter(r => r.status === 'pending');
    if (pendingLeave.length > 0) {
      suggs.push({
        type: 'info',
        priority: pendingLeave.length > 3 ? 'high' : 'normal',
        title: `${pendingLeave.length} Pending Leave Request${pendingLeave.length > 1 ? 's' : ''}`,
        description: 'Team members are waiting for leave approval. Review and approve to help them plan.',
        action: () => navigate(createPageUrl("LeaveRequests")),
        actionLabel: "Review Requests",
        metric: pendingLeave.length,
        metricLabel: 'awaiting review'
      });
    }

    // 4. Check carer-to-client ratio
    const activeCarers = carers.filter(c => c.status === 'active').length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const ratio = activeClients / (activeCarers || 1);

    if (ratio > 5) {
      suggs.push({
        type: 'tip',
        title: 'Consider Hiring More Carers',
        description: `Your carer-to-client ratio is ${ratio.toFixed(1)}:1. Industry standard is 4-5 clients per carer for quality care.`,
        action: () => navigate(createPageUrl("Carers")),
        actionLabel: "View Carers",
        secondaryAction: () => navigate(createPageUrl("Carers")),
        secondaryActionLabel: "Post Job",
        icon: UserPlus
      });
    }

    // 5. Check for shifts requiring specific qualifications
    const qualifiedShifts = shifts.filter(s => 
      s.required_qualification && 
      s.status === 'unfilled'
    );

    if (qualifiedShifts.length > 0) {
      suggs.push({
        type: 'info',
        title: `${qualifiedShifts.length} Shift${qualifiedShifts.length > 1 ? 's' : ''} Need Qualified Carers`,
        description: 'Some shifts require specific qualifications. Make sure to assign appropriately qualified staff.',
        action: () => navigate(createPageUrl("Schedule")),
        actionLabel: "View Shifts"
      });
    }

    // 6. Positive insights
    const completedThisWeek = shifts.filter(s => {
      if (s.status !== 'completed') return false;
      if (!s.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        return differenceInDays(today, shiftDate) <= 7;
      } catch {
        return false;
      }
    }).length;

    if (completedThisWeek > 20) {
      suggs.push({
        type: 'success',
        title: 'Great Week!',
        description: `Your team completed ${completedThisWeek} shifts this week. Keep up the excellent work!`,
        metric: completedThisWeek,
        metricLabel: 'shifts completed',
        icon: CheckCircle
      });
    }

    // 7. Check for scheduling conflicts
    const conflictingShifts = [];
    const carerDateMap = {};
    
    shifts.forEach(shift => {
      if (!shift.carer_id || !shift.date) return;
      const key = `${shift.carer_id}-${shift.date}`;
      if (!carerDateMap[key]) {
        carerDateMap[key] = [];
      }
      carerDateMap[key].push(shift);
    });

    Object.values(carerDateMap).forEach(dayShifts => {
      if (dayShifts.length < 2) return;
      for (let i = 0; i < dayShifts.length; i++) {
        for (let j = i + 1; j < dayShifts.length; j++) {
          const s1 = dayShifts[i];
          const s2 = dayShifts[j];
          const overlap = (
            (s1.start_time >= s2.start_time && s1.start_time < s2.end_time) ||
            (s1.end_time > s2.start_time && s1.end_time <= s2.end_time) ||
            (s1.start_time <= s2.start_time && s1.end_time >= s2.end_time)
          );
          if (overlap) {
            conflictingShifts.push(s1);
            break;
          }
        }
      }
    });

    if (conflictingShifts.length > 0) {
      suggs.push({
        type: 'warning',
        priority: 'high',
        title: 'Scheduling Conflicts Detected',
        description: `${conflictingShifts.length} shift${conflictingShifts.length > 1 ? 's have' : ' has'} overlapping times. Review and fix to avoid issues.`,
        action: () => navigate(createPageUrl("Schedule")),
        actionLabel: "Fix Conflicts",
        icon: AlertTriangle
      });
    }

    // 8. Optimization tip - Shift patterns
    const morningShifts = shifts.filter(s => s.shift_type === 'morning').length;
    const eveningShifts = shifts.filter(s => s.shift_type === 'evening').length;
    
    if (Math.abs(morningShifts - eveningShifts) > 20) {
      suggs.push({
        type: 'tip',
        title: 'Imbalanced Shift Distribution',
        description: 'Your morning and evening shifts are significantly imbalanced. Consider redistributing for better work-life balance.',
        action: () => navigate(createPageUrl("Schedule")),
        actionLabel: "View Distribution",
        icon: TrendingUp
      });
    }

    return suggs;
  }, [shifts, carers, clients, leaveRequests, navigate]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <SuggestionsPanel 
      suggestions={suggestions.slice(0, 3)} // Show top 3 suggestions
      title={`${suggestions.length} Smart Suggestion${suggestions.length > 1 ? 's' : ''}`}
    />
  );
}