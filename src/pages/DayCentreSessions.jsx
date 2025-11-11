
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  Plus,
  User,
  CheckCircle
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, addDays, isToday, isSameDay } from "date-fns";

export default function DayCentreSessions() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['daycentre-sessions'],
    queryFn: () => base44.entities.DayCentreSession.list('-session_date'),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['daycentre-activities'],
    queryFn: () => base44.entities.DayCentreActivity.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['daycentre-clients'],
    queryFn: () => base44.entities.DayCentreClient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDay = (date) => {
    return sessions.filter(session => {
      try {
        return isSameDay(parseISO(session.session_date), date);
      } catch {
        return false;
      }
    });
  };

  const todaySessions = getSessionsForDay(new Date());

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-800",
  };

  if (selectedSession) {
    const activity = activities.find(a => a.id === selectedSession.activity_id);
    const facilitators = staff.filter(s => 
      selectedSession.facilitator_staff_ids?.includes(s.id)
    );
    const registeredClients = clients.filter(c => 
      selectedSession.registered_clients?.includes(c.id)
    );
    const occupancyRate = selectedSession.max_capacity > 0 
      ? ((registeredClients.length / selectedSession.max_capacity) * 100).toFixed(0)
      : 0;

    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedSession(null)}
            className="mb-6"
          >
            ← Back to Sessions
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {activity?.activity_name || 'Session'}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColors[selectedSession.status]}>
                {selectedSession.status.replace('_', ' ')}
              </Badge>
              {selectedSession.is_recurring && (
                <Badge variant="outline">
                  Recurring - {selectedSession.recurrence_pattern}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-gray-600">Date</p>
                </div>
                <p className="font-bold text-blue-900">{selectedSession.session_date}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-gray-600">Time</p>
                </div>
                <p className="font-bold text-green-900">
                  {selectedSession.start_time} - {selectedSession.end_time}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-600" />
                  <p className="text-sm text-gray-600">Registered</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {registeredClients.length}/{selectedSession.max_capacity}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-orange-600" />
                  <p className="text-sm text-gray-600">Facilitators</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">{facilitators.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Activity</p>
                    <p className="text-lg font-semibold">{activity?.activity_name}</p>
                    <p className="text-sm text-gray-600 mt-1">{activity?.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{selectedSession.location}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Capacity</p>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {registeredClients.length}/{selectedSession.max_capacity} ({occupancyRate}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500"
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  {selectedSession.session_notes && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Session Notes</p>
                      <p className="text-blue-800">{selectedSession.session_notes}</p>
                    </div>
                  )}

                  {selectedSession.completion_notes && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-2">Completion Notes</p>
                      <p className="text-green-800">{selectedSession.completion_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {facilitators.length > 0 && (
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Facilitators</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {facilitators.map(facilitator => (
                        <div key={facilitator.id} className="p-3 bg-amber-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-amber-600" />
                            <span className="font-medium text-amber-900">{facilitator.full_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedSession.is_recurring && (
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Recurrence</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="bg-blue-50">
                      {selectedSession.recurrence_pattern}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {registeredClients.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Registered Participants</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {registeredClients.map((client) => (
                    <div key={client.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                          {client.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{client.full_name}</p>
                          <p className="text-xs text-gray-500">{client.mobility?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Centre Sessions</h1>
            <p className="text-gray-500">Manage activity sessions and bookings</p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">Today's Sessions</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{todaySessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-gray-600">Upcoming</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {sessions.filter(s => s.status === 'scheduled').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Week View</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addDays(currentDate, -7))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[200px] text-center">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addDays(currentDate, 7))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`p-3 text-center border-r last:border-r-0 ${
                    isToday(day) ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="text-xs text-gray-600 uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday(day) ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getSessionsForDay(day).length} sessions
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((day, idx) => {
                const daySessions = getSessionsForDay(day);
                return (
                  <div
                    key={idx}
                    className="p-2 border-r last:border-r-0 min-h-[300px] bg-gray-50"
                  >
                    <div className="space-y-2">
                      {daySessions.map((session) => {
                        const activity = activities.find(a => a.id === session.activity_id);
                        const registeredCount = session.registered_clients?.length || 0;
                        
                        return (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className="p-2 bg-white rounded border-l-4 border-amber-500 cursor-pointer hover:shadow-md transition-shadow text-xs"
                          >
                            <div className="font-medium mb-1">{session.start_time}</div>
                            <div className="text-gray-900 font-medium truncate mb-1">
                              {activity?.activity_name}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-600">
                              <Users className="w-3 h-3" />
                              <span>{registeredCount}/{session.max_capacity}</span>
                            </div>
                            <Badge variant="outline" className={`text-[10px] mt-1 ${statusColors[session.status]}`}>
                              {session.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {todaySessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No sessions scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => {
                  const activity = activities.find(a => a.id === session.activity_id);
                  const registeredClients = clients.filter(c => 
                    session.registered_clients?.includes(c.id)
                  );
                  const facilitators = staff.filter(s => 
                    session.facilitator_staff_ids?.includes(s.id)
                  );

                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-semibold">{session.start_time} - {session.end_time}</div>
                            <div className="text-sm text-gray-600">{activity?.activity_name}</div>
                          </div>
                        </div>
                        <Badge className={statusColors[session.status]}>
                          {session.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{session.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Registered:</span>
                          <span className="font-medium">
                            {registeredClients.length}/{session.max_capacity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Facilitators:</span>
                          <span className="font-medium">{facilitators.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
