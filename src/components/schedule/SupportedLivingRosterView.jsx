import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
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
  Plus,
  Home,
  Moon,
  Sun
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SHIFT_TYPE_COLORS = {
  visiting_support: "bg-blue-400 text-blue-900 border-blue-500",
  core_hours: "bg-green-400 text-green-900 border-green-500",
  sleep_in: "bg-indigo-400 text-indigo-900 border-indigo-500",
  waking_night: "bg-slate-600 text-white border-slate-700",
  on_call: "bg-orange-400 text-orange-900 border-orange-500",
};

const SHIFT_TYPE_LABELS = {
  visiting_support: "Visiting",
  core_hours: "Core",
  sleep_in: "Sleep-In",
  waking_night: "Waking",
  on_call: "On-Call",
};

export default function SupportedLivingRosterView({
  shifts = [],
  staff = [],
  clients = [],
  properties = [],
  onShiftClick,
  onShiftUpdate,
  onAddShift,
  locationName = "Supported Living"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [viewByProperty, setViewByProperty] = useState(false);
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

  // Weekly metrics
  const weeklyMetrics = useMemo(() => {
    const weekShifts = shifts.filter(s => {
      if (!s?.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const totalShifts = weekShifts.length;
    const filledShifts = weekShifts.filter(s => s.staff_id).length;
    const sleepIns = weekShifts.filter(s => s.shift_type === 'sleep_in').length;
    const wakingNights = weekShifts.filter(s => s.shift_type === 'waking_night').length;

    return {
      totalShifts,
      filledShifts,
      unfilledShifts: totalShifts - filledShifts,
      sleepIns,
      wakingNights,
      fillRate: totalShifts > 0 ? ((filledShifts / totalShifts) * 100).toFixed(0) : 100
    };
  }, [shifts, currentWeekStart]);

  const dailyMetrics = useMemo(() => {
    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s => s?.date === dayStr);
      const filledShifts = dayShifts.filter(s => s.staff_id);
      
      return {
        date: day,
        totalShifts: dayShifts.length,
        filledShifts: filledShifts.length,
        unfilledShifts: dayShifts.length - filledShifts.length,
        sleepIns: dayShifts.filter(s => s.shift_type === 'sleep_in').length
      };
    });
  }, [weekDays, shifts]);

  const getStaffDayShifts = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && s.staff_id === staffId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getUnassignedShifts = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts
      .filter(s => s?.date === dayStr && !s.staff_id)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getStaffWeeklyStats = (staffId) => {
    const weekShifts = shifts.filter(s => {
      if (!s?.date || s.staff_id !== staffId) return false;
      try {
        const shiftDate = parseISO(s.date);
        return shiftDate >= currentWeekStart && shiftDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const totalHours = weekShifts.reduce((sum, s) => {
      if (!s.start_time || !s.end_time) return sum;
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      let hours = (eh * 60 + em - sh * 60 - sm) / 60;
      if (hours < 0) hours += 24;
      return sum + hours;
    }, 0);

    return {
      shiftCount: weekShifts.length,
      totalHours: totalHours.toFixed(1),
      sleepIns: weekShifts.filter(s => s.shift_type === 'sleep_in').length
    };
  };

  const getPropertyName = (propertyId) => {
    const property = properties.find(p => p?.id === propertyId);
    return property?.property_name || 'Unknown';
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const [targetStaffId, targetDate] = destination.droppableId.split('_');

    const shift = shifts.find(s => s.id === draggableId);
    if (!shift) return;

    if (onShiftUpdate) {
      const newStaffId = targetStaffId === 'unassigned' ? null : targetStaffId;
      onShiftUpdate({ id: draggableId, data: { 
        staff_id: newStaffId,
        date: targetDate,
        status: newStaffId ? 'published' : 'draft'
      }});
      
      toast.success("Shift Updated", newStaffId 
        ? `Shift assigned to ${activeStaff.find(s => s.id === newStaffId)?.full_name || 'staff'}`
        : "Shift unassigned"
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
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
              variant={viewByProperty ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewByProperty(!viewByProperty)}
            >
              <Home className="w-4 h-4 mr-1" />
              By Property
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
            <Badge className="bg-indigo-100 text-indigo-700">
              <Home className="w-3 h-3 mr-1" />
              Supported Living
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-gray-500">Total Shifts</p>
              <p className="font-bold text-lg">{weeklyMetrics.totalShifts}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Fill Rate</p>
              <p className={`font-bold text-lg ${parseInt(weeklyMetrics.fillRate) < 80 ? 'text-orange-600' : 'text-green-600'}`}>
                {weeklyMetrics.fillRate}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Sleep-Ins</p>
              <p className="font-bold text-lg text-indigo-600">{weeklyMetrics.sleepIns}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Waking Nights</p>
              <p className="font-bold text-lg text-slate-600">{weeklyMetrics.wakingNights}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-gray-50">
        <div className="p-3 font-medium text-gray-600 border-r flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Daily Stats
        </div>
        {dailyMetrics.map((metric, idx) => {
          const isTodayDate = isToday(metric.date);
          return (
            <div key={idx} className={`p-2 text-center text-xs border-r ${isTodayDate ? 'bg-indigo-50' : ''}`}>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-gray-400">Shifts</p>
                  <p className="font-semibold">{metric.totalShifts}</p>
                </div>
                <div>
                  <p className="text-gray-400">Sleep</p>
                  <p className="font-semibold">{metric.sleepIns}</p>
                </div>
              </div>
              {metric.unfilledShifts > 0 && (
                <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">
                  {metric.unfilledShifts} open
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-white sticky top-0 z-20">
        <div className="p-3 font-medium text-gray-700 border-r flex items-center gap-2">
          <Users className="w-4 h-4" />
          Staff ({activeStaff.length})
        </div>
        {weekDays.map((day, idx) => {
          const isTodayDate = isToday(day);
          return (
            <div key={idx} className={`p-3 text-center border-r ${isTodayDate ? 'bg-indigo-100 font-bold' : ''}`}>
              <p className={`text-sm ${isTodayDate ? 'text-indigo-800' : 'text-gray-500'}`}>
                {format(day, 'EEE')}
              </p>
              <p className={`text-xl font-bold ${isTodayDate ? 'text-indigo-900' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </p>
              {isTodayDate && <Badge className="bg-indigo-600 text-white text-xs mt-1">Today</Badge>}
            </div>
          );
        })}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Unassigned Row */}
        <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-orange-50">
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
                    className={`p-1 min-h-[50px] border-r ${snapshot.isDraggingOver ? 'bg-orange-100' : ''}`}
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
                              <div className="font-semibold">{shift.start_time}</div>
                              <div className="text-orange-600 truncate max-w-[70px]">
                                {getPropertyName(shift.property_id)}
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
        <div className="max-h-[550px] overflow-y-auto">
          {activeStaff.map((staffMember) => {
            const weekStats = getStaffWeeklyStats(staffMember.id);
            
            return (
              <div key={staffMember.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50">
                <div className="p-3 border-r flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {staffMember.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">{staffMember.full_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{weekStats.shiftCount} shifts</span>
                      <span>•</span>
                      <span>{weekStats.totalHours}h</span>
                    </div>
                    {weekStats.sleepIns > 0 && (
                      <Badge variant="outline" className="text-xs py-0 px-1 mt-1">
                        <Moon className="w-3 h-3 mr-1" />
                        {weekStats.sleepIns} sleep-ins
                      </Badge>
                    )}
                  </div>
                </div>

                {weekDays.map((day, idx) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = getStaffDayShifts(staffMember.id, day);
                  const isTodayDate = isToday(day);

                  return (
                    <Droppable key={`${staffMember.id}_${dayStr}`} droppableId={`${staffMember.id}_${dayStr}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-1 min-h-[70px] border-r transition-colors ${
                            isTodayDate ? 'bg-indigo-50/50' : ''
                          } ${snapshot.isDraggingOver ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                        >
                          <div className="space-y-1">
                            {dayShifts.map((shift, sIdx) => {
                              const shiftColor = SHIFT_TYPE_COLORS[shift.shift_type] || 'bg-gray-200';
                              
                              return (
                                <Draggable key={shift.id} draggableId={shift.id} index={sIdx}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => onShiftClick?.(shift)}
                                      className={`
                                        px-2 py-1 rounded text-xs cursor-pointer border
                                        ${shiftColor}
                                        hover:shadow-md transition-all
                                        ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-400 z-50' : ''}
                                      `}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold">{shift.start_time}-{shift.end_time}</span>
                                      </div>
                                      <div className="truncate font-medium">
                                        {getPropertyName(shift.property_id)}
                                      </div>
                                      <Badge className="mt-1 text-[10px] py-0 px-1 bg-white/50">
                                        {SHIFT_TYPE_LABELS[shift.shift_type] || shift.shift_type}
                                      </Badge>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          </div>
                          {provided.placeholder}
                          
                          {dayShifts.length === 0 && !snapshot.isDraggingOver && (
                            <button
                              onClick={() => onAddShift?.({ staff_id: staffMember.id, date: dayStr })}
                              className="w-full h-full min-h-[40px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500"
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
        {Object.entries(SHIFT_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
            <span>{SHIFT_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}