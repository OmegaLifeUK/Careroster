import React, { useState, useEffect } from "react";
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
  MapPin,
  User,
  Activity,
  AlertCircle
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, addDays, isToday, isSameDay } from "date-fns";

export default function ClientPortalSchedule() {
  const [user, setUser] = useState(null);
  const [portalAccess, setPortalAccess] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const loadUserAndAccess = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        const allAccess = await base44.entities.ClientPortalAccess.list();
        const userAccess = Array.isArray(allAccess) ? allAccess.find(a => 
          a.user_email === userData.email && a.is_active
        ) : null;
        setPortalAccess(userAccess);
      } catch (error) {
        console.error("Error loading portal access:", error);
      }
    };
    loadUserAndAccess();
  }, []);

  const { data: schedule = [] } = useQuery({
    queryKey: ['portal-schedule', portalAccess?.client_id, portalAccess?.client_type],
    queryFn: async () => {
      if (!portalAccess) return [];
      
      try {
        if (portalAccess.client_type === 'day_centre') {
          const sessions = await base44.entities.DayCentreSession.list('-session_date');
          const safeSessions = Array.isArray(sessions) ? sessions : [];
          return safeSessions.filter(s => 
            s && s.registered_clients && Array.isArray(s.registered_clients) && s.registered_clients.includes(portalAccess.client_id)
          );
        } else if (portalAccess.client_type === 'supported_living') {
          const shifts = await base44.entities.SupportedLivingShift.list('-date');
          const safeShifts = Array.isArray(shifts) ? shifts : [];
          return safeShifts.filter(s => 
            s && s.clients_supported && Array.isArray(s.clients_supported) && s.clients_supported.includes(portalAccess.client_id)
          );
        }
        return [];
      } catch (error) {
        console.error("Error fetching schedule:", error);
        return [];
      }
    },
    enabled: !!portalAccess,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['daycentre-activities'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DayCentreActivity.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching activities:", error);
        return [];
      }
    },
    enabled: portalAccess?.client_type === 'day_centre',
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['supported-living-properties'],
    queryFn: async () => {
      try {
        const data = await base44.entities.SupportedLivingProperty.list();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching properties:", error);
        return [];
      }
    },
    enabled: portalAccess?.client_type === 'supported_living',
  });

  const getScheduleForDay = (date) => {
    const safeSchedule = Array.isArray(schedule) ? schedule : [];
    return safeSchedule.filter(item => {
      if (!item) return false;
      try {
        const dateField = portalAccess?.client_type === 'day_centre' ? 'session_date' : 'date';
        return item[dateField] && isSameDay(parseISO(item[dateField]), date);
      } catch {
        return false;
      }
    });
  };

  if (!portalAccess) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Loading...</h3>
                  <p className="text-sm text-orange-800">
                    Please wait while we load your schedule.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!portalAccess.can_view_schedule) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Access Denied</h3>
                  <p className="text-sm text-red-800">
                    You do not have permission to view the schedule. Please contact the care team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const safeSchedule = Array.isArray(schedule) ? schedule : [];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Schedule</h1>
          <p className="text-gray-500">View your upcoming sessions and appointments</p>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Week View</CardTitle>
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
                    isToday(day) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="text-xs text-gray-600 uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getScheduleForDay(day).length} items
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((day, idx) => {
                const daySchedule = getScheduleForDay(day);
                return (
                  <div
                    key={idx}
                    className="p-2 border-r last:border-r-0 min-h-[200px] bg-gray-50"
                  >
                    <div className="space-y-2">
                      {daySchedule.map((item, itemIdx) => {
                        if (!item) return null;
                        
                        let activityName = '';
                        let location = '';
                        let timeStart = '';
                        
                        if (portalAccess.client_type === 'day_centre') {
                          const activity = activities.find(a => a.id === item.activity_id);
                          activityName = activity?.activity_name || 'Session';
                          location = item.location || '';
                          timeStart = item.start_time || '';
                        } else {
                          const property = properties.find(p => p.id === item.property_id);
                          activityName = item.shift_type?.replace('_', ' ') || 'Support';
                          location = property?.property_name || '';
                          timeStart = item.start_time || '';
                        }
                        
                        return (
                          <div
                            key={itemIdx}
                            className="p-2 bg-white rounded border-l-4 border-blue-500 text-xs"
                          >
                            <div className="font-medium mb-1">{timeStart}</div>
                            <div className="text-gray-900 font-medium truncate">
                              {activityName}
                            </div>
                            {location && (
                              <div className="text-gray-500 text-[10px] truncate mt-1">
                                {location}
                              </div>
                            )}
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

        {/* List View */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>This Week's Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {safeSchedule.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No scheduled items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {safeSchedule.filter(item => {
                  if (!item) return false;
                  try {
                    const dateField = portalAccess.client_type === 'day_centre' ? 'session_date' : 'date';
                    if (!item[dateField]) return false;
                    const itemDate = parseISO(item[dateField]);
                    return itemDate >= weekStart && itemDate <= weekEnd;
                  } catch {
                    return false;
                  }
                }).map((item, idx) => {
                  if (!item) return null;
                  
                  let activityName = '';
                  let location = '';
                  let timeStart = '';
                  let timeEnd = '';
                  let dateField = '';
                  
                  if (portalAccess.client_type === 'day_centre') {
                    const activity = activities.find(a => a.id === item.activity_id);
                    activityName = activity?.activity_name || 'Session';
                    location = item.location || '';
                    timeStart = item.start_time || '';
                    timeEnd = item.end_time || '';
                    dateField = item.session_date || '';
                  } else {
                    const property = properties.find(p => p.id === item.property_id);
                    activityName = item.shift_type?.replace('_', ' ') || 'Support Session';
                    location = property?.property_name || '';
                    timeStart = item.start_time || '';
                    timeEnd = item.end_time || '';
                    dateField = item.date || '';
                  }
                  
                  if (!dateField) return null;
                  
                  try {
                    return (
                      <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {portalAccess.client_type === 'day_centre' ? (
                                <Activity className="w-5 h-5 text-blue-600" />
                              ) : (
                                <User className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{activityName}</div>
                              <div className="text-sm text-gray-600">{dateField}</div>
                            </div>
                          </div>
                          {isToday(parseISO(dateField)) && (
                            <Badge className="bg-blue-500 text-white">Today</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Time:</span>
                            <span className="font-medium">{timeStart} - {timeEnd}</span>
                          </div>
                          {location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Location:</span>
                              <span className="font-medium">{location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.error("Error rendering schedule item:", error);
                    return null;
                  }
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}