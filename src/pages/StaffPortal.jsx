
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
  MessageSquare // Added MessageSquare icon
} from "lucide-react";
import { format, parseISO, isToday, isFuture } from "date-fns";

import MyShifts from "../components/staff/MyShifts";
import ClockInOut from "../components/staff/ClockInOut";
import SOSButton from "../components/staff/SOSButton";
import StaffMessaging from "../components/staff/StaffMessaging"; // Added StaffMessaging import

export default function StaffPortal() {
  const [user, setUser] = useState(null);
  const [carer, setCarer] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // Added activeTab state

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Try to find the carer record by email
        const allCarers = await base44.entities.Carer.list();
        const carerRecord = allCarers.find(c => c.email === userData.email);
        setCarer(carerRecord);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['my-shifts', carer?.id],
    queryFn: async () => {
      if (!carer) return [];
      return base44.entities.Shift.filter({ carer_id: carer.id }, '-date');
    },
    enabled: !!carer,
    refetchInterval: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: timeAttendance = [] } = useQuery({
    queryKey: ['my-attendance', carer?.id],
    queryFn: async () => {
      if (!carer) return [];
      return base44.entities.TimeAttendance.filter({ carer_id: carer.id }, '-created_date');
    },
    enabled: !!carer,
  });

  const todayShifts = shifts.filter(shift => {
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });

  const upcomingShifts = shifts.filter(shift => {
    try {
      return isFuture(parseISO(shift.date)) && !isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  }).slice(0, 5);

  const activeShift = todayShifts.find(s => s.status === 'in_progress');
  const nextShift = todayShifts.find(s => s.status === 'scheduled') || upcomingShifts[0];

  if (!carer) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Carer Profile Not Found</h3>
                  <p className="text-sm text-yellow-800">
                    Your email ({user?.email}) is not associated with a carer account. 
                    Please contact your administrator to set up your carer profile.
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
            Welcome, {carer.full_name}
          </h1>
          <p className="text-gray-500">Your personal care portal</p>
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
        </div>

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-gray-600">Today's Shifts</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{todayShifts.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Upcoming</p>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{upcomingShifts.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-gray-600">This Month</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {shifts.filter(s => s.status === 'completed').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {activeShift && (
                  <Card className="border-2 border-green-500 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        Active Shift
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ClockInOut 
                        shift={activeShift} 
                        carer={carer}
                        client={clients.find(c => c.id === activeShift.client_id)}
                        timeAttendance={timeAttendance.find(ta => ta.shift_id === activeShift.id)}
                      />
                    </CardContent>
                  </Card>
                )}

                {nextShift && !activeShift && (
                  <Card className="border-2 border-blue-500 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Next Shift
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ClockInOut 
                        shift={nextShift} 
                        carer={carer}
                        client={clients.find(c => c.id === nextShift.client_id)}
                        timeAttendance={timeAttendance.find(ta => ta.shift_id === nextShift.id)}
                      />
                    </CardContent>
                  </Card>
                )}

                <MyShifts 
                  shifts={shifts}
                  clients={clients}
                  timeAttendance={timeAttendance}
                  isLoading={shiftsLoading}
                />
              </div>

              <div className="space-y-6">
                <SOSButton carer={carer} activeShift={activeShift} />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium mb-1">Employment Type</p>
                      <p className="text-blue-900">{carer.employment_type?.replace('_', ' ')}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium mb-1">Status</p>
                      <Badge className="bg-green-100 text-green-800">
                        {carer.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {carer.qualifications && carer.qualifications.length > 0 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-700 font-medium mb-2">Qualifications</p>
                        <p className="text-purple-900 text-sm">
                          {carer.qualifications.length} active qualification{carer.qualifications.length !== 1 ? 's' : ''}
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
          <StaffMessaging carer={carer} />
        )}
      </div>
    </div>
  );
}
