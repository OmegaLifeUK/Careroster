import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  UserCircle, 
  MapPin, 
  Clock, 
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Navigation,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday } from "date-fns";

import DomCareDashboardCustomizer from "../components/dashboard/DomCareDashboardCustomizer";

const DEFAULT_PREFERENCES = {
  statsCards: true,
  todayRuns: true,
  todayStats: true,
  quickActions: true,
};

export default function DomCareDashboard() {
  const [user, setUser] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.domcare_dashboard_preferences) {
          setModulePreferences(userData.domcare_dashboard_preferences);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-scheduled_start'),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => base44.entities.Run.list('-run_date'),
  });

  const activeStaff = staff.filter(s => s.is_active).length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  
  const todayVisits = visits.filter(visit => {
    try {
      return isToday(parseISO(visit.scheduled_start));
    } catch {
      return false;
    }
  });

  const todayRuns = runs.filter(run => {
    try {
      return isToday(parseISO(run.run_date));
    } catch {
      return false;
    }
  });

  const unfilledVisits = visits.filter(v => !v.assigned_staff_id && v.status !== 'cancelled').length;
  const totalMileageToday = todayRuns.reduce((sum, r) => sum + (r.total_estimated_mileage || 0), 0);

  const isLoading = staffLoading || clientsLoading || visitsLoading || runsLoading;

  const handleSavePreferences = async (preferences) => {
    try {
      await base44.auth.updateMe({
        domcare_dashboard_preferences: preferences
      });
      setModulePreferences(preferences);
      setShowCustomizer(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dom Care Dashboard</h1>
            <p className="text-gray-500">Overview of domiciliary care operations</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Customize
          </Button>
        </div>

        {modulePreferences.statsCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link to={createPageUrl("DomCareStaff")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Staff</p>
                      <p className="text-2xl font-bold text-gray-900">{activeStaff}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("DomCareClients")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <UserCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("DomCareSchedule")} className="block">
              <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Today's Visits</p>
                      <p className="text-2xl font-bold text-gray-900">{todayVisits.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("DomCareSchedule")} className="block">
              <Card className={`hover:shadow-xl hover:scale-105 transition-all cursor-pointer ${unfilledVisits > 0 ? 'ring-2 ring-orange-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 bg-gradient-to-br ${unfilledVisits > 0 ? 'from-orange-500 to-orange-600' : 'from-gray-400 to-gray-500'} rounded-lg`}>
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unfilled Visits</p>
                      <p className={`text-2xl font-bold ${unfilledVisits > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {unfilledVisits}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {modulePreferences.todayRuns && (
            <Link to={createPageUrl("DomCareRuns")} className="lg:col-span-2 block">
              <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">Today's Runs</CardTitle>
                    <span className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View Full Schedule →
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {todayRuns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Navigation className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No runs scheduled for today</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayRuns.slice(0, 5).map((run) => {
                        const runVisits = visits.filter(v => v.run_id === run.id);
                        const assignedStaff = staff.find(s => s.id === run.assigned_staff_id);
                        
                        return (
                          <div 
                            key={run.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{run.run_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {run.start_time} - {run.end_time}
                                  </span>
                                </div>
                              </div>
                              <Badge className={
                                run.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                run.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                                run.status === 'published' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {run.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-600">Staff:</span>
                                <span className="font-medium">{assignedStaff?.full_name || "Unassigned"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-500" />
                                <span className="text-gray-600">Visits:</span>
                                <span className="font-medium">{runVisits.length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-purple-500" />
                                <span className="text-gray-600">Miles:</span>
                                <span className="font-medium">{run.total_estimated_mileage?.toFixed(1) || 0} mi</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium">{Math.floor((run.total_estimated_duration || 0) / 60)}h {(run.total_estimated_duration || 0) % 60}m</span>
                              </div>
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

          <div className={`space-y-6 ${!modulePreferences.todayRuns ? 'lg:col-span-3' : ''}`}>
            {modulePreferences.todayStats && (
              <Link to={createPageUrl("DomCareSchedule")} className="block">
                <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                    <CardTitle className="text-xl font-bold">Today's Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Total Visits</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-900">{todayVisits.length}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Completed</span>
                      </div>
                      <span className="text-2xl font-bold text-green-900">
                        {todayVisits.filter(v => v.status === 'completed').length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Active Runs</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-900">{todayRuns.length}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Total Miles</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-900">{totalMileageToday.toFixed(1)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {modulePreferences.quickActions && (
              <Card className="shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <Link to={createPageUrl("DomCareSchedule")}>
                    <button className="w-full p-3 text-left border rounded-lg hover:shadow-md hover:bg-blue-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Manage Schedule</p>
                          <p className="text-xs text-gray-500">View and edit visits & runs</p>
                        </div>
                      </div>
                    </button>
                  </Link>

                  <Link to={createPageUrl("DomCareStaff")}>
                    <button className="w-full p-3 text-left border rounded-lg hover:shadow-md hover:bg-green-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Manage Staff</p>
                          <p className="text-xs text-gray-500">View care team</p>
                        </div>
                      </div>
                    </button>
                  </Link>

                  <Link to={createPageUrl("DomCareClients")}>
                    <button className="w-full p-3 text-left border rounded-lg hover:shadow-md hover:bg-purple-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <UserCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Manage Clients</p>
                          <p className="text-xs text-gray-500">View client list</p>
                        </div>
                      </div>
                    </button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {showCustomizer && (
          <DomCareDashboardCustomizer
            currentPreferences={modulePreferences}
            onSave={handleSavePreferences}
            onClose={() => setShowCustomizer(false)}
          />
        )}
      </div>
    </div>
  );
}