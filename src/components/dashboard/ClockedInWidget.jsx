import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Clock, MapPin, RefreshCw } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";

export default function ClockedInWidget({ carers = [], staff = [] }) {
  const { data: timeAttendance = [], refetch, isFetching } = useQuery({
    queryKey: ['time-attendance-live'],
    queryFn: () => base44.entities.TimeAttendance.filter({ clock_out_time: null }),
    refetchInterval: 60000,
  });

  const allStaff = [...carers, ...staff];

  const clockedInNow = timeAttendance.filter(t => t.clock_in_time && !t.clock_out_time);

  // Group by location
  const byLocation = clockedInNow.reduce((acc, record) => {
    const location = record.clock_in_location?.address || record.location_name || "Unknown Location";
    if (!acc[location]) acc[location] = [];
    acc[location].push(record);
    return acc;
  }, {});

  const getStaffName = (id) => {
    const person = allStaff.find(s => s.id === id);
    return person?.full_name || "Unknown";
  };

  const getDuration = (clockInTime) => {
    try {
      const mins = differenceInMinutes(new Date(), parseISO(clockInTime));
      if (mins < 60) return `${mins}m`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    } catch {
      return "—";
    }
  };

  return (
    <Card className="shadow-lg md:col-span-2">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50 py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="w-4 h-4 text-green-600" />
            Who's Clocked In Right Now
            <Badge className="bg-green-600 text-white text-xs ml-1">{clockedInNow.length}</Badge>
          </CardTitle>
          <button
            onClick={() => refetch()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {clockedInNow.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No staff currently clocked in</p>
        ) : (
          <div className="space-y-4 max-h-72 overflow-y-auto">
            {Object.entries(byLocation).map(([location, records]) => (
              <div key={location}>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate">{location}</span>
                  <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">{records.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {records.map(record => (
                    <div key={record.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getStaffName(record.carer_id).charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{getStaffName(record.carer_id)}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>In {getDuration(record.clock_in_time)} ago</span>
                          {record.clock_in_time && (
                            <span className="text-gray-400">· {format(parseISO(record.clock_in_time), 'HH:mm')}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}