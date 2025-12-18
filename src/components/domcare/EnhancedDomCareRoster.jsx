import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper to estimate distance based on postcode area
const getPostcodeDistance = (postcode1, postcode2) => {
  if (!postcode1 || !postcode2) return 999;
  
  const area1 = postcode1.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  const area2 = postcode2.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  
  if (area1 === area2) return 0;
  
  const proximityGroups = [
    ['M', 'SK', 'OL', 'BL', 'WN'], // Greater Manchester
    ['BN', 'RH', 'TN'], // Brighton/Sussex
    ['L', 'CH', 'WA'], // Liverpool/Merseyside
    ['B', 'WS', 'WV', 'DY'], // Birmingham/West Midlands
    ['LS', 'BD', 'HX', 'WF'], // Leeds/West Yorkshire
    ['S', 'DN', 'HD'], // Sheffield/South Yorkshire
    ['NE', 'SR', 'DH'], // Newcastle/Tyne and Wear
    ['GL', 'SN', 'BA'], // Gloucestershire/Wiltshire
    ['NG', 'DE', 'LE'], // Nottingham/Derby/Leicester
    ['CV', 'LE', 'NN'], // Coventry/Warwickshire
  ];
  
  for (const group of proximityGroups) {
    if (group.includes(area1) && group.includes(area2)) return 15;
  }
  
  return 100;
};
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
import { optimizeRoute, calculateRouteCoordinates } from "../schedule/RouteOptimizer";
import RouteMapViewer from "./RouteMapViewer";

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
  const [optimizingStaffId, setOptimizingStaffId] = useState(null);
  const [routeOptimizations, setRouteOptimizations] = useState({});

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

    // Proximity - CRITICAL for domiciliary care
    if (client.address?.postcode && staffMember.address?.postcode) {
      const distance = getPostcodeDistance(staffMember.address.postcode, client.address.postcode);
      
      if (distance === 0) {
        score += 60; // Same postcode area = huge bonus
        reasons.push("Same postcode area");
      } else if (distance <= 15) {
        score += 30; // Same region = good
        reasons.push("Same region");
      } else if (distance >= 100) {
        score -= 150; // Different regions = massive penalty
        warnings.push("Very far from client");
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

    // GEOGRAPHIC VALIDATION - Check postcode distance
    const staffMember = staff.find(s => s.id === staffId);
    const client = clients.find(c => c.id === visit.client_id);
    
    if (staffMember?.address?.postcode && client?.address?.postcode) {
      const distance = getPostcodeDistance(staffMember.address.postcode, client.address.postcode);
      
      if (distance >= 100) {
        const proceed = window.confirm(
          `⚠️ GEOGRAPHIC MISMATCH WARNING!\n\n` +
          `Staff: ${staffMember.full_name} (${staffMember.address.postcode})\n` +
          `Client: ${client.full_name} (${client.address.postcode})\n\n` +
          `These locations are in different regions and may be hours apart.\n` +
          `This assignment is not recommended for efficient rostering.\n\n` +
          `Do you still want to proceed?`
        );
        if (!proceed) return;
      }
    }

    onVisitUpdate?.(visitId, {
      staff_id: staffId,
      assigned_staff_id: staffId,
      status: 'published'
    });

    // Trigger route optimization for the staff member
    setTimeout(() => handleOptimizeRoute(staffId), 500);
  };

  const handleOptimizeRoute = (staffId) => {
    const staffSchedule = staffSchedule.find(ss => ss.staff.id === staffId);
    if (!staffSchedule || staffSchedule.visits.length < 2) return;

    const optimized = optimizeRoute(
      staffSchedule.visits,
      staffSchedule.staff,
      clients
    );

    setRouteOptimizations(prev => ({
      ...prev,
      [staffId]: optimized
    }));
  };

  const handleApplyOptimizedRoute = (staffId) => {
    const optimization = routeOptimizations[staffId];
    if (!optimization) return;

    // Update visit sequence numbers based on optimized order
    optimization.optimizedVisits.forEach((visit, idx) => {
      onVisitUpdate?.(visit.id, {
        sequence_number: idx + 1
      });
    });

    setOptimizingStaffId(null);
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
              flex-shrink-0 w-40 bg-white border-2 rounded p-1.5 cursor-move transition-all
              ${snapshot.isDragging ? 'shadow-xl border-teal-500 rotate-2' : 'border-orange-300 hover:border-orange-400 hover:shadow-md'}
              ${isExpanded ? 'ring-2 ring-teal-400' : ''}
            `}
          >
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-bold text-gray-900 text-xs leading-tight">{client?.full_name || 'Unknown'}</h4>
                {bestMatch && bestMatch.score > 0 && (
                  <Badge className="bg-teal-500 text-white text-[10px] px-1 py-0 leading-tight">
                    {bestMatch.score}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-700">
                <Clock className="w-3 h-3 text-orange-600" />
                <span className="font-medium">{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                <span className="text-gray-400">•</span>
                <span className="font-medium">{visit.duration_minutes}m</span>
              </div>
              {client?.address?.postcode && (
                <div className="flex items-center gap-0.5 text-[10px] text-gray-600">
                  <MapPin className="w-2.5 h-2.5 text-gray-400" />
                  <span>{client.address.postcode.split(' ')[0]}</span>
                </div>
              )}
              {bestMatch && bestMatch.score > 0 && (
                <div className="text-[10px] text-teal-700 font-medium truncate">
                  → {bestMatch.staff.full_name.split(' ')[0]}
                </div>
              )}

              {isExpanded && topMatches.length > 0 && (
                <div className="mt-1 pt-1 border-t border-gray-200 space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-700 mb-0.5">Best:</p>
                  {topMatches.slice(0, 2).map((match, idx) => (
                    <div 
                      key={match.staff.id} 
                      className={`p-1 rounded text-[10px] ${
                        idx === 0 ? 'bg-teal-50 border border-teal-300' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{match.staff.full_name.split(' ')[0]}</span>
                        <Badge className="bg-teal-600 text-white text-[9px] px-1 py-0">{match.score}</Badge>
                      </div>
                      <div className="text-[9px] text-emerald-700 truncate">
                        {match.reasons.slice(0, 2).join(', ')}
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
    
    const hasOptimization = routeOptimizations[staffMember.id];
    const showOptimizationBadge = hasOptimization && hasOptimization.savings > 0;
    
    // Calculate contracted/available hours from availability data
    const dayOfWeek = selectedDate.getDay();
    const staffAvailabilityToday = availability.filter(a => 
      a.carer_id === staffMember.id && 
      a.availability_type === 'working_hours' &&
      a.day_of_week === dayOfWeek
    );
    
    let contractedHours = 0;
    staffAvailabilityToday.forEach(avail => {
      if (avail.start_time && avail.end_time) {
        const [startH, startM] = avail.start_time.split(':').map(Number);
        const [endH, endM] = avail.end_time.split(':').map(Number);
        contractedHours += ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
      }
    });
    
    const availableForMore = contractedHours > totalHours;
    const capacityPercent = contractedHours > 0 ? Math.round((totalHours / contractedHours) * 100) : 0;
    
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
            <div className="grid grid-cols-[220px_1fr] min-h-[60px]">
              {/* Staff Info Panel */}
              <div className="border-r bg-white p-1.5 flex items-start gap-2">
                <div className="relative flex-shrink-0">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.full_name)}&background=14b8a6&color=fff&size=36`}
                    alt={staffMember.full_name}
                    className="w-9 h-9 rounded-full ring-2 ring-white shadow"
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColor.indicator}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate text-xs leading-tight">{staffMember.full_name}</h4>
                  
                  {/* Core Metrics Row */}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {/* Hours: Scheduled vs Contracted */}
                    <div className="flex items-center gap-0.5">
                      <Clock className={`w-3 h-3 ${hoursColor}`} />
                      <span className={`text-[10px] font-bold ${hoursColor}`}>{totalHours.toFixed(1)}h</span>
                      {contractedHours > 0 ? (
                        <span className="text-[10px] text-gray-500">/{contractedHours.toFixed(1)}h ({capacityPercent}%)</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">/no shift</span>
                      )}
                    </div>
                    
                    {/* Transport */}
                    {staffMember.vehicle_type && staffMember.vehicle_type !== 'walking' && (
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

                  {/* Status Indicators Row */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-semibold text-teal-700">{dayVisits.length} visits</span>
                    {travelHours > 0 && (
                      <span className="text-[10px] text-blue-600">🚗{travelHours.toFixed(1)}h</span>
                    )}
                    {showOptimizationBadge && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOptimizingStaffId(staffMember.id);
                        }}
                        className="flex items-center gap-0.5 bg-green-100 text-green-700 text-[9px] h-3.5 px-1 rounded hover:bg-green-200 transition-colors"
                      >
                        <Navigation className="w-2 h-2" />
                        Save {hasOptimization.savings}m
                      </button>
                    )}
                    {dayVisits.length >= 3 && !hasOptimization && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOptimizeRoute(staffMember.id);
                        }}
                        className="flex items-center gap-0.5 bg-blue-100 text-blue-700 text-[9px] h-3.5 px-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        <Navigation className="w-2 h-2" />
                        Optimize
                      </button>
                    )}
                    {availableForMore && contractedHours > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[9px] h-3.5 px-1 leading-none">
                        +{(contractedHours - totalHours).toFixed(1)}h available
                      </Badge>
                    )}
                    {wtr?.summary?.critical > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-[9px] h-3.5 px-1 leading-none">
                        <AlertTriangle className="w-2 h-2 mr-0.5" />WTR!
                      </Badge>
                    )}
                    {wtr?.summary?.warnings > 0 && !wtr?.summary?.critical && (
                      <Badge className="bg-amber-100 text-amber-700 text-[9px] h-3.5 px-1 leading-none">
                        ⚠️
                      </Badge>
                    )}
                  </div>
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
                        className="inline-flex items-center gap-1 bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-300 rounded px-2 py-1 cursor-pointer hover:shadow-md hover:border-teal-400 transition-all"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-0.5">
                            <span className="font-bold text-gray-900 text-xs">{visit.client?.full_name}</span>
                            {visit.client?.preferred_staff?.includes(staffMember.id) && (
                              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-700">
                            <Clock className="w-2.5 h-2.5 text-teal-600" />
                            <span className="font-medium">{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                            <span className="text-gray-400">-</span>
                            <span className="font-medium">{format(new Date(visit.scheduled_end), 'HH:mm')}</span>
                            <Badge className="bg-teal-600 text-white text-[9px] px-1 py-0 leading-none">
                              {visit.duration_minutes}m
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {visit.travelToNext > 0 && idx < dayVisits.length - 1 && (
                        <div className="inline-flex items-center gap-0.5 px-1">
                          <Navigation className="w-2.5 h-2.5 text-blue-600" />
                          <span className="text-[10px] font-bold text-blue-700">{visit.travelToNext}m</span>
                          <div className="w-6 h-0.5 bg-blue-400" />
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

  // Get optimization data for map viewer
  const selectedOptimization = optimizingStaffId ? routeOptimizations[optimizingStaffId] : null;
  const selectedStaff = optimizingStaffId ? staff.find(s => s.id === optimizingStaffId) : null;
  const routeCoordinates = selectedOptimization ? 
    calculateRouteCoordinates(selectedOptimization.optimizedVisits, clients) : [];

  return (
    <>
      {optimizingStaffId && selectedOptimization && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl">
            <RouteMapViewer
              staffMember={selectedStaff}
              routeData={selectedOptimization}
              coordinates={routeCoordinates}
              onClose={() => setOptimizingStaffId(null)}
              onApplyRoute={() => handleApplyOptimizedRoute(optimizingStaffId)}
            />
          </div>
        </div>
      )}

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
    </>
  );
}