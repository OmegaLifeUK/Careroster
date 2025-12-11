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
  Search,
  Plus,
  MapPin,
  Navigation,
  AlertCircle,
  Car
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { calculateTravelTime } from "./TravelTimeCalculator";

const STATUS_COLORS = {
  draft: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700" },
  published: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  in_progress: { bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  completed: { bg: "bg-slate-200", border: "border-slate-400", text: "text-slate-600" },
  cancelled: { bg: "bg-red-100", border: "border-red-300", text: "text-red-800" },
};

export default function SimpleDomCareRoster({
  visits = [],
  staff = [],
  clients = [],
  onVisitClick,
  onVisitUpdate,
  onAddVisit,
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const activeStaff = useMemo(() => {
    let filtered = staff.filter(s => s?.is_active !== false);
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [staff, searchQuery]);

  const getVisitDate = (visit) => {
    if (!visit) return null;
    if (visit.scheduled_start) {
      try {
        return format(new Date(visit.scheduled_start), 'yyyy-MM-dd');
      } catch { return null; }
    }
    return null;
  };

  const getVisitTime = (visit, field = 'scheduled_start') => {
    if (!visit?.[field]) return null;
    try {
      return format(new Date(visit[field]), 'HH:mm');
    } catch { return null; }
  };

  const getStaffDayVisits = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits
      .filter(v => {
        const visitStaffId = v.staff_id || v.assigned_staff_id;
        return getVisitDate(v) === dayStr && visitStaffId === staffId;
      })
      .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
  };

  const getUnassignedVisits = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits.filter(v => {
      return getVisitDate(v) === dayStr && !v.staff_id && !v.assigned_staff_id;
    });
  };

  const calculateAndUpdateTravelTimes = (staffId, date) => {
    setTimeout(() => {
      const staffVisits = visits
        .filter(v => {
          const vStaffId = v.staff_id || v.assigned_staff_id;
          return vStaffId === staffId && getVisitDate(v) === date;
        })
        .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));

      staffVisits.forEach((visit, idx) => {
        if (idx < staffVisits.length - 1) {
          const currentClient = clients.find(c => c.id === visit.client_id);
          const nextClient = clients.find(c => c.id === staffVisits[idx + 1].client_id);
          const staffMember = staff.find(s => s.id === staffId);

          if (currentClient?.address && nextClient?.address && staffMember) {
            const travel = calculateTravelTime(
              currentClient.address,
              nextClient.address,
              staffMember.vehicle_type
            );
            onVisitUpdate?.(visit.id, { estimated_travel_to_next: travel.time });
          }
        } else {
          onVisitUpdate?.(visit.id, { estimated_travel_to_next: 0 });
        }
      });
    }, 100);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const visit = visits.find(v => v.id === draggableId);
    if (!visit || !onVisitUpdate) return;

    const [targetStaffId, targetDate] = destination.droppableId.split('_');
    const newStaffId = targetStaffId === 'unassigned' ? null : targetStaffId;

    const updates = {
      staff_id: newStaffId,
      assigned_staff_id: newStaffId,
      status: newStaffId ? 'published' : 'draft'
    };

    onVisitUpdate(draggableId, updates);
    
    if (newStaffId) {
      calculateAndUpdateTravelTimes(newStaffId, targetDate);
    }

    toast.success(
      newStaffId 
        ? `Assigned to ${activeStaff.find(s => s.id === newStaffId)?.full_name}`
        : "Moved to unassigned"
    );
  };

  const VisitCard = ({ visit }) => {
    const colors = STATUS_COLORS[visit.status] || STATUS_COLORS.published;
    const client = clients.find(c => c.id === visit.client_id);
    const startTime = getVisitTime(visit);
    const isUnassigned = !visit.staff_id && !visit.assigned_staff_id;

    return (
      <div
        onClick={() => onVisitClick?.(visit)}
        className={`
          ${colors.bg} ${colors.border} border rounded-lg p-2 cursor-pointer
          hover:shadow-md transition-all
          ${isUnassigned ? 'border-2 border-dashed border-orange-400 bg-orange-50' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full ${colors.border.replace('border-', 'bg-')}`} />
            <span className="font-semibold text-sm truncate">{client?.full_name || 'Unknown'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-3 h-3" />
          <span>{startTime || 'No time'}</span>
          {visit.duration_minutes && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {visit.duration_minutes}m
            </Badge>
          )}
        </div>
        {client?.address?.postcode && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3" />
            <span>{client.address.postcode}</span>
          </div>
        )}
      </div>
    );
  };

  const TravelIndicator = ({ minutes }) => (
    <div className="flex items-center justify-center gap-1 py-1">
      <div className="flex-1 h-0.5 bg-blue-500" />
      <div className="flex items-center gap-1 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
        <Car className="w-3 h-3" />
        {minutes}m
      </div>
      <div className="flex-1 h-0.5 bg-blue-500" />
    </div>
  );

  const weekStats = useMemo(() => {
    const weekVisits = visits.filter(v => {
      const vDate = getVisitDate(v);
      if (!vDate) return false;
      try {
        const visitDate = parseISO(vDate);
        return visitDate >= currentWeekStart && visitDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    return {
      total: weekVisits.length,
      assigned: weekVisits.filter(v => v.staff_id || v.assigned_staff_id).length,
      unassigned: weekVisits.filter(v => !v.staff_id && !v.assigned_staff_id).length,
    };
  }, [visits, currentWeekStart]);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Visit Schedule</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 bg-white/20 rounded text-sm font-medium">
              {format(currentWeekStart, 'd MMM')} - {format(addDays(currentWeekStart, 6), 'd MMM yyyy')}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="text-white hover:bg-white/20"
            >
              Today
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-blue-200">Total:</span>
            <span className="ml-2 text-2xl font-bold">{weekStats.total}</span>
          </div>
          <div>
            <span className="text-blue-200">Assigned:</span>
            <span className="ml-2 text-xl font-bold text-green-300">{weekStats.assigned}</span>
          </div>
          <div>
            <span className="text-blue-200">Unassigned:</span>
            <span className="ml-2 text-xl font-bold text-orange-300">{weekStats.unassigned}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b bg-gray-50">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Roster Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto">
          {/* Column Headers */}
          <div className="grid grid-cols-[200px_repeat(7,minmax(150px,1fr))] border-b bg-gray-50 sticky top-0 z-10">
            <div className="p-3 border-r font-semibold text-sm">Staff</div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 border-r text-center ${
                  isToday(day) ? 'bg-blue-100 font-bold' : ''
                }`}
              >
                <div className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</div>
                <div className="text-xl font-bold mt-1">{format(day, 'd')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {visits.filter(v => getVisitDate(v) === format(day, 'yyyy-MM-dd')).length} visits
                </div>
              </div>
            ))}
          </div>

          {/* Unassigned Row */}
          <div className="grid grid-cols-[200px_repeat(7,minmax(150px,1fr))] border-b bg-orange-50">
            <div className="p-3 border-r flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="font-semibold text-sm">Unassigned</div>
                <div className="text-xs text-orange-700">Drag to assign</div>
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
                      className={`p-2 min-h-[100px] border-r space-y-2 ${
                        snapshot.isDraggingOver ? 'bg-orange-100' : ''
                      }`}
                    >
                      {unassigned.map((visit, idx) => (
                        <Draggable key={visit.id} draggableId={visit.id} index={idx}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <VisitCard visit={visit} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          {/* Staff Rows */}
          {activeStaff.map((staffMember) => (
            <div
              key={staffMember.id}
              className="grid grid-cols-[200px_repeat(7,minmax(150px,1fr))] border-b hover:bg-gray-50"
            >
              <div className="p-3 border-r flex items-center gap-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name || 'S')}&background=3b82f6&color=fff&size=40`}
                  alt={staffMember.full_name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{staffMember.full_name}</div>
                  {staffMember.vehicle_type && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      <Car className="w-3 h-3 mr-1" />
                      {staffMember.vehicle_type}
                    </Badge>
                  )}
                </div>
              </div>

              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayVisits = getStaffDayVisits(staffMember.id, day);

                return (
                  <Droppable
                    key={`${staffMember.id}_${dayStr}`}
                    droppableId={`${staffMember.id}_${dayStr}`}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 min-h-[100px] border-r space-y-2 relative group ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        }`}
                      >
                        {dayVisits.map((visit, idx) => (
                          <React.Fragment key={visit.id}>
                            <Draggable draggableId={visit.id} index={idx}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <VisitCard visit={visit} />
                                </div>
                              )}
                            </Draggable>
                            {visit.estimated_travel_to_next > 0 && dayVisits[idx + 1] && (
                              <TravelIndicator minutes={visit.estimated_travel_to_next} />
                            )}
                          </React.Fragment>
                        ))}
                        {provided.placeholder}
                        
                        {dayVisits.length === 0 && (
                          <button
                            onClick={() => onAddVisit?.({ staff_id: staffMember.id, scheduled_date: dayStr })}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-blue-50/50 transition-opacity"
                          >
                            <Plus className="w-6 h-6 text-blue-600" />
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}