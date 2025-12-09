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
import AlertBanner from "../components/alerts/AlertBanner";
import SystemAlertMonitor from "../components/alerts/SystemAlertMonitor";
import AutoScheduleHelper from "../components/schedule/AutoScheduleHelper";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const DEFAULT_PREFERENCES = {
  statsCards: true,
  todayShifts: true,
  quickActions: true,
  recentActivity: true,
  smartSuggestions: true,
};

const DEFAULT_WIDGET_ORDER = ['smartSuggestions', 'statsCards', 'todayShifts', 'quickActions', 'recentActivity'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_WIDGET_ORDER);

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
        if (userData.main_widget_order && Array.isArray(userData.main_widget_order)) {
          setWidgetOrder(userData.main_widget_order);
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

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts'],
    queryFn: async () => {
      const data = await base44.entities.ClientAlert.filter({ status: 'active' });
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 60000,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const data = await base44.entities.MedicationLog.list('-administration_time');
      return Array.isArray(data) ? data : [];
    },
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

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(widgetOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWidgetOrder(items);
    
    try {
      await base44.auth.updateMe({ main_widget_order: items });
    } catch (error) {
      console.error("Error saving widget order:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* System Alert Monitor */}
      <SystemAlertMonitor 
        shifts={shifts} 
        medications={medications} 
        clients={clients}
        carers={carers}
      />

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

        {/* Alert Banner */}
        <AlertBanner alerts={alerts} />
        
        {/* Automation Helper */}
        <div className="mb-6">
          <AutoScheduleHelper />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="main-dashboard-widgets">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {widgetOrder.filter(id => modulePreferences[id]).map((widgetId, index) => (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? 'z-50' : ''}
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className={`cursor-grab active:cursor-grabbing mb-8 ${snapshot.isDragging ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                        >
                          {widgetId === 'smartSuggestions' && (
                            <SmartSuggestionsWidget
                              shifts={shifts}
                              carers={carers}
                              clients={clients}
                              leaveRequests={leaveRequests}
                            />
                          )}

                          {widgetId === 'statsCards' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                          {widgetId === 'todayShifts' && (
                            <TodayShifts shifts={todayShifts} carers={carers} clients={clients} isLoading={isLoading} />
                          )}

                          {widgetId === 'quickActions' && (
                            <QuickActions 
                              pendingLeave={pendingLeave}
                              unfilledShifts={unfilledShifts}
                            />
                          )}

                          {widgetId === 'recentActivity' && (
                            <RecentActivity 
                              shifts={shifts.slice(0, 10)} 
                              leaveRequests={leaveRequests.slice(0, 5)}
                              carers={carers}
                              clients={clients}
                              isLoading={isLoading}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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