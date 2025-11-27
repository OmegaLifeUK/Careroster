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
  MapPin,
  Navigation,
  Car
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const VISIT_STATUS_COLORS = {
  scheduled: "bg-blue-400 text-blue-900 border-blue-500",
  in_progress: "bg-green-400 text-green-900 border-green-500",
  completed: "bg-gray-300 text-gray-700 border-gray-400",
  cancelled: "bg-red-300 text-red-800 border-red-400",
  missed: "bg-orange-400 text-orange-900 border-orange-500",
};

export default function DomCareRosterView({
  visits = [],
  staff = [],
  clients = [],
  runs = [],
  onVisitClick,
  onVisitUpdate,
  onAddVisit,
  locationName = "Domiciliary Care"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
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
    const weekVisits = visits.filter(v => {
      if (!v?.scheduled_date) return false;
      try {
        const visitDate = parseISO(v.scheduled_date);
        return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const totalVisits = weekVisits.length;
    const completedVisits = weekVisits.filter(v => v.status === 'completed').length;
    const unassignedVisits = weekVisits.filter(v => !v.staff_id).length;
    const totalMileage = weekVisits.reduce((sum, v) => sum + (v.mileage || 0), 0);

    return {
      totalVisits,
      completedVisits,
      unassignedVisits,
      totalMileage,
      completionRate: totalVisits > 0 ? ((completedVisits / totalVisits) * 100).toFixed(0) : 0
    };
  }, [visits, currentWeekStart]);

  // Daily metrics
  const dailyMetrics = useMemo(() => {
    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayVisits = visits.filter(v => v?.scheduled_date === dayStr);
      const assignedVisits = dayVisits.filter(v => v.staff_id);
      
      return {
        date: day,
        totalVisits: dayVisits.length,
        assignedVisits: assignedVisits.length,
        unassignedVisits: dayVisits.length - assignedVisits.length,
        totalHours: dayVisits.reduce((sum, v) => sum + (v.duration_minutes || 0) / 60, 0)
      };
    });
  }, [weekDays, visits]);

  const getStaffDayVisits = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits
      .filter(v => v?.scheduled_date === dayStr && v.staff_id === staffId)
      .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
  };

  const getUnassignedVisits = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits
      .filter(v => v?.scheduled_date === dayStr && !v.staff_id)
      .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
  };

  const getStaffWeeklyStats = (staffId) => {
    const weekVisits = visits.filter(v => {
      if (!v?.scheduled_date || v.staff_id !== staffId) return false;
      try {
        const visitDate = parseISO(v.scheduled_date);
        return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const totalMinutes = weekVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
    const totalMileage = weekVisits.reduce((sum, v) => sum + (v.mileage || 0), 0);

    return {
      visitCount: weekVisits.length,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalMileage
    };
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c?.id === clientId);
    return client?.full_name || 'Unknown Client';
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const [targetStaffId, targetDate] = destination.droppableId.split('_');

    const visit = visits.find(v => v.id === draggableId);
    if (!visit) return;

    if (onVisitUpdate) {
      const newStaffId = targetStaffId === 'unassigned' ? null : targetStaffId;
      onVisitUpdate(draggableId, { 
        staff_id: newStaffId,
        scheduled_date: targetDate,
        status: newStaffId ? 'scheduled' : 'scheduled'
      });
      
      toast.success("Visit Updated", newStaffId 
        ? `Visit assigned to ${activeStaff.find(s => s.id === newStaffId)?.full_name || 'staff'}`
        : "Visit unassigned"
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-green-50 to-teal-50">
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
              Unassigned
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
            <Badge className="bg-green-100 text-green-700">
              <Navigation className="w-3 h-3 mr-1" />
              Dom Care
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-gray-500">Total Visits</p>
              <p className="font-bold text-lg">{weeklyMetrics.totalVisits}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Completed</p>
              <p className="font-bold text-lg text-green-600">{weeklyMetrics.completedVisits}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Unassigned</p>
              <p className={`font-bold text-lg ${weeklyMetrics.unassignedVisits > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {weeklyMetrics.unassignedVisits}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Total Mileage</p>
              <p className="font-bold text-lg">{weeklyMetrics.totalMileage} mi</p>
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
            <div key={idx} className={`p-2 text-center text-xs border-r ${isTodayDate ? 'bg-green-50' : ''}`}>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-gray-400">Visits</p>
                  <p className="font-semibold">{metric.totalVisits}</p>
                </div>
                <div>
                  <p className="text-gray-400">Hours</p>
                  <p className="font-semibold">{metric.totalHours.toFixed(1)}</p>
                </div>
              </div>
              {metric.unassignedVisits > 0 && (
                <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">
                  {metric.unassignedVisits} open
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
            <div key={idx} className={`p-3 text-center border-r ${isTodayDate ? 'bg-green-100 font-bold' : ''}`}>
              <p className={`text-sm ${isTodayDate ? 'text-green-800' : 'text-gray-500'}`}>
                {format(day, 'EEE')}
              </p>
              <p className={`text-xl font-bold ${isTodayDate ? 'text-green-900' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </p>
              {isTodayDate && <Badge className="bg-green-600 text-white text-xs mt-1">Today</Badge>}
            </div>
          );
        })}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Unassigned Row */}
        <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-orange-50">
          <div className="p-3 font-medium text-orange-800 border-r flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Unassigned Visits
            <Badge className="bg-orange-200 text-orange-800 ml-auto">
              {weeklyMetrics.unassignedVisits}
            </Badge>
          </div>
          {weekDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const unassigned = getUnassignedVisits(day);
            
            return (
              <Droppable key={`unassigned_${dayStr}`} droppableId={`unassigned_${dayStr}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-1 min-h-[50px] border-r ${snapshot.isDraggingOver ? 'bg-orange-100' : ''}`}
                  >
                    <div className="flex flex-wrap gap-1">
                      {unassigned.map((visit, vIdx) => (
                        <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onVisitClick?.(visit)}
                              className={`
                                px-2 py-1 rounded text-xs font-medium cursor-pointer
                                bg-orange-200 text-orange-800 border border-orange-300
                                hover:bg-orange-300 transition-all
                                ${snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-400' : ''}
                              `}
                            >
                              <div className="font-semibold">{visit.scheduled_start}</div>
                              <div className="text-orange-600 truncate max-w-[70px]">
                                {getClientName(visit.client_id)}
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {staffMember.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">{staffMember.full_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{weekStats.visitCount} visits</span>
                      <span>•</span>
                      <span>{weekStats.totalHours}h</span>
                    </div>
                    {staffMember.vehicle_type && (
                      <Badge variant="outline" className="text-xs py-0 px-1 mt-1">
                        <Car className="w-3 h-3 mr-1" />
                        {staffMember.vehicle_type}
                      </Badge>
                    )}
                  </div>
                </div>

                {weekDays.map((day, idx) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayVisits = getStaffDayVisits(staffMember.id, day);
                  const isTodayDate = isToday(day);

                  return (
                    <Droppable key={`${staffMember.id}_${dayStr}`} droppableId={`${staffMember.id}_${dayStr}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-1 min-h-[70px] border-r transition-colors ${
                            isTodayDate ? 'bg-green-50/50' : ''
                          } ${snapshot.isDraggingOver ? 'bg-green-50 ring-2 ring-inset ring-green-300' : ''}`}
                        >
                          <div className="space-y-1">
                            {dayVisits.map((visit, vIdx) => {
                              const statusColor = VISIT_STATUS_COLORS[visit.status] || 'bg-gray-200';
                              
                              return (
                                <Draggable key={visit.id} draggableId={visit.id} index={vIdx}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => onVisitClick?.(visit)}
                                      className={`
                                        px-2 py-1 rounded text-xs cursor-pointer border
                                        ${statusColor}
                                        hover:shadow-md transition-all
                                        ${snapshot.isDragging ? 'shadow-xl ring-2 ring-green-400 z-50' : ''}
                                      `}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold">{visit.scheduled_start}</span>
                                        {visit.duration_minutes && (
                                          <span className="text-[10px] opacity-75">{visit.duration_minutes}m</span>
                                        )}
                                      </div>
                                      <div className="truncate font-medium">
                                        {getClientName(visit.client_id)}
                                      </div>
                                      {visit.address && (
                                        <div className="flex items-center gap-1 text-[10px] opacity-75 truncate">
                                          <MapPin className="w-2 h-2" />
                                          {visit.address.postcode || visit.address.city}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          </div>
                          {provided.placeholder}
                          
                          {dayVisits.length === 0 && !snapshot.isDraggingOver && (
                            <button
                              onClick={() => onAddVisit?.({ staff_id: staffMember.id, scheduled_date: dayStr })}
                              className="w-full h-full min-h-[40px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-gray-400 hover:text-green-500"
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
        <span className="text-gray-500">Status:</span>
        {Object.entries(VISIT_STATUS_COLORS).slice(0, 5).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
            <span className="capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}