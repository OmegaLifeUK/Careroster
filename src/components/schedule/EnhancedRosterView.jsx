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
  User,
  Home,
  MapPin,
  Maximize2,
  Building,
  AlertTriangle,
  X
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SHIFT_COLORS = {
  morning: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  afternoon: { bg: "bg-sky-100", border: "border-sky-300", text: "text-sky-800", dot: "bg-sky-500" },
  evening: { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  night: { bg: "bg-slate-200", border: "border-slate-400", text: "text-slate-800", dot: "bg-slate-600" },
  sleep_in: { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800", dot: "bg-indigo-500" },
  waking_night: { bg: "bg-slate-300", border: "border-slate-500", text: "text-slate-900", dot: "bg-slate-700" },
  supervision: { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800", dot: "bg-teal-500" },
  shadowing: { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
};

const TIMELINE_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export default function EnhancedRosterView({
  shifts = [],
  carers = [],
  clients = [],
  properties = [],
  carerAvailability = [],
  onShiftClick,
  onShiftUpdate,
  onAddShift,
  onShiftDelete,
  locationName = "Care Home"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activePanel, setActivePanel] = useState("staff"); // "staff" | "clients" | "locations" | "both"
  const { toast } = useToast();

  // Location-based view data
  const locationShifts = useMemo(() => {
    const locations = new Map();
    shifts.forEach(s => {
      if (s?.location_name) {
        if (!locations.has(s.location_name)) {
          locations.set(s.location_name, { name: s.location_name, address: s.location_address });
        }
      }
    });
    // Add default locations
    ['Main Building', 'East Wing', 'West Wing', 'Day Centre', 'Nursing Unit'].forEach(name => {
      if (!locations.has(name)) {
        locations.set(name, { name, address: '' });
      }
    });
    return Array.from(locations.values());
  }, [shifts]);

  const getLocationDayShifts = (locationName, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.location_name === locationName)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const activeCarers = useMemo(() => {
    let filtered = carers.filter(c => c && c.status === 'active');
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [carers, searchQuery]);

  const activeClients = useMemo(() => {
    return clients.filter(c => c && c.status === 'active')
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [clients]);

  const weeklyStats = useMemo(() => {
    const weekShifts = shifts.filter(s => {
      if (!s?.date) return false;
      const shiftDate = parseISO(s.date);
      return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
    });
    const filled = weekShifts.filter(s => s.carer_id).length;
    const unfilled = weekShifts.filter(s => !s.carer_id).length;
    const totalHours = weekShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
    
    return { total: weekShifts.length, filled, unfilled, totalHours };
  }, [shifts, currentWeekStart]);

  const getCarerDayShifts = (carerId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.carer_id === carerId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getClientDayShifts = (clientId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.client_id === clientId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getUnassignedShifts = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts.filter(s => s?.date === dayStr && !s.carer_id);
  };

  const getCarerWeekHours = (carerId) => {
    return shifts
      .filter(s => {
        if (!s?.date || s.carer_id !== carerId) return false;
        const shiftDate = parseISO(s.date);
        return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
      })
      .reduce((sum, s) => sum + (s.duration_hours || 0), 0);
  };

  const getCarerContractedHours = (carerId) => {
    const carer = carers.find(c => c?.id === carerId);
    // Check availability records for max hours
    const availability = carerAvailability.find(a => a?.carer_id === carerId && a?.max_hours_per_week);
    if (availability?.max_hours_per_week) return availability.max_hours_per_week;
    // Fallback to employment type defaults
    if (carer?.employment_type === 'full_time') return 40;
    if (carer?.employment_type === 'part_time') return 20;
    return null;
  };

  const getCarerHoursStatus = (carerId) => {
    const weekHours = getCarerWeekHours(carerId);
    const contracted = getCarerContractedHours(carerId);
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
    if (!start || !end) return 0;
    const startPos = getTimePosition(start);
    const endPos = getTimePosition(end);
    return Math.max(endPos - startPos, 5);
  };

  // Check for conflicts before updating
  const checkForConflicts = (carerIdToCheck, dateToCheck, shiftToMove) => {
    if (!carerIdToCheck || !dateToCheck || !shiftToMove) return null;
    
    const conflictingShifts = shifts.filter(s => {
      if (!s || s.carer_id !== carerIdToCheck || s.date !== dateToCheck) return false;
      if (s.id === shiftToMove.id) return false; // Skip the shift being moved
      
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedShifts, setSelectedShifts] = useState([]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const [targetCarerId, targetDate] = destination.droppableId.split('_');
    
    const shift = shifts.find(s => s.id === draggableId);
    if (!shift || !onShiftUpdate) return;

    const newCarerId = targetCarerId === 'unassigned' ? null : targetCarerId;
    
    // Check for time conflicts if assigning to a carer
    if (newCarerId) {
      const conflicts = checkForConflicts(newCarerId, targetDate, shift);
      if (conflicts) {
        const carerName = activeCarers.find(c => c.id === newCarerId)?.full_name || 'This carer';
        const conflictTimes = conflicts.map(c => `${c.start_time}-${c.end_time}`).join(', ');
        const proceed = window.confirm(
          `⚠️ Scheduling Conflict!\n\n${carerName} already has shift(s) at ${conflictTimes} on this date.\n\nThis will create overlapping shifts. Continue?`
        );
        if (!proceed) return;
      }
      
      // Check for hours capacity
      const hoursStatus = getCarerHoursStatus(newCarerId);
      const shiftDuration = shift.duration_hours || 0;
      const projectedHours = hoursStatus.weekHours + shiftDuration;
      const projectedPercentage = hoursStatus.contracted ? (projectedHours / hoursStatus.contracted) * 100 : 0;
      
      if (hoursStatus.status === 'full' || projectedPercentage >= 100) {
        const carerName = activeCarers.find(c => c.id === newCarerId)?.full_name || 'This carer';
        setPendingAssignment({
          shiftId: draggableId,
          newCarerId,
          targetDate,
          carerName,
          currentHours: hoursStatus.weekHours,
          contractedHours: hoursStatus.contracted,
          projectedHours,
          shiftDuration
        });
        setShowOverrideDialog(true);
        return;
      }
    }
    
    completeAssignment(draggableId, newCarerId, targetDate);
  };

  const completeAssignment = (shiftId, newCarerId, targetDate, overrideInfo = null) => {
    const updateData = { 
      carer_id: newCarerId,
      date: targetDate,
      status: newCarerId ? 'scheduled' : 'unfilled'
    };
    
    if (overrideInfo) {
      updateData.hours_override_reason = overrideInfo.reason;
      updateData.hours_override_by = overrideInfo.overriddenBy;
      updateData.hours_override_date = new Date().toISOString();
    }
    
    onShiftUpdate(shiftId, updateData);
    
    toast.success("Shift Updated", newCarerId 
      ? `Assigned to ${activeCarers.find(c => c.id === newCarerId)?.full_name}`
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
        pendingAssignment.newCarerId,
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

  const getClientName = (clientId) => clients.find(c => c?.id === clientId)?.full_name || '';
  const getCarerName = (carerId) => carers.find(c => c?.id === carerId)?.full_name || 'Unassigned';

  const toggleShiftSelection = (shiftId) => {
    setSelectedShifts(prev => 
      prev.includes(shiftId) 
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const handleBulkUnassign = () => {
    if (selectedShifts.length === 0) return;
    if (!confirm(`Unassign ${selectedShifts.length} selected shift(s)?`)) return;
    
    selectedShifts.forEach(shiftId => {
      onShiftUpdate?.(shiftId, { carer_id: null, status: 'unfilled' });
    });
    
    setSelectedShifts([]);
    setBulkMode(false);
    toast.success("Bulk Update", `Unassigned ${selectedShifts.length} shifts`);
  };

  const handleBulkCancel = () => {
    if (selectedShifts.length === 0) return;
    if (!confirm(`Cancel ${selectedShifts.length} selected shift(s)? This cannot be undone.`)) return;
    
    selectedShifts.forEach(shiftId => {
      onShiftUpdate?.(shiftId, { status: 'cancelled' });
    });
    
    setSelectedShifts([]);
    setBulkMode(false);
    toast.success("Bulk Update", `Cancelled ${selectedShifts.length} shifts`);
  };

  const ShiftPill = ({ shift, showCarer = false, showClient = true }) => {
    const colors = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning;
    const label = showClient 
      ? (shift.location_name || getClientName(shift.client_id) || 'Shift')
      : (showCarer ? getCarerName(shift.carer_id) : shift.shift_type);
    const isSelected = selectedShifts.includes(shift.id);

    return (
      <div
        onClick={(e) => {
          if (bulkMode) {
            e.stopPropagation();
            toggleShiftSelection(shift.id);
          } else {
            onShiftClick?.(shift);
          }
        }}
        className={`
          px-2 py-1 rounded-md text-xs cursor-pointer transition-all relative group/shift
          ${colors.bg} ${colors.border} ${colors.text} border
          hover:shadow-md hover:scale-[1.02]
          ${!shift.carer_id ? 'border-dashed border-orange-400 bg-orange-50' : ''}
          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        `}
      >
        {bulkMode && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center z-10">
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
        {!bulkMode && onShiftDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this shift?')) {
                onShiftDelete(shift.id);
              }
            }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center z-10 opacity-0 group-hover/shift:opacity-100 transition-opacity shadow-sm"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className="font-medium truncate">{label}</span>
        </div>
        <div className="text-[10px] opacity-75 mt-0.5">
          {shift.start_time} - {shift.end_time}
        </div>
      </div>
    );
  };

  const TimelineShift = ({ shift, showLabel = true }) => {
    const colors = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning;
    const left = getTimePosition(shift.start_time);
    const width = getTimeWidth(shift.start_time, shift.end_time);

    return (
      <div
        onClick={() => onShiftClick?.(shift)}
        className={`
          absolute top-1 bottom-1 rounded cursor-pointer transition-all
          ${colors.bg} ${colors.border} border
          hover:shadow-lg hover:z-10
          ${!shift.carer_id ? 'border-dashed border-orange-400 bg-orange-50/80' : ''}
        `}
        style={{ left: `${left}%`, width: `${width}%`, minWidth: '40px' }}
      >
        {showLabel && (
          <div className="px-1.5 py-0.5 text-[10px] truncate">
            <span className={`font-semibold ${colors.text}`}>
              {shift.location_name || getClientName(shift.client_id) || getCarerName(shift.carer_id)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">{locationName}</h2>
              <p className="text-blue-100 text-sm">Shift Roster</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.total}</p>
                <p className="text-blue-200 text-xs">Total Shifts</p>
              </div>
              <div className="w-px h-8 bg-blue-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-300">{weeklyStats.filled}</p>
                <p className="text-blue-200 text-xs">Filled</p>
              </div>
              <div className="w-px h-8 bg-blue-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-300">{weeklyStats.unfilled}</p>
                <p className="text-blue-200 text-xs">Open</p>
              </div>
              <div className="w-px h-8 bg-blue-400" />
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.totalHours.toFixed(0)}h</p>
                <p className="text-blue-200 text-xs">Hours</p>
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
                viewMode === "day" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === "week" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
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
          {bulkMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedShifts.length} selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBulkUnassign}
                disabled={selectedShifts.length === 0}
              >
                Unassign
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBulkCancel}
                disabled={selectedShifts.length === 0}
                className="text-red-600 hover:text-red-700"
              >
                Cancel Shifts
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  setBulkMode(false);
                  setSelectedShifts([]);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          {!bulkMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkMode(true)}
              className="h-8"
            >
              Bulk Actions
            </Button>
          )}
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
                activePanel === "staff" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="w-3 h-3" />
              Staff
            </button>
            <button
              onClick={() => setActivePanel("locations")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "locations" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <MapPin className="w-3 h-3" />
              Locations
            </button>
            <button
              onClick={() => setActivePanel("clients")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "clients" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <User className="w-3 h-3" />
              Clients
            </button>
            <button
              onClick={() => setActivePanel("both")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "both" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
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
          {/* Timeline Header */}
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

          {/* Staff Section - Day View */}
          {(activePanel === "staff" || activePanel === "both") && activeCarers.length > 0 && (
            <div className={activePanel === "both" ? "border-b" : ""}>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Staff</span>
                <Badge className="bg-blue-100 text-blue-700 text-xs">{activeCarers.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeCarers.map(carer => {
                  const dayShifts = getCarerDayShifts(carer.id, selectedDate);
                  const hoursStatus = getCarerHoursStatus(carer.id);
                  
                  return (
                    <div key={carer.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {carer.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{carer.full_name}</p>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className={`text-xs ${
                              hoursStatus.status === 'full' ? 'text-red-600 font-medium' :
                              hoursStatus.status === 'near' ? 'text-amber-600' :
                              hoursStatus.status === 'low' ? 'text-blue-600' : 'text-gray-500'
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
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {/* Shifts */}
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

          {/* Locations Section - Day View */}
          {(activePanel === "locations") && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border-b">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-purple-900">Locations</span>
                <Badge className="bg-purple-100 text-purple-700 text-xs">{locationShifts.length}</Badge>
              </div>
              <div className="overflow-y-auto max-h-[500px]">
                {locationShifts.map(location => {
                  const dayShifts = getLocationDayShifts(location.name, selectedDate);
                  
                  return (
                    <div key={location.name} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                          <Building className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{location.name}</p>
                          <p className="text-xs text-gray-500">{dayShifts.length} shifts today</p>
                        </div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {dayShifts.map(shift => (
                          <TimelineShift key={shift.id} shift={shift} showLabel={true} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clients Section - Day View */}
          {(activePanel === "clients" || activePanel === "both") && activeClients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b">
                <User className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900">Service Users</span>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">{activeClients.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeClients.map(client => {
                  const dayShifts = getClientDayShifts(client.id, selectedDate);
                  
                  return (
                    <div key={client.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {client.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{client.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{client.address?.city || 'Location'}</p>
                        </div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {dayShifts.map(shift => (
                          <TimelineShift key={shift.id} shift={shift} showLabel={true} />
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
            {/* Week Header */}
            <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-3 border-r flex items-center gap-2">
                {activePanel === "clients" ? (
                  <>
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">Service Users</span>
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
                      isTodayDate ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className={`text-xs font-medium ${isTodayDate ? 'text-blue-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-bold ${isTodayDate ? 'text-blue-700' : 'text-gray-900'}`}>
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

            {/* Staff Rows - Week View */}
            {(activePanel === "staff" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`}>
              {activeCarers.map((carer) => {
                const hoursStatus = getCarerHoursStatus(carer.id);
                
                return (
                  <div key={carer.id} className={`grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors ${
                    hoursStatus.status === 'full' ? 'bg-red-50/30' : ''
                  }`}>
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                        hoursStatus.status === 'full' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                        hoursStatus.status === 'near' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                        'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}>
                        {carer.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{carer.full_name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-xs ${
                            hoursStatus.status === 'full' ? 'text-red-600 font-semibold' :
                            hoursStatus.status === 'near' ? 'text-amber-600 font-medium' :
                            hoursStatus.status === 'low' ? 'text-blue-600' : 'text-gray-500'
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
                                  hoursStatus.status === 'low' ? 'bg-blue-400' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(hoursStatus.percentage || 0, 100)}%` }}
                              />
                            </div>
                          )}
                          {carer.employment_type && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1">
                              {carer.employment_type === 'full_time' ? 'FT' : 
                               carer.employment_type === 'part_time' ? 'PT' : 
                               carer.employment_type === 'bank' ? 'Bank' : 'Contract'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getCarerDayShifts(carer.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <Droppable key={`${carer.id}_${dayStr}`} droppableId={`${carer.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 min-h-[60px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-blue-50/30' : ''
                              } ${snapshot.isDraggingOver ? 'bg-blue-100/50 ring-2 ring-inset ring-blue-300' : ''}`}
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
                                      onClick={() => onAddShift?.({ carer_id: carer.id, date: dayStr })}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50/50"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                                        <Plus className="w-4 h-4" />
                                      </div>
                                    </button>
                                  )}
                                  {/* Small add button in corner when shifts exist */}
                                  {dayShifts.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAddShift?.({ carer_id: carer.id, date: dayStr });
                                      }}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
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

            {/* Locations Rows - Week View */}
            {(activePanel === "locations") && (
            <div className="overflow-y-auto max-h-[500px]">
              {locationShifts.map((location) => {
                return (
                  <div key={location.name} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{location.name}</p>
                        {location.address && (
                          <p className="text-xs text-gray-500 truncate">{location.address}</p>
                        )}
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getLocationDayShifts(location.name, day);
                      const isTodayDate = isToday(day);

                      return (
                        <div
                          key={dayStr}
                          className={`p-1 min-h-[60px] border-r transition-colors relative group ${
                            isTodayDate ? 'bg-purple-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            {dayShifts.map((shift) => (
                              <ShiftPill key={shift.id} shift={shift} showCarer={true} showClient={false} />
                            ))}
                          </div>
                          
                          <button
                            onClick={() => onAddShift?.({ location_name: location.name, date: dayStr, assignment_type: 'location' })}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-purple-50/50"
                          >
                            <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-sm">
                              <Plus className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            )}

            {/* Clients Rows - Week View */}
            {(activePanel === "clients" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`}>
              {activePanel === "both" && (
                <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-emerald-50">
                  <div className="p-2 border-r flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Service Users</span>
                  </div>
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="border-r" />
                  ))}
                </div>
              )}
              {activeClients.map((client) => {
                return (
                  <div key={client.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {client.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{client.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{client.address?.city || 'Location'}</p>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getClientDayShifts(client.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <div
                          key={dayStr}
                          className={`p-1 min-h-[60px] border-r transition-colors relative group ${
                            isTodayDate ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            {dayShifts.map((shift) => (
                              <ShiftPill key={shift.id} shift={shift} showCarer={true} showClient={false} />
                            ))}
                          </div>
                          
                          <button
                            onClick={() => onAddShift?.({ client_id: client.id, date: dayStr, assignment_type: 'client' })}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50/50"
                          >
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                              <Plus className="w-4 h-4" />
                            </div>
                          </button>
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
          {Object.entries(SHIFT_COLORS).slice(0, 5).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              <span className="capitalize text-gray-600">{type.replace('_', ' ')}</span>
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
                <p className="font-semibold text-amber-900 mb-2">{pendingAssignment.carerName}</p>
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