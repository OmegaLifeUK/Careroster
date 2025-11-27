import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Plus,
  GripVertical,
  User,
  Star,
  Award,
  Car,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  EyeOff,
  UserCircle,
  Home
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, differenceInMinutes, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SHIFT_TYPE_COLORS = {
  morning: "bg-green-400 text-green-900 border-green-500",
  afternoon: "bg-blue-400 text-blue-900 border-blue-500",
  evening: "bg-purple-400 text-purple-900 border-purple-500",
  night: "bg-slate-600 text-white border-slate-700",
  sleep_in: "bg-indigo-400 text-indigo-900 border-indigo-500",
  waking_night: "bg-slate-500 text-white border-slate-600",
  supervision: "bg-teal-400 text-teal-900 border-teal-500",
  shadowing: "bg-pink-400 text-pink-900 border-pink-500",
};

const CARE_TYPE_COLORS = {
  residential_care: "bg-gray-200 text-gray-800",
  domiciliary_care: "bg-green-200 text-green-800",
  supported_living: "bg-purple-200 text-purple-800",
  day_centre: "bg-amber-200 text-amber-800",
};

const CARE_TYPE_LABELS = {
  morning: "AM",
  afternoon: "PM",
  evening: "Eve",
  night: "Night",
  sleep_in: "Sleep-In",
  waking_night: "Waking",
  supervision: "Supervision",
  shadowing: "Shadow",
};

// Timeline hours for hourly grid view (5AM to 9PM)
const TIMELINE_HOURS = Array.from({ length: 17 }, (_, i) => i + 5);

const STATUS_INDICATORS = {
  scheduled: "border-l-4 border-l-green-500",
  in_progress: "border-l-4 border-l-blue-500",
  completed: "border-l-4 border-l-gray-400",
  cancelled: "border-l-4 border-l-red-500",
  unfilled: "border-l-4 border-l-orange-500 bg-orange-50",
  published: "border-l-4 border-l-purple-500",
  draft: "border-l-4 border-l-gray-300",
};

