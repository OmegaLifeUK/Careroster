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
  X,
  Mail,
  Phone,
  CheckCircle,
  MessageSquare,
  FileText,
  Send,
  MoreVertical,
  Copy,
  Filter,
  Sparkles
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { TravelTimeBadge, calculateTravelTime } from "./TravelTimeCalculator";
import { WorkingTimeComplianceIndicator, WTRStatusBadge, checkWorkingTimeCompliance } from "./WorkingTimeRegulations";
import RouteOptimizer from "./RouteOptimizer";

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
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [resourceMode, setResourceMode] = useState("resources");
  const [viewByMode, setViewByMode] = useState("staff");
  const [viewPlanMode, setViewPlanMode] = useState("planned");
  const [durationMode, setDurationMode] = useState("1day");
  const [branchFilter, setBranchFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [optimizingRoutes, setOptimizingRoutes] = useState(false);
  const [optimizedRoutes, setOptimizedRoutes] = useState({});
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
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
    const totalHours = weekVisits.reduce((sum, v) => {
      if (v.duration_minutes) {
        return sum + (v.duration_minutes / 60);
      }
      if (v.scheduled_start && v.scheduled_end) {
        try {
          const start = new Date(v.scheduled_start);
          const end = new Date(v.scheduled_end);
          const durationMs = end - start;
          return sum + (durationMs / (1000 * 60 * 60));
        } catch {
          return sum;
        }
      }
      return sum;
    }, 0);

    return { total, completed, unassigned, totalMileage, totalHours: totalHours.toFixed(1) };
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
        try {
          const visitDate = parseISO(visitDateStr);
          return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
        } catch {
          return false;
        }
      })
      .reduce((sum, v) => {
        // Calculate duration from start/end times if duration_minutes not available
        if (v.duration_minutes) {
          return sum + (v.duration_minutes / 60);
        }
        if (v.scheduled_start && v.scheduled_end) {
          try {
            const start = new Date(v.scheduled_start);
            const end = new Date(v.scheduled_end);
            const durationMs = end - start;
            const hours = durationMs / (1000 * 60 * 60);
            return sum + hours;
          } catch {
            return sum;
          }
        }
        return sum;
      }, 0);
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
    const staffMember = staff.find(s => s?.id === staffId);
    const wtrCompliance = checkWorkingTimeCompliance(staffMember || {}, visits.filter(v => 
      (v.staff_id === staffId || v.assigned_staff_id === staffId) &&
      getVisitDate(v) >= format(currentWeekStart, 'yyyy-MM-dd') &&
      getVisitDate(v) < format(addDays(currentWeekStart, 7), 'yyyy-MM-dd')
    ));
    
    if (!contracted) return { status: 'unknown', weekHours, contracted: null, wtrCompliance };
    const percentage = (weekHours / contracted) * 100;
    if (percentage >= 100) return { status: 'full', weekHours, contracted, percentage, wtrCompliance };
    if (percentage >= 80) return { status: 'near', weekHours, contracted, percentage, wtrCompliance };
    if (percentage < 50) return { status: 'low', weekHours, contracted, percentage, wtrCompliance };
    return { status: 'ok', weekHours, contracted, percentage, wtrCompliance };
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
  const checkForConflicts = (staffIdToCheck, dateToCheck, visitToMove, clientIdToCheck = null) => {
    if (!staffIdToCheck || !dateToCheck || !visitToMove) return null;
    
    const conflictingVisits = visits.filter(v => {
      if (!v || v.id === visitToMove.id) return false;
      
      const visitDateStr = getVisitDate(v);
      if (visitDateStr !== dateToCheck) return false;
      
      const visitStaffId = v.staff_id || v.assigned_staff_id;
      
      // Check staff conflicts
      if (visitStaffId === staffIdToCheck) {
        const visitStart = getVisitTime(v, 'scheduled_start') || "00:00";
        const visitEnd = getVisitTime(v, 'scheduled_end') || "23:59";
        const moveStart = getVisitTime(visitToMove, 'scheduled_start') || "00:00";
        const moveEnd = getVisitTime(visitToMove, 'scheduled_end') || "23:59";
        
        // Check for time overlap
        return (
          (moveStart >= visitStart && moveStart < visitEnd) ||
          (moveEnd > visitStart && moveEnd <= visitEnd) ||
          (moveStart <= visitStart && moveEnd >= visitEnd)
        );
      }
      
      // Check client conflicts - same client can't have overlapping visits
      if (clientIdToCheck && v.client_id === clientIdToCheck) {
        const visitStart = getVisitTime(v, 'scheduled_start') || "00:00";
        const visitEnd = getVisitTime(v, 'scheduled_end') || "23:59";
        const moveStart = getVisitTime(visitToMove, 'scheduled_start') || "00:00";
        const moveEnd = getVisitTime(visitToMove, 'scheduled_end') || "23:59";
        
        // Check for exact time match or overlap
        return (
          (moveStart >= visitStart && moveStart < visitEnd) ||
          (moveEnd > visitStart && moveEnd <= visitEnd) ||
          (moveStart <= visitStart && moveEnd >= visitEnd) ||
          (moveStart === visitStart && moveEnd === visitEnd)
        );
      }
      
      return false;
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
    
    // Check for conflicts
    const conflicts = checkForConflicts(newStaffId, targetDate, visit, targetClientId);
    if (conflicts) {
      const conflictMessages = [];
      conflicts.forEach(c => {
        const conflictStaffId = c.staff_id || c.assigned_staff_id;
        if (conflictStaffId === newStaffId) {
          const staffName = activeStaff.find(s => s.id === newStaffId)?.full_name || 'Staff member';
          const timeStart = getVisitTime(c, 'scheduled_start');
          conflictMessages.push(`${staffName} is already scheduled at ${timeStart}`);
        }
        if (c.client_id === targetClientId) {
          const clientName = activeClients.find(cl => cl.id === targetClientId)?.full_name || 'Client';
          const timeStart = getVisitTime(c, 'scheduled_start');
          const conflictStaff = activeStaff.find(s => s.id === (c.staff_id || c.assigned_staff_id))?.full_name || 'another carer';
          conflictMessages.push(`${clientName} already has a visit at ${timeStart} with ${conflictStaff}`);
        }
      });
      
      toast.error("Scheduling Conflict", conflictMessages.join('\n'));
      return;
    }
    
    // Check for hours capacity if assigning to staff
    if (newStaffId && parts[0] !== 'client') {
      
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

  // AI Route Optimization
  const optimizeStaffRoutes = async (staffId = null, date = null) => {
    setOptimizingRoutes(true);
    const targetDate = date || (viewMode === "day" ? selectedDate : null);
    const targetStaff = staffId ? [staffId] : activeStaff.map(s => s.id);
    
    const optimizations = {};
    
    for (const sId of targetStaff) {
      const staffMember = staff.find(s => s.id === sId);
      if (!staffMember?.address) continue;
      
      let staffVisits;
      if (targetDate) {
        staffVisits = getStaffDayVisits(sId, targetDate);
      } else {
        // Optimize for entire week
        staffVisits = visits.filter(v => {
          const visitStaffId = v.staff_id || v.assigned_staff_id;
          const visitDateStr = getVisitDate(v);
          if (!visitDateStr || visitStaffId !== sId) return false;
          try {
            const visitDate = parseISO(visitDateStr);
            return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
          } catch {
            return false;
          }
        });
      }
      
      if (staffVisits.length < 2) continue;
      
      // Group by date if optimizing week
      const visitsByDate = {};
      staffVisits.forEach(v => {
        const dateKey = getVisitDate(v);
        if (!visitsByDate[dateKey]) visitsByDate[dateKey] = [];
        visitsByDate[dateKey].push(v);
      });
      
      // Optimize each day
      Object.entries(visitsByDate).forEach(([dateKey, dayVisits]) => {
        if (dayVisits.length < 2) return;
        
        // Calculate optimal route using nearest neighbor algorithm
        const optimized = [];
        const remaining = [...dayVisits];
        let currentLocation = staffMember.address;
        
        while (remaining.length > 0) {
          let nearestIdx = 0;
          let nearestDistance = Infinity;
          
          remaining.forEach((visit, idx) => {
            const client = clients.find(c => c.id === visit.client_id);
            if (!client?.address) return;
            
            const travel = calculateTravelTime(currentLocation, client.address, staffMember.vehicle_type);
            if (travel.distance < nearestDistance) {
              nearestDistance = travel.distance;
              nearestIdx = idx;
            }
          });
          
          const nextVisit = remaining.splice(nearestIdx, 1)[0];
          optimized.push(nextVisit);
          
          const nextClient = clients.find(c => c.id === nextVisit.client_id);
          if (nextClient?.address) {
            currentLocation = nextClient.address;
          }
        }
        
        // Calculate travel times between optimized visits
        const optimizedWithTravel = optimized.map((visit, idx) => {
          if (idx < optimized.length - 1) {
            const currentClient = clients.find(c => c.id === visit.client_id);
            const nextClient = clients.find(c => c.id === optimized[idx + 1].client_id);
            
            if (currentClient?.address && nextClient?.address) {
              const travel = calculateTravelTime(
                currentClient.address,
                nextClient.address,
                staffMember.vehicle_type
              );
              return { ...visit, estimated_travel_to_next: travel.time, optimized_sequence: idx + 1 };
            }
          }
          return { ...visit, optimized_sequence: idx + 1 };
        });
        
        // Calculate savings
        const originalTravel = dayVisits.reduce((sum, v) => sum + (v.estimated_travel_to_next || 0), 0);
        const optimizedTravel = optimizedWithTravel.reduce((sum, v) => sum + (v.estimated_travel_to_next || 0), 0);
        const savings = originalTravel - optimizedTravel;
        
        const key = `${sId}_${dateKey}`;
        optimizations[key] = {
          staffId: sId,
          staffName: staffMember.full_name,
          date: dateKey,
          original: dayVisits,
          optimized: optimizedWithTravel,
          originalTravel,
          optimizedTravel,
          savings,
          savingsPercent: originalTravel > 0 ? ((savings / originalTravel) * 100).toFixed(0) : 0
        };
      });
    }
    
    setOptimizedRoutes(optimizations);
    setShowOptimizationPanel(true);
    setOptimizingRoutes(false);
    
    const totalSavings = Object.values(optimizations).reduce((sum, opt) => sum + opt.savings, 0);
    toast.success(
      "Routes Optimized", 
      `Found ${Object.keys(optimizations).length} optimizations saving ${totalSavings.toFixed(0)} minutes of travel time`
    );
  };

  const applyOptimization = (key) => {
    const optimization = optimizedRoutes[key];
    if (!optimization) return;
    
    optimization.optimized.forEach((visit) => {
      onVisitUpdate?.(visit.id, {
        sequence_number: visit.optimized_sequence,
        estimated_travel_to_next: visit.estimated_travel_to_next || 0
      });
    });
    
    // Remove this optimization from the list
    const updated = { ...optimizedRoutes };
    delete updated[key];
    setOptimizedRoutes(updated);
    
    toast.success("Route Applied", `Optimized route for ${optimization.staffName} on ${format(parseISO(optimization.date), 'MMM d')}`);
  };

  const applyAllOptimizations = () => {
    Object.keys(optimizedRoutes).forEach(key => {
      applyOptimization(key);
    });
    setShowOptimizationPanel(false);
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
    const isLocked = visit.status === 'completed' || visit.status === 'in_progress';
    const visitClient = clients.find(c => c?.id === visit.client_id);
    const visitStaff = staff.find(s => s?.id === visitStaffId);

    return (
      <div
        onClick={() => {
          setSelectedVisit(visit);
          setShowSidebar(true);
          onVisitClick?.(visit);
        }}
        className={`
          px-2 py-1.5 rounded text-xs cursor-pointer transition-all relative w-full
          ${colors.bg} ${colors.border} ${colors.text} border
          hover:shadow-md hover:scale-[1.01]
          ${!visitStaffId ? 'border-dashed border-2 border-orange-400 bg-orange-50' : ''}
        `}
      >
        {isLocked && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-600 rounded-full flex items-center justify-center z-10">
            <CheckCircle className="w-2 h-2 text-white" />
          </div>
        )}
        <div className="flex items-start gap-1.5 mb-1">
          <div className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-xs leading-tight">{label || 'Visit'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-1 flex-wrap">
            <Clock className="w-2.5 h-2.5 opacity-60" />
            <span className="font-medium">{startTime}</span>
            {visit.duration_minutes && (
              <Badge className="bg-gray-100 text-gray-700 text-[9px] px-1 py-0">
                {visit.duration_minutes}m
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {visitStaff?.vehicle_type && (
              <Badge className="bg-indigo-50 text-indigo-700 text-[9px] px-1 py-0">
                {visitStaff.vehicle_type === 'car' ? '🚗' : visitStaff.vehicle_type === 'bike' ? '🚴' : '🚶'}
              </Badge>
            )}
            {visit.estimated_travel_to_next > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1 py-0">
                <Navigation className="w-2.5 h-2.5 mr-0.5" />
                {visit.estimated_travel_to_next}m
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TimelineVisit = ({ visit, isDragging = false }) => {
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
          ${!visitStaffId ? 'border-dashed border-2 border-orange-400 bg-orange-50/80' : ''}
          ${isDragging ? 'shadow-2xl z-50 opacity-90' : ''}
        `}
        style={{ left: `${left}%`, width: `${width}%`, minWidth: '50px' }}
      >
        <div className="px-2 py-1 text-[10px] truncate">
          <span className={`font-semibold ${colors.text}`}>
            {getClientName(visit.client_id)}
          </span>
        </div>
      </div>
    );
  };

  const SidebarPanel = () => {
    if (!showSidebar || !selectedVisit) return null;

    const visitStaff = staff.find(s => s?.id === (selectedVisit.staff_id || selectedVisit.assigned_staff_id));
    const visitClient = clients.find(c => c?.id === selectedVisit.client_id);
    const colors = VISIT_COLORS[selectedVisit.status] || VISIT_COLORS.scheduled;
    const startTime = getVisitTime(selectedVisit, 'scheduled_start') || selectedVisit.scheduled_start;
    const endTime = getVisitTime(selectedVisit, 'scheduled_end') || selectedVisit.scheduled_end;

    const dayStats = useMemo(() => {
      if (!selectedVisit) return { allocated: 0, unallocated: 0, total: 0 };
      const visitDateStr = getVisitDate(selectedVisit);
      const dayVisits = visits.filter(v => getVisitDate(v) === visitDateStr);
      const allocated = dayVisits.filter(v => v.staff_id || v.assigned_staff_id).length;
      const unallocated = dayVisits.filter(v => !v.staff_id && !v.assigned_staff_id).length;
      const totalHours = dayVisits.reduce((sum, v) => sum + ((v.duration_minutes || 0) / 60), 0);
      return { allocated, unallocated, total: dayVisits.length, totalHours: totalHours.toFixed(1) };
    }, [selectedVisit, visits]);

    return (
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l shadow-2xl z-50 overflow-y-auto slide-in-right">
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-bold text-sm">Visit Details</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-3 h-9">
              <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
              <TabsTrigger value="visit" className="text-xs">Visit</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="p-3 space-y-3 mt-0">
              {visitClient && (
                <div className="border rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Service User</p>
                  <div className="flex items-center gap-2">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(visitClient.full_name || 'C')}&background=10b981&color=fff&size=40`}
                      alt={visitClient.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{visitClient.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{visitClient.address?.postcode}</p>
                    </div>
                  </div>
                  {visitClient.address && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight">{visitClient.address.street}, {visitClient.address.city}, {visitClient.address.postcode}</span>
                      </div>
                      {visitStaff?.address && (
                        <TravelTimeBadge
                          fromAddress={visitStaff.address}
                          toAddress={visitClient.address}
                          transportMode={visitStaff.vehicle_type || 'car'}
                          showDetails={true}
                        />
                      )}
                    </div>
                  )}
                  {visitClient.access_instructions && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-1">Access Instructions</p>
                      <p className="text-xs text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                        {visitClient.access_instructions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {visitStaff && (
                <div className="border rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Assigned Employee</p>
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(visitStaff.full_name || 'S')}&background=0ea5e9&color=fff&size=40`}
                      alt={visitStaff.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{visitStaff.full_name}</p>
                      <p className="text-xs text-gray-500">{visitStaff.vehicle_type ? `${visitStaff.vehicle_type}` : 'Care Worker'}</p>
                    </div>
                  </div>
                  {visitStaff.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                      <Phone className="w-3 h-3" />
                      <span>{visitStaff.phone}</span>
                    </div>
                  )}
                  {visitStaff.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{visitStaff.email}</span>
                    </div>
                  )}
                </div>
              )}

              {!visitStaff && (
                <div className="border-2 border-dashed border-orange-300 rounded-lg p-3 bg-orange-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <p className="font-semibold text-sm text-orange-900">Unallocated</p>
                  </div>
                  <p className="text-xs text-orange-700">This visit needs to be assigned to a staff member</p>
                </div>
              )}

              <div className={`p-2.5 rounded-lg ${colors.bg} border ${colors.border}`}>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Visit Type:</span>
                    <span className="font-semibold">{selectedVisit.visit_type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold">{format(parseISO(getVisitDate(selectedVisit)), 'EEE, d MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-semibold">{startTime} - {endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold">{selectedVisit.duration_minutes}m</span>
                  </div>
                  {selectedVisit.mileage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mileage:</span>
                      <span className="font-semibold">{selectedVisit.mileage} miles</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visit" className="p-3 space-y-3 mt-0">
              <div className="space-y-2">
                <Button className="w-full justify-start" size="sm" variant="outline">
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Create New Visit
                </Button>
                <Button className="w-full justify-start" size="sm" variant="outline">
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Send SMS
                </Button>
                <Button className="w-full justify-start" size="sm" variant="outline">
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  Send Email
                </Button>
                <Button className="w-full justify-start" size="sm" variant="outline">
                  <Clock className="w-3.5 h-3.5 mr-2" />
                  Generate Timesheets
                </Button>
                <Button className="w-full justify-start" size="sm" variant="outline">
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Duplicate Visit
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-3 space-y-3 mt-0">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Visit Notes</Label>
                <Textarea 
                  value={selectedVisit.notes || ''} 
                  readOnly
                  placeholder="No notes available"
                  rows={4}
                  className="text-xs"
                />
              </div>

              {visitClient?.care_needs && visitClient.care_needs.length > 0 && (
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Care Needs</Label>
                  <div className="space-y-1">
                    {visitClient.care_needs.map((need, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs">
                        <CheckCircle className="w-3 h-3 text-teal-600" />
                        <span>{need}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="p-3 space-y-3 mt-0">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {format(parseISO(getVisitDate(selectedVisit)), 'EEEE, d MMMM yyyy')}
                </p>
                <div className="bg-gray-50 rounded-lg p-2.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Total Visits</span>
                    <span className="font-bold text-lg">{dayStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Allocated</span>
                    <Badge className="bg-green-100 text-green-700 text-xs">{dayStats.allocated}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Unallocated</span>
                    <Badge className="bg-red-100 text-red-700 text-xs">{dayStats.unallocated}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t">
                    <span className="text-gray-600">Total Hours</span>
                    <span className="font-semibold">{dayStats.totalHours}h</span>
                  </div>
                </div>
              </div>

              {visitStaff && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">WTR Compliance</p>
                  <WorkingTimeComplianceIndicator 
                    staff={visitStaff}
                    shifts={visits.filter(v => 
                      (v.staff_id === visitStaff.id || v.assigned_staff_id === visitStaff.id) &&
                      getVisitDate(v) >= format(currentWeekStart, 'yyyy-MM-dd') &&
                      getVisitDate(v) < format(addDays(currentWeekStart, 7), 'yyyy-MM-dd')
                    )}
                    compact={false}
                  />
                </div>
              )}

              {visitStaff && selectedVisit && (
                <RouteOptimizer
                  visits={visits.filter(v => {
                    const vStaffId = v.staff_id || v.assigned_staff_id;
                    return vStaffId === visitStaff.id && 
                           getVisitDate(v) === getVisitDate(selectedVisit);
                  }).map(v => ({
                    ...v,
                    client: clients.find(c => c?.id === v.client_id)
                  }))}
                  staff={visitStaff}
                  onApplyOptimization={(optimized) => {
                    optimized.forEach((visit, idx) => {
                      if (idx < optimized.length - 1) {
                        const current = optimized[idx];
                        const next = optimized[idx + 1];
                        const currentClient = clients.find(c => c?.id === current.client_id);
                        const nextClient = clients.find(c => c?.id === next.client_id);
                        
                        if (currentClient?.address && nextClient?.address) {
                          const travel = calculateTravelTime(
                            currentClient.address,
                            nextClient.address,
                            visitStaff?.vehicle_type
                          );
                          onVisitUpdate?.(current.id, { 
                            sequence_number: idx + 1,
                            estimated_travel_to_next: travel.time
                          });
                        }
                      } else {
                        onVisitUpdate?.(visit.id, { sequence_number: idx + 1 });
                      }
                    });
                  }}
                />
              )}

              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-600 mb-2">Quick Actions</p>
                <div className="space-y-1.5">
                  <Button className="w-full justify-start h-8" size="sm" variant="outline">
                    <Navigation className="w-3.5 h-3.5 mr-2" />
                    Manage Runs
                  </Button>
                  <Button className="w-full justify-start h-8" size="sm" variant="outline">
                    <FileText className="w-3.5 h-3.5 mr-2" />
                    View Report
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all ${showSidebar ? 'mr-80' : ''}`}>
      {/* Top Filters Bar */}
      <div className="px-3 py-2 border-b bg-white flex items-center gap-2 flex-wrap text-xs">
        <Select value={resourceMode} onValueChange={setResourceMode}>
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="resources">Resources</SelectItem>
            <SelectItem value="runs">Runs</SelectItem>
          </SelectContent>
        </Select>

        <Select value={viewByMode} onValueChange={setViewByMode}>
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">By: Staff</SelectItem>
            <SelectItem value="clients">By: Clients</SelectItem>
            <SelectItem value="visit">By: Visit</SelectItem>
          </SelectContent>
        </Select>

        <Select value={viewPlanMode} onValueChange={setViewPlanMode}>
          <SelectTrigger className="w-32 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">View: Planned</SelectItem>
            <SelectItem value="actual">View: Actual</SelectItem>
            <SelectItem value="both">View: Both</SelectItem>
          </SelectContent>
        </Select>

        <Select value={durationMode} onValueChange={setDurationMode}>
          <SelectTrigger className="w-32 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1day">Duration: 1 Day</SelectItem>
            <SelectItem value="1week">Duration: 1 Week</SelectItem>
            <SelectItem value="2weeks">Duration: 2 Weeks</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-7 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Locked Visits
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
            onClick={() => optimizeStaffRoutes()}
            disabled={optimizingRoutes}
          >
            {optimizingRoutes ? (
              <>
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1" />
                Optimizing...
              </>
            ) : (
              <>
                <Navigation className="w-3 h-3 mr-1" />
                AI Optimize Routes
              </>
            )}
          </Button>
          {Object.keys(optimizedRoutes).length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => setShowOptimizationPanel(true)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {Object.keys(optimizedRoutes).length} Optimizations
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Second Row Filters */}
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center gap-2 flex-wrap text-xs">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 w-36 text-xs"
          />
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Branch: All</SelectItem>
            <SelectItem value="brighton">Brighton</SelectItem>
            <SelectItem value="hove">Hove</SelectItem>
          </SelectContent>
        </Select>

        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Area: All</SelectItem>
            <SelectItem value="east">East</SelectItem>
            <SelectItem value="west">West</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Type: All</SelectItem>
            <SelectItem value="personal_care">Personal Care</SelectItem>
            <SelectItem value="medication">Medication</SelectItem>
            <SelectItem value="meal_prep">Meal Prep</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-32 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Service Type: All</SelectItem>
            <SelectItem value="homecare">Home Care</SelectItem>
            <SelectItem value="supported">Supported Living</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Priority: All</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-28 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-3">
        <div className="text-sm">
          <p className="text-teal-100 text-xs mb-0.5">Week of {format(currentWeekStart, 'd MMM')} - {format(addDays(currentWeekStart, 6), 'd MMM yyyy')}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/80">Total:</span>
              <span className="text-xl font-bold">{weeklyStats.total}</span>
            </div>
            <div className="w-px h-6 bg-teal-400/50" />
            <div className="flex items-center gap-2">
              <span className="text-white/80">Allocated:</span>
              <span className="text-xl font-bold text-emerald-300">{weeklyStats.total - weeklyStats.unassigned}</span>
            </div>
            <div className="w-px h-6 bg-teal-400/50" />
            <div className="flex items-center gap-2">
              <span className="text-white/80">Unallocated:</span>
              <span className="text-xl font-bold text-orange-300">{weeklyStats.unassigned}</span>
            </div>
            <div className="w-px h-6 bg-teal-400/50" />
            <div className="flex items-center gap-2">
              <span className="text-white/80">Hours:</span>
              <span className="text-xl font-bold">{weeklyStats.totalHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="p-2 border-b bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="icon"
            className="h-7 w-7"
            onClick={() => viewMode === "day" 
              ? setSelectedDate(addDays(selectedDate, -1))
              : setCurrentWeekStart(subWeeks(currentWeekStart, 1))
            }
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded border text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>
              {viewMode === "day" 
                ? format(selectedDate, 'EEE, d MMM yyyy')
                : `${format(currentWeekStart, 'd MMM')} - ${format(addDays(currentWeekStart, 6), 'd MMM yyyy')}`
              }
            </span>
          </div>

          <Button 
            variant="outline" 
            size="icon"
            className="h-7 w-7"
            onClick={() => viewMode === "day" 
              ? setSelectedDate(addDays(selectedDate, 1))
              : setCurrentWeekStart(addWeeks(currentWeekStart, 1))
            }
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex bg-white rounded border p-0.5">
            <button
              onClick={() => setViewMode("day")}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                viewMode === "day" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                viewMode === "week" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex bg-white rounded border p-0.5">
            <button
              onClick={() => setActivePanel("staff")}
              className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "staff" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="w-3 h-3" />
              Staff
            </button>
            <button
              onClick={() => setActivePanel("clients")}
              className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "clients" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <User className="w-3 h-3" />
              Clients
            </button>
          </div>
        </div>
      </div>

      {viewMode === "day" ? (
        /* DAY TIMELINE VIEW */
        <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col">
          <div className="flex border-b bg-gray-50">
            <div className="w-[200px] p-2 border-r flex-shrink-0" />
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
                  
                  // Check for unavailability
                  const staffUnavailable = staffAvailability.some(a => 
                    a?.carer_id === staffMember.id && 
                    a.availability_type === 'unavailable' &&
                    a.specific_date === format(selectedDate, 'yyyy-MM-dd')
                  );

                  return (
                    <div key={staffMember.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-[200px] p-3 border-r flex-shrink-0 flex items-center gap-2 bg-white">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name || 'S')}&background=0ea5e9&color=fff&size=40`}
                          alt={staffMember.full_name}
                          className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-blue-200 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{staffMember.full_name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                            {staffMember.vehicle_type && (
                              <Badge className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 border border-blue-200">
                                <Car className="w-2.5 h-2.5 mr-0.5" />
                                {staffMember.vehicle_type}
                              </Badge>
                            )}
                            <Badge className={`text-[9px] px-1.5 py-0.5 font-semibold ${
                              hoursStatus.status === 'full' ? 'bg-red-100 text-red-700 border border-red-300' :
                              hoursStatus.status === 'near' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-green-100 text-green-700 border border-green-300'
                            }`}>
                              {hoursStatus.weekHours.toFixed(1)}h/{hoursStatus.contracted}h
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Droppable droppableId={`${staffMember.id}_${format(selectedDate, 'yyyy-MM-dd')}`}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 relative min-h-[80px] ${staffUnavailable ? 'bg-gray-100' : 'bg-white'} ${
                              snapshot.isDraggingOver ? 'bg-teal-100/50 ring-2 ring-inset ring-teal-400' : ''
                            }`}
                          >
                            {staffUnavailable && (
                              <div className="absolute inset-0 bg-repeat pointer-events-none" style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,.04) 8px, rgba(0,0,0,.04) 16px)'
                              }} />
                            )}
                            <div className="absolute inset-0 flex">
                              {TIMELINE_HOURS.map(hour => (
                                <div key={hour} className="flex-1 border-r border-gray-100" />
                              ))}
                            </div>
                            {dayVisits.map((visit, vIdx) => {
                              const nextVisit = dayVisits[vIdx + 1];
                              const hasTravel = visit.estimated_travel_to_next > 0;
                              
                              return (
                                <React.Fragment key={visit.id}>
                                  <Draggable draggableId={visit.id} index={vIdx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                      >
                                        <TimelineVisit visit={visit} isDragging={snapshot.isDragging} />
                                      </div>
                                    )}
                                  </Draggable>
                                  {hasTravel && nextVisit && (
                                    <div 
                                      className="absolute h-4 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md z-30 border border-blue-300"
                                      style={{ 
                                        left: `${getTimePosition(getVisitTime(visit, 'scheduled_end')) + 0.5}%`,
                                        width: `${Math.max(visit.estimated_travel_to_next * 0.8, 3)}%`,
                                        top: '50%',
                                        transform: 'translateY(-50%)'
                                      }}
                                    >
                                      <span className="text-[9px] text-white font-bold px-1.5">
                                        🚗 {visit.estimated_travel_to_next}min
                                      </span>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
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
                      <div className="w-[200px] p-3 border-r flex-shrink-0 flex items-center gap-2 bg-white">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=10b981&color=fff&size=40`}
                          alt={client.full_name}
                          className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-emerald-200 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{client.full_name}</p>
                          <p className="text-[11px] text-gray-600 truncate flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {client.address?.postcode || 'Location'}
                          </p>
                        </div>
                      </div>
                      <Droppable droppableId={`client_${client.id}_${format(selectedDate, 'yyyy-MM-dd')}`}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 relative min-h-[80px] bg-white ${
                              snapshot.isDraggingOver ? 'bg-emerald-100/50 ring-2 ring-inset ring-emerald-400' : ''
                            }`}
                          >
                            <div className="absolute inset-0 flex">
                              {TIMELINE_HOURS.map(hour => (
                                <div key={hour} className="flex-1 border-r border-gray-100" />
                              ))}
                            </div>
                            {dayVisits.map((visit, vIdx) => (
                              <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <TimelineVisit visit={visit} isDragging={snapshot.isDragging} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </DragDropContext>
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
          <div className="flex flex-col h-full" style={{ overscrollBehavior: 'contain' }}>
            <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b bg-gradient-to-b from-gray-100 to-gray-50 sticky top-0 z-20 shadow-sm">
              <div className="p-3 border-r flex items-center gap-2 bg-gray-100">
                {activePanel === "clients" ? (
                  <>
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-bold text-sm text-gray-800">Service Users</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="font-bold text-sm text-gray-800">Care Workers</span>
                  </>
                )}
              </div>
              {weekDays.map((day, idx) => {
                const isTodayDate = isToday(day);
                const unassignedCount = getUnassignedVisits(day).length;
                const dayVisitsCount = visits.filter(v => getVisitDate(v) === format(day, 'yyyy-MM-dd')).length;
                const allocatedCount = dayVisitsCount - unassignedCount;
                const dayTotalHours = visits
                  .filter(v => getVisitDate(v) === format(day, 'yyyy-MM-dd'))
                  .reduce((sum, v) => {
                    if (v.duration_minutes) {
                      return sum + (v.duration_minutes / 60);
                    }
                    if (v.scheduled_start && v.scheduled_end) {
                      try {
                        const start = new Date(v.scheduled_start);
                        const end = new Date(v.scheduled_end);
                        const durationMs = end - start;
                        return sum + (durationMs / (1000 * 60 * 60));
                      } catch {
                        return sum;
                      }
                    }
                    return sum;
                  }, 0);

                return (
                  <div 
                    key={idx} 
                    className={`p-2 border-r text-center transition-colors ${
                      isTodayDate ? 'bg-blue-100 border-l-2 border-r-2 border-blue-400' : ''
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isTodayDate ? 'text-blue-700' : 'text-gray-600'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-2xl font-black mb-1 ${isTodayDate ? 'text-blue-700' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </p>
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex items-center gap-1">
                        <Badge className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-800 border border-green-300 font-semibold">
                          ✓ {allocatedCount}
                        </Badge>
                        {unassignedCount > 0 && (
                          <Badge className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-300 font-semibold">
                            ! {unassignedCount}
                          </Badge>
                        )}
                      </div>
                      <Badge className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-300">
                        {dayTotalHours.toFixed(1)}h
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unassigned Row */}
            <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500">
              <div className="p-3 border-r flex items-center gap-2.5 bg-orange-100">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center animate-pulse shadow-md">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-900">Unallocated Visits</p>
                  <p className="text-[11px] text-orange-700">Need assignment</p>
                </div>
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
                        className={`p-2 min-h-[90px] border-r transition-colors ${
                          snapshot.isDraggingOver ? 'bg-orange-200 ring-2 ring-orange-500' : 'bg-orange-50/40'
                        }`}
                      >
                        <div className="flex flex-col gap-1.5">
                          {unassigned.map((visit, vIdx) => (
                            <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? 'z-50 shadow-2xl' : ''}
                                >
                                  <VisitPill visit={visit} />
                                </div>
                              )}
                            </Draggable>
                          ))}
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
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[550px]"}`} style={{ overscrollBehavior: 'contain' }}>
              {activeStaff.map((staffMember) => {
                const hoursStatus = getStaffHoursStatus(staffMember.id);
                
                return (
                  <div key={staffMember.id} className={`grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b hover:bg-gray-50/30 transition-colors ${
                    hoursStatus.status === 'full' ? 'bg-red-50/20' : ''
                  }`}>
                    <div className="p-3 border-r flex items-center gap-2.5 bg-white">
                     <img 
                       src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name || 'S')}&background=0ea5e9&color=fff&size=40`}
                       alt={staffMember.full_name}
                       className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-blue-200 shadow-sm"
                     />
                      <div className="flex-1 min-w-0">
                       <p className="font-semibold text-sm truncate text-gray-900">{staffMember.full_name}</p>
                       <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap mt-1">
                         {staffMember.vehicle_type && (
                           <Badge className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 border border-blue-200">
                             <Car className="w-3 h-3 mr-0.5" />
                             {staffMember.vehicle_type}
                           </Badge>
                         )}
                         <Badge className={`text-[10px] px-2 py-0.5 font-semibold ${
                           hoursStatus.status === 'full' ? 'bg-red-100 text-red-700 border border-red-300' :
                           hoursStatus.status === 'near' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-green-100 text-green-700 border border-green-300'
                         }`}>
                           {hoursStatus.weekHours.toFixed(1)}h / {hoursStatus.contracted}h
                         </Badge>
                         {hoursStatus.wtrCompliance && hoursStatus.wtrCompliance.summary.critical > 0 && (
                           <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 font-semibold border border-red-300">
                             ⚠️ WTR
                           </Badge>
                         )}
                       </div>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayVisits = getStaffDayVisits(staffMember.id, day);
                      const isTodayDate = isToday(day);
                      const staffUnavailable = staffAvailability.some(a => 
                        a?.carer_id === staffMember.id && 
                        a.availability_type === 'unavailable' &&
                        a.specific_date === dayStr
                      );

                      return (
                        <Droppable key={`${staffMember.id}_${dayStr}`} droppableId={`${staffMember.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1.5 min-h-[90px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-blue-50/40' : 'bg-white'
                              } ${snapshot.isDraggingOver ? 'bg-teal-100/50 ring-2 ring-inset ring-teal-400' : ''}`}
                            >
                              {staffUnavailable && (
                                <div className="absolute inset-0 bg-repeat pointer-events-none z-0" style={{
                                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,.05) 8px, rgba(0,0,0,.05) 16px)'
                                }} />
                              )}
                              <div className="flex flex-col gap-1.5 relative z-10">
                                    {dayVisits.map((visit, vIdx) => {
                                      const nextVisit = dayVisits[vIdx + 1];
                                      const hasTravel = visit.estimated_travel_to_next > 0;
                                      
                                      return (
                                        <div key={visit.id}>
                                          <Draggable draggableId={visit.id} index={vIdx}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={snapshot.isDragging ? 'z-50 shadow-2xl' : ''}
                                              >
                                                <VisitPill visit={visit} />
                                              </div>
                                            )}
                                          </Draggable>
                                          {hasTravel && nextVisit && (
                                            <div className="flex items-center gap-1 py-0.5">
                                              <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" 
                                                   style={{ width: `${Math.min(visit.estimated_travel_to_next * 2, 100)}%` }} />
                                              <span className="text-[9px] text-blue-600 font-semibold">
                                                {visit.estimated_travel_to_next}min
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {provided.placeholder}

                                  {/* Add button - only show when no visits */}
                                  {dayVisits.length === 0 && (
                                    <button
                                      onClick={() => onAddVisit?.({ staff_id: staffMember.id, scheduled_date: dayStr })}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-teal-50/50 z-10"
                                    >
                                      <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg hover:bg-teal-600 transition-colors">
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
                                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-teal-600 z-20"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
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
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[550px]"}`} style={{ overscrollBehavior: 'contain' }}>
              {activePanel === "both" && (
                <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b bg-emerald-50">
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
                  <div key={client.id} className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b hover:bg-gray-50/30 transition-colors">
                    <div className="p-3 border-r flex items-center gap-2.5 bg-white">
                     <img 
                       src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=10b981&color=fff&size=40`}
                       alt={client.full_name}
                       className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-emerald-200 shadow-sm"
                     />
                     <div className="flex-1 min-w-0">
                       <p className="font-semibold text-sm truncate text-gray-900">{client.full_name}</p>
                       <p className="text-[11px] text-gray-600 truncate flex items-center gap-1 mt-1">
                         <MapPin className="w-3 h-3" />
                         {client.address?.postcode || 'Location'}
                       </p>
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
                              className={`p-2 min-h-[90px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-blue-50/40' : 'bg-white'
                              } ${snapshot.isDraggingOver ? 'bg-emerald-100/50 ring-2 ring-inset ring-emerald-500' : ''}`}
                            >
                              <div className="flex flex-col gap-1.5 relative z-10">
                                    {dayVisits.map((visit, vIdx) => {
                                      const nextVisit = dayVisits[vIdx + 1];
                                      const hasTravel = visit.estimated_travel_to_next > 0;
                                      
                                      return (
                                        <div key={visit.id}>
                                          <Draggable draggableId={visit.id} index={vIdx}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={snapshot.isDragging ? 'z-50 shadow-2xl' : ''}
                                              >
                                                <VisitPill visit={visit} showStaff={true} showClient={false} />
                                              </div>
                                            )}
                                          </Draggable>
                                          {hasTravel && nextVisit && (
                                            <div className="flex items-center gap-1 py-0.5">
                                              <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" 
                                                   style={{ width: `${Math.min(visit.estimated_travel_to_next * 2, 100)}%` }} />
                                              <span className="text-[9px] text-blue-600 font-semibold">
                                                {visit.estimated_travel_to_next}min
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {provided.placeholder}

                                  {/* Add button - only show when no visits */}
                                  {dayVisits.length === 0 && (
                                    <button
                                      onClick={() => onAddVisit?.({ client_id: client.id, scheduled_date: dayStr })}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50/50 z-10"
                                    >
                                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors">
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
                                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 z-20"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
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

      {/* Runs Section at Bottom */}
      {resourceMode === "runs" && runs && runs.length > 0 && viewMode === "week" && (
        <div className="border-t">
          <div className="bg-purple-50 px-3 py-1.5 border-b">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-900">Runs</span>
              <Badge className="bg-purple-100 text-purple-700 text-[9px]">{runs.length}</Badge>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {runs.slice(0, 3).map(run => (
              <div key={run.id} className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b hover:bg-purple-50/30">
                <div className="p-1.5 border-r flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center">
                    <Navigation className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{run.run_name || `Run ${run.id.slice(-4)}`}</p>
                    <p className="text-[10px] text-gray-500">{run.area || 'Area'}</p>
                  </div>
                </div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="p-0.5 border-r min-h-[40px] bg-white" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      <SidebarPanel />

      {/* Route Optimization Panel */}
      {showOptimizationPanel && Object.keys(optimizedRoutes).length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">AI Route Optimizations</h3>
                  <p className="text-sm text-purple-100">
                    {Object.keys(optimizedRoutes).length} optimized route{Object.keys(optimizedRoutes).length !== 1 ? 's' : ''} ready to apply
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOptimizationPanel(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.entries(optimizedRoutes).map(([key, opt]) => (
                <div key={key} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(opt.staffName)}&background=8b5cf6&color=fff&size=40`}
                        alt={opt.staffName}
                        className="w-10 h-10 rounded-full border-2 border-purple-200"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{opt.staffName}</p>
                        <p className="text-sm text-gray-600">{format(parseISO(opt.date), 'EEEE, MMM d')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Travel Time Savings</p>
                        <p className="text-2xl font-bold text-green-600">-{opt.savings.toFixed(0)}min</p>
                        <p className="text-xs text-green-600">({opt.savingsPercent}% reduction)</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => applyOptimization(key)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Current Route</p>
                      <div className="space-y-1">
                        {opt.original.map((visit, idx) => {
                          const client = clients.find(c => c.id === visit.client_id);
                          return (
                            <div key={visit.id} className="flex items-center gap-2 text-xs">
                              <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="flex-1">{client?.full_name || 'Unknown'}</span>
                              {visit.estimated_travel_to_next > 0 && (
                                <span className="text-gray-500">→ {visit.estimated_travel_to_next}min</span>
                              )}
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t text-xs font-semibold text-gray-700">
                          Total Travel: {opt.originalTravel.toFixed(0)}min
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Optimized Route
                      </p>
                      <div className="space-y-1">
                        {opt.optimized.map((visit, idx) => {
                          const client = clients.find(c => c.id === visit.client_id);
                          const wasReordered = opt.original[idx]?.id !== visit.id;
                          return (
                            <div key={visit.id} className={`flex items-center gap-2 text-xs ${wasReordered ? 'bg-green-50 px-1 py-0.5 rounded' : ''}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[10px] ${
                                wasReordered ? 'bg-green-500 text-white' : 'bg-purple-200 text-purple-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="flex-1">{client?.full_name || 'Unknown'}</span>
                              {visit.estimated_travel_to_next > 0 && (
                                <span className="text-green-600 font-semibold">→ {visit.estimated_travel_to_next}min</span>
                              )}
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t text-xs font-semibold text-green-700">
                          Total Travel: {opt.optimizedTravel.toFixed(0)}min
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm">
                <p className="text-gray-600">Total time savings: 
                  <span className="font-bold text-green-600 ml-2">
                    {Object.values(optimizedRoutes).reduce((sum, opt) => sum + opt.savings, 0).toFixed(0)} minutes
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOptimizationPanel(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={applyAllOptimizations}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply All Optimizations
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}