import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MessageSquare,
  Bell,
  User,
  LogOut,
  Wifi,
  WifiOff,
  Send,
  Camera
} from "lucide-react";

import MyShifts from "../components/staff/MyShifts";
import ClockInOut from "../components/staff/ClockInOut";
import SOSButton from "../components/staff/SOSButton";
import MyShiftRequests from "../components/messaging/MyShiftRequests";
import OfflineDataManager from "../components/staff/OfflineDataManager";
import RealTimeVisitUpdates from "../components/staff/RealTimeVisitUpdates";
import SecurePhotoUpload from "../components/staff/SecurePhotoUpload";

export default function StaffPortal() {
  const [activeTab, setActiveTab] = useState("shifts");
  const [user, setUser] = useState(null);

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

  const { data: notifications = [] } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: async () => {
      if (!user) return [];
      const data = await base44.entities.Notification.filter({ 
        recipient_id: user.email,
        is_read: false 
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: shiftRequests = [] } = useQuery({
    queryKey: ['pending-shift-requests'],
    queryFn: async () => {
      if (!user) return [];
      const allRequests = await base44.entities.ShiftRequest.list();
      return Array.isArray(allRequests) 
        ? allRequests.filter(r => 
            r && 
            Array.isArray(r.carer_ids) && 
            r.carer_ids.includes(user.email) && 
            r.status === 'pending' &&
            !r.responses?.some(resp => resp && resp.carer_id === user.email)
          )
        : [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Portal</h1>
            <p className="text-gray-600">Welcome back, {user?.full_name || 'Staff Member'}</p>
          </div>
          <div className="flex items-center gap-3">
            <SOSButton />
            {notifications.length > 0 && (
              <Badge className="bg-red-500 text-white">
                {notifications.length} new
              </Badge>
            )}
          </div>
        </div>

        {shiftRequests.length > 0 && (
          <Card className="mb-6 border-l-4 border-purple-500 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900">
                    {shiftRequests.length} New Shift Request{shiftRequests.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-purple-700">
                    You have pending shift requests waiting for your response
                  </p>
                </div>
                <Badge className="bg-purple-600 text-white">
                  Action Required
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1">
              <TabsTrigger value="shifts" className="flex items-center gap-1 text-xs md:text-sm py-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">My</span> Shifts
              </TabsTrigger>
              <TabsTrigger value="updates" className="flex items-center gap-1 text-xs md:text-sm py-2">
                <Send className="w-4 h-4" />
                Updates
              </TabsTrigger>
              <TabsTrigger value="offline" className="flex items-center gap-1 text-xs md:text-sm py-2">
                <Wifi className="w-4 h-4" />
                Offline
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-1 text-xs md:text-sm py-2">
                <Camera className="w-4 h-4" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-1 text-xs md:text-sm py-2">
                <MessageSquare className="w-4 h-4" />
                Requests
                {shiftRequests.length > 0 && (
                  <Badge className="bg-red-500 text-white ml-1 text-xs">{shiftRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="clock" className="flex items-center gap-1 text-xs md:text-sm py-2">
                <Clock className="w-4 h-4" />
                Clock
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shifts" className="p-4 md:p-6">
              <MyShifts />
            </TabsContent>

            <TabsContent value="updates" className="p-4 md:p-6">
              <RealTimeVisitUpdates user={user} />
            </TabsContent>

            <TabsContent value="offline" className="p-4 md:p-6">
              <OfflineDataManager user={user} />
            </TabsContent>

            <TabsContent value="photos" className="p-4 md:p-6">
              <SecurePhotoUpload user={user} />
            </TabsContent>

            <TabsContent value="requests" className="p-4 md:p-6">
              <MyShiftRequests />
            </TabsContent>

            <TabsContent value="clock" className="p-4 md:p-6">
              <ClockInOut />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}