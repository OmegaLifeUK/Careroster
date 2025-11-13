import React, { useState } from "react";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const SHIFT_COLORS = {
  morning: "bg-green-200 border-green-400 text-green-900",
  afternoon: "bg-blue-200 border-blue-400 text-blue-900",
  evening: "bg-purple-200 border-purple-400 text-purple-900",
  night: "bg-indigo-200 border-indigo-400 text-indigo-900",
  supervision: "bg-yellow-200 border-yellow-400 text-yellow-900",
};

export default function SplitScreenScheduler({ 
  shifts = [], 
  carers = [], 
  clients = [], 
  onShiftUpdate,
  onShiftClick 
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedShift, setDraggedShift] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getShiftsForCarerAndDate = (carerId, date) => {
    if (!Array.isArray(shifts)) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter(s => s && s.carer_id === carerId && s.date === dateStr);
  };

  const handleDragStart = (e, shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setHoveredSlot(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, carerId, date, hour) => {
    e.preventDefault();
    if (draggedShift && onShiftUpdate) {
      const dateStr = format(date, "yyyy-MM-dd");
      const startTime = hour;
      const [startHour] = hour.split(':').map(Number);
      const duration = draggedShift.duration_hours || 1;
      const endHour = startHour + Math.floor(duration);
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;

      onShiftUpdate(draggedShift.id, {
        ...draggedShift,
        carer_id: carerId,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        status: 'scheduled'
      });
    }
    setDraggedShift(null);
    setHoveredSlot(null);
  };

  const getShiftPosition = (shift) => {
    if (!shift) return { left: 0, width: 0 };
    const [hour, minute] = (shift.start_time || "00:00").split(':').map(Number);
    const duration = shift.duration_hours || 1;
    const startPos = hour * 60 + (minute / 60) * 60; // pixels per hour
    const width = duration * 60;
    return { left: startPos, width };
  };

  const getClientName = (clientId) => {
    if (!clientId || !Array.isArray(clients)) return "Unknown";
    const client = clients.find(c => c && c.id === clientId);
    return client?.full_name || "Unknown";
  };

  const activeCarers = Array.isArray(carers) ? carers.filter(c => c && c.status === 'active') : [];

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Week
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </h2>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
            >
              Next Week
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Split Screen Layout */}
      <div className="flex h-[calc(100vh-300px)] bg-white border rounded-lg overflow-hidden shadow-lg">
        {/* Left Sidebar - Carers List */}
        <div className="w-64 border-r bg-gray-50 overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 border-b p-4 z-10">
            <h3 className="font-semibold text-gray-900">Care Team</h3>
            <p className="text-xs text-gray-500 mt-1">{activeCarers.length} active carers</p>
          </div>
          <div className="p-2">
            {activeCarers.map(carer => {
              if (!carer) return null;
              
              return (
                <div
                  key={carer.id}
                  className="p-3 mb-2 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {carer.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {carer.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {carer.employment_type?.replace('_', ' ') || 'Staff'}
                      </p>
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
            <div className="w-16 flex-shrink-0 border-r"></div>
            {weekDays.map(day => (
              <div key={day.toString()} className="flex-1 min-w-[800px]">
                <div className="p-3 text-center border-r">
                  <p className="font-semibold text-gray-900">{format(day, "EEE")}</p>
                  <p className="text-sm text-gray-500">{format(day, "MMM d")}</p>
                </div>
                {/* Hour Headers */}
                <div className="flex border-t">
                  {HOURS.map(hour => (
                    <div 
                      key={hour} 
                      className="w-[60px] flex-shrink-0 border-r border-gray-200 p-1 text-center"
                    >
                      <span className="text-[10px] text-gray-500">{hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Carer Rows */}
          {activeCarers.map(carer => {
            if (!carer) return null;
            
            return (
              <div key={carer.id} className="flex border-b hover:bg-gray-50">
                {/* Carer Name Column */}
                <div className="w-16 flex-shrink-0 border-r bg-gray-50 p-2 flex items-center justify-center sticky left-0 z-10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-xs">
                    {carer.full_name?.charAt(0) || '?'}
                  </div>
                </div>

                {/* Day Columns */}
                {weekDays.map(day => {
                  const carerShifts = getShiftsForCarerAndDate(carer.id, day);
                  
                  return (
                    <div 
                      key={day.toString()} 
                      className="flex-1 min-w-[800px] border-r relative"
                      style={{ minHeight: '80px' }}
                    >
                      {/* Hour Grid */}
                      <div className="flex h-full">
                        {HOURS.map(hour => {
                          const slotKey = `${carer.id}-${format(day, 'yyyy-MM-dd')}-${hour}`;
                          
                          return (
                            <div
                              key={hour}
                              className={`w-[60px] flex-shrink-0 border-r border-gray-100 relative ${
                                hoveredSlot === slotKey ? 'bg-blue-100' : ''
                              }`}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, carer.id, day, hour)}
                              onDragEnter={() => setHoveredSlot(slotKey)}
                              onDragLeave={() => setHoveredSlot(null)}
                            />
                          );
                        })}
                      </div>

                      {/* Shifts Overlay */}
                      {Array.isArray(carerShifts) && carerShifts.map(shift => {
                        if (!shift) return null;
                        
                        const { left, width } = getShiftPosition(shift);
                        const shiftColor = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning;
                        
                        return (
                          <div
                            key={shift.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, shift)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onShiftClick && onShiftClick(shift)}
                            className={`absolute top-1 h-[calc(100%-8px)] border-l-4 rounded cursor-move ${shiftColor} ${
                              draggedShift?.id === shift.id ? 'opacity-50' : 'shadow-sm hover:shadow-md'
                            }`}
                            style={{
                              left: `${left}px`,
                              width: `${width}px`,
                              zIndex: 5
                            }}
                          >
                            <div className="p-1 h-full overflow-hidden">
                              <p className="text-[10px] font-semibold truncate">
                                {shift.start_time} - {shift.end_time}
                              </p>
                              <p className="text-[9px] truncate mt-1">
                                {getClientName(shift.client_id)}
                              </p>
                              {shift.tasks && Array.isArray(shift.tasks) && shift.tasks[0] && (
                                <p className="text-[8px] text-gray-600 truncate mt-0.5">
                                  {shift.tasks[0]}
                                </p>
                              )}
                            </div>
                          </div>
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