import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Users, Calendar, ChevronDown, ChevronUp, Edit, Send, Trash2, UserMinus, RefreshCw } from "lucide-react";
import { format, parseISO, getDay } from "date-fns";
import { checkCarerAvailability } from "@/components/availability/AvailabilityChecker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function ConflictDetector({ 
  shifts = [], 
  carers = [], 
  clients = [], 
  leaveRequests = [], 
  carerAvailability = [],
  onEditShift,
  onUnassignShift,
  onSendRequest,
  onDeleteShift,
  onBulkAction
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [filterType, setFilterType] = React.useState("all");
  const [selectedConflicts, setSelectedConflicts] = React.useState([]);
  const [bulkActionMode, setBulkActionMode] = React.useState(false);

  const detectConflicts = () => {
    const conflicts = [];

    if (!Array.isArray(shifts) || !Array.isArray(carers) || !Array.isArray(clients)) {
      return conflicts;
    }

    // Group shifts by date and carer
    const shiftsByCarerAndDate = {};
    shifts.forEach(shift => {
      if (!shift || !shift.carer_id || !shift.date) return;
      const key = `${shift.carer_id}-${shift.date}`;
      if (!shiftsByCarerAndDate[key]) {
        shiftsByCarerAndDate[key] = [];
      }
      shiftsByCarerAndDate[key].push(shift);
    });

    // Check for overlapping shifts
    Object.entries(shiftsByCarerAndDate).forEach(([key, shiftsForDay]) => {
      if (!Array.isArray(shiftsForDay) || shiftsForDay.length < 2) return;

      const [carerId, date] = key.split('-');
      const carer = carers.find(c => c && c.id === carerId);

      for (let i = 0; i < shiftsForDay.length; i++) {
        for (let j = i + 1; j < shiftsForDay.length; j++) {
          const shift1 = shiftsForDay[i];
          const shift2 = shiftsForDay[j];

          if (!shift1 || !shift2) continue;

          const start1 = shift1.start_time || "00:00";
          const end1 = shift1.end_time || "23:59";
          const start2 = shift2.start_time || "00:00";
          const end2 = shift2.end_time || "23:59";

          // Check for overlap
          if (
            (start1 >= start2 && start1 < end2) ||
            (end1 > start2 && end1 <= end2) ||
            (start1 <= start2 && end1 >= end2)
          ) {
            conflicts.push({
              type: "overlap",
              severity: "high",
              carer: carer?.full_name || "Unknown",
              date,
              shift1,
              shift2,
              message: `${carer?.full_name || 'Unknown'} has overlapping shifts on ${format(parseISO(date), "MMM d")}`,
            });
          }
        }
      }

      // Check for overallocation (too many hours in a day)
      const totalHours = shiftsForDay.reduce((sum, shift) => {
        return sum + (shift?.duration_hours || 0);
      }, 0);

      if (totalHours > 10) {
        conflicts.push({
          type: "overallocation",
          severity: "high",
          carer: carer?.full_name || "Unknown",
          date,
          totalHours,
          message: `${carer?.full_name || 'Unknown'} scheduled for ${totalHours.toFixed(1)} hours on ${format(parseISO(date), "MMM d")} (exceeds 10 hours)`,
        });
      } else if (totalHours > 8) {
        conflicts.push({
          type: "overallocation",
          severity: "medium",
          carer: carer?.full_name || "Unknown",
          date,
          totalHours,
          message: `${carer?.full_name || 'Unknown'} scheduled for ${totalHours.toFixed(1)} hours on ${format(parseISO(date), "MMM d")} (approaching limit)`,
        });
      }
    });

    // Check for unfilled critical shifts
    const criticalUnfilled = shifts.filter(s => 
      s && s.status === 'unfilled' && 
      s.date && 
      new Date(s.date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    criticalUnfilled.forEach(shift => {
      if (!shift) return;
      const client = clients.find(c => c && c.id === shift.client_id);
      conflicts.push({
        type: "unfilled",
        severity: "high",
        shift,
        client: client?.full_name || "Unknown",
        message: `Unfilled shift for ${client?.full_name || 'Unknown'} on ${format(parseISO(shift.date), "MMM d")} at ${shift.start_time}`,
      });
    });

    // Check for availability conflicts
    shifts.forEach(shift => {
      if (!shift || !shift.carer_id || !shift.date) return;
      
      const availCheck = checkCarerAvailability(
        shift.carer_id, 
        shift.date, 
        shift.start_time, 
        shift.end_time, 
        carerAvailability, 
        leaveRequests
      );
      
      if (!availCheck.isAvailable) {
        const carer = carers.find(c => c && c.id === shift.carer_id);
        const client = clients.find(c => c && c.id === shift.client_id);
        
        conflicts.push({
          type: "availability",
          severity: availCheck.reason === 'On approved leave' ? "high" : "medium",
          carer: carer?.full_name || "Unknown",
          client: client?.full_name || "Unknown",
          date: shift.date,
          shift,
          message: `${carer?.full_name || 'Unknown'} is ${availCheck.reason} on ${format(parseISO(shift.date), "MMM d")} (${shift.start_time}-${shift.end_time})`,
        });
      }
    });

    // Check for consecutive long shifts
    const consecutiveShiftsByDate = {};
    shifts.forEach(shift => {
      if (!shift || !shift.carer_id || !shift.date) return;
      if (!consecutiveShiftsByDate[shift.carer_id]) {
        consecutiveShiftsByDate[shift.carer_id] = {};
      }
      if (!consecutiveShiftsByDate[shift.carer_id][shift.date]) {
        consecutiveShiftsByDate[shift.carer_id][shift.date] = [];
      }
      consecutiveShiftsByDate[shift.carer_id][shift.date].push(shift);
    });

    Object.entries(consecutiveShiftsByDate).forEach(([carerId, dateMap]) => {
      const carer = carers.find(c => c && c.id === carerId);
      const sortedDates = Object.keys(dateMap).sort();
      
      let consecutiveDays = 0;
      for (let i = 0; i < sortedDates.length; i++) {
        consecutiveDays++;
        if (consecutiveDays >= 7) {
          conflicts.push({
            type: "consecutive",
            severity: "medium",
            carer: carer?.full_name || "Unknown",
            message: `${carer?.full_name || 'Unknown'} has ${consecutiveDays} consecutive days without break`,
          });
          break;
        }
        
        // Check if next day is consecutive
        if (i < sortedDates.length - 1) {
          const currentDate = new Date(sortedDates[i]);
          const nextDate = new Date(sortedDates[i + 1]);
          const dayDiff = (nextDate - currentDate) / (1000 * 60 * 60 * 24);
          if (dayDiff > 1) {
            consecutiveDays = 0;
          }
        }
      }
    });

    return conflicts;
  };

  const allConflicts = detectConflicts();
  const conflicts = filterType === "all" 
    ? allConflicts 
    : allConflicts.filter(c => c.type === filterType);
  const highSeverity = allConflicts.filter(c => c && c.severity === "high").length;
  const mediumSeverity = allConflicts.filter(c => c && c.severity === "medium").length;
  
  const conflictTypes = [...new Set(allConflicts.map(c => c.type))];

  const handleAction = (action, conflict) => {
    switch (action) {
      case 'edit':
        if (onEditShift && conflict.shift) {
          onEditShift(conflict.shift);
        } else if (onEditShift && conflict.shift1) {
          onEditShift(conflict.shift1);
        }
        break;
      case 'unassign':
        if (onUnassignShift && conflict.shift) {
          onUnassignShift(conflict.shift.id);
        } else if (onUnassignShift && conflict.shift1) {
          onUnassignShift(conflict.shift1.id);
        }
        break;
      case 'request':
        if (onSendRequest && conflict.shift) {
          onSendRequest(conflict.shift);
        } else if (onSendRequest && conflict.shift1) {
          onSendRequest(conflict.shift1);
        }
        break;
      case 'delete':
        if (onDeleteShift && conflict.shift) {
          onDeleteShift(conflict.shift.id);
        }
        break;
    }
  };

  const toggleConflictSelection = (idx) => {
    setSelectedConflicts(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const selectAllConflicts = () => {
    if (selectedConflicts.length === conflicts.length) {
      setSelectedConflicts([]);
    } else {
      setSelectedConflicts(conflicts.map((_, idx) => idx));
    }
  };

  const getSelectedShiftIds = () => {
    const shiftIds = [];
    selectedConflicts.forEach(idx => {
      const conflict = conflicts[idx];
      if (conflict?.shift?.id) shiftIds.push(conflict.shift.id);
      if (conflict?.shift1?.id) shiftIds.push(conflict.shift1.id);
      if (conflict?.shift2?.id) shiftIds.push(conflict.shift2.id);
    });
    return [...new Set(shiftIds)];
  };

  const handleBulkAction = (action) => {
    const shiftIds = getSelectedShiftIds();
    if (shiftIds.length === 0) return;
    
    if (onBulkAction) {
      onBulkAction(action, shiftIds);
    }
    setSelectedConflicts([]);
    setBulkActionMode(false);
  };

  if (conflicts.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">No Conflicts Detected</h3>
              <p className="text-sm text-green-700">Your schedule looks good!</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const getSeverityColor = (severity) => {
    return severity === "high" ? "bg-red-100 text-red-800 border-red-200" :
           severity === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
           "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getSeverityIcon = (severity) => {
    return severity === "high" ? "text-red-600" : "text-yellow-600";
  };

  return (
    <Card className="border-orange-200">
      <div 
        className="p-4 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">
                {conflicts.length} Scheduling Issue{conflicts.length !== 1 ? 's' : ''} Detected
              </h3>
              <div className="flex items-center gap-3 text-sm">
                {highSeverity > 0 && (
                  <span className="text-red-700 font-medium">{highSeverity} High Priority</span>
                )}
                {mediumSeverity > 0 && (
                  <span className="text-yellow-700">{mediumSeverity} Medium Priority</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className={filterType === "all" ? "bg-orange-600" : ""}
            >
              All ({allConflicts.length})
            </Button>
            {conflictTypes.map(type => (
              <Button
                key={type}
                size="sm"
                variant={filterType === type ? "default" : "outline"}
                onClick={() => setFilterType(type)}
                className={filterType === type ? "bg-orange-600" : ""}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} ({allConflicts.filter(c => c.type === type).length})
              </Button>
            ))}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conflicts.map((conflict, idx) => {
              if (!conflict) return null;
              
              const hasShift = conflict.shift || conflict.shift1;
              const canEdit = onEditShift && hasShift;
              const canUnassign = onUnassignShift && hasShift;
              const canRequest = onSendRequest && hasShift;
              const canDelete = onDeleteShift && conflict.shift;
              const hasActions = canEdit || canUnassign || canRequest || canDelete;
              
              return (
                <div
                  key={idx}
                  className={`p-3 border rounded-lg ${getSeverityColor(conflict.severity)} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 ${getSeverityIcon(conflict.severity)} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={conflict.severity === "high" ? "bg-red-600" : "bg-yellow-600"}>
                          {conflict.severity?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{conflict.type}</Badge>
                        {conflict.date && (
                          <Badge variant="outline" className="bg-white">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(parseISO(conflict.date), "dd MMM")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-2">{conflict.message}</p>
                      
                      {conflict.type === "overlap" && conflict.shift1 && conflict.shift2 && (
                        <div className="text-xs space-y-1 text-gray-700 mb-2">
                          <p>• Shift 1: {conflict.shift1.start_time} - {conflict.shift1.end_time}</p>
                          <p>• Shift 2: {conflict.shift2.start_time} - {conflict.shift2.end_time}</p>
                        </div>
                      )}

                      {conflict.type === "overallocation" && (
                        <div className="text-xs text-gray-700 mb-2">
                          <p>Total scheduled: {conflict.totalHours?.toFixed(1)} hours</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    {hasActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="flex-shrink-0">
                            Actions
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleAction('edit', conflict)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Shift
                            </DropdownMenuItem>
                          )}
                          {canUnassign && (
                            <DropdownMenuItem onClick={() => handleAction('unassign', conflict)}>
                              <UserMinus className="w-4 h-4 mr-2" />
                              Unassign Carer
                            </DropdownMenuItem>
                          )}
                          {canRequest && (
                            <DropdownMenuItem onClick={() => handleAction('request', conflict)}>
                              <Send className="w-4 h-4 mr-2" />
                              Send Coverage Request
                            </DropdownMenuItem>
                          )}
                          {(canDelete && conflict.type === "unfilled") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleAction('delete', conflict)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Shift
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}