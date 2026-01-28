import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  Heart,
  AlertCircle,
  Calendar,
  Activity,
  Utensils,
  Accessibility,
  MessageCircle,
  Target,
  Edit,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { format, parseISO } from "date-fns";
import DayCentreClientDialog from "../components/daycentre/DayCentreClientDialog";
import ClientOnboardingWorkflow from "../components/onboarding/ClientOnboardingWorkflow";

export default function DayCentreClientProfile() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['daycentre-client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.DayCentreClient.list();
      return clients.find(c => c.id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['client-sessions', clientId],
    queryFn: async () => {
      const allSessions = await base44.entities.DayCentreSession.list('-session_date');
      return allSessions.filter(s => s.registered_clients?.includes(clientId));
    },
    enabled: !!clientId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['daycentre-activities'],
    queryFn: () => base44.entities.DayCentreActivity.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['client-attendance', clientId],
    queryFn: async () => {
      const allAttendance = await base44.entities.DayCentreAttendance.list('-attendance_date');
      return allAttendance.filter(a => a.client_id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  if (clientLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Client Not Found</h2>
              <Link to={createPageUrl('DayCentreClients')}>
                <Button>Back to Clients</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const upcomingSessions = sessions.filter(s => {
    try {
      const sessionDate = parseISO(s.session_date);
      return sessionDate >= new Date() && s.status !== 'cancelled';
    } catch {
      return false;
    }
  }).slice(0, 5);

  const recentAttendance = attendance.slice(0, 5);
  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0;

  const keyWorker = staff.find(s => s.id === client.key_worker_id);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('DayCentreClients')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
              <p className="text-gray-500">Day Centre Attendee</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              client.status === 'active' ? 'bg-green-100 text-green-800' :
              client.status === 'on_hold' ? 'bg-amber-100 text-amber-800' :
              'bg-gray-100 text-gray-800'
            }>
              {client.status || 'Active'}
            </Badge>
            <Button onClick={() => setShowEditDialog(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="onboarding">
              <UserCheck className="w-4 h-4 mr-2" />
              Onboarding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-amber-100">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{client.date_of_birth || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{client.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium">{client.address?.street || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {client.address?.city}, {client.address?.postcode}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Transport</p>
                    <Badge variant="outline">{client.transport_arrangement || 'Not specified'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {client.emergency_contact && (
              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium">{client.emergency_contact.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Relationship</p>
                      <p className="font-medium">{client.emergency_contact.relationship}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{client.emergency_contact.phone}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Needs & Preferences */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-purple-100">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  Needs & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Mobility</p>
                    <div className="flex items-center gap-2">
                      <Accessibility className="w-4 h-4 text-gray-400" />
                      <Badge variant="outline">{client.mobility || 'Not specified'}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Communication Needs</p>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                      <p className="text-sm">{client.communication_needs || 'None specified'}</p>
                    </div>
                  </div>
                </div>
                {client.dietary_requirements && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <Utensils className="w-4 h-4" />
                      Dietary Requirements
                    </p>
                    <p className="text-sm bg-purple-50 p-3 rounded border border-purple-200">
                      {client.dietary_requirements}
                    </p>
                  </div>
                )}
                {client.medical_needs && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Medical Needs</p>
                    <p className="text-sm bg-purple-50 p-3 rounded border border-purple-200">
                      {client.medical_needs}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interests & Goals */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-teal-100">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600" />
                  Interests & Support Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {client.interests_and_hobbies && client.interests_and_hobbies.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Interests & Hobbies</p>
                    <div className="flex flex-wrap gap-2">
                      {client.interests_and_hobbies.map((interest, idx) => (
                        <Badge key={idx} variant="outline" className="bg-teal-50">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {client.support_goals && client.support_goals.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Support Goals</p>
                    <div className="space-y-2">
                      {client.support_goals.map((goal, idx) => (
                        <div key={idx} className="p-2 bg-teal-50 rounded border border-teal-200 text-sm">
                          {goal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Key Worker */}
            {keyWorker && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-600" />
                    Key Worker
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white text-lg font-medium">
                      {keyWorker.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{keyWorker.full_name}</p>
                      <p className="text-sm text-gray-500">Key Worker</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance Stats */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <p className={`text-4xl font-bold ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {attendanceRate}%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Attendance Rate</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${attendanceRate >= 80 ? 'bg-green-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Sessions:</span>
                  <span className="font-bold">{attendance.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sessions/Week:</span>
                  <span className="font-bold">{client.contracted_sessions_per_week || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Sessions */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming sessions</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingSessions.map(session => {
                      const activity = activities.find(a => a.id === session.activity_id);
                      return (
                        <div key={session.id} className="p-2 bg-amber-50 rounded border border-amber-200">
                          <p className="text-sm font-medium">{session.session_date}</p>
                          <p className="text-xs text-gray-600">{activity?.activity_name}</p>
                          <p className="text-xs text-gray-500">
                            {session.start_time} - {session.end_time}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Attendance */}
            {recentAttendance.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Recent Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {recentAttendance.map(record => (
                      <div key={record.id} className="p-2 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{record.attendance_date}</p>
                          <Badge className={
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'late' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {record.status}
                          </Badge>
                        </div>
                        {record.mood_on_arrival && (
                          <p className="text-xs text-gray-500 mt-1">
                            Mood: {record.mood_on_arrival}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
            </div>
          </TabsContent>

          <TabsContent value="onboarding" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Client Onboarding Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowOnboarding(true)}>
                  View Onboarding Workflow
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showEditDialog && (
          <DayCentreClientDialog
            client={client}
            onClose={() => setShowEditDialog(false)}
          />
        )}

        {showOnboarding && (
          <ClientOnboardingWorkflow
            clientId={clientId}
            clientName={client.full_name}
            onClose={() => setShowOnboarding(false)}
          />
        )}
      </div>
    </div>
  );
}