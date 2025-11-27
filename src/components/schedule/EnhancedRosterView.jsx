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
  MoreHorizontal,
  Maximize2,
  Filter,
  Download
} from "lucide-react";
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
  onShiftClick,
  onShiftUpdate,
  onAddShift,
  locationName = "Care Home"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activePanel, setActivePanel] = useState("staff"); // "staff" | "clients" | "both"
  const { toast } = useToast();

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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const [targetCarerId, targetDate] = destination.droppableId.split('_');
    
    const shift = shifts.find(s => s.id === draggableId);
    if (!shift || !onShiftUpdate) return;

    const newCarerId = targetCarerId === 'unassigned' ? null : targetCarerId;
    onShiftUpdate(draggableId, { 
      carer_id: newCarerId,
      date: targetDate,
      status: newCarerId ? 'scheduled' : 'unfilled'
    });
    
    toast.success("Shift Updated", newCarerId 
      ? `Assigned to ${activeCarers.find(c => c.id === newCarerId)?.full_name}`
      : "Moved to unassigned"
    );
  };

  const getClientName = (clientId) => clients.find(c => c?.id === clientId)?.full_name || '';
  const getCarerName = (carerId) => carers.find(c => c?.id === carerId)?.full_name || 'Unassigned';

  const ShiftPill = ({ shift, showCarer = false, showClient = true }) => {
    const colors = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning;
    const label = showClient 
      ? (shift.location_name || getClientName(shift.client_id) || 'Shift')
      : (showCarer ? getCarerName(shift.carer_id) : shift.shift_type);

    return (
      <div
        onClick={() => onShiftClick?.(shift)}
        className={`
          px-2 py-1 rounded-md text-xs cursor-pointer transition-all
          ${colors.bg} ${colors.border} ${colors.text} border
          hover:shadow-md hover:scale-[1.02]
          ${!shift.carer_id ? 'border-dashed border-orange-400 bg-orange-50' : ''}
        `}
      >
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

          {/* Staff Section */}
          {(activePanel === "staff" || activePanel === "both") && (
            <div className={activePanel === "both" ? "border-b" : ""}>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Staff</span>
                <Badge className="bg-blue-100 text-blue-700 text-xs">{activeCarers.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeCarers.map(carer => {
                  const dayShifts = getCarerDayShifts(carer.id, selectedDate);
                  const weekHours = getCarerWeekHours(carer.id);
                  
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
                            <span className="text-xs text-gray-500">{weekHours.toFixed(1)}h this week</span>
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

          {/* Clients Section */}
          {(activePanel === "clients" || activePanel === "both") && (
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
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-700">Staff</span>
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

            {/* Staff Rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {activeCarers.map((carer) => {
                const weekHours = getCarerWeekHours(carer.id);
                
                return (
                  <div key={carer.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {carer.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{carer.full_name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{weekHours.toFixed(1)}h</span>
                          {carer.employment_type && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1">
                              {carer.employment_type.replace('_', ' ')}
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
                              <div className="space-y-1">
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
                              
                              {/* Add button on hover */}
                              <button
                                onClick={() => onAddShift?.({ carer_id: carer.id, date: dayStr })}
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50/50"
                              >
                                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                                  <Plus className="w-4 h-4" />
                                </div>
                              </button>
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                );
              })}
            </div>
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
    </div>
  );
}