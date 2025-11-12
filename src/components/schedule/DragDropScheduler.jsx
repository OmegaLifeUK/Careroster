import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MapPin, GripVertical, Edit, Trash2, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export const DragDropScheduler = ({ 
  shifts, 
  carers, 
  clients, 
  onShiftUpdate,
  onShiftEdit,
  onShiftDelete,
  groupBy = "carer" // "carer", "date", or "client"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedShift, setDraggedShift] = useState(null);
  const [potentialConflicts, setPotentialConflicts] = useState([]);
  const { toast } = useToast();

  // Group shifts by carer, date, or client
  const groupedShifts = shifts.reduce((acc, shift) => {
    let key;
    if (groupBy === "carer") {
      key = shift.carer_id || "unassigned";
    } else if (groupBy === "date") {
      key = shift.date;
    } else if (groupBy === "client") {
      key = shift.client_id || "unknown";
    }
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(shift);
    return acc;
  }, {});

  // Create list of all possible drop zones (including empty ones)
  const getAllDropZones = () => {
    const zones = new Set(Object.keys(groupedShifts));
    
    if (groupBy === "carer") {
      zones.add("unassigned");
      carers.forEach(c => zones.add(c.id));
    }
    
    return Array.from(zones);
  };

  // Check for conflicts when dragging
  const checkConflicts = (shiftId, newCarerId, newDate) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return [];

    const conflicts = [];
    const targetCarerId = groupBy === "carer" ? newCarerId : shift.carer_id;
    const targetDate = groupBy === "date" ? newDate : shift.date;

    // Check for overlapping shifts
    const carerShifts = shifts.filter(s => 
      s.id !== shiftId && 
      s.carer_id === targetCarerId && 
      s.date === targetDate
    );

    carerShifts.forEach(otherShift => {
      const start1 = shift.start_time || "00:00";
      const end1 = shift.end_time || "23:59";
      const start2 = otherShift.start_time || "00:00";
      const end2 = otherShift.end_time || "23:59";

      if (
        (start1 >= start2 && start1 < end2) ||
        (end1 > start2 && end1 <= end2) ||
        (start1 <= start2 && end1 >= end2)
      ) {
        conflicts.push({
          type: "overlap",
          message: `Time overlap with another shift (${start2}-${end2})`
        });
      }
    });

    // Check for total hours
    const totalHours = carerShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0) + (shift.duration_hours || 0);
    if (totalHours > 10) {
      conflicts.push({
        type: "hours",
        message: `Total hours would be ${totalHours.toFixed(1)}h (exceeds 10h limit)`
      });
    }

    return conflicts;
  };

  const handleDragStart = (result) => {
    setIsDragging(true);
    const shift = shifts.find(s => s.id === result.draggableId);
    setDraggedShift(shift);
  };

  const handleDragUpdate = (result) => {
    if (!result.destination) {
      setPotentialConflicts([]);
      return;
    }

    const newDropZone = result.destination.droppableId;
    const conflicts = checkConflicts(
      result.draggableId,
      newDropZone === "unassigned" ? null : newDropZone,
      newDropZone
    );
    setPotentialConflicts(conflicts);
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);
    setDraggedShift(null);
    setPotentialConflicts([]);
    
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) return;

    // Find the shift being moved
    const shift = shifts.find(s => s.id === draggableId);
    if (!shift) return;

    // Check for conflicts one more time
    const conflicts = checkConflicts(
      draggableId,
      destination.droppableId === "unassigned" ? null : destination.droppableId,
      destination.droppableId
    );

    if (conflicts.length > 0) {
      toast.warning(
        "Conflicts Detected",
        `This assignment has ${conflicts.length} conflict(s). Proceed with caution.`
      );
    } else {
      toast.success(
        "Assignment Updated",
        "Shift successfully reassigned"
      );
    }

    // Update based on groupBy type
    if (groupBy === "carer") {
      const newCarerId = destination.droppableId === "unassigned" 
        ? null 
        : destination.droppableId;
      
      onShiftUpdate(draggableId, { carer_id: newCarerId, status: newCarerId ? 'scheduled' : 'unfilled' });
    } else if (groupBy === "date") {
      onShiftUpdate(draggableId, { date: destination.droppableId });
    } else if (groupBy === "client") {
      onShiftUpdate(draggableId, { client_id: destination.droppableId });
    }
  };

  const getCarerName = (carerId) => {
    if (!carerId) return "Unassigned";
    const carer = carers.find(c => c.id === carerId);
    return carer?.full_name || "Unknown";
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || "Unknown";
  };

  const getGroupLabel = (groupKey) => {
    if (groupBy === "carer") {
      return getCarerName(groupKey === "unassigned" ? null : groupKey);
    } else if (groupBy === "date") {
      try {
        return format(parseISO(groupKey), "EEEE, MMM d");
      } catch {
        return groupKey;
      }
    } else if (groupBy === "client") {
      return getClientName(groupKey);
    }
    return groupKey;
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-blue-100 text-blue-800",
    scheduled: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-600",
    unfilled: "bg-orange-100 text-orange-800",
  };

  const allDropZones = getAllDropZones();

  return (
    <DragDropContext 
      onDragStart={handleDragStart} 
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <div className={`space-y-6 ${isDragging ? 'select-none' : ''}`}>
        {/* Conflict Warning Banner */}
        {isDragging && potentialConflicts.length > 0 && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <Card className="bg-red-50 border-red-200 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">
                      {potentialConflicts.length} Conflict{potentialConflicts.length > 1 ? 's' : ''} Detected
                    </p>
                    {potentialConflicts.map((c, idx) => (
                      <p key={idx} className="text-sm text-red-700">{c.message}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success Indicator */}
        {isDragging && potentialConflicts.length === 0 && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="bg-green-50 border-green-200 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <p className="font-semibold text-green-900">No conflicts - safe to drop</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {allDropZones.sort().map((groupKey) => {
          const groupShifts = groupedShifts[groupKey] || [];
          const label = getGroupLabel(groupKey);
          const isUnassigned = groupKey === "unassigned";

          // Calculate stats for this group
          const totalHours = groupShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
          const hasConflicts = groupShifts.some(s => 
            checkConflicts(s.id, s.carer_id, s.date).length > 0
          );

          return (
            <div key={groupKey}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-gray-900">{label}</h3>
                  {hasConflicts && (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {groupShifts.length} shift{groupShifts.length !== 1 ? 's' : ''}
                  </Badge>
                  {totalHours > 0 && (
                    <Badge 
                      className={totalHours > 10 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}
                    >
                      {totalHours.toFixed(1)}h
                    </Badge>
                  )}
                </div>
              </div>

              <Droppable droppableId={groupKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] p-4 rounded-lg border-2 border-dashed transition-all ${
                      snapshot.isDraggingOver 
                        ? potentialConflicts.length > 0
                          ? 'bg-red-50 border-red-400 shadow-lg'
                          : 'bg-green-50 border-green-400 shadow-lg'
                        : isUnassigned
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="space-y-3">
                      {groupShifts.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <GripVertical className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-400 font-medium">
                            {isUnassigned ? "Drag unfilled shifts here" : "Drop shifts here"}
                          </p>
                        </div>
                      ) : (
                        groupShifts.map((shift, index) => {
                          const shiftConflicts = checkConflicts(shift.id, shift.carer_id, shift.date);
                          
                          return (
                            <Draggable
                              key={shift.id}
                              draggableId={shift.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`group transition-all duration-200 ${
                                    snapshot.isDragging ? 'rotate-2 scale-105 z-50' : ''
                                  }`}
                                >
                                  <Card className={`transition-all ${
                                    snapshot.isDragging 
                                      ? 'shadow-2xl ring-4 ring-blue-400 bg-white' 
                                      : shiftConflicts.length > 0
                                        ? 'border-orange-300 hover:shadow-lg'
                                        : 'hover:shadow-lg'
                                  }`}>
                                    <CardContent className="p-4">
                                      <div className="flex items-start gap-3">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                          <GripVertical className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                {groupBy !== "client" && getClientName(shift.client_id)}
                                                {shiftConflicts.length > 0 && (
                                                  <AlertCircle className="w-4 h-4 text-orange-500" />
                                                )}
                                              </div>
                                              {groupBy !== "carer" && (
                                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                                  <User className="w-3 h-3" />
                                                  {getCarerName(shift.carer_id)}
                                                </div>
                                              )}
                                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <Clock className="w-3 h-3" />
                                                {shift.start_time} - {shift.end_time}
                                              </div>
                                            </div>
                                            <Badge className={statusColors[shift.status] || 'bg-gray-100'}>
                                              {shift.status}
                                            </Badge>
                                          </div>

                                          {groupBy !== "date" && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                              <Calendar className="w-3 h-3" />
                                              {shift.date}
                                            </div>
                                          )}

                                          {shift.shift_type && (
                                            <Badge variant="outline" className="text-xs">
                                              {shift.shift_type}
                                            </Badge>
                                          )}

                                          {shiftConflicts.length > 0 && (
                                            <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-800">
                                              {shiftConflicts[0].message}
                                            </div>
                                          )}

                                          <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => onShiftEdit(shift)}
                                            >
                                              <Edit className="w-3 h-3 mr-1" />
                                              Edit
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => onShiftDelete(shift.id)}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <Trash2 className="w-3 h-3 mr-1" />
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};