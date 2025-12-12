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
              bg-white border rounded p-2 cursor-pointer transition-all text-xs
              ${snapshot.isDragging ? 'shadow-lg border-blue-500' : 'border-gray-200 hover:border-teal-400'}
              ${isExpanded ? 'ring-1 ring-teal-500' : ''}
            `}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate text-xs">{client?.full_name || 'Unknown'}</h4>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                  <span className="text-gray-400">•</span>
                  <span>{visit.duration_minutes}m</span>
                </div>
                {client?.address?.postcode && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="text-xs">{client.address.postcode.split(' ')[0]}</span>
                  </div>
                )}
              </div>
              {bestMatch && bestMatch.score > 0 && (
                <Badge className="bg-teal-500 text-white text-xs h-5">
                  {bestMatch.score}
                </Badge>
              )}
            </div>

            {visit.required_qualification_id && (
              <Badge variant="outline" className="text-xs">
                <Award className="w-3 h-3 mr-1" />
                Qualification Required
              </Badge>
            )}

            {isExpanded && topMatches.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <p className="text-xs font-semibold text-gray-700">AI Recommendations:</p>
                {topMatches.map((match, idx) => (
                  <div 
                    key={match.staff.id} 
                    className={`p-2 rounded text-xs ${
                      idx === 0 ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{match.staff.full_name}</span>
                      <Badge variant="outline" className="text-xs">{match.score} pts</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {match.reasons.map((r, i) => (
                        <Badge key={i} className="bg-emerald-100 text-emerald-700 text-xs">{r}</Badge>
                      ))}
                      {match.warnings.map((w, i) => (
                        <Badge key={i} className="bg-amber-100 text-amber-700 text-xs">{w}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <div className="grid grid-cols-[160px_1fr] min-h-[60px]">
              {/* Staff Info Panel */}
              <div className="border-r p-1.5 flex items-center gap-1.5">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name)}&background=14b8a6&color=fff&size=28`}
                  alt={staffMember.full_name}
                  className="w-7 h-7 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate text-xs leading-tight">{staffMember.full_name}</h4>
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor.indicator}`} />
                    <span className="text-xs text-gray-600">{totalHours.toFixed(1)}h</span>
                    {staffMember.vehicle_type && <Car className="w-3 h-3 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Timeline Panel */}
              <div className="p-1.5 relative">
                {dayVisits.length === 0 && !snapshot.isDraggingOver && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                    <span>Drop here</span>
                  </div>
                )}
                
                <div className="space-y-1">
                  {dayVisits.map((visit, idx) => (
                    <React.Fragment key={visit.id}>
                      <div
                        onClick={() => onVisitClick?.(visit)}
                        className="bg-teal-50 border border-teal-300 rounded p-1.5 cursor-pointer hover:shadow transition-all"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className="font-semibold text-gray-900 truncate text-xs">{visit.client?.full_name}</span>
                            {visit.client?.preferred_staff?.includes(staffMember.id) && (
                              <Heart className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                            <span className="text-gray-400">·</span>
                            <span>{visit.duration_minutes}m</span>
                          </div>
                        </div>
                      </div>

                      {visit.travelToNext > 0 && idx < dayVisits.length - 1 && (
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-px bg-blue-300" />
                          <span className="text-xs text-blue-600 font-medium">{visit.travelToNext}m</span>
                          <div className="flex-1 h-px bg-blue-300" />
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded border overflow-hidden">
        {/* TOP PANEL - Unallocated Visits */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="px-2 py-1 border-b bg-orange-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-bold text-xs">Unallocated ({unallocatedVisits.length})</span>
            </div>

            <div className="flex items-center gap-1 flex-wrap px-2 py-1">
              <Search className="w-3 h-3 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-6 text-xs w-32 border-0 focus-visible:ring-0 px-1"
              />
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-20 h-6 text-xs border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="morning">AM</SelectItem>
                  <SelectItem value="afternoon">PM</SelectItem>
                  <SelectItem value="evening">Eve</SelectItem>
                </SelectContent>
              </Select>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-20 h-6 text-xs border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unallocated Visits List */}
          <Droppable droppableId={`unallocated_${dateStr}`}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="p-1.5 max-h-[140px] overflow-y-auto"
              >
                {unallocatedVisits.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-xs">
                    <Shield className="w-8 h-8 mx-auto mb-1 opacity-30" />
                    <p>All allocated</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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

        {/* BOTTOM PANEL - Staff Timeline */}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-teal-600 text-white px-2 py-1 border-b flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs">Staff ({staff.filter(s => s.is_active !== false).length})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="text-xs">OK</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                <span className="text-xs">Warn</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                <span className="text-xs">Over</span>
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