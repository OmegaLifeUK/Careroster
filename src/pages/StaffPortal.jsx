import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Shield,
  LogIn,
  LogOut,
  CheckCircle,
  MessageSquare,
  GraduationCap
} from "lucide-react";
import { format, parseISO, isToday, isFuture } from "date-fns";

import MyShifts from "../components/staff/MyShifts";
import ClockInOut from "../components/staff/ClockInOut";
import SOSButton from "../components/staff/SOSButton";
import StaffMessaging from "../components/staff/StaffMessaging";
import MyTraining from "../components/training/MyTraining";

export default function StaffPortal() {
  const [user, setUser] = useState(null);
  const [staffMember, setStaffMember] = useState(null);
  const [staffType, setStaffType] = useState(null); // 'carer' or 'staff'
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // First try to find as Domiciliary Care Staff
        const allStaff = await base44.entities.Staff.list();
        const staffRecord = allStaff.find(s => s.email === userData.email);
        
        if (staffRecord) {
          setStaffMember(staffRecord);
          setStaffType('staff');
          return;
        }

        // If not found, try as Residential Care Carer
        const allCarers = await base44.entities.Carer.list();
        const carerRecord = allCarers.find(c => c.email === userData.email);
        
        if (carerRecord) {
          setStaffMember(carerRecord);
          setStaffType('carer');
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Query for Residential Care (Shifts)
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['my-shifts', staffMember?.id, staffType],
    queryFn: async () => {
      if (!staffMember || staffType !== 'carer') return [];
      return base44.entities.Shift.filter({ carer_id: staffMember.id }, '-date');
    },
    enabled: !!staffMember && staffType === 'carer',
    refetchInterval: 30000,
  });

  // Query for Domiciliary Care (Visits)
  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['my-visits', staffMember?.id, staffType],
    queryFn: async () => {
      if (!staffMember || staffType !== 'staff') return [];
      return base44.entities.Visit.filter({ assigned_staff_id: staffMember.id }, '-scheduled_start');
    },
    enabled: !!staffMember && staffType === 'staff',
    refetchInterval: 30000,
  });

  // Combine data depending on staff type
  const allAssignments = staffType === 'carer' ? shifts : visits;
  const isLoading = staffType === 'carer' ? shiftsLoading : visitsLoading;

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', staffType],
    queryFn: async () => {
      if (staffType === 'carer') {
        return base44.entities.Client.list();
      } else {
        return base44.entities.DomCareClient.list();
      }
    },
    enabled: !!staffType,
  });

  const { data: timeAttendance = [] } = useQuery({
    queryKey: ['my-attendance', staffMember?.id, staffType],
    queryFn: async () => {
      if (!staffMember) return [];
      if (staffType === 'carer') {
        return base44.entities.TimeAttendance.filter({ carer_id: staffMember.id }, '-created_date');
      } else {
        // For domiciliary care, we don't have visit-specific attendance yet
        // You might want to create a VisitAttendance entity or use a different approach
        return [];
      }
    },
    enabled: !!staffMember,
  });

  // Convert visits to shift-like format for unified display
  const normalizedAssignments = allAssignments.map(item => {
    if (staffType === 'staff') {
      // Convert Visit to Shift format
      return {
        ...item,
        date: item.scheduled_start ? new Date(item.scheduled_start).toISOString().split('T')[0] : '',
        start_time: item.scheduled_start ? format(parseISO(item.scheduled_start), 'HH:mm') : '',
        end_time: item.scheduled_end ? format(parseISO(item.scheduled_end), 'HH:mm') : '',
        shift_type: 'visit',
        notes: item.visit_notes,
      };
    }
    return item;
  });

  const todayAssignments = normalizedAssignments.filter(item => {
    try {
      return isToday(parseISO(item.date));
    } catch {
      return false;
    }
  });

  const upcomingAssignments = normalizedAssignments.filter(item => {
    try {
      return isFuture(parseISO(item.date)) && !isToday(parseISO(item.date));
    } catch {
      return false;
    }
  }).slice(0, 5);

  const activeAssignment = todayAssignments.find(s => s.status === 'in_progress');
  const nextAssignment = todayAssignments.find(s => s.status === 'scheduled' || s.status === 'published') || upcomingAssignments[0];

  if (!staffMember) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Staff Profile Not Found</h3>
                  <p className="text-sm text-yellow-800">
                    Your email ({user?.email}) is not associated with a staff or carer account. 
                    Please contact your administrator to set up your profile.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {staffMember.full_name}
          </h1>
          <p className="text-gray-500">
            {staffType === 'carer' ? 'Residential Care Portal' : 'Domiciliary Care Portal'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className="flex-shrink-0"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === "messages" ? "default" : "ghost"}
            onClick={() => setActiveTab("messages")}
            className="flex-shrink-0"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </Button>
          <Button
            variant={activeTab === "training" ? "default" : "ghost"}
            onClick={() => setActiveTab("training")}
            className="flex-shrink-0"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Training
          </Button>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-gray-600">
                      {staffType === 'carer' ? "Today's Shifts" : "Today's Visits"}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{todayAssignments.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Upcoming</p>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{upcomingAssignments.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-gray-600">This Month</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {normalizedAssignments.filter(s => s.status === 'completed').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {activeAssignment && (
                  <Card className="border-2 border-green-500 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        {staffType === 'carer' ? 'Active Shift' : 'Active Visit'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ClockInOut 
                        shift={activeAssignment} 
                        carer={staffMember}
                        client={clients.find(c => c.id === activeAssignment.client_id)}
                        timeAttendance={timeAttendance.find(ta => 
                          staffType === 'carer' ? ta.shift_id === activeAssignment.id : false
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {nextAssignment && !activeAssignment && (
                  <Card className="border-2 border-blue-500 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        {staffType === 'carer' ? 'Next Shift' : 'Next Visit'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ClockInOut 
                        shift={nextAssignment} 
                        carer={staffMember}
                        client={clients.find(c => c.id === nextAssignment.client_id)}
                        timeAttendance={timeAttendance.find(ta => 
                          staffType === 'carer' ? ta.shift_id === nextAssignment.id : false
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                <MyShifts 
                  shifts={normalizedAssignments}
                  clients={clients}
                  timeAttendance={timeAttendance}
                  isLoading={isLoading}
                />
              </div>

              <div className="space-y-6">
                <SOSButton carer={staffMember} activeShift={activeAssignment} />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium mb-1">Employment Type</p>
                      <p className="text-blue-900 capitalize">
                        {staffMember.employment_type?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium mb-1">Status</p>
                      <Badge className="bg-green-100 text-green-800 capitalize">
                        {staffMember.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {staffType === 'staff' && staffMember.vehicle_type && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-700 font-medium mb-1">Vehicle</p>
                        <p className="text-purple-900 capitalize">
                          {staffMember.vehicle_type}
                        </p>
                      </div>
                    )}
                    {staffMember.qualifications && staffMember.qualifications.length > 0 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-700 font-medium mb-2">Qualifications</p>
                        <p className="text-purple-900 text-sm">
                          {staffMember.qualifications.length} active qualification{staffMember.qualifications.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {activeTab === "messages" && (
          <StaffMessaging carer={staffMember} />
        )}

        {activeTab === "training" && (
          <MyTraining staffMember={staffMember} />
        )}
      </div>
    </div>
  );
}