import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MapPin, GripVertical, Edit, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export const DragDropScheduler = ({ 
  shifts, 
  carers, 
  clients, 
  onShiftUpdate,
  onShiftEdit,
  onShiftDelete,
  groupBy = "carer" // "carer" or "date"
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Group shifts by carer or date
  const groupedShifts = shifts.reduce((acc, shift) => {
    const key = groupBy === "carer" 
      ? shift.carer_id || "unassigned"
      : shift.date;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(shift);
    return acc;
  }, {});

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);
    
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) return;

    // Find the shift being moved
    const shiftId = draggableId;
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // Update based on what changed
    if (groupBy === "carer") {
      const newCarerId = destination.droppableId === "unassigned" 
        ? null 
        : destination.droppableId;
      
      onShiftUpdate(shiftId, { carer_id: newCarerId });
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

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-blue-100 text-blue-800",
    scheduled: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-600",
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`space-y-6 ${isDragging ? 'select-none' : ''}`}>
        {Object.keys(groupedShifts).map((groupKey) => {
          const groupShifts = groupedShifts[groupKey];
          const label = groupBy === "carer" 
            ? getCarerName(groupKey === "unassigned" ? null : groupKey)
            : groupKey;

          return (
            <div key={groupKey}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-900">{label}</h3>
                <Badge variant="secondary">
                  {groupShifts.length} shift{groupShifts.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <Droppable droppableId={groupKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${
                      snapshot.isDraggingOver 
                        ? 'bg-blue-50 border-blue-400' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="space-y-3">
                      {groupShifts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          Drop shifts here
                        </div>
                      ) : (
                        groupShifts.map((shift, index) => (
                          <Draggable
                            key={shift.id}
                            draggableId={shift.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group ${snapshot.isDragging ? 'rotate-2 scale-105' : ''}`}
                              >
                                <Card className={`transition-all ${
                                  snapshot.isDragging 
                                    ? 'shadow-2xl ring-2 ring-blue-400' 
                                    : 'hover:shadow-lg'
                                }`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                      >
                                        <GripVertical className="w-5 h-5" />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                          <div>
                                            <div className="font-semibold text-gray-900">
                                              {getClientName(shift.client_id)}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                              <Clock className="w-3 h-3" />
                                              {shift.start_time} - {shift.end_time}
                                            </div>
                                          </div>
                                          <Badge className={statusColors[shift.status] || 'bg-gray-100'}>
                                            {shift.status}
                                          </Badge>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-600">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {shift.date}
                                          </div>
                                          {shift.shift_type && (
                                            <Badge variant="outline" className="text-xs">
                                              {shift.shift_type}
                                            </Badge>
                                          )}
                                        </div>

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
                        ))
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