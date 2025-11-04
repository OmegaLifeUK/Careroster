import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { format, isToday } from "date-fns";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00"
];

const SHIFT_COLORS = {
  morning: "bg-green-100 border-green-400 text-green-900",
  afternoon: "bg-blue-100 border-blue-400 text-blue-900",
  evening: "bg-purple-100 border-purple-400 text-purple-900",
  night: "bg-indigo-100 border-indigo-400 text-indigo-900",
  supervision: "bg-yellow-100 border-yellow-400 text-yellow-900",
  shadowing: "bg-orange-100 border-orange-400 text-orange-900",
};

export default function TimeGrid({
  weekDays,
  people,
  shifts,
  carers,
  clients,
  viewMode,
  onEditShift,
  isLoading,
}) {
  const getShiftForSlot = (personId, date, time) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.find(shift => {
      const matchesPerson = viewMode === "carers" 
        ? shift.carer_id === personId
        : shift.client_id === personId;
      
      if (!matchesPerson || shift.date !== dateStr) return false;

      const shiftStartTime = shift.start_time || "00:00";
      return time === shiftStartTime;
    });
  };

  const getPersonName = (id, type) => {
    const list = type === "carer" ? carers : clients;
    const person = list.find(p => p.id === id);
    return person?.full_name || "Unknown";
  };

  const calculateShiftHeight = (shift) => {
    if (!shift.duration_hours) return 1;
    return shift.duration_hours;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header with dates */}
          <div className="flex border-b bg-gray-50 sticky top-0 z-10">
            <div className="w-48 flex-shrink-0 p-4 border-r font-semibold text-gray-700">
              {viewMode === "carers" ? "Carer" : "Client"}
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toString()}
                className={`flex-1 min-w-[120px] p-3 text-center border-r ${
                  isToday(day) ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`font-semibold ${isToday(day) ? 'text-blue-700' : 'text-gray-900'}`}>
                  {format(day, "EEE")}
                </div>
                <div className={`text-sm ${isToday(day) ? 'text-blue-600' : 'text-gray-500'}`}>
                  {format(day, "MMM d")}
                </div>
              </div>
            ))}
          </div>

          {/* Rows for each person */}
          {people.map((person) => (
            <div key={person.id} className="flex border-b hover:bg-gray-50">
              <div className="w-48 flex-shrink-0 p-3 border-r bg-gray-50 sticky left-0 z-[5]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
                    {person.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {person.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {person.employment_type?.replace('_', ' ') || person.status}
                    </p>
                  </div>
                </div>
              </div>

              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                
                return (
                  <div
                    key={day.toString()}
                    className="flex-1 min-w-[120px] border-r relative"
                    style={{ minHeight: "100px" }}
                  >
                    <div className="relative h-full">
                      {TIME_SLOTS.map((time, timeIndex) => {
                        const shift = getShiftForSlot(person.id, day, time);
                        const droppableId = `timeslot-${person.id}-${dateStr}-${time}`;

                        if (shift) {
                          const height = calculateShiftHeight(shift);
                          const shiftColor = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning;
                          const partnerName = viewMode === "carers"
                            ? getPersonName(shift.client_id, "client")
                            : getPersonName(shift.carer_id, "carer");

                          return (
                            <Draggable
                              key={shift.id}
                              draggableId={`shift-${shift.id}`}
                              index={timeIndex}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`absolute left-1 right-1 p-2 rounded border-l-4 cursor-move ${shiftColor} ${
                                    snapshot.isDragging ? 'shadow-lg opacity-90 z-50' : 'shadow-sm'
                                  }`}
                                  style={{
                                    top: `${timeIndex * 60}px`,
                                    height: `${height * 60 - 4}px`,
                                    ...provided.draggableProps.style,
                                  }}
                                  onClick={() => onEditShift(shift)}
                                >
                                  <div className="text-xs font-semibold mb-1">
                                    {shift.start_time} - {shift.end_time}
                                  </div>
                                  <div className="text-xs truncate">
                                    {partnerName}
                                  </div>
                                  {shift.tasks && shift.tasks.length > 0 && (
                                    <div className="text-xs text-gray-600 truncate mt-1">
                                      {shift.tasks[0]}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        }

                        return (
                          <Droppable
                            key={`${droppableId}-${timeIndex}`}
                            droppableId={droppableId}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`h-[60px] border-t border-dashed border-gray-200 ${
                                  snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                                }`}
                              >
                                {snapshot.isDraggingOver && (
                                  <div className="text-xs text-blue-600 p-1 text-center">
                                    Drop here
                                  </div>
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}