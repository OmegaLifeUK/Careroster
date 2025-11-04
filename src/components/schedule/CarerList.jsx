import React from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Award, AlertCircle } from "lucide-react";
import { parseISO, isWithinInterval, addDays } from "date-fns";

export default function CarerList({ carers, shifts, leaveRequests, selectedDate }) {
  const checkAvailability = (carer, dateStr) => {
    // Check leave requests
    const onLeave = leaveRequests.some(leave => {
      if (leave.carer_id !== carer.id || leave.status !== 'approved') return false;
      
      try {
        const leaveStart = parseISO(leave.start_date);
        const leaveEnd = parseISO(leave.end_date);
        const checkDate = parseISO(dateStr);
        
        return isWithinInterval(checkDate, { start: leaveStart, end: leaveEnd });
      } catch {
        return false;
      }
    });

    return !onLeave;
  };

  // Get unassigned shifts (shifts without carers)
  const unassignedShifts = shifts.filter(s => !s.carer_id && s.client_id);

  return (
    <div className="p-2 space-y-3">
      {/* Available Carers - draggable for creating new shifts */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
          Available Carers
        </h4>
        <Droppable droppableId="available-carers" isDropDisabled={true}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {carers.map((carer, index) => {
                const isAvailable = checkAvailability(carer, selectedDate);
                
                return (
                  <Draggable
                    key={carer.id}
                    draggableId={`available-${carer.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-3 border rounded-lg cursor-move transition-all ${
                          snapshot.isDragging
                            ? 'shadow-lg bg-blue-50 border-blue-300'
                            : 'bg-white hover:shadow-md'
                        } ${!isAvailable ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                            {carer.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {carer.full_name}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {carer.qualifications && carer.qualifications.length > 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  <Award className="w-3 h-3 mr-1" />
                                  {carer.qualifications.length}
                                </Badge>
                              ) : null}
                              {!isAvailable && (
                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  On Leave
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      {/* Unassigned Shifts - need carers */}
      {unassignedShifts.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
            Unassigned Shifts
          </h4>
          <Droppable droppableId="unassigned-shifts" isDropDisabled={true}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {unassignedShifts.slice(0, 5).map((shift, index) => (
                  <Draggable
                    key={shift.id}
                    draggableId={`unassigned-${shift.client_id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-2 border rounded-lg cursor-move transition-all ${
                          snapshot.isDragging
                            ? 'shadow-lg bg-orange-50 border-orange-300'
                            : 'bg-orange-50 hover:shadow-md border-orange-200'
                        }`}
                      >
                        <p className="text-xs font-medium text-orange-900">
                          Needs Assignment
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          {shift.date} {shift.start_time}
                        </p>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </div>
  );
}