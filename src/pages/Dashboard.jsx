import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  UserCircle, 
  Calendar, 
  Clock, 
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  Settings,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isFuture } from "date-fns";

import StatsCard from "../components/dashboard/StatsCard";
import TodayShifts from "../components/dashboard/TodayShifts";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";
import MainDashboardCustomizer from "../components/dashboard/MainDashboardCustomizer";
import SmartSuggestionsWidget from "../components/dashboard/SmartSuggestionsWidget";

const DEFAULT_PREFERENCES = {
  statsCards: true,
  todayShifts: true,
  quickActions: true,
  recentActivity: true,
  smartSuggestions: true,
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.main_dashboard_preferences) {
          setModulePreferences({
            ...DEFAULT_PREFERENCES,
            ...userData.main_dashboard_preferences
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const activeCarers = carers.filter(c => c.status === 'active').length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  
  const todayShifts = shifts.filter(shift => {
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });

  const upcomingShifts = shifts.filter(shift => {
    try {
      return isFuture(parseISO(shift.date));
    } catch {
      return false;
    }
  }).length;

  const unfilledShifts = shifts.filter(s => s.status === 'unfilled').length;
  const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;

  const isLoading = carersLoading || clientsLoading || shiftsLoading || leaveLoading;

  const handleSavePreferences = async (preferences) => {
    try {
      await base44.auth.updateMe({
        main_dashboard_preferences: preferences
      });
      setModulePreferences(preferences);
      setShowCustomizer(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-500">Overview of your care management system</p>
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

        {modulePreferences.smartSuggestions && (
          <div className="mb-8">
            <SmartSuggestionsWidget
              shifts={shifts}
              carers={carers}
              clients={clients}
              leaveRequests={leaveRequests}
            />
          </div>
        )}

        {modulePreferences.statsCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Active Carers"
              value={activeCarers}
              icon={Users}
              bgColor="from-blue-500 to-blue-600"
              isLoading={isLoading}
              linkTo={createPageUrl("Carers")}
            />
            <StatsCard
              title="Active Clients"
              value={activeClients}
              icon={UserCircle}
              bgColor="from-green-500 to-green-600"
              isLoading={isLoading}
              linkTo={createPageUrl("Clients")}
            />
            <StatsCard
              title="Today's Shifts"
              value={todayShifts.length}
              icon={Calendar}
              bgColor="from-purple-500 to-purple-600"
              isLoading={isLoading}
              linkTo={createPageUrl("Schedule")}
            />
            <StatsCard
              title="Unfilled Shifts"
              value={unfilledShifts}
              icon={AlertCircle}
              bgColor="from-orange-500 to-orange-600"
              isLoading={isLoading}
              alert={unfilledShifts > 0}
              linkTo={createPageUrl("Schedule")}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {modulePreferences.todayShifts && (
            <div className="lg:col-span-2">
              <TodayShifts shifts={todayShifts} carers={carers} clients={clients} isLoading={isLoading} />
            </div>
          )}
          {modulePreferences.quickActions && (
            <div className={modulePreferences.todayShifts ? "" : "lg:col-span-3"}>
              <QuickActions 
                pendingLeave={pendingLeave}
                unfilledShifts={unfilledShifts}
              />
            </div>
          )}
        </div>

        {modulePreferences.recentActivity && (
          <RecentActivity 
            shifts={shifts.slice(0, 10)} 
            leaveRequests={leaveRequests.slice(0, 5)}
            carers={carers}
            clients={clients}
            isLoading={isLoading}
          />
        )}

        {showCustomizer && (
          <MainDashboardCustomizer
            currentPreferences={modulePreferences}
            onSave={handleSavePreferences}
            onClose={() => setShowCustomizer(false)}
          />
        )}
      </div>
    </div>
  );
}