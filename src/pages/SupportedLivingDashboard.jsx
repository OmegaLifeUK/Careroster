import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  Home, 
  Calendar, 
  TrendingUp,
  AlertCircle,
  Clock,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday } from "date-fns";

const DEFAULT_PREFERENCES = {
  statsCards: true,
  todayShifts: true,
  properties: true,
  quickActions: true,
};

export default function SupportedLivingDashboard() {
  const [user, setUser] = useState(null);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.supported_living_dashboard_preferences) {
          setModulePreferences(userData.supported_living_dashboard_preferences);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['supported-living-clients'],
    queryFn: () => base44.entities.SupportedLivingClient.list(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['supported-living-properties'],
    queryFn: () => base44.entities.SupportedLivingProperty.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['supported-living-shifts'],
    queryFn: () => base44.entities.SupportedLivingShift.list('-date'),
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalCapacity = properties.reduce((sum, p) => sum + (p.total_capacity || 0), 0);
  const currentOccupancy = properties.reduce((sum, p) => sum + (p.current_occupancy || 0), 0);
  const occupancyRate = totalCapacity > 0 ? ((currentOccupancy / totalCapacity) * 100).toFixed(1) : 0;

  const todayShifts = shifts.filter(shift => {
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });

  const unfilledShifts = shifts.filter(s => !s.staff_id && s.status !== 'cancelled').length;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Supported Living Dashboard</h1>
            <p className="text-gray-500">Overview of supported living services</p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Customize
          </Button>
        </div>

        {modulePreferences.statsCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link to={createPageUrl("SupportedLivingClients")} className="block">
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

            <Link to={createPageUrl("SupportedLivingProperties")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <Home className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Properties</p>
                      <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("SupportedLivingProperties")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Occupancy</p>
                      <p className="text-2xl font-bold text-gray-900">{occupancyRate}%</p>
                      <p className="text-xs text-gray-500">{currentOccupancy}/{totalCapacity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("SupportedLivingSchedule")} className="block">
              <Card className={`hover:shadow-xl hover:scale-105 transition-all cursor-pointer ${unfilledShifts > 0 ? 'ring-2 ring-orange-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 bg-gradient-to-br ${unfilledShifts > 0 ? 'from-orange-500 to-orange-600' : 'from-gray-400 to-gray-500'} rounded-lg`}>
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unfilled Shifts</p>
                      <p className={`text-2xl font-bold ${unfilledShifts > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {unfilledShifts}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {modulePreferences.todayShifts && (
            <Link to={createPageUrl("SupportedLivingSchedule")} className="lg:col-span-2 block">
              <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">Today's Shifts</CardTitle>
                    <span className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View Schedule →
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {todayShifts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No shifts scheduled for today</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayShifts.slice(0, 5).map((shift) => {
                        const property = properties.find(p => p.id === shift.property_id);
                        
                        return (
                          <div 
                            key={shift.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{property?.property_name || "Property"}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {shift.start_time} - {shift.end_time}
                                  </span>
                                </div>
                              </div>
                              <Badge className={
                                shift.status === 'completed' ? 'bg-green-100 text-green-800' :
                                shift.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {shift.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p>Type: <span className="font-medium">{shift.shift_type?.replace('_', ' ')}</span></p>
                              {shift.clients_supported?.length > 0 && (
                                <p className="mt-1">Supporting {shift.clients_supported.length} client(s)</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )}

          {modulePreferences.properties && (
            <Link to={createPageUrl("SupportedLivingProperties")} className="block">
              <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-xl font-bold">Properties Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {properties.slice(0, 5).map((property) => (
                      <div key={property.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{property.property_name}</h4>
                          <Badge className={
                            property.status === 'full' ? 'bg-red-100 text-red-800' :
                            property.status === 'active' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {property.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Occupancy: {property.current_occupancy || 0}/{property.total_capacity || 0}</p>
                          <p className="text-xs mt-1">{property.property_type?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Properties
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {modulePreferences.quickActions && (
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link to={createPageUrl("SupportedLivingSchedule")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <Calendar className="w-5 h-5" />
                    <span className="text-xs">Manage Schedule</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("SupportedLivingClients")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <Users className="w-5 h-5" />
                    <span className="text-xs">View Clients</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("SupportedLivingProperties")}>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                    <Home className="w-5 h-5" />
                    <span className="text-xs">Manage Properties</span>
                  </Button>
                </Link>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs">Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}