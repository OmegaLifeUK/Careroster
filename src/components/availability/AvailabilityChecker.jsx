import { parseISO, getDay, isWithinInterval } from "date-fns";

/**
 * Utility to check carer availability for scheduling
 * Used by shift scheduling, AI allocator, and conflict detection
 */

export function checkCarerAvailability(carerId, date, startTime, endTime, availability = [], leaveRequests = []) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dayOfWeek = getDay(dateObj);

  const result = {
    isAvailable: true,
    reason: null,
    workingHours: null,
    conflicts: []
  };

  const carerAvailability = Array.isArray(availability) 
    ? availability.filter(a => a && a.carer_id === carerId) 
    : [];
  const carerLeave = Array.isArray(leaveRequests) 
    ? leaveRequests.filter(l => l && l.carer_id === carerId && l.status === 'approved') 
    : [];

  // Check if on approved leave for the specific shift date
  const onLeave = carerLeave.some(leave => {
    try {
      if (!leave.start_date || !leave.end_date) return false;
      // Compare date strings directly (YYYY-MM-DD format)
      return dateStr >= leave.start_date && dateStr <= leave.end_date;
    } catch {
      return false;
    }
  });

  if (onLeave) {
    result.isAvailable = false;
    result.reason = 'On approved leave';
    result.conflicts.push({ type: 'leave', message: 'Carer is on approved leave' });
    return result;
  }

  // Check unavailability periods
  const unavailability = carerAvailability.filter(a => 
    a.availability_type === 'unavailable' || a.availability_type === 'day_off'
  );

  const isUnavailable = unavailability.some(u => {
    // Single date
    if (u.specific_date === dateStr) {
      // Check if it's a partial unavailability (specific times)
      if (u.start_time && u.end_time && startTime && endTime) {
        return timeOverlaps(u.start_time, u.end_time, startTime, endTime);
      }
      return true; // Full day unavailable
    }
    
    // Date range
    if (u.date_range_start && u.date_range_end) {
      try {
        const start = parseISO(u.date_range_start);
        const end = parseISO(u.date_range_end);
        return isWithinInterval(dateObj, { start, end });
      } catch {
        return false;
      }
    }
    
    return false;
  });

  if (isUnavailable) {
    const unavailEntry = unavailability.find(u => 
      u.specific_date === dateStr || 
      (u.date_range_start && u.date_range_end)
    );
    result.isAvailable = false;
    result.reason = unavailEntry?.reason || 'Marked as unavailable';
    result.conflicts.push({ 
      type: 'unavailable', 
      message: unavailEntry?.reason || 'Carer marked as unavailable for this date/time' 
    });
    return result;
  }

  // Check working hours
  const workingHours = carerAvailability.filter(a => a.availability_type === 'working_hours');
  const dayWorkingHours = workingHours.find(w => w.day_of_week === dayOfWeek);

  if (workingHours.length > 0 && !dayWorkingHours) {
    result.isAvailable = false;
    result.reason = 'Not a working day';
    result.conflicts.push({ type: 'not_working_day', message: 'This is not a scheduled working day' });
    return result;
  }

  if (dayWorkingHours && startTime && endTime) {
    result.workingHours = {
      start: dayWorkingHours.start_time,
      end: dayWorkingHours.end_time
    };

    // Check if shift is within working hours
    if (!isWithinWorkingHours(startTime, endTime, dayWorkingHours.start_time, dayWorkingHours.end_time)) {
      result.isAvailable = false;
      result.reason = `Outside working hours (${dayWorkingHours.start_time} - ${dayWorkingHours.end_time})`;
      result.conflicts.push({ 
        type: 'outside_hours', 
        message: `Shift time is outside working hours (${dayWorkingHours.start_time} - ${dayWorkingHours.end_time})` 
      });
      return result;
    }
  }

  return result;
}

function timeOverlaps(start1, end1, start2, end2) {
  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  
  return s1 < e2 && s2 < e1;
}

function isWithinWorkingHours(shiftStart, shiftEnd, workStart, workEnd) {
  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  
  const ss = toMinutes(shiftStart);
  const se = toMinutes(shiftEnd);
  const ws = toMinutes(workStart);
  const we = toMinutes(workEnd);
  
  return ss >= ws && se <= we;
}

export function getCarerWorkingHoursForDay(carerId, dayOfWeek, availability = []) {
  const carerAvailability = Array.isArray(availability) 
    ? availability.filter(a => a && a.carer_id === carerId && a.availability_type === 'working_hours') 
    : [];
  
  return carerAvailability.find(w => w.day_of_week === dayOfWeek) || null;
}

export function getCarerWeeklyHours(carerId, availability = []) {
  const carerAvailability = Array.isArray(availability) 
    ? availability.filter(a => a && a.carer_id === carerId && a.availability_type === 'working_hours') 
    : [];
  
  return carerAvailability.reduce((total, wh) => {
    if (wh.start_time && wh.end_time) {
      const [startH, startM] = wh.start_time.split(':').map(Number);
      const [endH, endM] = wh.end_time.split(':').map(Number);
      return total + ((endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0))) / 60;
    }
    return total;
  }, 0);
}