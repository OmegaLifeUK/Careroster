import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Search,
  Plus,
  Home,
  Moon,
  Sun,
  Maximize2,
  User,
  AlertTriangle,
  X
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SHIFT_COLORS = {
  visiting_support: { bg: "bg-sky-100", border: "border-sky-300", text: "text-sky-800", dot: "bg-sky-500" },
  core_hours: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  sleep_in: { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800", dot: "bg-indigo-500" },
  waking_night: { bg: "bg-slate-200", border: "border-slate-400", text: "text-slate-800", dot: "bg-slate-600" },
  on_call: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-500" },
};

const SHIFT_LABELS = {
  visiting_support: "Visiting",
  core_hours: "Core",
  sleep_in: "Sleep-In",
  waking_night: "Waking Night",
  on_call: "On-Call",
};

const TIMELINE_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export default function SupportedLivingRosterView({
  shifts = [],
  staff = [],
  clients = [],
  properties = [],
  staffAvailability = [],
  onShiftClick,
  onShiftUpdate,
  onAddShift,
  locationName = "Supported Living"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activePanel, setActivePanel] = useState("staff");
  const { toast } = useToast();

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const activeStaff = useMemo(() => {
    let filtered = staff.filter(s => s && s.is_active !== false);
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [staff, searchQuery]);

  const activeProperties = useMemo(() => {
    return properties.filter(p => p && p.status === 'active')
      .sort((a, b) => (a.property_name || '').localeCompare(b.property_name || ''));
  }, [properties]);

  const weeklyStats = useMemo(() => {
    const weekShifts = shifts.filter(s => {
      if (!s?.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const total = weekShifts.length;
    const filled = weekShifts.filter(s => s.staff_id).length;
    const sleepIns = weekShifts.filter(s => s.shift_type === 'sleep_in').length;
    const wakingNights = weekShifts.filter(s => s.shift_type === 'waking_night').length;

    return { total, filled, unfilled: total - filled, sleepIns, wakingNights };
  }, [shifts, currentWeekStart]);

  const getStaffDayShifts = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.staff_id === staffId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getPropertyDayShifts = (propertyId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.property_id === propertyId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getUnassignedShifts = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts.filter(s => s?.date === dayStr && !s.staff_id);
  };

  const getStaffWeekHours = (staffId) => {
    return shifts
      .filter(s => {
        if (!s?.date || s.staff_id !== staffId) return false;
        const shiftDate = parseISO(s.date);
        return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
      })
      .reduce((sum, s) => {
        if (!s.start_time || !s.end_time) return sum;
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        let hours = (eh * 60 + em - sh * 60 - sm) / 60;
        if (hours < 0) hours += 24;
        return sum + hours;
      }, 0);
  };

  const getStaffContractedHours = (staffId) => {
    const staffMember = staff.find(s => s?.id === staffId);
    // Check availability records for max hours
    const availability = staffAvailability?.find(a => a?.carer_id === staffId && a?.max_hours_per_week);
    if (availability?.max_hours_per_week) return availability.max_hours_per_week;
    // Check staff record for contracted hours
    if (staffMember?.max_hours_per_week) return staffMember.max_hours_per_week;
    // Fallback to defaults
    return 40;
  };

  const getStaffHoursStatus = (staffId) => {
    const weekHours = getStaffWeekHours(staffId);
    const contracted = getStaffContractedHours(staffId);
    if (!contracted) return { status: 'unknown', weekHours, contracted: null };
    const percentage = (weekHours / contracted) * 100;
    if (percentage >= 100) return { status: 'full', weekHours, contracted, percentage };
    if (percentage >= 80) return { status: 'near', weekHours, contracted, percentage };
    if (percentage < 50) return { status: 'low', weekHours, contracted, percentage };
    return { status: 'ok', weekHours, contracted, percentage };
  };

  const getTimePosition = (time) => {
    if (!time) return 0;
    const [hour, min] = time.split(':').map(Number);
    return ((hour - 6 + min / 60) / 18) * 100;
  };

  const getTimeWidth = (start, end) => {
    if (!start || !end) return 8;
    const startPos = getTimePosition(start);
    const endPos = getTimePosition(end);
    return Math.max(endPos - startPos, 5);
  };

  // Check for conflicts before updating
  const checkForConflicts = (staffIdToCheck, dateToCheck, shiftToMove) => {
    if (!staffIdToCheck || !dateToCheck || !shiftToMove) return null;
    
    const conflictingShifts = shifts.filter(s => {
      if (!s || s.staff_id !== staffIdToCheck || s.date !== dateToCheck) return false;
      if (s.id === shiftToMove.id) return false;
      
      const shiftStart = s.start_time || "00:00";
      const shiftEnd = s.end_time || "23:59";
      const moveStart = shiftToMove.start_time || "00:00";
      const moveEnd = shiftToMove.end_time || "23:59";
      
      return (
        (moveStart >= shiftStart && moveStart < shiftEnd) ||
        (moveEnd > shiftStart && moveEnd <= shiftEnd) ||
        (moveStart <= shiftStart && moveEnd >= shiftEnd)
      );
    });
    
    return conflictingShifts.length > 0 ? conflictingShifts : null;
  };

  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const [targetStaffId, targetDate] = destination.droppableId.split('_');
    
    const shift = shifts.find(s => s.id === draggableId);
    if (!shift || !onShiftUpdate) return;

    const newStaffId = targetStaffId === 'unassigned' ? null : targetStaffId;
    
    // Check for time conflicts if assigning to staff
    if (newStaffId) {
      const conflicts = checkForConflicts(newStaffId, targetDate, shift);
      if (conflicts) {
        const staffName = activeStaff.find(s => s.id === newStaffId)?.full_name || 'This staff member';
        const conflictTimes = conflicts.map(c => `${c.start_time}-${c.end_time}`).join(', ');
        const proceed = window.confirm(
          `⚠️ Scheduling Conflict!\n\n${staffName} already has shift(s) at ${conflictTimes} on this date.\n\nThis will create overlapping shifts. Continue?`
        );
        if (!proceed) return;
      }
      
      // Check for hours capacity
      const hoursStatus = getStaffHoursStatus(newStaffId);
      // Calculate shift duration
      let shiftDuration = 0;
      if (shift.start_time && shift.end_time) {
        const [sh, sm] = shift.start_time.split(':').map(Number);
        const [eh, em] = shift.end_time.split(':').map(Number);
        shiftDuration = (eh * 60 + em - sh * 60 - sm) / 60;
        if (shiftDuration < 0) shiftDuration += 24;
      }
      
      const projectedHours = hoursStatus.weekHours + shiftDuration;
      const projectedPercentage = hoursStatus.contracted ? (projectedHours / hoursStatus.contracted) * 100 : 0;
      
      if (hoursStatus.status === 'full' || projectedPercentage >= 100) {
        const staffName = activeStaff.find(s => s.id === newStaffId)?.full_name || 'This staff member';
        setPendingAssignment({
          shiftId: draggableId,
          newStaffId,
          targetDate,
          staffName,
          currentHours: hoursStatus.weekHours,
          contractedHours: hoursStatus.contracted,
          projectedHours,
          shiftDuration
        });
        setShowOverrideDialog(true);
        return;
      }
    }
    
    completeAssignment(draggableId, newStaffId, targetDate);
  };

  const completeAssignment = (shiftId, newStaffId, targetDate, overrideInfo = null) => {
    const updateData = { 
      staff_id: newStaffId,
      date: targetDate,
      status: newStaffId ? 'published' : 'draft'
    };
    
    if (overrideInfo) {
      updateData.hours_override_reason = overrideInfo.reason;
      updateData.hours_override_by = overrideInfo.overriddenBy;
      updateData.hours_override_date = new Date().toISOString();
    }
    
    onShiftUpdate({ id: shiftId, data: updateData });
    
    toast.success("Shift Updated", newStaffId 
      ? `Assigned to ${activeStaff.find(s => s.id === newStaffId)?.full_name}`
      : "Moved to unassigned"
    );
  };

  const handleOverrideConfirm = () => {
    if (!overrideReason.trim()) {
      toast.error("Override Reason Required", "Please enter a reason for exceeding contracted hours");
      return;
    }
    
    if (pendingAssignment) {
      completeAssignment(
        pendingAssignment.shiftId,
        pendingAssignment.newStaffId,
        pendingAssignment.targetDate,
        { reason: overrideReason, overriddenBy: 'scheduler' }
      );
    }
    
    setShowOverrideDialog(false);
    setPendingAssignment(null);
    setOverrideReason("");
  };

  const handleOverrideCancel = () => {
    setShowOverrideDialog(false);
    setPendingAssignment(null);
    setOverrideReason("");
  };

  const getPropertyName = (propertyId) => properties.find(p => p?.id === propertyId)?.property_name || '';
  const getStaffName = (staffId) => staff.find(s => s?.id === staffId)?.full_name || 'Unassigned';

  const ShiftPill = ({ shift, showStaff = false, showProperty = true }) => {
    const colors = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.core_hours;
    const label = showProperty 
      ? getPropertyName(shift.property_id)
      : (showStaff ? getStaffName(shift.staff_id) : '');

    return (
      <div
        onClick={() => onShiftClick?.(shift)}
        className={`
          px-2 py-1 rounded-md text-xs cursor-pointer transition-all
          ${colors.bg} ${colors.border} ${colors.text} border
          hover:shadow-md hover:scale-[1.02]
          ${!shift.staff_id ? 'border-dashed border-orange-400 bg-orange-50' : ''}
        `}
      >
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className="font-medium truncate">{label || SHIFT_LABELS[shift.shift_type] || 'Shift'}</span>
        </div>
        <div className="text-[10px] opacity-75 mt-0.5">
          {shift.start_time} - {shift.end_time}
        </div>
      </div>
    );
  };

  const TimelineShift = ({ shift }) => {
    const colors = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.core_hours;
    const left = getTimePosition(shift.start_time);
    const width = getTimeWidth(shift.start_time, shift.end_time);

    return (
      <div
        onClick={() => onShiftClick?.(shift)}
        className={`
          absolute top-1 bottom-1 rounded cursor-pointer transition-all
          ${colors.bg} ${colors.border} border
          hover:shadow-lg hover:z-10
          ${!shift.staff_id ? 'border-dashed border-orange-400 bg-orange-50/80' : ''}
        `}
        style={{ left: `${left}%`, width: `${width}%`, minWidth: '40px' }}
      >
        <div className="px-1.5 py-0.5 text-[10px] truncate">
          <span className={`font-semibold ${colors.text}`}>
            {getPropertyName(shift.property_id) || SHIFT_LABELS[shift.shift_type]}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">{locationName}</h2>
              <p className="text-indigo-100 text-sm">Shift Roster</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.total}</p>
                <p className="text-indigo-200 text-xs">Total Shifts</p>
              </div>
              <div className="w-px h-8 bg-indigo-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-300">{weeklyStats.filled}</p>
                <p className="text-indigo-200 text-xs">Filled</p>
              </div>
              <div className="w-px h-8 bg-indigo-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-300">{weeklyStats.unfilled}</p>
                <p className="text-indigo-200 text-xs">Open</p>
              </div>
              <div className="w-px h-8 bg-indigo-400" />
              <div className="text-center flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <p className="text-2xl font-bold">{weeklyStats.sleepIns}</p>
                <p className="text-indigo-200 text-xs">Sleep-Ins</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => viewMode === "day" 
              ? setSelectedDate(addDays(selectedDate, -1))
              : setCurrentWeekStart(subWeeks(currentWeekStart, 1))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex bg-white rounded-lg border p-0.5">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === "day" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === "week" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-sm">
              {viewMode === "day" 
                ? format(selectedDate, 'EEE, d MMM yyyy')
                : `${format(currentWeekStart, 'd MMM')} - ${format(addDays(currentWeekStart, 6), 'd MMM yyyy')}`
              }
            </span>
          </div>

          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => viewMode === "day" 
              ? setSelectedDate(addDays(selectedDate, 1))
              : setCurrentWeekStart(addWeeks(currentWeekStart, 1))
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>

          <div className="flex bg-white rounded-lg border p-0.5">
            <button
              onClick={() => setActivePanel("staff")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "staff" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="w-3 h-3" />
              Staff
            </button>
            <button
              onClick={() => setActivePanel("properties")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "properties" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Home className="w-3 h-3" />
              Properties
            </button>
            <button
              onClick={() => setActivePanel("both")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "both" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              Split
            </button>
          </div>
        </div>
      </div>

      {viewMode === "day" ? (
        /* DAY TIMELINE VIEW */
        <div className="flex flex-col">
          <div className="flex border-b bg-gray-50">
            <div className="w-56 p-2 border-r flex-shrink-0" />
            <div className="flex-1 flex">
              {TIMELINE_HOURS.map(hour => (
                <div key={hour} className="flex-1 text-center py-2 text-xs text-gray-500 border-r">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {(activePanel === "staff" || activePanel === "both") && activeStaff.length > 0 && (
            <div className={activePanel === "both" ? "border-b" : ""}>
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-indigo-900">Staff</span>
                <Badge className="bg-indigo-100 text-indigo-700 text-xs">{activeStaff.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeStaff.map(staffMember => {
                  const dayShifts = getStaffDayShifts(staffMember.id, selectedDate);
                  const hoursStatus = getStaffHoursStatus(staffMember.id);
                  
                  return (
                    <div key={staffMember.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                          hoursStatus.status === 'full' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                          hoursStatus.status === 'near' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                          'bg-gradient-to-br from-indigo-400 to-purple-600'
                        }`}>
                          {staffMember.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{staffMember.full_name}</p>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className={`text-xs ${
                              hoursStatus.status === 'full' ? 'text-red-600 font-medium' :
                              hoursStatus.status === 'near' ? 'text-amber-600' : 'text-gray-500'
                            }`}>
                              {hoursStatus.weekHours.toFixed(1)}h
                              {hoursStatus.contracted && ` / ${hoursStatus.contracted}h`}
                            </span>
                            {hoursStatus.status === 'full' && (
                              <Badge className="bg-red-100 text-red-700 text-[9px] py-0 px-1">Full</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {dayShifts.map(shift => (
                          <TimelineShift key={shift.id} shift={shift} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activePanel === "properties" || activePanel === "both") && activeProperties.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border-b">
                <Home className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-purple-900">Properties</span>
                <Badge className="bg-purple-100 text-purple-700 text-xs">{activeProperties.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeProperties.map(property => {
                  const dayShifts = getPropertyDayShifts(property.id, selectedDate);
                  
                  return (
                    <div key={property.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{property.property_name}</p>
                          <p className="text-xs text-gray-500 truncate">{property.address?.city || 'Location'}</p>
                        </div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {dayShifts.map(shift => (
                          <TimelineShift key={shift.id} shift={shift} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* WEEK GRID VIEW */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col">
            <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-3 border-r flex items-center gap-2">
                {activePanel === "properties" ? (
                  <>
                    <Home className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">Properties</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">Staff</span>
                  </>
                )}
              </div>
              {weekDays.map((day, idx) => {
                const isTodayDate = isToday(day);
                const unassignedCount = getUnassignedShifts(day).length;
                return (
                  <div 
                    key={idx} 
                    className={`p-2 border-r text-center transition-colors ${
                      isTodayDate ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <p className={`text-xs font-medium ${isTodayDate ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-bold ${isTodayDate ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </p>
                    {unassignedCount > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] mt-1">
                        {unassignedCount} open
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Unassigned Row */}
            <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-orange-50/50">
              <div className="p-2 border-r flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">Open Shifts</span>
              </div>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const unassigned = getUnassignedShifts(day);
                return (
                  <Droppable key={`unassigned_${dayStr}`} droppableId={`unassigned_${dayStr}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-1.5 min-h-[50px] border-r transition-colors ${
                          snapshot.isDraggingOver ? 'bg-orange-100' : ''
                        }`}
                      >
                        <div className="flex flex-wrap gap-1">
                          {unassigned.slice(0, 3).map((shift, sIdx) => (
                            <Draggable key={shift.id} draggableId={shift.id} index={sIdx}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? 'z-50' : ''}
                                >
                                  <ShiftPill shift={shift} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {unassigned.length > 3 && (
                            <Badge className="text-[10px] bg-orange-200 text-orange-700">
                              +{unassigned.length - 3}
                            </Badge>
                          )}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>

            {/* Staff Rows */}
            {(activePanel === "staff" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`}>
              {activeStaff.map((staffMember) => {
                const hoursStatus = getStaffHoursStatus(staffMember.id);
                
                return (
                  <div key={staffMember.id} className={`grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors ${
                    hoursStatus.status === 'full' ? 'bg-red-50/30' : ''
                  }`}>
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                        hoursStatus.status === 'full' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                        hoursStatus.status === 'near' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                        'bg-gradient-to-br from-indigo-400 to-purple-600'
                      }`}>
                        {staffMember.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{staffMember.full_name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-xs ${
                            hoursStatus.status === 'full' ? 'text-red-600 font-semibold' :
                            hoursStatus.status === 'near' ? 'text-amber-600 font-medium' :
                            hoursStatus.status === 'low' ? 'text-indigo-600' : 'text-gray-500'
                          }`}>
                            {hoursStatus.weekHours.toFixed(1)}h
                            {hoursStatus.contracted && ` / ${hoursStatus.contracted}h`}
                          </span>
                          {hoursStatus.contracted && (
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  hoursStatus.status === 'full' ? 'bg-red-500' :
                                  hoursStatus.status === 'near' ? 'bg-amber-500' :
                                  hoursStatus.status === 'low' ? 'bg-indigo-400' : 'bg-purple-500'
                                }`}
                                style={{ width: `${Math.min(hoursStatus.percentage || 0, 100)}%` }}
                              />
                            </div>
                          )}
                          {hoursStatus.status === 'full' && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] py-0 px-1">Full</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getStaffDayShifts(staffMember.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <Droppable key={`${staffMember.id}_${dayStr}`} droppableId={`${staffMember.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 min-h-[60px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-indigo-50/30' : ''
                              } ${snapshot.isDraggingOver ? 'bg-indigo-100/50 ring-2 ring-inset ring-indigo-300' : ''}`}
                            >
                              <div className="space-y-1 relative z-10">
                                {dayShifts.map((shift, sIdx) => (
                                  <Draggable key={shift.id} draggableId={shift.id} index={sIdx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={snapshot.isDragging ? 'z-50' : ''}
                                      >
                                        <ShiftPill shift={shift} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </div>
                              {provided.placeholder}
                              
                              {/* Add button - only show when no shifts */}
                              {dayShifts.length === 0 && (
                                <button
                                  onClick={() => onAddShift?.({ staff_id: staffMember.id, date: dayStr })}
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50/50"
                                >
                                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                                    <Plus className="w-4 h-4" />
                                  </div>
                                </button>
                              )}
                              {/* Small add button in corner when shifts exist */}
                              {dayShifts.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddShift?.({ staff_id: staffMember.id, date: dayStr });
                                  }}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            )}

            {/* Properties Rows */}
            {(activePanel === "properties" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`}>
              {activePanel === "both" && (
                <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-purple-50">
                  <div className="p-2 border-r flex items-center gap-2">
                    <Home className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Properties</span>
                  </div>
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="border-r" />
                  ))}
                </div>
              )}
              {activeProperties.map((property) => {
                return (
                  <div key={property.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                        <Home className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{property.property_name}</p>
                        <p className="text-xs text-gray-500 truncate">{property.address?.city || 'Location'}</p>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getPropertyDayShifts(property.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <div
                          key={dayStr}
                          className={`p-1 min-h-[60px] border-r transition-colors ${
                            isTodayDate ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            {dayShifts.map((shift) => (
                              <ShiftPill key={shift.id} shift={shift} showStaff={true} showProperty={false} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Legend */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">Shift Types:</span>
          {Object.entries(SHIFT_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              <span className="text-gray-600">{SHIFT_LABELS[type]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-4 h-3 border border-dashed border-orange-400 bg-orange-50 rounded" />
          <span>Unassigned</span>
        </div>
      </div>

      {/* Hours Override Dialog */}
      {showOverrideDialog && pendingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b bg-red-50 flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-lg">Hours Limit Exceeded</h3>
                <p className="text-red-700 text-sm">Override required to continue</p>
              </div>
              <button onClick={handleOverrideCancel} className="ml-auto text-red-400 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-semibold text-amber-900 mb-2">{pendingAssignment.staffName}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-amber-700">Current hours:</span>
                    <span className="font-bold text-amber-900 ml-1">{pendingAssignment.currentHours.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="text-amber-700">Contracted:</span>
                    <span className="font-bold text-amber-900 ml-1">{pendingAssignment.contractedHours}h</span>
                  </div>
                  <div>
                    <span className="text-amber-700">This shift:</span>
                    <span className="font-bold text-amber-900 ml-1">+{pendingAssignment.shiftDuration.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="text-amber-700">Projected:</span>
                    <span className="font-bold text-red-600 ml-1">{pendingAssignment.projectedHours.toFixed(1)}h</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="override-reason" className="text-sm font-medium text-gray-700 mb-2 block">
                  Override Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter reason for exceeding contracted hours (e.g., staff shortage, emergency cover, staff request for extra hours)..."
                  rows={3}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be recorded for audit and compliance purposes.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleOverrideCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOverrideConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={!overrideReason.trim()}
                >
                  Override & Assign
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}