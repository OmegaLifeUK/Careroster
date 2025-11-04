import React, { useState } from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { ChevronRight, MapPin, Clock, User } from "lucide-react";
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeStaff = staff.filter(s => s.is_active);

  const getVisitsForStaffAndDate = (staffId, date) => {
    return visits.filter(v => {
      try {
        return v.assigned_staff_id === staffId && isSameDay(parseISO(v.scheduled_start), date);
      } catch {
        return false;
      }
    });
  };

  const handleDragStart = (e, visit) => {
    setDraggedVisit(visit);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedVisit(null);
    setHoveredSlot(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, staffId, date, hour) => {
    e.preventDefault();
    if (draggedVisit) {
      const [hourNum] = hour.split(':').map(Number);
      const newStart = new Date(date);
      newStart.setHours(hourNum, 0, 0, 0);
      
      const duration = draggedVisit.scheduled_end && draggedVisit.scheduled_start
        ? (new Date(draggedVisit.scheduled_end) - new Date(draggedVisit.scheduled_start)) / (1000 * 60 * 60)
        : 0.5;
      
      const newEnd = new Date(newStart);
      newEnd.setHours(newStart.getHours() + duration);

      onVisitUpdate(draggedVisit.id, {
        ...draggedVisit,
        assigned_staff_id: staffId,
        scheduled_start: newStart.toISOString(),
        scheduled_end: newEnd.toISOString(),
        status: 'published'
      });
    }
    setDraggedVisit(null);
    setHoveredSlot(null);
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
    <div className="flex h-[calc(100vh-250px)] bg-white border rounded-lg overflow-hidden shadow-lg">
      {/* Left Sidebar - Staff List */}
      <div className="w-56 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="sticky top-0 bg-gray-100 border-b p-4 z-10">
          <h3 className="font-semibold text-gray-900 text-sm">Care Staff</h3>
          <p className="text-xs text-gray-500 mt-1">{activeStaff.length} active</p>
        </div>
        <div className="p-2">
          {activeStaff.map(member => (
            <div
              key={member.id}
              className="p-3 mb-2 bg-white border rounded-lg hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {member.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {member.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.vehicle_type || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
        {activeStaff.map(member => (
          <div key={member.id} className="flex border-b hover:bg-gray-50">
            {/* Day Columns */}
            {weekDays.map(day => {
              const staffVisits = getVisitsForStaffAndDate(member.id, day);
              
              return (
                <div 
                  key={day.toString()} 
                  className="flex-1 min-w-[600px] border-r relative"
                  style={{ minHeight: '70px' }}
                >
                  {/* Hour Grid */}
                  <div className="flex h-full">
                    {HOURS.map(hour => {
                      const slotKey = `${member.id}-${format(day, 'yyyy-MM-dd')}-${hour}`;
                      
                      return (
                        <div
                          key={hour}
                          className={`w-[50px] flex-shrink-0 border-r border-gray-100 relative ${
                            hoveredSlot === slotKey ? 'bg-blue-100' : ''
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, member.id, day, hour)}
                          onDragEnter={() => setHoveredSlot(slotKey)}
                          onDragLeave={() => setHoveredSlot(null)}
                        />
                      );
                    })}
                  </div>

                  {/* Visits Overlay */}
                  {staffVisits.map(visit => {
                    const { left, width } = getVisitPosition(visit);
                    const statusColor = STATUS_COLORS[visit.status] || STATUS_COLORS.draft;
                    
                    return (
                      <div
                        key={visit.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, visit)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onVisitClick(visit)}
                        className={`absolute top-1 h-[calc(100%-8px)] border-l-4 rounded cursor-move ${statusColor} ${
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
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}