export default function EnhancedRosterView({
  shifts = [],
  carers = [],
  clients = [],
  properties = [],
  onShiftClick,
  onShiftUpdate,
  onAddShift,
  locationName = "Care Home"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQualification, setFilterQualification] = useState("all");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [viewMode, setViewMode] = useState("weekly"); // "weekly" or "daily"
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showServiceUsers, setShowServiceUsers] = useState(true);
  const [showEmployees, setShowEmployees] = useState(true);
  const [hideToolbars, setHideToolbars] = useState(false);
  const { toast } = useToast();

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Filter active carers
  const activeCarers = useMemo(() => {
    let filtered = carers.filter(c => c && c.status === 'active');
    
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [carers, searchQuery]);

  // Calculate weekly metrics
  const weeklyMetrics = useMemo(() => {
    const weekShifts = shifts.filter(s => {
      if (!s?.date) return false;
      const shiftDate = parseISO(s.date);
      return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
    });

    const totalBudgetedHours = weekShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
    const filledShifts = weekShifts.filter(s => s.carer_id);
    const unfilledShifts = weekShifts.filter(s => !s.carer_id);
    const actualHours = filledShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);

    return {
      budgetedHours: totalBudgetedHours,
      actualHours,
      variance: actualHours - totalBudgetedHours,
      totalShifts: weekShifts.length,
      filledShifts: filledShifts.length,
      unfilledShifts: unfilledShifts.length,
      fillRate: weekShifts.length > 0 ? ((filledShifts.length / weekShifts.length) * 100).toFixed(0) : 100
    };
  }, [shifts, currentWeekStart]);

  // Calculate daily metrics
  const dailyMetrics = useMemo(() => {
    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s => s?.date === dayStr);
      const filledShifts = dayShifts.filter(s => s.carer_id);
      
      return {
        date: day,
        totalShifts: dayShifts.length,
        filledShifts: filledShifts.length,
        unfilledShifts: dayShifts.length - filledShifts.length,
        hours: dayShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0)
      };
    });
  }, [weekDays, shifts]);

  // Get shifts for a specific carer on a specific day
  const getCarerDayShifts = (carerId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.carer_id === carerId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  // Get unassigned shifts for a day
  const getUnassignedShifts = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && !s.carer_id)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  // Calculate carer weekly stats
  const getCarerWeeklyStats = (carerId) => {
    const carer = carers.find(c => c?.id === carerId);
    const weekShifts = shifts.filter(s => {
      if (!s?.date || s.carer_id !== carerId) return false;
      const shiftDate = parseISO(s.date);
      return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
    });

    const totalHours = weekShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
    // Use carer's max hours if available, otherwise default
    const contractedHours = carer?.max_hours_per_week || 37.5;

    return {
      totalHours,
      contractedHours,
      variance: totalHours - contractedHours,
      shiftCount: weekShifts.length
    };
  };

  // Get shifts for a specific client on a specific day
  const getClientDayShifts = (clientId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.client_id === clientId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  // Get client weekly stats
  const getClientWeeklyStats = (clientId) => {
    const weekShifts = shifts.filter(s => {
      if (!s?.date || s.client_id !== clientId) return false;
      const shiftDate = parseISO(s.date);
      return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
    });

    const totalHours = weekShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
    return {
      totalHours,
      shiftCount: weekShifts.length,
      assignedCount: weekShifts.filter(s => s.carer_id).length
    };
  };

  // Calculate position and width for timeline view
  const getTimelinePosition = (startTime, endTime) => {
    if (!startTime || !endTime) return { left: 0, width: 0 };
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startPos = ((startHour - 5) + startMin / 60) / 17 * 100;
    let endPos = ((endHour - 5) + endMin / 60) / 17 * 100;
    
    // Handle overnight shifts
    if (endHour < startHour) {
      endPos = 100;
    }
    
    return {
      left: Math.max(0, startPos),
      width: Math.min(100 - startPos, endPos - startPos)
    };
  };

  // Format hours display like "P 24:30h"
  const formatHoursDisplay = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}h`;
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c?.id === clientId);
    return client?.full_name || 'Unknown';
  };

  const getShiftLabel = (shift) => {
    if (shift.location_name) return shift.location_name;
    if (shift.client_id) return getClientName(shift.client_id);
    return shift.shift_type || 'Shift';
  };

  // Drag and drop handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const [targetCarerId, targetDate] = destination.droppableId.split('_');

    const shift = shifts.find(s => s.id === draggableId);
    if (!shift) return;

    // Update shift assignment
    if (onShiftUpdate) {
      const newCarerId = targetCarerId === 'unassigned' ? null : targetCarerId;
      onShiftUpdate(draggableId, { 
        carer_id: newCarerId,
        date: targetDate,
        status: newCarerId ? 'scheduled' : 'unfilled'
      });
      
      toast.success("Shift Updated", newCarerId 
        ? `Shift assigned to ${activeCarers.find(c => c.id === newCarerId)?.full_name || 'carer'}`
        : "Shift unassigned"
      );
    }
  };

  // Get active clients for service user view
  const activeClients = useMemo(() => {
    return clients.filter(c => c && c.status === 'active')
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [clients]);

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Top Toolbar */}
      <div className="p-3 border-b bg-slate-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-lg">Shift Roster</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-slate-700"
            onClick={() => {
              toast.info("Refreshing", "Data refreshed");
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-700 rounded">
            <span className="text-sm">Compact View</span>
            <button 
              onClick={() => setHideToolbars(!hideToolbars)}
              className={`w-10 h-5 rounded-full transition-colors ${hideToolbars ? 'bg-green-500' : 'bg-slate-500'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${hideToolbars ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation and View Controls */}
      {!hideToolbars && (
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => {
                if (viewMode === "daily") {
                  setSelectedDate(addDays(selectedDate, -1));
                } else {
                  setCurrentWeekStart(subWeeks(currentWeekStart, 1));
                }
              }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant={viewMode === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("weekly")}
                >
                  Week
                </Button>
                <Button 
                  variant={viewMode === "daily" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("daily")}
                >
                  Day
                </Button>
                <span className="font-semibold text-lg ml-4">
                  {viewMode === "daily" 
                    ? format(selectedDate, 'EEE dd/MM/yyyy')
                    : `${format(currentWeekStart, 'MMM d')} - ${format(addDays(currentWeekStart, 6), 'MMM d')}`
                  }
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                if (viewMode === "daily") {
                  setSelectedDate(addDays(selectedDate, 1));
                } else {
                  setCurrentWeekStart(addWeeks(currentWeekStart, 1));
                }
              }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button 
                variant={showUnassignedOnly ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Unfilled Only
              </Button>
            </div>
          </div>

          {/* Location and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>

            {/* Weekly Summary Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Hours Budget</p>
                <p className="font-bold text-lg">{weeklyMetrics.budgetedHours.toFixed(0)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Hours Actual</p>
                <p className="font-bold text-lg">{weeklyMetrics.actualHours.toFixed(0)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Variance</p>
                <p className={`font-bold text-lg ${weeklyMetrics.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {weeklyMetrics.variance > 0 ? '+' : ''}{weeklyMetrics.variance.toFixed(0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Fill Rate</p>
                <p className={`font-bold text-lg ${parseInt(weeklyMetrics.fillRate) < 80 ? 'text-orange-600' : 'text-green-600'}`}>
                  {weeklyMetrics.fillRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "daily" ? (
        /* DAILY TIMELINE VIEW (Access Group Style) */
        <>
          {/* Timeline Header */}
          <div className="grid grid-cols-[200px_1fr] border-b bg-gray-100">
            <div className="p-2 font-medium text-gray-600 border-r" />
            <div className="flex">
              {TIMELINE_HOURS.map(hour => (
                <div key={hour} className="flex-1 text-center text-xs text-gray-500 py-2 border-r">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Service Users Section */}
          <div className="border-b">
            <button
              onClick={() => setShowServiceUsers(!showServiceUsers)}
              className="w-full px-4 py-2 bg-pink-50 text-left flex items-center gap-2 hover:bg-pink-100 transition-colors"
            >
              {showServiceUsers ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <UserCircle className="w-4 h-4 text-pink-600" />
              <span className="font-semibold text-pink-800">Service Users</span>
              <Badge className="bg-pink-200 text-pink-800 ml-2">{activeClients.length}</Badge>
            </button>

            {showServiceUsers && (
              <div className="max-h-[300px] overflow-y-auto">
                {activeClients.map(client => {
                  const dayShifts = getClientDayShifts(client.id, selectedDate);
                  
                  return (
                    <div key={client.id} className="grid grid-cols-[200px_1fr] border-b hover:bg-gray-50">
                      <div className="p-2 border-r flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs">
                          {client.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{client.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {client.address?.city || 'Location'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="relative h-12 bg-gray-50">
                        {/* Timeline grid lines */}
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-200" />
                          ))}
                        </div>
                        {/* Shifts as bars */}
                        {dayShifts.map(shift => {
                          const pos = getTimelinePosition(shift.start_time, shift.end_time);
                          const carer = carers.find(c => c?.id === shift.carer_id);
                          const careLabel = CARE_TYPE_LABELS[shift.shift_type] || '';
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => onShiftClick?.(shift)}
                              className={`absolute top-1 h-10 rounded cursor-pointer hover:shadow-lg transition-shadow ${
                                shift.carer_id ? 'bg-gray-300' : 'bg-orange-200'
                              }`}
                              style={{
                                left: `${pos.left}%`,
                                width: `${Math.max(pos.width, 3)}%`
                              }}
                            >
                              <div className="px-1 h-full flex flex-col justify-center text-xs overflow-hidden">
                                <span className="font-semibold truncate text-gray-800">
                                  {carer?.full_name || 'Unassigned'}
                                </span>
                                <span className="text-gray-600 truncate">
                                  Care - {careLabel} Visit
                                </span>
                                <span className="text-gray-500 text-[10px]">
                                  {shift.start_time} - {shift.end_time}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Employee Section */}
          <div className="border-b">
            <button
              onClick={() => setShowEmployees(!showEmployees)}
              className="w-full px-4 py-2 bg-green-50 text-left flex items-center gap-2 hover:bg-green-100 transition-colors"
            >
              {showEmployees ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <Users className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-800">Employee</span>
              <Badge className="bg-green-200 text-green-800 ml-2">{activeCarers.length}</Badge>
            </button>

            {showEmployees && (
              <div className="max-h-[400px] overflow-y-auto">
                {activeCarers.map(carer => {
                  const dayShifts = getCarerDayShifts(carer.id, selectedDate);
                  const weekStats = getCarerWeeklyStats(carer.id);
                  
                  return (
                    <div key={carer.id} className="grid grid-cols-[200px_1fr] border-b hover:bg-gray-50">
                      <div className="p-2 border-r flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs flex-shrink-0">
                          {carer.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{carer.full_name}</p>
                          <p className="text-xs text-gray-500">{carer.employment_type?.replace('_', ' ') || 'Care Worker'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-blue-50 text-blue-700">
                              €{formatHoursDisplay(weekStats.totalHours)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-purple-50 text-purple-700">
                              P {formatHoursDisplay(weekStats.contractedHours)}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="relative h-14 bg-gray-50">
                        {/* Timeline grid lines */}
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-200" />
                          ))}
                        </div>
                        {/* Shifts as bars */}
                        {dayShifts.map(shift => {
                          const pos = getTimelinePosition(shift.start_time, shift.end_time);
                          const client = clients.find(c => c?.id === shift.client_id);
                          const isOnCall = shift.shift_type === 'on_call';
                          const shiftColor = isOnCall 
                            ? 'bg-amber-300 text-amber-900' 
                            : SHIFT_TYPE_COLORS[shift.shift_type]?.split(' ')[0] || 'bg-green-300';
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => onShiftClick?.(shift)}
                              className={`absolute top-1 h-12 rounded cursor-pointer hover:shadow-lg transition-shadow ${shiftColor}`}
                              style={{
                                left: `${pos.left}%`,
                                width: `${Math.max(pos.width, 3)}%`
                              }}
                            >
                              <div className="px-1 h-full flex flex-col justify-center text-xs overflow-hidden">
                                <span className="font-bold truncate">
                                  {client?.full_name || shift.location_name || 'Shift'}
                                </span>
                                <span className="truncate opacity-90">
                                  Care - {CARE_TYPE_LABELS[shift.shift_type] || shift.shift_type}
                                </span>
                                <span className="text-[10px] opacity-75">
                                  {shift.start_time} - {shift.end_time}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* WEEKLY VIEW (Original) */
        <>
          {/* Daily Metrics Row */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-gray-50">
            <div className="p-3 font-medium text-gray-600 border-r flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Metrics
            </div>
            {dailyMetrics.map((metric, idx) => {
              const isTodayDate = isToday(metric.date);
              return (
                <div 
                  key={idx} 
                  className={`p-2 text-center text-xs border-r ${isTodayDate ? 'bg-blue-50' : ''}`}
                >
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <p className="text-gray-400">Shifts</p>
                      <p className="font-semibold">{metric.totalShifts}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Hours</p>
                      <p className="font-semibold">{metric.hours.toFixed(1)}</p>
                    </div>
                  </div>
                  {metric.unfilledShifts > 0 && (
                    <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">
                      {metric.unfilledShifts} unfilled
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-white sticky top-0 z-20">
            <div className="p-3 font-medium text-gray-700 border-r flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff ({activeCarers.length})
            </div>
            {weekDays.map((day, idx) => {
              const isTodayDate = isToday(day);
              return (
                <div 
                  key={idx} 
                  className={`p-3 text-center border-r ${isTodayDate ? 'bg-blue-100 font-bold' : ''}`}
                >
                  <p className={`text-sm ${isTodayDate ? 'text-blue-800' : 'text-gray-500'}`}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-xl font-bold ${isTodayDate ? 'text-blue-900' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </p>
                  {isTodayDate && <Badge className="bg-blue-600 text-white text-xs mt-1">Today</Badge>}
                </div>
              );
            })}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-orange-50">
          <div className="p-3 font-medium text-orange-800 border-r flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Open Shifts
            <Badge className="bg-orange-200 text-orange-800 ml-auto">
              {weeklyMetrics.unfilledShifts}
            </Badge>
          </div>
          {weekDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const unassigned = getUnassignedShifts(day);
            
            return (
              <Droppable key={`unassigned_${dayStr}`} droppableId={`unassigned_${dayStr}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-1 min-h-[60px] border-r ${snapshot.isDraggingOver ? 'bg-orange-100' : ''}`}
                  >
                    <div className="flex flex-wrap gap-1">
                      {unassigned.map((shift, sIdx) => (
                        <Draggable key={shift.id} draggableId={shift.id} index={sIdx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onShiftClick?.(shift)}
                              className={`
                                px-2 py-1 rounded text-xs font-medium cursor-pointer
                                bg-orange-200 text-orange-800 border border-orange-300
                                hover:bg-orange-300 transition-all
                                ${snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-400' : ''}
                              `}
                            >
                              <div className="font-semibold">{shift.start_time}-{shift.end_time}</div>
                              <div className="text-orange-600 truncate max-w-[80px]">
                                {getShiftLabel(shift)}
                              </div>
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

            {/* Unassigned Shifts Row */}
            <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-orange-50">
              <div className="p-3 font-medium text-orange-800 border-r flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Open Shifts
                <Badge className="bg-orange-200 text-orange-800 ml-auto">
                  {weeklyMetrics.unfilledShifts}
                </Badge>
              </div>
              {weekDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const unassigned = getUnassignedShifts(day);
                
                return (
                  <Droppable key={`unassigned_${dayStr}`} droppableId={`unassigned_${dayStr}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-1 min-h-[60px] border-r ${snapshot.isDraggingOver ? 'bg-orange-100' : ''}`}
                      >
                        <div className="flex flex-wrap gap-1">
                          {unassigned.map((shift, sIdx) => (
                            <Draggable key={shift.id} draggableId={shift.id} index={sIdx}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onShiftClick?.(shift)}
                                  className={`
                                    px-2 py-1 rounded text-xs font-medium cursor-pointer
                                    bg-orange-200 text-orange-800 border border-orange-300
                                    hover:bg-orange-300 transition-all
                                    ${snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-400' : ''}
                                  `}
                                >
                                  <div className="font-semibold">{shift.start_time}-{shift.end_time}</div>
                                  <div className="text-orange-600 truncate max-w-[80px]">
                                    {getShiftLabel(shift)}
                                  </div>
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
            <div className="max-h-[600px] overflow-y-auto">
              {activeCarers.map((carer) => {
                const weekStats = getCarerWeeklyStats(carer.id);
                
                return (
                  <div key={carer.id} className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50">
                    {/* Carer Info */}
                    <div className="p-3 border-r flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {carer.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{carer.full_name}</h4>
                        <p className="text-xs text-gray-500">{carer.employment_type?.replace('_', ' ') || 'Care Worker'}</p>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1 bg-blue-50 text-blue-700">
                            € {formatHoursDisplay(weekStats.totalHours)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 bg-purple-50 text-purple-700">
                            P {formatHoursDisplay(weekStats.contractedHours)}
                          </Badge>
                        </div>
                        {/* Qualifications/Tags */}
                        {carer.qualifications?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {carer.qualifications?.slice(0, 2).map((q, i) => (
                              <Badge key={i} variant="outline" className="text-xs py-0 px-1">
                                {typeof q === 'string' ? q.substring(0, 10) : ''}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* Day Cells */}
                    {weekDays.map((day, idx) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getCarerDayShifts(carer.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <Droppable key={`${carer.id}_${dayStr}`} droppableId={`${carer.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 min-h-[80px] border-r transition-colors ${
                                isTodayDate ? 'bg-blue-50/50' : ''
                              } ${snapshot.isDraggingOver ? 'bg-green-50 ring-2 ring-inset ring-green-300' : ''}`}
                            >
                              <div className="space-y-1">
                                {dayShifts.map((shift, sIdx) => {
                                  const shiftColor = SHIFT_TYPE_COLORS[shift.shift_type] || 'bg-gray-200 text-gray-800';
                                  const client = clients.find(c => c?.id === shift.client_id);
                                  
                                  return (
                                    <Draggable key={shift.id} draggableId={shift.id} index={sIdx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          onClick={() => onShiftClick?.(shift)}
                                          className={`
                                            px-2 py-1.5 rounded text-xs cursor-pointer
                                            border ${shiftColor} ${STATUS_INDICATORS[shift.status] || ''}
                                            hover:shadow-md transition-all
                                            ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-400 z-50' : ''}
                                          `}
                                        >
                                          <div className="font-bold truncate">
                                            {client?.full_name || getShiftLabel(shift)}
                                          </div>
                                          <div className="text-[10px] opacity-90">
                                            Care - {CARE_TYPE_LABELS[shift.shift_type] || shift.shift_type?.replace('_', ' ')}
                                          </div>
                                          <div className="text-[10px] opacity-75">
                                            {shift.start_time} - {shift.end_time}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                              </div>
                              {provided.placeholder}
                              
                              {/* Add shift button (appears on hover) */}
                              {dayShifts.length === 0 && !snapshot.isDraggingOver && (
                                <button
                                  onClick={() => onAddShift?.({ carer_id: carer.id, date: dayStr })}
                                  className="w-full h-full min-h-[40px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500"
                                >
                                  <Plus className="w-4 h-4" />
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
          </DragDropContext>
        </>
      )}

      {/* Legend */}
      <div className="p-3 border-t bg-gray-50 flex items-center gap-4 text-xs">
        <span className="text-gray-500">Shift Types:</span>
        {Object.entries(SHIFT_TYPE_COLORS).slice(0, 6).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
            <span className="capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}