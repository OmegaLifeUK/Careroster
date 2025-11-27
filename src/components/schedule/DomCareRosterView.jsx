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
  MapPin,
  Car,
  Maximize2,
  Navigation,
  AlertTriangle,
  X
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const VISIT_COLORS = {
  scheduled: { bg: "bg-sky-100", border: "border-sky-300", text: "text-sky-800", dot: "bg-sky-500" },
  in_progress: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  completed: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-600", dot: "bg-slate-400" },
  cancelled: { bg: "bg-red-100", border: "border-red-300", text: "text-red-800", dot: "bg-red-500" },
  missed: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-500" },
};

const TIMELINE_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export default function DomCareRosterView({
  visits = [],
  staff = [],
  clients = [],
  runs = [],
  staffAvailability = [],
  onVisitClick,
  onVisitUpdate,
  onAddVisit,
  locationName = "Domiciliary Care"
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

  const activeClients = useMemo(() => {
    return clients.filter(c => c && c.status === 'active')
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [clients]);

  // Helper to extract date string from datetime
  const getVisitDate = (visit) => {
    if (!visit) return null;
    if (visit.scheduled_date) return visit.scheduled_date;
    if (visit.scheduled_start) {
      try {
        const d = new Date(visit.scheduled_start);
        return format(d, 'yyyy-MM-dd');
      } catch { return null; }
    }
    return null;
  };

  // Helper to extract time string from datetime
  const getVisitTime = (visit, field) => {
    if (!visit || !visit[field]) return null;
    try {
      const d = new Date(visit[field]);
      return format(d, 'HH:mm');
    } catch { return null; }
  };

  const weeklyStats = useMemo(() => {
    const weekVisits = visits.filter(v => {
      const visitDateStr = getVisitDate(v);
      if (!visitDateStr) return false;
      try {
        const visitDate = parseISO(visitDateStr);
        return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const total = weekVisits.length;
    const completed = weekVisits.filter(v => v.status === 'completed').length;
    const unassigned = weekVisits.filter(v => !v.staff_id && !v.assigned_staff_id).length;
    const totalMileage = weekVisits.reduce((sum, v) => sum + (v.mileage || 0), 0);
    const totalMinutes = weekVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);

    return { total, completed, unassigned, totalMileage, totalHours: (totalMinutes / 60).toFixed(0) };
  }, [visits, currentWeekStart]);

  const getStaffDayVisits = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits
      .filter(v => {
        const visitDateStr = getVisitDate(v);
        const visitStaffId = v.staff_id || v.assigned_staff_id;
        return visitDateStr === dayStr && visitStaffId === staffId;
      })
      .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
  };

  const getClientDayVisits = (clientId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits
      .filter(v => {
        const visitDateStr = getVisitDate(v);
        return visitDateStr === dayStr && v.client_id === clientId;
      })
      .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
  };

  const getUnassignedVisits = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits.filter(v => {
      const visitDateStr = getVisitDate(v);
      return visitDateStr === dayStr && !v.staff_id && !v.assigned_staff_id;
    });
  };

  const getStaffWeekHours = (staffId) => {
    return visits
      .filter(v => {
        const visitDateStr = getVisitDate(v);
        const visitStaffId = v.staff_id || v.assigned_staff_id;
        if (!visitDateStr || visitStaffId !== staffId) return false;
        const visitDate = parseISO(visitDateStr);
        return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
      })
      .reduce((sum, v) => sum + ((v.duration_minutes || 0) / 60), 0);
  };

  const getStaffContractedHours = (staffId) => {
    const staffMember = staff.find(s => s?.id === staffId);
    // Check availability records for max hours
    const availability = staffAvailability?.find(a => a?.carer_id === staffId && a?.max_hours_per_week);
    if (availability?.max_hours_per_week) return availability.max_hours_per_week;
    // Check staff record for contracted hours
    if (staffMember?.max_hours_per_week) return staffMember.max_hours_per_week;
    // Fallback to defaults based on employment type or is_active
    return 40; // Default contracted hours
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

  const getTimeWidth = (start, duration) => {
    if (!start || !duration) return 8;
    return Math.max((duration / 60 / 18) * 100, 5);
  };

  // Check for conflicts before updating
  const checkForConflicts = (staffIdToCheck, dateToCheck, visitToMove) => {
    if (!staffIdToCheck || !dateToCheck || !visitToMove) return null;
    
    const conflictingVisits = visits.filter(v => {
      if (!v || v.staff_id !== staffIdToCheck || v.scheduled_date !== dateToCheck) return false;
      if (v.id === visitToMove.id) return false; // Skip the visit being moved
      
      const visitStart = v.scheduled_start || "00:00";
      const visitEnd = v.scheduled_end || "23:59";
      const moveStart = visitToMove.scheduled_start || "00:00";
      const moveEnd = visitToMove.scheduled_end || "23:59";
      
      // Extract time from datetime strings if needed
      const getTime = (str) => {
        if (!str) return "00:00";
        if (str.includes('T')) return str.split('T')[1]?.substring(0, 5) || "00:00";
        if (str.includes(' ')) return str.split(' ')[1]?.substring(0, 5) || str;
        return str;
      };
      
      const start1 = getTime(visitStart);
      const end1 = getTime(visitEnd);
      const start2 = getTime(moveStart);
      const end2 = getTime(moveEnd);
      
      return (
        (start2 >= start1 && start2 < end1) ||
        (end2 > start1 && end2 <= end1) ||
        (start2 <= start1 && end2 >= end1)
      );
    });
    
    return conflictingVisits.length > 0 ? conflictingVisits : null;
  };

  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const droppableId = destination.droppableId;
    
    const visit = visits.find(v => v.id === draggableId);
    if (!visit || !onVisitUpdate) return;

    // Parse the droppable ID to determine target
    // Format: "staffId_date" or "unassigned_date" or "client_clientId_date"
    const parts = droppableId.split('_');
    
    let newStaffId = null;
    let targetDate = null;
    let targetClientId = visit.client_id; // Keep existing client by default
    
    if (parts[0] === 'unassigned') {
      newStaffId = null;
      targetDate = parts[1];
    } else if (parts[0] === 'client') {
      // Dropped on a client row - keep staff, update client and date
      targetClientId = parts[1];
      targetDate = parts[2];
      newStaffId = visit.staff_id; // Keep existing staff
    } else {
      // Dropped on a staff row
      newStaffId = parts[0];
      targetDate = parts[1];
    }
    
    // Check for time conflicts if assigning to staff
    if (newStaffId && parts[0] !== 'client') {
      const conflicts = checkForConflicts(newStaffId, targetDate, visit);
      if (conflicts) {
        const staffName = activeStaff.find(s => s.id === newStaffId)?.full_name || 'This staff member';
        const proceed = window.confirm(
          `⚠️ Scheduling Conflict!\n\n${staffName} already has visit(s) at overlapping times on this date.\n\nThis will create overlapping visits. Continue?`
        );
        if (!proceed) return;
      }
      
      // Check for hours capacity
      const hoursStatus = getStaffHoursStatus(newStaffId);
      const visitDuration = (visit.duration_minutes || 60) / 60;
      const projectedHours = hoursStatus.weekHours + visitDuration;
      const projectedPercentage = hoursStatus.contracted ? (projectedHours / hoursStatus.contracted) * 100 : 0;
      
      if (hoursStatus.status === 'full' || projectedPercentage >= 100) {
        const staffName = activeStaff.find(s => s.id === newStaffId)?.full_name || 'This staff member';
        setPendingAssignment({
          visitId: draggableId,
          newStaffId,
          targetClientId,
          parts,
          staffName,
          currentHours: hoursStatus.weekHours,
          contractedHours: hoursStatus.contracted,
          projectedHours,
          visitDuration
        });
        setShowOverrideDialog(true);
        return;
      }
    }

    completeAssignment(draggableId, newStaffId, targetClientId, parts);
  };

  const completeAssignment = (visitId, newStaffId, targetClientId, parts, overrideInfo = null) => {
    const updates = {
      status: newStaffId ? 'published' : 'draft'
    };

    if (parts[0] !== 'client') {
      updates.assigned_staff_id = newStaffId;
      updates.staff_id = newStaffId;
    }
    if (parts[0] === 'client') {
      updates.client_id = targetClientId;
    }
    
    // Add override information if provided
    if (overrideInfo) {
      updates.hours_override_reason = overrideInfo.reason;
      updates.hours_override_by = overrideInfo.overriddenBy;
      updates.hours_override_date = new Date().toISOString();
    }

    onVisitUpdate(visitId, updates);
    
    if (parts[0] === 'client') {
      const clientName = activeClients.find(c => c.id === targetClientId)?.full_name;
      toast.success("Visit Updated", `Moved to ${clientName}`);
    } else {
      toast.success("Visit Updated", newStaffId 
        ? `Assigned to ${activeStaff.find(s => s.id === newStaffId)?.full_name}`
        : "Moved to unassigned"
      );
    }
  };

  const handleOverrideConfirm = () => {
    if (!overrideReason.trim()) {
      toast.error("Override Reason Required", "Please enter a reason for exceeding contracted hours");
      return;
    }
    
    if (pendingAssignment) {
      completeAssignment(
        pendingAssignment.visitId,
        pendingAssignment.newStaffId,
        pendingAssignment.targetClientId,
        pendingAssignment.parts,
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
  const getStaffName = (staffId) => staff.find(s => s?.id === staffId)?.full_name || 'Unassigned';

  const VisitPill = ({ visit, showStaff = false, showClient = true }) => {
    const colors = VISIT_COLORS[visit.status] || VISIT_COLORS.scheduled;
    const visitStaffId = visit.staff_id || visit.assigned_staff_id;
    const label = showClient 
      ? getClientName(visit.client_id)
      : (showStaff ? getStaffName(visitStaffId) : '');
    
    const startTime = getVisitTime(visit, 'scheduled_start') || visit.scheduled_start;

    return (
      <div
        onClick={() => onVisitClick?.(visit)}
        className={`
          px-2 py-1 rounded-md text-xs cursor-pointer transition-all
          ${colors.bg} ${colors.border} ${colors.text} border
          hover:shadow-md hover:scale-[1.02]
          ${!visitStaffId ? 'border-dashed border-orange-400 bg-orange-50' : ''}
        `}
      >
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className="font-medium truncate">{label || 'Visit'}</span>
        </div>
        <div className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
          <span>{startTime}</span>
          {visit.duration_minutes && <span>• {visit.duration_minutes}m</span>}
        </div>
      </div>
    );
  };

  const TimelineVisit = ({ visit }) => {
    const colors = VISIT_COLORS[visit.status] || VISIT_COLORS.scheduled;
    const startTime = getVisitTime(visit, 'scheduled_start') || visit.scheduled_start;
    const left = getTimePosition(startTime);
    const width = getTimeWidth(startTime, visit.duration_minutes);
    const visitStaffId = visit.staff_id || visit.assigned_staff_id;

    return (
      <div
        onClick={() => onVisitClick?.(visit)}
        className={`
          absolute top-1 bottom-1 rounded cursor-pointer transition-all
          ${colors.bg} ${colors.border} border
          hover:shadow-lg hover:z-10
          ${!visitStaffId ? 'border-dashed border-orange-400 bg-orange-50/80' : ''}
        `}
        style={{ left: `${left}%`, width: `${width}%`, minWidth: '40px' }}
      >
        <div className="px-1.5 py-0.5 text-[10px] truncate">
          <span className={`font-semibold ${colors.text}`}>
            {getClientName(visit.client_id)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">{locationName}</h2>
              <p className="text-teal-100 text-sm">Visit Schedule</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.total}</p>
                <p className="text-teal-200 text-xs">Total Visits</p>
              </div>
              <div className="w-px h-8 bg-teal-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-300">{weeklyStats.completed}</p>
                <p className="text-teal-200 text-xs">Completed</p>
              </div>
              <div className="w-px h-8 bg-teal-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-300">{weeklyStats.unassigned}</p>
                <p className="text-teal-200 text-xs">Open</p>
              </div>
              <div className="w-px h-8 bg-teal-400" />
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.totalMileage}</p>
                <p className="text-teal-200 text-xs">Miles</p>
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
                viewMode === "day" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === "week" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
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
                activePanel === "staff" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="w-3 h-3" />
              Staff
            </button>
            <button
              onClick={() => setActivePanel("clients")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "clients" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <User className="w-3 h-3" />
              Clients
            </button>
            <button
              onClick={() => setActivePanel("both")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "both" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
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
              <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border-b">
                <Users className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-teal-900">Staff</span>
                <Badge className="bg-teal-100 text-teal-700 text-xs">{activeStaff.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeStaff.map(staffMember => {
                  const dayVisits = getStaffDayVisits(staffMember.id, selectedDate);
                  const hoursStatus = getStaffHoursStatus(staffMember.id);
                  
                  return (
                    <div key={staffMember.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                          hoursStatus.status === 'full' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                          hoursStatus.status === 'near' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                          'bg-gradient-to-br from-teal-400 to-emerald-600'
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
                        {dayVisits.map(visit => (
                          <TimelineVisit key={visit.id} visit={visit} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activePanel === "clients" || activePanel === "both") && activeClients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b">
                <User className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900">Service Users</span>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">{activeClients.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeClients.map(client => {
                  const dayVisits = getClientDayVisits(client.id, selectedDate);
                  
                  return (
                    <div key={client.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {client.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{client.full_name}</p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.address?.postcode || 'Location'}
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {dayVisits.map(visit => (
                          <TimelineVisit key={visit.id} visit={visit} />
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
        <DragDropContext 
          onDragEnd={handleDragEnd}
          autoScrollerOptions={{
            startFromPercentage: 0.2,
            maxScrollAtPercentage: 0.9,
            maxPixelScroll: 15,
            ease: (percentage) => Math.pow(percentage, 2),
            durationDampening: {
              damping: 20,
              accelerateAt: 2000
            },
            disabled: false
          }}
        >
          <div className="flex flex-col" style={{ overscrollBehavior: 'contain' }}>
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
                const unassignedCount = getUnassignedVisits(day).length;
                return (
                  <div 
                    key={idx} 
                    className={`p-2 border-r text-center transition-colors ${
                      isTodayDate ? 'bg-teal-50' : ''
                    }`}
                  >
                    <p className={`text-xs font-medium ${isTodayDate ? 'text-teal-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-bold ${isTodayDate ? 'text-teal-700' : 'text-gray-900'}`}>
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
                <span className="text-sm font-medium text-orange-700">Open Visits</span>
              </div>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const unassigned = getUnassignedVisits(day);
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
                          {unassigned.slice(0, 3).map((visit, vIdx) => (
                            <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? 'z-50' : ''}
                                >
                                  <VisitPill visit={visit} />
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
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`} style={{ overscrollBehavior: 'contain' }}>
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
                        'bg-gradient-to-br from-teal-400 to-emerald-600'
                      }`}>
                        {staffMember.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{staffMember.full_name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-xs ${
                            hoursStatus.status === 'full' ? 'text-red-600 font-semibold' :
                            hoursStatus.status === 'near' ? 'text-amber-600 font-medium' :
                            hoursStatus.status === 'low' ? 'text-teal-600' : 'text-gray-500'
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
                                  hoursStatus.status === 'low' ? 'bg-teal-400' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(hoursStatus.percentage || 0, 100)}%` }}
                              />
                            </div>
                          )}
                          {staffMember.vehicle_type && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1">
                              <Car className="w-3 h-3 mr-0.5" />
                              {staffMember.vehicle_type}
                            </Badge>
                          )}
                          {hoursStatus.status === 'full' && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] py-0 px-1">Full</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayVisits = getStaffDayVisits(staffMember.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <Droppable key={`${staffMember.id}_${dayStr}`} droppableId={`${staffMember.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 min-h-[60px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-teal-50/30' : ''
                              } ${snapshot.isDraggingOver ? 'bg-teal-100/50 ring-2 ring-inset ring-teal-300' : ''}`}
                            >
                              <div className="space-y-1 relative z-10">
                                    {dayVisits.map((visit, vIdx) => (
                                      <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={snapshot.isDragging ? 'z-50' : ''}
                                          >
                                            <VisitPill visit={visit} />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                  </div>
                                  {provided.placeholder}

                                  {/* Add button - only show when no visits */}
                                  {dayVisits.length === 0 && (
                                    <button
                                      onClick={() => onAddVisit?.({ staff_id: staffMember.id, scheduled_date: dayStr })}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-teal-50/50"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-sm">
                                        <Plus className="w-4 h-4" />
                                      </div>
                                    </button>
                                  )}
                                  {/* Small add button in corner when visits exist */}
                                  {dayVisits.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAddVisit?.({ staff_id: staffMember.id, scheduled_date: dayStr });
                                      }}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
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

            {/* Clients Rows */}
            {(activePanel === "clients" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`} style={{ overscrollBehavior: 'contain' }}>
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
                        <p className="text-xs text-gray-500 truncate">{client.address?.postcode || 'Location'}</p>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayVisits = getClientDayVisits(client.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <Droppable key={`client_${client.id}_${dayStr}`} droppableId={`client_${client.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 min-h-[60px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-teal-50/30' : ''
                              } ${snapshot.isDraggingOver ? 'bg-emerald-100/50 ring-2 ring-inset ring-emerald-300' : ''}`}
                            >
                              <div className="space-y-1 relative z-10">
                                    {dayVisits.map((visit, vIdx) => (
                                      <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={snapshot.isDragging ? 'z-50' : ''}
                                          >
                                            <VisitPill visit={visit} showStaff={true} showClient={false} />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                  </div>
                                  {provided.placeholder}

                                  {/* Add button - only show when no visits */}
                                  {dayVisits.length === 0 && (
                                    <button
                                      onClick={() => onAddVisit?.({ client_id: client.id, scheduled_date: dayStr })}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50/50"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                        <Plus className="w-4 h-4" />
                                      </div>
                                    </button>
                                  )}
                                  {/* Small add button in corner when visits exist */}
                                  {dayVisits.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAddVisit?.({ client_id: client.id, scheduled_date: dayStr });
                                      }}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
          </div>
        </DragDropContext>
      )}

      {/* Legend */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">Status:</span>
          {Object.entries(VISIT_COLORS).slice(0, 4).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              <span className="capitalize text-gray-600">{status.replace('_', ' ')}</span>
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
                    <span className="text-amber-700">This visit:</span>
                    <span className="font-bold text-amber-900 ml-1">+{pendingAssignment.visitDuration.toFixed(1)}h</span>
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