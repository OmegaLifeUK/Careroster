import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Bell,
  Heart,
  Activity,
  Home,
  MapPin,
  Sparkles
} from "lucide-react";
import { format, parseISO, isToday, isFuture } from "date-fns";

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [portalAccess, setPortalAccess] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    const loadUserAndAccess = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Find portal access for this user
        const allAccess = await base44.entities.ClientPortalAccess.list();
        const userAccess = allAccess.find(a => 
          a.user_email === userData.email && a.is_active
        );
        
        if (userAccess) {
          setPortalAccess(userAccess);
          
          // Load client based on type
          let clientData;
          switch (userAccess.client_type) {
            case 'day_centre':
              const dayCentreClients = await base44.entities.DayCentreClient.list();
              clientData = dayCentreClients.find(c => c.id === userAccess.client_id);
              break;
            case 'supported_living':
              const slClients = await base44.entities.SupportedLivingClient.list();
              clientData = slClients.find(c => c.id === userAccess.client_id);
              break;
            case 'residential':
              const residentialClients = await base44.entities.Client.list();
              clientData = residentialClients.find(c => c.id === userAccess.client_id);
              break;
            case 'domiciliary':
              const domClients = await base44.entities.DomCareClient.list();
              clientData = domClients.find(c => c.id === userAccess.client_id);
              break;
          }
          setClient(clientData);

          // Update last login
          await base44.entities.ClientPortalAccess.update(userAccess.id, {
            last_login: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error loading portal access:", error);
      }
    };
    loadUserAndAccess();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-messages', portalAccess?.client_id],
    queryFn: async () => {
      if (!portalAccess) return [];
      return base44.entities.ClientPortalMessage.filter(
        { client_id: portalAccess.client_id },
        '-created_date'
      );
    },
    enabled: !!portalAccess,
  });

  const { data: bookingRequests = [] } = useQuery({
    queryKey: ['booking-requests', portalAccess?.client_id],
    queryFn: async () => {
      if (!portalAccess) return [];
      return base44.entities.SessionBookingRequest.filter(
        { client_id: portalAccess.client_id },
        '-created_date'
      );
    },
    enabled: !!portalAccess,
  });

  // Load schedule based on client type
  const { data: schedule = [] } = useQuery({
    queryKey: ['portal-schedule', portalAccess?.client_id, portalAccess?.client_type],
    queryFn: async () => {
      if (!portalAccess) return [];
      
      if (portalAccess.client_type === 'day_centre') {
        const sessions = await base44.entities.DayCentreSession.list('-session_date');
        return sessions.filter(s => 
          s.registered_clients?.includes(portalAccess.client_id)
        );
      } else if (portalAccess.client_type === 'supported_living') {
        const shifts = await base44.entities.SupportedLivingShift.list('-date');
        return shifts.filter(s => 
          s.clients_supported?.includes(portalAccess.client_id)
        );
      }
      return [];
    },
    enabled: !!portalAccess,
  });

  const unreadMessages = messages.filter(m => 
    !m.is_read && m.sender_type === 'staff'
  ).length;

  const pendingRequests = bookingRequests.filter(r => r.status === 'pending').length;

  const upcomingSchedule = schedule.filter(item => {
    try {
      const dateField = portalAccess?.client_type === 'day_centre' ? 'session_date' : 'date';
      return isFuture(parseISO(item[dateField])) || isToday(parseISO(item[dateField]));
    } catch {
      return false;
    }
  }).slice(0, 5);

  if (!portalAccess) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Portal Access Not Found</h3>
                  <p className="text-sm text-orange-800">
                    Your account ({user?.email}) does not have portal access configured. 
                    Please contact the care team to set up your portal access.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const serviceTypeLabels = {
    residential: "Residential Care",
    domiciliary: "Home Care",
    supported_living: "Supported Living",
    day_centre: "Day Centre",
  };

  const serviceTypeIcons = {
    residential: Home,
    domiciliary: MapPin,
    supported_living: Home,
    day_centre: Activity,
  };

  const ServiceIcon = serviceTypeIcons[portalAccess.client_type] || Home;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <ServiceIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {portalAccess.full_name}
              </h1>
              <p className="text-gray-500">
                {serviceTypeLabels[portalAccess.client_type]} Portal - {client?.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-blue-50">
              {portalAccess.relationship}
            </Badge>
            {portalAccess.is_primary_contact && (
              <Badge className="bg-green-100 text-green-800">
                Primary Contact
              </Badge>
            )}
            <Badge variant="outline" className="bg-purple-50">
              {portalAccess.access_level.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{upcomingSchedule.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-shadow ${unreadMessages > 0 ? 'ring-2 ring-green-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">New Messages</p>
                  <p className="text-2xl font-bold text-green-600">{unreadMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold text-purple-600">{pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Notifications</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {unreadMessages + pendingRequests}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {portalAccess.can_view_schedule && (
                <Link to={createPageUrl("ClientPortalSchedule")}>
                  <button className="w-full p-4 border-2 rounded-lg hover:shadow-md hover:border-blue-500 transition-all text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold">View Schedule</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      See upcoming sessions and appointments
                    </p>
                  </button>
                </Link>
              )}

              {portalAccess.can_send_messages && (
                <Link to={createPageUrl("ClientPortalMessages")}>
                  <button className="w-full p-4 border-2 rounded-lg hover:shadow-md hover:border-green-500 transition-all text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="font-semibold">Messages</h3>
                      {unreadMessages > 0 && (
                        <Badge className="bg-green-500 text-white">{unreadMessages}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Communicate with care team
                    </p>
                  </button>
                </Link>
              )}

              {portalAccess.can_request_bookings && (
                <Link to={createPageUrl("ClientPortalBookings")}>
                  <button className="w-full p-4 border-2 rounded-lg hover:shadow-md hover:border-purple-500 transition-all text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="font-semibold">Booking Requests</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Request or cancel sessions
                    </p>
                  </button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Schedule */}
          {portalAccess.can_view_schedule && upcomingSchedule.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Upcoming Schedule</CardTitle>
                  <Link to={createPageUrl("ClientPortalSchedule")}>
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {upcomingSchedule.map((item, idx) => {
                    const dateField = portalAccess.client_type === 'day_centre' ? 'session_date' : 'date';
                    const timeField = portalAccess.client_type === 'day_centre' ? 'start_time' : 'start_time';
                    
                    return (
                      <div key={idx} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{item[dateField]}</span>
                          </div>
                          {isToday(parseISO(item[dateField])) && (
                            <Badge className="bg-blue-500 text-white">Today</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{item[timeField]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Messages */}
          {portalAccess.can_send_messages && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Recent Messages</CardTitle>
                  <Link to={createPageUrl("ClientPortalMessages")}>
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {messages.slice(0, 3).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.slice(0, 3).map((message) => (
                      <div 
                        key={message.id}
                        className={`p-3 rounded-lg border ${
                          !message.is_read && message.sender_type === 'staff'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-sm">{message.sender_name}</span>
                          {!message.is_read && message.sender_type === 'staff' && (
                            <Badge className="bg-green-500 text-white text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {message.message_content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(parseISO(message.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Client Information */}
        {client && (
          <Card className="mt-6">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="font-medium">{client.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Service Type</p>
                  <p className="font-medium">{serviceTypeLabels[portalAccess.client_type]}</p>
                </div>
                {portalAccess.client_type === 'day_centre' && client.attendance_days && (
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}