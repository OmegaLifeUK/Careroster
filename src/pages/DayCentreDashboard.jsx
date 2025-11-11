
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  Calendar, 
  Activity,
  TrendingUp,
  Clock,
  Settings,
  Smile
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, startOfWeek, endOfWeek } from "date-fns";

const DEFAULT_PREFERENCES = {
  statsCards: true,
  todaySessions: true,
  attendanceOverview: true,
  quickActions: true,
};

export default function DayCentreDashboard() {
  const [user, setUser] = useState(null);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.day_centre_dashboard_preferences) {
          setModulePreferences(userData.day_centre_dashboard_preferences);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['day-centre-clients'],
    queryFn: () => base44.entities.DayCentreClient.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['day-centre-activities'],
    queryFn: () => base44.entities.DayCentreActivity.filter({ is_active: true }),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['day-centre-sessions'],
    queryFn: () => base44.entities.DayCentreSession.list('-session_date'),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['day-centre-attendance'],
    queryFn: () => base44.entities.DayCentreAttendance.list('-attendance_date'),
  });

  const activeClients = clients.filter(c => c.status === 'active').length;

  const todaySessions = sessions.filter(session => {
    try {
      return isToday(parseISO(session.session_date));
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

  const thisWeekAttendance = attendance.filter(att => {
    try {
      const attDate = parseISO(att.attendance_date);
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      return attDate >= weekStart && attDate <= weekEnd;
    } catch {
      return false;
    }
  });

  const attendanceRate = activeClients > 0 
    ? ((todayAttendance.filter(a => a.status === 'present').length / activeClients) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-amber-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Centre Dashboard</h1>
            <p className="text-gray-500">Overview of day centre services and activities</p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Customize
          </Button>
        </div>

        {modulePreferences.statsCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link to={createPageUrl("DayCentreClients")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("DayCentreActivities")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Activities</p>
                      <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("DayCentreAttendance")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <Smile className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Today's Attendance</p>
                      <p className="text-2xl font-bold text-gray-900">{todayAttendance.length}</p>
                      <p className="text-xs text-gray-500">{attendanceRate}% rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("DayCentreSessions")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Today's Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{todaySessions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {modulePreferences.todaySessions && (
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">Today's Sessions</CardTitle>
                    <Link 
                      to={createPageUrl("DayCentreSessions")}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All →
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {todaySessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No sessions scheduled for today</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todaySessions.slice(0, 5).map((session) => {
                        const activity = activities.find(a => a.id === session.activity_id);
                        
                        return (
                          <div 
                            key={session.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{activity?.activity_name || "Activity"}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {session.start_time} - {session.end_time}
                                  </span>
                                </div>
                              </div>
                              <Badge className={
                                session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {session.status}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p>Category: <span className="font-medium capitalize">{activity?.category?.replace('_', ' ')}</span></p>
                              <p className="mt-1">Registered: {session.registered_clients?.length || 0} / {session.max_capacity || 0}</p>
                              <p>Location: <span className="font-medium capitalize">{session.location?.replace('_', ' ')}</span></p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {modulePreferences.attendanceOverview && (
            <div>
              <Card className="shadow-lg mb-6">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-xl font-bold">Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-900">Present</span>
                      <span className="text-2xl font-bold text-green-900">
                        {todayAttendance.filter(a => a.status === 'present').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium text-yellow-900">Late</span>
                      <span className="text-2xl font-bold text-yellow-900">
                        {todayAttendance.filter(a => a.status === 'late').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-900">Absent</span>
                      <span className="text-2xl font-bold text-red-900">
                        {todayAttendance.filter(a => a.status === 'absent_notified' || a.status === 'absent_unnotified').length}
                      </span>
                    </div>
                  </div>
                  <Link to={createPageUrl("DayCentreAttendance")}>
                    <Button variant="outline" className="w-full mt-4">
                      Manage Attendance
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardTitle className="text-lg font-bold">This Week</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-900">{thisWeekAttendance.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Attendances</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {modulePreferences.quickActions && (
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link to={createPageUrl("DayCentreSessions")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <Calendar className="w-5 h-5" />
                    <span className="text-xs">Manage Sessions</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("DayCentreClients")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <Users className="w-5 h-5" />
                    <span className="text-xs">View Clients</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("DayCentreActivities")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs">Manage Activities</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("DayCentreAttendance")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs">Attendance</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
