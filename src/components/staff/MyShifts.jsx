import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  unfilled: "bg-orange-100 text-orange-800",
};

export default function MyShifts() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['my-shifts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const allShifts = await base44.entities.Shift.list();
        return Array.isArray(allShifts) 
          ? allShifts.filter(s => s.carer_id === user.email || s.carer_id === user.id)
          : [];
      } catch (error) {
        console.log("Shifts not available");
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-shifts'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Client.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: timeAttendance = [] } = useQuery({
    queryKey: ['my-time-attendance', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const data = await base44.entities.TimeAttendance.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const isLoading = shiftsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedShifts = [...shifts]
    .sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.start_time);
      const dateB = new Date(b.date + ' ' + b.start_time);
      return dateB - dateA;
    })
    .slice(0, 10);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || "Unknown Client";
  };

  const getClientAddress = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client?.address) return null;
    return `${client.address.city || ''} ${client.address.postcode || ''}`.trim();
  };

  const getShiftAttendance = (shiftId) => {
    return timeAttendance.find(ta => ta.shift_id === shiftId);
  };

  const getShiftDate = (shift) => {
    try {
      const date = parseISO(shift.date);
      if (isToday(date)) return "Today";
      if (isFuture(date)) return format(date, "EEE, MMM d");
      return format(date, "MMM d, yyyy");
    } catch {
      return shift.date;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          My Shifts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedShifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No shifts assigned yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedShifts.map((shift) => {
              const attendance = getShiftAttendance(shift.id);
              const clientAddress = getClientAddress(shift.client_id);

              return (
                <div 
                  key={shift.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {getShiftDate(shift)}
                        </span>
                        <Badge className={statusColors[shift.status]}>
                          {shift.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {shift.start_time} - {shift.end_time}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {shift.shift_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{getClientName(shift.client_id)}</span>
                    </div>
                    {clientAddress && (
                      <div className="flex items-center gap-2 ml-6 text-gray-500">
                        <span className="text-xs">{clientAddress}</span>
                      </div>
                    )}
                  </div>

                  {attendance && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        {attendance.clock_in_time && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span>In: {format(new Date(attendance.clock_in_time), "h:mm a")}</span>
                            {attendance.clock_in_location_match === "mismatch" && (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                        )}
                        {attendance.clock_out_time && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-blue-500" />
                            <span>Out: {format(new Date(attendance.clock_out_time), "h:mm a")}</span>
                            {attendance.clock_out_location_match === "mismatch" && (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                        )}
                        {attendance.total_hours && (
                          <div className="font-medium text-gray-700">
                            Total: {attendance.total_hours.toFixed(2)}h
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}