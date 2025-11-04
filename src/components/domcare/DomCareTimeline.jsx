import React, { useState } from "react";
import { format, parseISO, addDays, isSameDay, differenceInMinutes } from "date-fns";
import { ChevronRight, MapPin, Clock, User, AlertTriangle, Star, TrendingUp, Car, Navigation as NavigationIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HOURS = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);

const STATUS_COLORS = {
  draft: "bg-gray-200 border-gray-400 text-gray-900",
  published: "bg-blue-200 border-blue-400 text-blue-900",
  in_progress: "bg-green-200 border-green-400 text-green-900",
  completed: "bg-purple-200 border-purple-400 text-purple-900",
  cancelled: "bg-red-200 border-red-400 text-red-900",
  missed: "bg-orange-200 border-orange-400 text-orange-900",
};

// Calculate travel time between two addresses (simplified - in production use Google Distance Matrix API)
const calculateTravelTime = (fromPostcode, toPostcode, vehicleType) => {
  // Simple estimation based on postcode area difference
  // In production, this would call a real mapping API
  if (!fromPostcode || !toPostcode) return 15; // Default 15 mins
  
  const fromArea = fromPostcode.split(' ')[0];
  const toArea = toPostcode.split(' ')[0];
  
  // Same postcode area = nearby
  if (fromArea === toArea) {
    return vehicleType === 'car' ? 5 : vehicleType === 'bike' ? 10 : 20;
  }
  
  // Different postcode area = further away
  return vehicleType === 'car' ? 20 : vehicleType === 'bike' ? 35 : 45;
};

