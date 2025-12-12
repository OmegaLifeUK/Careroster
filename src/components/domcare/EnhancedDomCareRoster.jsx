import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Clock, 
  Award, 
  Heart, 
  Car,
  AlertTriangle,
  TrendingUp,
  User,
  Navigation,
  Shield
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { calculateTravelTime } from "../schedule/TravelTimeCalculator";
import { checkWorkingTimeCompliance } from "../schedule/WorkingTimeRegulations";

const CARE_COLORS = {
  ideal: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", indicator: "bg-emerald-500" },
  good: { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700", indicator: "bg-teal-400" },
  caution: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", indicator: "bg-amber-500" },
  violation: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", indicator: "bg-red-500" }
};

export default function EnhancedDomCareRoster({
  selectedDate,
  visits = [],
  staff = [],
  clients = [],
  availability = [],
  leaveRequests = [],
  onVisitUpdate,
  onVisitClick
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [selectedVisit, setSelectedVisit] = useState(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Get unallocated visits for selected date
  const unallocatedVisits = useMemo(() => {
    return visits.filter(v => {
      if (!v.scheduled_start) return false;
      const vDate = format(new Date(v.scheduled_start), 'yyyy-MM-dd');
      if (vDate !== dateStr) return false;
      if (v.staff_id || v.assigned_staff_id) return false;
      
      let matches = true;
      if (searchQuery) {
        const client = clients.find(c => c.id === v.client_id);
        matches = client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (timeFilter !== "all") {
        const hour = parseInt(format(new Date(v.scheduled_start), 'HH'));
        if (timeFilter === "morning" && (hour < 6 || hour >= 12)) matches = false;
        if (timeFilter === "afternoon" && (hour < 12 || hour >= 18)) matches = false;
        if (timeFilter === "evening" && (hour < 18)) matches = false;
      }
      if (areaFilter !== "all") {
        const client = clients.find(c => c.id === v.client_id);
        const postcode = client?.address?.postcode?.split(' ')[0];
        if (postcode !== areaFilter) matches = false;
      }
      
      return matches;
    }).sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  }, [visits, dateStr, clients, searchQuery, timeFilter, areaFilter]);

  // Get staff with their daily visits
  const staffSchedule = useMemo(() => {
    return staff.filter(s => s.is_active !== false).map(s => {
      const dayVisits = visits
        .filter(v => {
          const vStaffId = v.staff_id || v.assigned_staff_id;
          if (!vStaffId || vStaffId !== s.id) return false;
          if (!v.scheduled_start) return false;
          const vDate = format(new Date(v.scheduled_start), 'yyyy-MM-dd');
          return vDate === dateStr;
        })
        .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
        .map((v, idx, arr) => {
          const client = clients.find(c => c.id === v.client_id);
          let travelToNext = 0;
          
          if (idx < arr.length - 1 && client?.address && s.address) {
            const nextClient = clients.find(c => c.id === arr[idx + 1].client_id);
            if (nextClient?.address) {
              const travel = calculateTravelTime(client.address, nextClient.address, s.vehicle_type);
              travelToNext = travel.time;
            }
          }
          
          return { ...v, client, travelToNext };
        });

      const totalHours = dayVisits.reduce((sum, v) => sum + (v.duration_minutes || 60) / 60, 0);
      const travelHours = dayVisits.reduce((sum, v) => sum + (v.travelToNext || 0) / 60, 0);
      const wtr = checkWorkingTimeCompliance(s, dayVisits);

      return { staff: s, visits: dayVisits, totalHours, travelHours, wtr };
    }).sort((a, b) => a.staff.full_name.localeCompare(b.staff.full_name));
  }, [staff, visits, clients, dateStr]);

  // Calculate AI match score for visit + staff
  const calculateMatchScore = (visit, staffMember, currentStaffSchedule) => {
    let score = 0;
    const reasons = [];
    const warnings = [];

    const client = clients.find(c => c.id === visit.client_id);
    if (!client) return { score: 0, reasons, warnings };

    // Continuity of care (highest priority)
    if (client.preferred_staff?.includes(staffMember.id)) {
      score += 40;
      reasons.push("Preferred carer");
    }

    // Skills match
    if (visit.required_qualification_id) {
      if (staffMember.qualifications?.includes(visit.required_qualification_id)) {
        score += 30;
        reasons.push("Qualified");
      } else {
        score -= 100;
        warnings.push("Missing qualification");
        return { score, reasons, warnings };
      }
    }

    // Proximity
    if (client.address?.postcode && staffMember.address?.postcode) {
      const clientPrefix = client.address.postcode.split(' ')[0];
      const staffPrefix = staffMember.address.postcode.split(' ')[0];
      if (clientPrefix === staffPrefix) {
        score += 20;
        reasons.push("Same area");
      } else if (clientPrefix.substring(0, 2) === staffPrefix.substring(0, 2)) {
        score += 10;
        reasons.push("Nearby");
      } else {
        score -= 5;
      }
    }

    // Vehicle availability
    if (staffMember.vehicle_type === 'car') {
      score += 5;
      reasons.push("Has vehicle");
    }

    // Check WTR compliance using passed schedule data
    if (currentStaffSchedule) {
      const staffSched = currentStaffSchedule.find(ss => ss.staff.id === staffMember.id);
      if (staffSched) {
        const projectedHours = staffSched.totalHours + (visit.duration_minutes || 60) / 60;
        if (projectedHours > 12) {
          score -= 30;
          warnings.push("Exceeds 12h/day");
        } else if (projectedHours > 10) {
          score -= 10;
          warnings.push("Long day");
        }
      }
    }

    return { score, reasons, warnings };
  };

  // Get top matches for a visit
  const getTopMatches = (visit) => {
    return staff
      .filter(s => s.is_active !== false)
      .map(s => ({
        staff: s,
        ...calculateMatchScore(visit, s, staffSchedule)
      }))
      .filter(m => m.score > -50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const visitId = result.draggableId;
    const [staffId, date] = result.destination.droppableId.split('_');
    
    if (staffId === 'unallocated') return;

    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    onVisitUpdate?.(visitId, {
      staff_id: staffId,
      assigned_staff_id: staffId,
      status: 'published'
    });
  };

  const UnallocatedVisitCard = ({ visit, index }) => {
    const client = clients.find(c => c.id === visit.client_id);
    const topMatches = getTopMatches(visit);
    const bestMatch = topMatches[0];
    const isExpanded = selectedVisit === visit.id;

    return (
      <Draggable draggableId={visit.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setSelectedVisit(isExpanded ? null : visit.id)}
            className={`
              flex-shrink-0 w-48 bg-white border-2 rounded-lg p-2.5 cursor-move transition-all
              ${snapshot.isDragging ? 'shadow-xl border-teal-500 rotate-2' : 'border-orange-300 hover:border-orange-400 hover:shadow-md'}
              ${isExpanded ? 'ring-2 ring-teal-400' : ''}
            `}
          >
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-gray-900 text-sm leading-tight">{client?.full_name || 'Unknown'}</h4>
                {bestMatch && bestMatch.score > 0 && (
                  <div className="flex flex-col items-end">
                    <Badge className="bg-teal-500 text-white text-xs px-1.5 py-0.5">
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                      {bestMatch.score}
                    </Badge>
                    <span className="text-xs text-gray-500 mt-0.5">{bestMatch.staff.full_name.split(' ')[0]}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-700">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span className="font-medium">{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                <span className="text-gray-400">•</span>
                <span className="font-medium">{visit.duration_minutes}min</span>
              </div>
              {client?.address?.postcode && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{client.address.postcode}</span>
                </div>
              )}
              {visit.required_qualification_id && (
                <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1">
                  <Award className="w-3 h-3" />
                  <span>Qualified staff only</span>
                </div>
              )}

              {isExpanded && topMatches.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  <p className="text-xs font-bold text-gray-700 mb-1">Best Matches:</p>
                  {topMatches.slice(0, 2).map((match, idx) => (
                    <div 
                      key={match.staff.id} 
                      className={`p-1.5 rounded text-xs ${
                        idx === 0 ? 'bg-teal-50 border border-teal-300' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">{match.staff.full_name}</span>
                        <Badge className="bg-teal-600 text-white text-xs px-1 py-0">{match.score}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {match.reasons.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-xs text-emerald-700">• {r}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const StaffTimelineRow = ({ staffSchedule }) => {
    const { staff: staffMember, visits: dayVisits, totalHours, travelHours, wtr } = staffSchedule;
    
    const hoursColor = totalHours > 12 ? 'text-red-600' : totalHours > 10 ? 'text-amber-600' : 'text-emerald-600';
    const wtrStatus = wtr?.summary?.critical > 0 ? 'violation' : 
                      wtr?.summary?.warnings > 0 ? 'caution' : 'ideal';
    const statusColor = CARE_COLORS[wtrStatus];

    return (
      <Droppable droppableId={`${staffMember.id}_${dateStr}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`border-b transition-colors ${
              snapshot.isDraggingOver ? 'bg-teal-50' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="grid grid-cols-[200px_1fr] min-h-[70px]">
              {/* Staff Info Panel */}
              <div className="border-r bg-white p-2 flex items-center gap-2">
                <div className="relative">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name)}&background=14b8a6&color=fff&size=40`}
                    alt={staffMember.full_name}
                    className="w-10 h-10 rounded-full ring-2 ring-white shadow"
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor.indicator}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate text-sm">{staffMember.full_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-700">{totalHours.toFixed(1)}h</span>
                      <span className="text-xs text-gray-400">/ {staffMember.max_hours_per_day || 12}h</span>
                    </div>
                    {staffMember.vehicle_type && (
                      <Car className="w-3.5 h-3.5 text-teal-600" />
                    )}
                  </div>
                  {wtr?.summary?.critical > 0 && (
                    <Badge className="bg-red-100 text-red-700 text-xs mt-1 h-4 px-1">
                      <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                      WTR
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timeline Panel */}
              <div className="p-2 relative bg-gradient-to-r from-gray-50 to-white">
                {dayVisits.length === 0 && !snapshot.isDraggingOver && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    <span>Drop visits here to assign</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {dayVisits.map((visit, idx) => (
                    <React.Fragment key={visit.id}>
                      <div
                        onClick={() => onVisitClick?.(visit)}
                        className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300 rounded-lg px-3 py-2 cursor-pointer hover:shadow-md hover:border-teal-400 transition-all"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 text-sm">{visit.client?.full_name}</span>
                            {visit.client?.preferred_staff?.includes(staffMember.id) && (
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-700 mt-0.5">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-teal-600" />
                              <span className="font-medium">{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                              <span>-</span>
                              <span className="font-medium">{format(new Date(visit.scheduled_end), 'HH:mm')}</span>
                            </div>
                            <Badge className="bg-teal-600 text-white text-xs px-1.5 py-0">
                              {visit.duration_minutes}min
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {visit.travelToNext > 0 && idx < dayVisits.length - 1 && (
                        <div className="inline-flex items-center gap-1 px-2">
                          <Navigation className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-bold text-blue-700">{visit.travelToNext}m</span>
                          <div className="w-8 h-0.5 bg-blue-400" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            </div>
          </div>
        )}
      </Droppable>
    );
  };

  const areas = useMemo(() => {
    const postcodes = new Set();
    clients.forEach(c => {
      const prefix = c.address?.postcode?.split(' ')[0];
      if (prefix) postcodes.add(prefix);
    });
    return Array.from(postcodes).sort();
  }, [clients]);

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded border overflow-hidden">
        {/* Date Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-center border-b">
          <h2 className="text-lg font-bold">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            {isToday && <span className="ml-3 text-sm bg-white/30 px-3 py-1 rounded-full">TODAY</span>}
          </h2>
        </div>

        {/* TOP PANEL - Unallocated Visits */}
        <div className="flex-shrink-0 border-b">
          <div className="px-3 py-1.5 bg-orange-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-bold text-sm">Unallocated ({unallocatedVisits.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input
                  placeholder="Search client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 text-xs w-40 pl-7 bg-white/90"
                />
              </div>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-24 h-7 text-xs bg-white/90">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Times</SelectItem>
                  <SelectItem value="morning">AM</SelectItem>
                  <SelectItem value="afternoon">PM</SelectItem>
                  <SelectItem value="evening">Eve</SelectItem>
                </SelectContent>
              </Select>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-24 h-7 text-xs bg-white/90">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unallocated Visits List */}
          <Droppable droppableId={`unallocated_${dateStr}`} direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`p-2 ${unallocatedVisits.length > 0 ? 'max-h-[120px]' : 'h-16'} overflow-x-auto overflow-y-hidden bg-gradient-to-b from-orange-50 to-white ${snapshot.isDraggingOver ? 'bg-orange-100' : ''}`}
              >
                {unallocatedVisits.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    <Shield className="w-5 h-5 mr-2 opacity-30" />
                    <p>All visits assigned for {format(selectedDate, 'EEEE, MMM d')}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 pb-1">
                    {unallocatedVisits.map((visit, idx) => (
                      <UnallocatedVisitCard key={visit.id} visit={visit} index={idx} />
                    ))}
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* BOTTOM PANEL - Staff Schedules */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-3 py-1.5 border-b shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-bold text-sm">Care Workers ({staff.filter(s => s.is_active !== false).length})</span>
              {isToday && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">TODAY</span>}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span>Under capacity</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full" />
                <span>Near limit</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span>Overallocated</span>
              </div>
            </div>
          </div>

          {staffSchedule.map(ss => (
            <StaffTimelineRow key={ss.staff.id} staffSchedule={ss} />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}