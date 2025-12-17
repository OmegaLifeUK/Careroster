import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  Search,
  CalendarOff,
  CalendarCheck,
  Settings,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

import WorkingHoursEditor from "@/components/availability/WorkingHoursEditor";
import UnavailabilityManager from "@/components/availability/UnavailabilityManager";
import AvailabilityCalendarView from "@/components/availability/AvailabilityCalendarView";
import CarerAvailabilitySummary from "@/components/availability/CarerAvailabilitySummary";
import AvailabilityConflictDetector from "@/components/availability/AvailabilityConflictDetector";

export default function CarerAvailability() {
  const [selectedCarerId, setSelectedCarerId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data.filter(c => c && c.status === 'active') : [];
    }
  });

  const { data: availability = [], isLoading: availabilityLoading } = useQuery({
    queryKey: ['carer-availability'],
    queryFn: async () => {
      const data = await base44.entities.CarerAvailability.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const data = await base44.entities.LeaveRequest.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Shift.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Visit.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  });

  const filteredCarers = carers.filter(carer => 
    carer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    carer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCarer = carers.find(c => c.id === selectedCarerId);
  const carerAvailability = availability.filter(a => a.carer_id === selectedCarerId);
  const carerLeave = leaveRequests.filter(l => l.carer_id === selectedCarerId);

  const getAvailabilityStatus = (carerId) => {
    const carerAvail = availability.filter(a => a.carer_id === carerId);
    const hasWorkingHours = carerAvail.some(a => a.availability_type === 'working_hours');
    const hasUnavailability = carerAvail.some(a => 
      a.availability_type === 'unavailable' || a.availability_type === 'day_off'
    );
    
    if (!hasWorkingHours) return { status: 'not_set', label: 'Not Set', color: 'bg-gray-100 text-gray-600' };
    if (hasUnavailability) return { status: 'partial', label: 'Partial', color: 'bg-yellow-100 text-yellow-700' };
    return { status: 'available', label: 'Available', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Carer Availability</h1>
            <p className="text-gray-500">Manage working hours, days off, and unavailability periods</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Carer List Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Carers
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search carers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
                {carersLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : filteredCarers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No carers found</div>
                ) : (
                  filteredCarers.map(carer => {
                    const status = getAvailabilityStatus(carer.id);
                    return (
                      <div
                        key={carer.id}
                        onClick={() => setSelectedCarerId(carer.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedCarerId === carer.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                            {carer.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{carer.full_name}</p>
                            <Badge className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {!selectedCarerId ? (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Select a carer</p>
                  <p className="text-sm">Choose a carer from the list to manage their availability</p>
                </div>
              </Card>
            ) : !selectedCarer ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <p>Loading carer data...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Carer Header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                          {selectedCarer?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedCarer?.full_name}</h2>
                          <p className="text-gray-500">{selectedCarer?.email}</p>
                        </div>
                      </div>
                      <CarerAvailabilitySummary 
                        availability={carerAvailability} 
                        leaveRequests={carerLeave}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="working-hours" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Working Hours
                    </TabsTrigger>
                    <TabsTrigger value="unavailability" className="flex items-center gap-2">
                      <CalendarOff className="w-4 h-4" />
                      Unavailability
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Preferences
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <div className="space-y-4">
                      <AvailabilityConflictDetector
                        carerId={selectedCarerId}
                        availability={carerAvailability}
                        leaveRequests={carerLeave}
                        shifts={shifts}
                        visits={visits}
                      />
                      <AvailabilityCalendarView 
                        carerId={selectedCarerId}
                        availability={carerAvailability}
                        leaveRequests={carerLeave}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="working-hours" className="mt-4">
                    <WorkingHoursEditor 
                      carerId={selectedCarerId}
                      availability={carerAvailability}
                    />
                  </TabsContent>

                  <TabsContent value="unavailability" className="mt-4">
                    <UnavailabilityManager 
                      carerId={selectedCarerId}
                      availability={carerAvailability}
                      leaveRequests={carerLeave}
                    />
                  </TabsContent>

                  <TabsContent value="preferences" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Work Preferences</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Max Hours Per Day</label>
                            <Input type="number" placeholder="8" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Max Hours Per Week</label>
                            <Input type="number" placeholder="40" />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Preferred Areas (Postcodes)</label>
                          <Input placeholder="e.g., SW1, W1, NW3" />
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Save Preferences
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}