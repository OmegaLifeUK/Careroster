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
  Car
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, differenceInMinutes, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SHIFT_TYPE_COLORS = {
  morning: "bg-amber-400 text-amber-900 border-amber-500",
  afternoon: "bg-blue-400 text-blue-900 border-blue-500",
  evening: "bg-purple-400 text-purple-900 border-purple-500",
  night: "bg-slate-600 text-white border-slate-700",
  sleep_in: "bg-indigo-400 text-indigo-900 border-indigo-500",
  waking_night: "bg-slate-500 text-white border-slate-600",
  supervision: "bg-teal-400 text-teal-900 border-teal-500",
  shadowing: "bg-pink-400 text-pink-900 border-pink-500",
};

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
    const weekShifts = shifts.filter(s => {
      if (!s?.date || s.carer_id !== carerId) return false;
      const shiftDate = parseISO(s.date);
      return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
    });

    const totalHours = weekShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
    const contractedHours = 37.5; // Default, could come from carer record

    return {
      totalHours,
      contractedHours,
      variance: totalHours - contractedHours,
      shiftCount: weekShifts.length
    };
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

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-medium">Week</span>
              <Button variant="ghost" size="sm" className="font-semibold text-lg">
                {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
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

      {/* Unassigned Shifts Row */}
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
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className={`${weekStats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ●
                      </span>
                      <span>Weekly: {weekStats.totalHours.toFixed(0)}h / {weekStats.contractedHours}h</span>
                    </div>
                    {/* Qualifications/Tags */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {carer.qualifications?.slice(0, 2).map((q, i) => (
                        <Badge key={i} variant="outline" className="text-xs py-0 px-1">
                          {typeof q === 'string' ? q.substring(0, 10) : ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold">{shift.start_time}-{shift.end_time}</span>
                                        {shift.duration_hours && (
                                          <span className="text-[10px] opacity-75">{shift.duration_hours}h</span>
                                        )}
                                      </div>
                                      <div className="truncate font-medium mt-0.5">
                                        {getShiftLabel(shift)}
                                      </div>
                                      {shift.shift_type && (
                                        <Badge className="mt-1 text-[10px] py-0 px-1 bg-white/50">
                                          {shift.shift_type?.replace('_', ' ')}
                                        </Badge>
                                      )}
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