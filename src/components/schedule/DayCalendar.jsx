import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from "lucide-react";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";

export default function DayCalendar({ shifts = [], carers = [], clients = [], onShiftClick, onShiftUpdate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const dayShifts = Array.isArray(shifts) ? shifts.filter(shift => {
    if (!shift || !shift.date) return false;
    try {
      return isSameDay(parseISO(shift.date), currentDate);
    } catch {
      return false;
    }
  }) : [];

  // Sort shifts by start time
  const sortedShifts = Array.isArray(dayShifts) 
    ? [...dayShifts].sort((a, b) => {
        return ((a && a.start_time) || '').localeCompare((b && b.start_time) || '');
      })
    : [];

  const getCarerName = (carerId) => {
    if (!carerId) return 'Unassigned';
    const carer = Array.isArray(carers) ? carers.find(c => c && c.id === carerId) : null;
    return carer?.full_name || 'Unassigned';
  };

  const getClientName = (clientId) => {
    if (!clientId) return 'Unknown';
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === clientId) : null;
    return client?.full_name || 'Unknown';
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    unfilled: 'bg-orange-100 text-orange-800',
  };
  
  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
              <p className="text-sm text-gray-500">{sortedShifts.length} shifts scheduled</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addDays(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline View */}
      <div className="grid grid-cols-1 gap-2">
        {sortedShifts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No shifts scheduled for this day</p>
            </CardContent>
          </Card>
        ) : (
          sortedShifts.map((shift) => {
            if (!shift) return null;
            
            return (
              <Card 
                key={shift.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onShiftClick && onShiftClick(shift)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[shift.status] || 'bg-gray-100 text-gray-800'}>
                          {shift.status}
                        </Badge>
                        {shift.shift_type && (
                          <Badge variant="outline" className="capitalize">
                            {shift.shift_type}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">
                            {shift.start_time} - {shift.end_time}
                          </span>
                          {shift.duration_hours && (
                            <span className="text-gray-500">({shift.duration_hours}h)</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className={shift.carer_id ? '' : 'text-red-600 font-semibold'}>
                            {getCarerName(shift.carer_id)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{getClientName(shift.client_id)}</span>
                        </div>
                      </div>

                      {shift.tasks && Array.isArray(shift.tasks) && shift.tasks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {shift.tasks.slice(0, 3).map((task, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {task}
                            </Badge>
                          ))}
                          {shift.tasks.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{shift.tasks.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {shift.notes && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-1">{shift.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}