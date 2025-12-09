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
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Smile,
  Frown,
  Meh,
  Activity,
  AlertCircle,
  Sparkles,
  Plus
} from "lucide-react";
import { format, parseISO, isToday, isSameDay, addDays, subDays } from "date-fns";
import AttendanceDialog from "../components/daycentre/AttendanceDialog";

const moodIcons = {
  happy: { icon: Smile, color: "text-green-600", bg: "bg-green-50" },
  neutral: { icon: Meh, color: "text-gray-600", bg: "bg-gray-50" },
  anxious: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
  upset: { icon: Frown, color: "text-red-600", bg: "bg-red-50" },
  excited: { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
};

const statusColors = {
  present: "bg-green-100 text-green-800",
  absent_notified: "bg-orange-100 text-orange-800",
  absent_unnotified: "bg-red-100 text-red-800",
  late: "bg-yellow-100 text-yellow-800",
  early_departure: "bg-blue-100 text-blue-800",
};

export default function DayCentreAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);

  const { data: attendance = [], isLoading, error: attendanceError } = useQuery({
    queryKey: ['daycentre-attendance'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DayCentreAttendance.list('-attendance_date');
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching attendance:", error);
        return [];
      }
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['daycentre-clients'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DayCentreClient.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
      }
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Staff.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching staff:", error);
        return [];
      }
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['daycentre-sessions'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DayCentreSession.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching sessions:", error);
        return [];
      }
    },
  });

  const dateAttendance = attendance.filter(att => {
    try {
      return isSameDay(parseISO(att.attendance_date), selectedDate);
    } catch {
      return false;
    }
  });

  const todayAttendance = attendance.filter(att => {
    try {
      return isToday(parseISO(att.attendance_date));
    } catch {
      return false;
    }
  });

  const stats = {
    present: todayAttendance.filter(a => a.status === 'present').length,
    absent: todayAttendance.filter(a => a.status === 'absent_notified' || a.status === 'absent_unnotified').length,
    late: todayAttendance.filter(a => a.status === 'late').length,
    total: todayAttendance.length,
  };

  const attendanceRate = stats.total > 0 
    ? ((stats.present / stats.total) * 100).toFixed(0)
    : 0;

  if (selectedAttendance) {
    const client = clients.find(c => c.id === selectedAttendance.client_id);
    const recordedBy = staff.find(s => s.id === selectedAttendance.recorded_by_staff_id);
    const arrivalMood = moodIcons[selectedAttendance.mood_on_arrival];
    const departureMood = moodIcons[selectedAttendance.mood_on_departure];

    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedAttendance(null)}
            className="mb-6"
          >
            ← Back to Attendance
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{client?.full_name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColors[selectedAttendance.status]}>
                {selectedAttendance.status.replace('_', ' ')}
              </Badge>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{selectedAttendance.attendance_date}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Arrival Time</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="font-bold text-blue-900">
                    {selectedAttendance.arrival_time ? format(parseISO(selectedAttendance.arrival_time), 'HH:mm') : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Departure Time</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <p className="font-bold text-green-900">
                    {selectedAttendance.departure_time ? format(parseISO(selectedAttendance.departure_time), 'HH:mm') : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {arrivalMood && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Arrival Mood</p>
                  <div className="flex items-center gap-2">
                    <arrivalMood.icon className={`w-5 h-5 ${arrivalMood.color}`} />
                    <p className="font-medium capitalize">{selectedAttendance.mood_on_arrival}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {departureMood && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Departure Mood</p>
                  <div className="flex items-center gap-2">
                    <departureMood.icon className={`w-5 h-5 ${departureMood.color}`} />
                    <p className="font-medium capitalize">{selectedAttendance.mood_on_departure}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                <CardTitle>Attendance Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Transport Used</p>
                      <p className="font-medium capitalize">{selectedAttendance.transport_used?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Lunch Consumed</p>
                      <div className="flex items-center gap-2">
                        {selectedAttendance.lunch_consumed ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-medium">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">No</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Medication Given</p>
                      <div className="flex items-center gap-2">
                        {selectedAttendance.medication_administered ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-medium">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">No</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Recorded By</p>
                      <p className="font-medium">{recordedBy?.full_name || 'Unknown'}</p>
                    </div>
                  </div>

                  {selectedAttendance.activities_participated && selectedAttendance.activities_participated.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Activities Participated</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedAttendance.activities_participated.map((activity, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-50">
                            {activity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAttendance.positive_highlights && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-green-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-green-900 mb-2">Positive Highlights</p>
                          <p className="text-green-800">{selectedAttendance.positive_highlights}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAttendance.incidents_or_concerns && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-orange-900 mb-2">Incidents or Concerns</p>
                          <p className="text-orange-800">{selectedAttendance.incidents_or_concerns}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Client Name</p>
                    <p className="font-medium">{client?.full_name}</p>
                  </div>
                  {client?.attendance_days && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Regular Days</p>
                      <div className="flex flex-wrap gap-1">
                        {client.attendance_days.map((day, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {day.substring(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
          </div>
        </div>
      </div>
    );
  }

  if (attendanceError) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Error Loading Attendance</p>
                  <p className="text-sm">{attendanceError.message || "Failed to load data"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Attendance Register</h1>
            <p className="text-gray-500">Track client attendance and daily notes</p>
          </div>
          <Button
            onClick={() => {
              setEditingAttendance(null);
              setShowAttendanceDialog(true);
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Attendance
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Present Today</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-gray-600">Absent Today</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-gray-600">Late Arrivals</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-gray-600">Attendance Rate</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{attendanceRate}%</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Select Date</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[150px] text-center">
                  {format(selectedDate, 'EEEE, MMM d, yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Attendance - {format(selectedDate, 'EEEE, MMM d')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {dateAttendance.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No attendance records for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dateAttendance.map((att) => {
                  const client = clients.find(c => c.id === att.client_id);
                  const arrivalMood = moodIcons[att.mood_on_arrival];
                  const departureMood = moodIcons[att.mood_on_departure];

                  return (
                    <div
                      key={att.id}
                      onClick={() => {
                        setEditingAttendance(att);
                        setShowAttendanceDialog(true);
                      }}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-lg">
                            {client?.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-lg">{client?.full_name}</div>
                            <div className="text-sm text-gray-600">
                              {att.arrival_time && format(parseISO(att.arrival_time), 'HH:mm')} - {att.departure_time && format(parseISO(att.departure_time), 'HH:mm')}
                            </div>
                          </div>
                        </div>
                        <Badge className={statusColors[att.status]}>
                          {att.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {arrivalMood && (
                          <div className={`p-2 rounded ${arrivalMood.bg}`}>
                            <div className="flex items-center gap-2">
                              <arrivalMood.icon className={`w-4 h-4 ${arrivalMood.color}`} />
                              <span className="text-xs">Arrived {att.mood_on_arrival}</span>
                            </div>
                          </div>
                        )}
                        {departureMood && (
                          <div className={`p-2 rounded ${departureMood.bg}`}>
                            <div className="flex items-center gap-2">
                              <departureMood.icon className={`w-4 h-4 ${departureMood.color}`} />
                              <span className="text-xs">Left {att.mood_on_departure}</span>
                            </div>
                          </div>
                        )}
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {att.lunch_consumed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-xs">Lunch</span>
                          </div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {att.medication_administered ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-xs">Medication</span>
                          </div>
                        </div>
                      </div>

                      {att.activities_participated && att.activities_participated.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Participated in {att.activities_participated.length} activities
                          </span>
                        </div>
                      )}

                      {att.positive_highlights && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-green-600 mt-0.5" />
                            <p className="text-sm text-green-800 line-clamp-2">{att.positive_highlights}</p>
                          </div>
                        </div>
                      )}

                      {att.incidents_or_concerns && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mt-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                            <p className="text-sm text-orange-800 line-clamp-2">{att.incidents_or_concerns}</p>
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

        {showAttendanceDialog && (
          <AttendanceDialog
            attendance={editingAttendance}
            selectedDate={selectedDate}
            onClose={() => {
              setShowAttendanceDialog(false);
              setEditingAttendance(null);
            }}
          />
        )}
      </div>
    </div>
  );
}