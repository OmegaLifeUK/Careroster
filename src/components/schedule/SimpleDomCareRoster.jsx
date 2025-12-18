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
  Car,
  Award,
  AlertTriangle
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { calculateTravelTime } from "./TravelTimeCalculator";

// Helper to extract postcode area and check distance
const getPostcodeDistance = (postcode1, postcode2) => {
  if (!postcode1 || !postcode2) return 999;
  
  const extractArea = (postcode) => {
    const match = postcode.trim().toUpperCase().match(/^([A-Z]+)/);
    return match ? match[1] : '';
  };
  
  const area1 = extractArea(postcode1);
  const area2 = extractArea(postcode2);
  
  if (area1 === area2) return 0;
  
  const proximityGroups = [
    ['M', 'SK', 'OL', 'BL', 'WN'],
    ['BN', 'RH', 'TN'],
    ['L', 'CH', 'WA'],
    ['B', 'WS', 'WV', 'DY'],
    ['LS', 'BD', 'HX', 'WF'],
    ['S', 'DN', 'HD'],
    ['NE', 'SR', 'DH'],
    ['GL', 'SN', 'BA'],
    ['NG', 'DE', 'LE'],
    ['CV', 'LE', 'NN'],
  ];
  
  for (const group of proximityGroups) {
    if (group.includes(area1) && group.includes(area2)) return 15;
  }
  
  return 100;
};

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
  availability = [],
  onVisitClick,
  onVisitUpdate,
  onAddVisit,
}) {
  console.log('🟢🟢🟢 SimpleDomCareRoster RENDERED', new Date().toISOString());
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
    const dayVisits = visits
      .filter(v => {
        const visitStaffId = v.staff_id || v.assigned_staff_id;
        return getVisitDate(v) === dayStr && visitStaffId === staffId;
      })
      .sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
    
    // Calculate travel times for display
    const staffMember = staff.find(s => s.id === staffId);
    return dayVisits.map((visit, idx) => {
      if (idx < dayVisits.length - 1) {
        const currentClient = clients.find(c => c.id === visit.client_id);
        const nextClient = clients.find(c => c.id === dayVisits[idx + 1].client_id);
        
        if (currentClient?.address && nextClient?.address && staffMember) {
          const travel = calculateTravelTime(
            currentClient.address,
            nextClient.address,
            staffMember.vehicle_type
          );
          return { ...visit, calculated_travel_to_next: travel.time };
        }
      }
      return visit;
    });
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
    console.log('═══════════════════════════════════════════════');
    console.log('[SimpleDomCareRoster] DRAG END TRIGGERED');
    console.log('[SimpleDomCareRoster] Result:', result);
    
    if (!result.destination) {
      console.log('[SimpleDomCareRoster] No destination - aborting');
      return;
    }
    
    const { draggableId, destination } = result;
    const visit = visits.find(v => v.id === draggableId);
    
    console.log('[SimpleDomCareRoster] Visit found:', visit?.id, visit?.client_id);
    
    if (!visit || !onVisitUpdate) {
      console.log('[SimpleDomCareRoster] No visit or update handler - aborting');
      return;
    }

    const [targetStaffId, targetDate] = destination.droppableId.split('_');
    const newStaffId = targetStaffId === 'unassigned' ? null : targetStaffId;

    console.log('[SimpleDomCareRoster] Destination:', {
      droppableId: destination.droppableId,
      targetStaffId,
      newStaffId,
      targetDate
    });

    // GEOGRAPHIC VALIDATION - Block distant assignments
    if (newStaffId) {
      const staffMember = staff.find(s => s.id === newStaffId);
      const client = clients.find(c => c.id === visit.client_id);

      console.log('[SimpleDomCareRoster] Staff entity check:', { 
        staffMember,
        hasAddress: !!staffMember?.address,
        postcode: staffMember?.address?.postcode
      });
      console.log('[SimpleDomCareRoster] Client entity check:', { 
        client,
        hasAddress: !!client?.address,
        postcode: client?.address?.postcode
      });
      
      console.log('');
      console.log('[GEOGRAPHIC VALIDATION STARTING]');
      console.log('[SimpleDomCareRoster] Staff Member:', {
        id: staffMember?.id,
        name: staffMember?.full_name,
        hasAddress: !!staffMember?.address,
        postcode: staffMember?.address?.postcode,
        fullAddress: staffMember?.address
      });
      console.log('[SimpleDomCareRoster] Client:', {
        id: client?.id,
        name: client?.full_name,
        hasAddress: !!client?.address,
        postcode: client?.address?.postcode,
        fullAddress: client?.address
      });
      
      // REQUIRE postcodes for validation
      if (!staffMember?.address?.postcode || !client?.address?.postcode) {
        console.log('[SimpleDomCareRoster] ❌ BLOCKING - Missing postcode data');
        console.log('═══════════════════════════════════════════════');
        alert(
          `⚠️ BLOCKED: Missing Postcode Data\n\n` +
          `Cannot assign visit - postcode information is required for both staff and client.\n\n` +
          `${!staffMember?.address?.postcode ? `Staff ${staffMember?.full_name || 'Unknown'} needs a postcode.\n` : ''}` +
          `${!client?.address?.postcode ? `Client ${client?.full_name || 'Unknown'} needs a postcode.\n` : ''}\n` +
          `Please update the missing information before assigning.`
        );
        return;
      }
      
      const distance = getPostcodeDistance(staffMember.address.postcode, client.address.postcode);
      
      console.log('[SimpleDomCareRoster] Distance calculated:', distance);
      console.log('');
      
      if (distance >= 100) {
        console.log('[SimpleDomCareRoster] ❌❌❌ BLOCKING ASSIGNMENT - Different regions');
        console.log('═══════════════════════════════════════════════');
        alert(
          `🚫 BLOCKED: Geographic Mismatch\n\n` +
          `Staff: ${staffMember.full_name}\nLocation: ${staffMember.address.postcode}\n\n` +
          `Client: ${client.full_name}\nLocation: ${client.address.postcode}\n\n` +
          `These postcodes are in completely different regions (100+ miles apart).\n` +
          `Please assign local staff only.`
        );
        return;
      }
      
      console.log('[SimpleDomCareRoster] ✅ Allowing assignment - distance OK');
    }
    console.log('═══════════════════════════════════════════════');

    const updates = {
      staff_id: newStaffId,
      assigned_staff_id: newStaffId,
      status: newStaffId ? 'published' : 'draft'
    };

    console.log('[SimpleDomCareRoster] Applying updates:', updates);
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

  // Calculate staff metrics for a specific day
  const getStaffDayMetrics = (staffId, day) => {
    const dayVisits = getStaffDayVisits(staffId, day);
    const totalHours = dayVisits.reduce((sum, v) => sum + (v.duration_minutes || 60) / 60, 0);
    const travelHours = dayVisits.reduce((sum, v) => sum + (v.estimated_travel_to_next || v.calculated_travel_to_next || 0) / 60, 0);
    
    // Get contracted hours for this day
    const dayOfWeek = day.getDay();
    const staffAvailability = availability.filter(a => 
      a.carer_id === staffId && 
      a.availability_type === 'working_hours' &&
      a.day_of_week === dayOfWeek
    );
    
    let contractedHours = 0;
    staffAvailability.forEach(avail => {
      if (avail.start_time && avail.end_time) {
        const [startH, startM] = avail.start_time.split(':').map(Number);
        const [endH, endM] = avail.end_time.split(':').map(Number);
        contractedHours += ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
      }
    });

    return { totalHours, travelHours, contractedHours, visitsCount: dayVisits.length };
  };

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
          {activeStaff.map((staffMember) => {
            // Calculate weekly totals for this staff
            const weeklyMetrics = weekDays.map(day => getStaffDayMetrics(staffMember.id, day));
            const weeklyTotalHours = weeklyMetrics.reduce((sum, m) => sum + m.totalHours, 0);
            const weeklyTotalVisits = weeklyMetrics.reduce((sum, m) => sum + m.visitsCount, 0);
            
            return (
            <div
              key={staffMember.id}
              className="grid grid-cols-[200px_repeat(7,minmax(150px,1fr))] border-b hover:bg-gray-50"
            >
              <div className="p-2 border-r">
                <div className="flex items-start gap-2">
                  <div className="relative flex-shrink-0">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name || 'S')}&background=14b8a6&color=fff&size=36`}
                      alt={staffMember.full_name}
                      className="w-9 h-9 rounded-full ring-2 ring-white shadow"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate text-xs leading-tight">{staffMember.full_name}</h4>
                    
                    {/* Core Metrics */}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {/* Weekly Hours */}
                      <div className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-teal-600" />
                        <span className="text-[10px] font-bold text-teal-700">{weeklyTotalHours.toFixed(1)}h</span>
                      </div>
                      
                      {/* Transport */}
                      {staffMember.vehicle_type && (
                        <div className="flex items-center gap-0.5">
                          <Car className="w-3 h-3 text-blue-600" />
                          <span className="text-[10px] text-gray-600">{staffMember.vehicle_type}</span>
                        </div>
                      )}
                      
                      {/* Qualifications */}
                      {staffMember.qualifications && staffMember.qualifications.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          <Award className="w-3 h-3 text-indigo-600" />
                          <span className="text-[10px] text-gray-600">{staffMember.qualifications.length}</span>
                        </div>
                      )}
                      
                      {/* Area */}
                      {staffMember.address?.postcode && (
                        <div className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-purple-600" />
                          <span className="text-[10px] text-gray-600">{staffMember.address.postcode.split(' ')[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Row */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] font-semibold text-teal-700">{weeklyTotalVisits} visits</span>
                    </div>
                  </div>
                </div>
              </div>

              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayVisits = getStaffDayVisits(staffMember.id, day);
                const dayMetrics = getStaffDayMetrics(staffMember.id, day);
                
                const hoursColor = dayMetrics.totalHours > 12 ? 'text-red-600' : 
                                   dayMetrics.totalHours > 10 ? 'text-amber-600' : 'text-emerald-600';
                const capacityPercent = dayMetrics.contractedHours > 0 
                  ? Math.round((dayMetrics.totalHours / dayMetrics.contractedHours) * 100) 
                  : 0;

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
                        {/* Day Summary Header */}
                        {dayVisits.length > 0 && (
                          <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-200">
                            <div className="flex items-center gap-1">
                              <Clock className={`w-3 h-3 ${hoursColor}`} />
                              <span className={`text-[10px] font-bold ${hoursColor}`}>
                                {dayMetrics.totalHours.toFixed(1)}h
                              </span>
                              {dayMetrics.contractedHours > 0 && (
                                <span className="text-[10px] text-gray-500">
                                  ({capacityPercent}%)
                                </span>
                              )}
                            </div>
                            {dayMetrics.travelHours > 0 && (
                              <div className="flex items-center gap-0.5">
                                <Navigation className="w-2.5 h-2.5 text-blue-600" />
                                <span className="text-[10px] text-blue-600">{dayMetrics.travelHours.toFixed(1)}h</span>
                              </div>
                            )}
                          </div>
                        )}
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
                            {dayVisits[idx + 1] && (visit.estimated_travel_to_next > 0 || visit.calculated_travel_to_next > 0) && (
                              <TravelIndicator minutes={visit.estimated_travel_to_next || visit.calculated_travel_to_next} />
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
          );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}