export default function DomCareTimeline({ 
  visits, 
  staff, 
  clients, 
  runs,
  weekStart,
  onVisitUpdate,
  onVisitClick,
  isLoading
}) {
  const [draggedVisit, setDraggedVisit] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Separate unallocated and allocated visits
  const unallocatedVisits = visits.filter(v => !v.assigned_staff_id && v.status !== 'cancelled');
  
  // Calculate match score for a staff member and visit
  const calculateMatchScore = (staffMember, visit) => {
    let score = 0;
    let reasons = [];

    const client = clients.find(c => c.id === visit.client_id);
    if (!client) return { score: 0, reasons: [] };

    // Preferred staff match (30 points)
    if (client.preferred_staff?.includes(staffMember.id)) {
      score += 30;
      reasons.push({ text: "Preferred staff member", points: 30 });
    }

    // Qualification match (20 points)
    if (visit.required_qualification_id) {
      if (staffMember.qualifications?.includes(visit.required_qualification_id)) {
        score += 20;
        reasons.push({ text: "Has required qualification", points: 20 });
      } else {
        score -= 20;
        reasons.push({ text: "Missing required qualification", points: -20 });
      }
    } else {
      score += 10;
      reasons.push({ text: "No special qualifications needed", points: 10 });
    }

    // Proximity/Area preference (25 points)
    if (staffMember.preferred_areas && client.address?.postcode) {
      const clientPostcode = client.address.postcode.split(' ')[0];
      const hasAreaMatch = staffMember.preferred_areas.some(area => 
        area.includes(clientPostcode) || clientPostcode.includes(area)
      );
      if (hasAreaMatch) {
        score += 25;
        reasons.push({ text: "Preferred area match", points: 25 });
      } else {
        score += 5;
        reasons.push({ text: "Outside preferred area", points: 5 });
      }
    }

    // Workload balance (15 points)
    const dateStr = format(parseISO(visit.scheduled_start), 'yyyy-MM-dd');
    const staffVisitsToday = visits.filter(v => 
      v.assigned_staff_id === staffMember.id && 
      format(parseISO(v.scheduled_start), 'yyyy-MM-dd') === dateStr
    ).length;
    
    const maxVisits = staffMember.max_visits_per_day || 8;
    if (staffVisitsToday < maxVisits) {
      const workloadScore = Math.max(0, 15 - (staffVisitsToday * 2));
      score += workloadScore;
      reasons.push({ text: `${staffVisitsToday}/${maxVisits} visits today`, points: workloadScore });
    } else {
      score -= 10;
      reasons.push({ text: "At capacity for the day", points: -10 });
    }

    // Vehicle suitability (10 points)
    if (staffMember.vehicle_type === 'car') {
      score += 10;
      reasons.push({ text: "Has car for travel", points: 10 });
    } else if (staffMember.vehicle_type === 'bike') {
      score += 5;
      reasons.push({ text: "Using bike", points: 5 });
    } else {
      score += 2;
      reasons.push({ text: "Using public transport", points: 2 });
    }

    const normalizedScore = Math.max(0, Math.min(100, score));
    
    return {
      score: normalizedScore,
      reasons: reasons
    };
  };

  // Check if visit can fit considering travel time
  const checkVisitConflict = (staffId, date, newVisit) => {
    const staffVisitsOnDay = visits
      .filter(v => v.assigned_staff_id === staffId && isSameDay(parseISO(v.scheduled_start), date))
      .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));

    const staffMember = staff.find(s => s.id === staffId);
    const newVisitStart = new Date(newVisit.scheduled_start);
    const newVisitEnd = new Date(newVisit.scheduled_end);
    const newVisitClient = clients.find(c => c.id === newVisit.client_id);

    // Check each existing visit for conflicts
    for (const existingVisit of staffVisitsOnDay) {
      const existingStart = new Date(existingVisit.scheduled_start);
      const existingEnd = new Date(existingVisit.scheduled_end);
      const existingClient = clients.find(c => c.id === existingVisit.client_id);

      // Check if new visit would end after existing starts (potential overlap)
      if (newVisitEnd > existingStart && newVisitStart < existingEnd) {
        // Calculate required travel time
        const travelTime = calculateTravelTime(
          newVisitClient?.address?.postcode,
          existingClient?.address?.postcode,
          staffMember?.vehicle_type || 'car'
        );

        // Check gap before existing visit
        if (newVisitStart < existingStart) {
          const gapMinutes = differenceInMinutes(existingStart, newVisitEnd);
          if (gapMinutes < travelTime) {
            return {
              hasConflict: true,
              message: `Not enough travel time! Need ${travelTime} mins, only ${gapMinutes} mins available before ${format(existingStart, 'HH:mm')} visit`,
              requiredTime: travelTime,
              availableTime: gapMinutes
            };
          }
        }

        // Check gap after existing visit
        if (newVisitStart >= existingEnd) {
          const gapMinutes = differenceInMinutes(newVisitStart, existingEnd);
          if (gapMinutes < travelTime) {
            return {
              hasConflict: true,
              message: `Not enough travel time! Need ${travelTime} mins, only ${gapMinutes} mins available after ${format(existingEnd, 'HH:mm')} visit`,
              requiredTime: travelTime,
              availableTime: gapMinutes
            };
          }
        }
      }
    }

    return { hasConflict: false };
  };

  // Sort staff by match score for dragged visit
  const getSortedStaff = () => {
    if (!draggedVisit) {
      return staff.filter(s => s.is_active);
    }

    const activeStaff = staff.filter(s => s.is_active);
    const staffWithScores = activeStaff.map(member => ({
      ...member,
      matchData: calculateMatchScore(member, draggedVisit)
    }));

    return staffWithScores.sort((a, b) => b.matchData.score - a.matchData.score);
  };

  const activeStaff = getSortedStaff();
  
  const getUnallocatedVisitsForDate = (date) => {
    return unallocatedVisits.filter(v => {
      try {
        return isSameDay(parseISO(v.scheduled_start), date);
      } catch {
        return false;
      }
    });
  };

  const getVisitsForStaffAndDate = (staffId, date) => {
    return visits.filter(v => {
      try {
        return v.assigned_staff_id === staffId && isSameDay(parseISO(v.scheduled_start), date);
      } catch {
        return false;
      }
    }).sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  };

  const handleDragStart = (e, visit) => {
    setDraggedVisit(visit);
    e.dataTransfer.effectAllowed = 'move';
    setConflictWarning(null);
  };

  const handleDragEnd = () => {
    setDraggedVisit(null);
    setHoveredSlot(null);
    setConflictWarning(null);
  };

  const handleDragOver = (e, staffId, date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Check for conflicts while hovering
    if (draggedVisit) {
      const conflict = checkVisitConflict(staffId, date, draggedVisit);
      setConflictWarning(conflict.hasConflict ? conflict : null);
    }
  };

  const handleDrop = (e, staffId, date) => {
    e.preventDefault();
    if (draggedVisit) {
      // Final conflict check
      const conflict = checkVisitConflict(staffId, date, draggedVisit);
      
      if (conflict.hasConflict) {
        alert(`Cannot assign visit: ${conflict.message}\n\nPlease adjust visit times to allow for travel.`);
        setDraggedVisit(null);
        setHoveredSlot(null);
        setConflictWarning(null);
        return;
      }

      // Calculate travel time to next visit for updating the visit record
      const staffMember = staff.find(s => s.id === staffId);
      const staffVisits = getVisitsForStaffAndDate(staffId, date);
      const draggedClient = clients.find(c => c.id === draggedVisit.client_id);
      
      // Find next visit after this one
      const draggedStart = new Date(draggedVisit.scheduled_start);
      const nextVisit = staffVisits.find(v => new Date(v.scheduled_start) > draggedStart);
      
      let travelToNext = 0;
      if (nextVisit) {
        const nextClient = clients.find(c => c.id === nextVisit.client_id);
        travelToNext = calculateTravelTime(
          draggedClient?.address?.postcode,
          nextClient?.address?.postcode,
          staffMember?.vehicle_type || 'car'
        );
      }

      onVisitUpdate(draggedVisit.id, {
        ...draggedVisit,
        assigned_staff_id: staffId,
        status: 'published',
        estimated_travel_to_next: travelToNext
      });
    }
    setDraggedVisit(null);
    setHoveredSlot(null);
    setConflictWarning(null);
  };

  const getVisitPosition = (visit) => {
    try {
      const start = parseISO(visit.scheduled_start);
      const end = parseISO(visit.scheduled_end);
      
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      
      const startPos = (startHour - 6) * 60;
      const width = (endHour - startHour) * 60;
      
      return { left: startPos, width: Math.max(width, 30) };
    } catch {
      return { left: 0, width: 30 };
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || "Unknown Client";
  };

  const getClientAddress = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.address?.postcode || "";
  };

  const getMatchBadgeColor = (score) => {
    if (score >= 80) return "bg-green-500 text-white";
    if (score >= 60) return "bg-blue-500 text-white";
    if (score >= 40) return "bg-yellow-500 text-white";
    return "bg-orange-500 text-white";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Travel Time Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <NavigationIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Automatic Travel Time Calculation</p>
            <p className="text-blue-700">
              The system automatically calculates travel time between visits based on postcode distance and vehicle type. 
              You cannot assign visits that don't allow enough travel time between locations.
            </p>
          </div>
        </div>
      </div>

      {/* Unallocated Visits Section */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg overflow-hidden">
        <div className="bg-orange-100 border-b border-orange-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">
              Unallocated Visits ({unallocatedVisits.length})
            </h3>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Drag visits below onto staff members - travel time will be automatically calculated
          </p>
        </div>
        
        <div className="p-4">
          <div className="flex overflow-x-auto gap-3">
            {weekDays.map(day => {
              const dayVisits = getUnallocatedVisitsForDate(day);
              
              return (
                <div key={day.toString()} className="flex-shrink-0 w-64">
                  <div className="text-center mb-3 pb-2 border-b border-orange-200">
                    <p className="font-semibold text-gray-900">{format(day, "EEE")}</p>
                    <p className="text-sm text-gray-500">{format(day, "MMM d")}</p>
                  </div>
                  
                  <div className="space-y-2">
                    {dayVisits.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-4">No unallocated visits</p>
                    ) : (
                      dayVisits.map(visit => (
                        <div
                          key={visit.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, visit)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onVisitClick(visit)}
                          className={`p-3 border-2 border-orange-300 rounded-lg cursor-move bg-white hover:shadow-md transition-all ${
                            draggedVisit?.id === visit.id ? 'opacity-50 ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-sm font-semibold">
                              {format(parseISO(visit.scheduled_start), "HH:mm")} - {format(parseISO(visit.scheduled_end), "HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {getClientName(visit.client_id)}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getClientAddress(visit.client_id)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Schedule Grid */}
      <div className="flex h-[calc(100vh-450px)] bg-white border rounded-lg overflow-hidden shadow-lg">
        {/* Left Sidebar - Staff List */}
        <div className="w-72 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
          <div className="sticky top-0 bg-gray-100 border-b p-4 z-10">
            <h3 className="font-semibold text-gray-900 text-sm">Care Staff</h3>
            <p className="text-xs text-gray-500 mt-1">
              {activeStaff.length} active {draggedVisit ? "• Sorted by match" : ""}
            </p>
          </div>
          <div className="p-2">
            {activeStaff.map((member, index) => {
              const matchData = member.matchData;
              const isTopMatch = draggedVisit && index === 0;
              
              return (
                <div
                  key={member.id}
                  className={`p-3 mb-2 bg-white border rounded-lg hover:shadow-md transition-all ${
                    isTopMatch ? 'ring-2 ring-green-500 border-green-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {member.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {member.full_name}
                        </p>
                        {draggedVisit && matchData && (
                          <Badge className={`${getMatchBadgeColor(matchData.score)} text-xs font-bold`}>
                            {Math.round(matchData.score)}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Car className="w-3 h-3" />
                        <span className="capitalize">{member.vehicle_type || 'N/A'}</span>
                      </div>

                      {draggedVisit && matchData && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                            {isTopMatch && <Star className="w-3 h-3 text-green-600 fill-green-600" />}
                            {isTopMatch ? "Best Match:" : "Match Factors:"}
                          </p>
                          <div className="space-y-0.5">
                            {matchData.reasons.slice(0, 3).map((reason, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className={reason.points > 0 ? "text-green-700" : "text-red-700"}>
                                  {reason.text}
                                </span>
                                <span className={`font-medium ${reason.points > 0 ? "text-green-700" : "text-red-700"}`}>
                                  {reason.points > 0 ? '+' : ''}{reason.points}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Timeline Grid */}
        <div className="flex-1 overflow-auto">
          {/* Date Headers */}
          <div className="sticky top-0 bg-white border-b z-20 flex">
            {weekDays.map(day => (
              <div key={day.toString()} className="flex-1 min-w-[600px]">
                <div className="p-3 text-center border-r">
                  <p className="font-semibold text-gray-900">{format(day, "EEE")}</p>
                  <p className="text-sm text-gray-500">{format(day, "MMM d")}</p>
                </div>
                {/* Hour Headers */}
                <div className="flex border-t">
                  {HOURS.map(hour => (
                    <div 
                      key={hour} 
                      className="w-[50px] flex-shrink-0 border-r border-gray-200 p-1 text-center"
                    >
                      <span className="text-[9px] text-gray-500">{hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Staff Rows */}
          {activeStaff.map((member, index) => {
            const matchData = member.matchData;
            const isTopMatch = draggedVisit && index === 0;
            
            return (
              <div 
                key={member.id} 
                className={`flex border-b ${isTopMatch ? 'bg-green-50' : 'hover:bg-gray-50'}`}
              >
                {/* Day Columns */}
                {weekDays.map(day => {
                  const staffVisits = getVisitsForStaffAndDate(member.id, day);
                  const slotKey = `${member.id}-${format(day, 'yyyy-MM-dd')}`;
                  const isHovered = hoveredSlot === slotKey;
                  
                  return (
                    <div 
                      key={day.toString()} 
                      className={`flex-1 min-w-[600px] border-r relative ${
                        isHovered && draggedVisit ? (conflictWarning ? 'bg-red-50' : 'bg-blue-50') : ''
                      } ${isTopMatch && draggedVisit ? 'ring-1 ring-green-300 ring-inset' : ''}`}
                      style={{ minHeight: '80px' }}
                      onDragOver={(e) => handleDragOver(e, member.id, day)}
                      onDrop={(e) => handleDrop(e, member.id, day)}
                      onDragEnter={() => setHoveredSlot(slotKey)}
                      onDragLeave={() => setHoveredSlot(null)}
                    >
                      {/* Hour Grid */}
                      <div className="flex h-full">
                        {HOURS.map(hour => (
                          <div
                            key={hour}
                            className="w-[50px] flex-shrink-0 border-r border-gray-100 relative"
                          />
                        ))}
                      </div>

                      {/* Drop Zone Indicator */}
                      {isHovered && draggedVisit && (
                        <div className={`absolute inset-0 border-2 ${conflictWarning ? 'border-red-500 bg-red-100' : 'border-blue-500 bg-blue-100'} border-dashed rounded bg-opacity-30 pointer-events-none flex items-center justify-center`}>
                          <div className={`${conflictWarning ? 'bg-red-500' : isTopMatch ? 'bg-green-500' : 'bg-blue-500'} text-white px-4 py-2 rounded-lg shadow-lg max-w-xs`}>
                            {conflictWarning ? (
                              <div className="text-center">
                                <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                                <p className="text-xs font-bold">Cannot Assign!</p>
                                <p className="text-xs mt-1">{conflictWarning.message}</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isTopMatch && <Star className="w-4 h-4 fill-white" />}
                                <span className="text-sm font-bold">
                                  {matchData ? `${Math.round(matchData.score)}% Match - ` : ''}
                                  Drop at {format(parseISO(draggedVisit.scheduled_start), "HH:mm")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Visits and Travel Time Overlay */}
                      {staffVisits.map((visit, visitIdx) => {
                        const { left, width } = getVisitPosition(visit);
                        const statusColor = STATUS_COLORS[visit.status] || STATUS_COLORS.draft;
                        const nextVisit = staffVisits[visitIdx + 1];
                        
                        return (
                          <React.Fragment key={visit.id}>
                            {/* Visit Block */}
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, visit)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onVisitClick(visit)}
                              className={`absolute top-1 h-[calc(50%-4px)] border-l-4 rounded cursor-move ${statusColor} ${
                                draggedVisit?.id === visit.id ? 'opacity-50' : 'shadow-sm hover:shadow-md'
                              }`}
                              style={{
                                left: `${left}px`,
                                width: `${width}px`,
                                zIndex: 5
                              }}
                            >
                              <div className="p-1 h-full overflow-hidden">
                                <p className="text-[9px] font-semibold truncate flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {format(parseISO(visit.scheduled_start), "HH:mm")}
                                </p>
                                <p className="text-[9px] truncate mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {getClientName(visit.client_id)}
                                </p>
                                <p className="text-[8px] text-gray-600 truncate">
                                  {getClientAddress(visit.client_id)}
                                </p>
                              </div>
                            </div>

                            {/* Travel Time Indicator */}
                            {nextVisit && (
                              (() => {
                                const visitEnd = parseISO(visit.scheduled_end);
                                const nextStart = parseISO(nextVisit.scheduled_start);
                                const currentClient = clients.find(c => c.id === visit.client_id);
                                const nextClient = clients.find(c => c.id === nextVisit.client_id);
                                
                                const travelTime = calculateTravelTime(
                                  currentClient?.address?.postcode,
                                  nextClient?.address?.postcode,
                                  member.vehicle_type || 'car'
                                );
                                
                                const actualGap = differenceInMinutes(nextStart, visitEnd);
                                const hasSufficientTime = actualGap >= travelTime;
                                
                                const visitEndHour = visitEnd.getHours() + visitEnd.getMinutes() / 60;
                                const travelStartPos = (visitEndHour - 6) * 60;
                                const travelWidth = (travelTime / 60) * 60;
                                
                                return (
                                  <div
                                    className={`absolute bottom-1 h-[calc(50%-4px)] rounded-sm flex items-center justify-center ${
                                      hasSufficientTime ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                                    }`}
                                    style={{
                                      left: `${travelStartPos}px`,
                                      width: `${travelWidth}px`,
                                      zIndex: 4
                                    }}
                                  >
                                    <div className="flex items-center gap-1">
                                      <NavigationIcon className={`w-2.5 h-2.5 ${hasSufficientTime ? 'text-green-700' : 'text-red-700'}`} />
                                      <span className={`text-[9px] font-medium ${hasSufficientTime ? 'text-green-800' : 'text-red-800'}`}>
                                        {travelTime}min
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}