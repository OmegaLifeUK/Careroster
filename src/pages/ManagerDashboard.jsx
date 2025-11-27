import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCircle,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  Bell,
  FileText,
  GraduationCap,
  Activity,
  Home,
  Download,
  Settings,
  BarChart3,
  MessageSquare,
  Shield
} from "lucide-react";
import { format, parseISO, isToday, isPast, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import AlertsWidget from "../components/alerts/AlertsWidget";
import SystemAlertMonitor from "../components/alerts/SystemAlertMonitor";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const DEFAULT_PREFERENCES = {
  occupancy: true,
  staff: true,
  training: true,
  incidents: true,
  finance: true,
  communication: true,
  alerts: true,
  dailyLog: true,
};

const DEFAULT_WIDGET_ORDER = ['alerts', 'occupancy', 'staff', 'training', 'incidents', 'finance', 'communication', 'dailyLog'];

export default function ManagerDashboard() {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [user, setUser] = useState(null);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_WIDGET_ORDER);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        if (userData.dashboard_preferences) {
          setModulePreferences({ ...DEFAULT_PREFERENCES, ...userData.dashboard_preferences });
        }
        if (userData.widget_order && Array.isArray(userData.widget_order)) {
          setWidgetOrder(userData.widget_order);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const data = await base44.entities.Shift.list('-date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const data = await base44.entities.MedicationLog.list('-administration_time');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const data = await base44.entities.Incident.list('-incident_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: async () => {
      const data = await base44.entities.TrainingAssignment.list('-assigned_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: async () => {
      const data = await base44.entities.ClientFeedback.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts'],
    queryFn: async () => {
      const data = await base44.entities.ClientAlert.filter({ status: 'active' });
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const data = await base44.entities.LeaveRequest.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['daily-logs-today', todayStr],
    queryFn: async () => {
      const data = await base44.entities.DailyLog.filter({ log_date: todayStr });
      return Array.isArray(data) ? data : [];
    },
  });

  const occupancyStats = {
    totalBeds: 50,
    occupied: clients.filter(c => c && c.status === 'active').length,
    plannedAdmissions: 3,
  };
  occupancyStats.occupancyRate = ((occupancyStats.occupied / occupancyStats.totalBeds) * 100).toFixed(1);

  const todayMeds = medications.filter(m => {
    if (!m || !m.administration_time) return false;
    try {
      return isToday(parseISO(m.administration_time));
    } catch {
      return false;
    }
  });
  const overdueMeds = todayMeds.filter(m => m && m.status === 'missed').length;
  const upcomingMeds = medications.filter(m => {
    if (!m || !m.administration_time) return false;
    try {
      const medTime = parseISO(m.administration_time);
      return medTime > new Date() && medTime < addDays(new Date(), 1);
    } catch {
      return false;
    }
  }).length;

  const todayShifts = shifts.filter(shift => {
    if (!shift || !shift.date) return false;
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });
  const unfilledShifts = shifts.filter(s => s && s.status === 'unfilled').length;
  const shiftFillRate = todayShifts.length > 0
    ? (((todayShifts.length - todayShifts.filter(s => s && s.status === 'unfilled').length) / todayShifts.length) * 100).toFixed(1)
    : 100;

  const expiringCerts = trainingAssignments.filter(a => {
    if (!a || !a.expiry_date) return false;
    try {
      const expiry = parseISO(a.expiry_date);
      return expiry < addDays(new Date(), 30) && expiry > new Date();
    } catch {
      return false;
    }
  }).length;

  const overdueTraining = trainingAssignments.filter(a => {
    if (!a || !a.due_date) return false;
    try {
      return isPast(parseISO(a.due_date)) && a.status !== 'completed';
    } catch {
      return false;
    }
  }).length;

  const trainingCompletionRate = trainingAssignments.length > 0
    ? ((trainingAssignments.filter(a => a && a.status === 'completed').length / trainingAssignments.length) * 100).toFixed(1)
    : 0;

  const recentIncidents = incidents.filter(inc => {
    if (!inc || !inc.incident_date) return false;
    try {
      return parseISO(inc.incident_date) > subMonths(new Date(), 1);
    } catch {
      return false;
    }
  });
  const unresolvedIncidents = incidents.filter(i => i && i.status !== 'resolved' && i.status !== 'closed').length;
  const criticalIncidents = incidents.filter(i => i && i.severity === 'critical' && i.status !== 'closed').length;

  const incidentTrends = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  }).map(month => {
    const monthIncidents = incidents.filter(inc => {
      if (!inc || !inc.incident_date) return false;
      try {
        const incDate = parseISO(inc.incident_date);
        return incDate >= startOfMonth(month) && incDate <= endOfMonth(month);
      } catch {
        return false;
      }
    });
    return {
      month: format(month, 'MMM'),
      count: monthIncidents.length,
      critical: monthIncidents.filter(i => i && i.severity === 'critical').length
    };
  });

  const financeStats = {
    overdue: 15,
    pending: 25,
    paid: 60,
    totalRevenue: 125000,
  };

  const pendingLeave = leaveRequests.filter(r => r && r.status === 'pending').length;
  const newFeedback = feedback.filter(f => f && f.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a && a.severity === 'critical').length;

  const handleSavePreferences = async (preferences) => {
    try {
      if (user && user.id) {
        await base44.auth.updateMe({
          dashboard_preferences: preferences
        });
        setModulePreferences(preferences);
        setShowCustomizer(false);
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(widgetOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWidgetOrder(items);
    
    try {
      await base44.auth.updateMe({ widget_order: items });
    } catch (error) {
      console.error("Error saving widget order:", error);
    }
  };

  const exportDashboard = () => {
    const report = `Manager's Dashboard Report - ${format(new Date(), 'yyyy-MM-dd HH:mm')}

OCCUPANCY & COMPLIANCE
- Beds Occupied: ${occupancyStats.occupied}/${occupancyStats.totalBeds} (${occupancyStats.occupancyRate}%)

STAFF MANAGEMENT
- Today's Shifts: ${todayShifts.length}
- Unfilled Shifts: ${unfilledShifts}
- Fill Rate: ${shiftFillRate}%

TRAINING COMPLIANCE
- Completion Rate: ${trainingCompletionRate}%
- Expiring Certificates: ${expiringCerts}
- Overdue Training: ${overdueTraining}

INCIDENTS & SAFETY
- Recent Incidents: ${recentIncidents.length}
- Unresolved: ${unresolvedIncidents}
- Critical: ${criticalIncidents}

COMMUNICATION
- Pending Leave Requests: ${pendingLeave}
- New Feedback: ${newFeedback}
- Critical Alerts: ${criticalAlerts}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* System Alert Monitor - runs in background */}
      <SystemAlertMonitor 
        shifts={shifts} 
        medications={medications} 
        clients={clients}
        carers={carers}
      />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Dashboard</h1>
            <p className="text-gray-500">Operational overview and key metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportDashboard}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCustomizer(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Customize Dashboard
            </Button>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Clients</p>
                  <p className="text-2xl font-bold">{clients.filter(c => c && c.status === 'active').length}</p>
                </div>
                <UserCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Carers</p>
                  <p className="text-2xl font-bold">{carers.filter(c => c && c.status === 'active').length}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today's Shifts</p>
                  <p className="text-2xl font-bold">{todayShifts.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unfilled Shifts</p>
                  <p className="text-2xl font-bold text-orange-600">{unfilledShifts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Widgets Based on Preferences */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-widgets">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {widgetOrder.filter(id => modulePreferences[id]).map((widgetId, index) => (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${widgetId === 'alerts' ? 'md:col-span-2' : ''} ${snapshot.isDragging ? 'z-50' : ''}`}
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className={`cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                        >
                          {widgetId === 'alerts' && (
                            <AlertsWidget alerts={alerts} compact={false} showAll={false} />
                          )}

                          {widgetId === 'occupancy' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                <CardTitle className="flex items-center gap-2">
                                  <Home className="w-5 h-5 text-blue-600" />
                                  Occupancy & Capacity
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Current Occupancy</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                      {occupancyStats.occupied}/{occupancyStats.totalBeds}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                                      style={{ width: `${occupancyStats.occupancyRate}%` }}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                      <p className="text-sm text-gray-600">Occupancy Rate</p>
                                      <p className="text-xl font-semibold">{occupancyStats.occupancyRate}%</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Planned Admissions</p>
                                      <p className="text-xl font-semibold">{occupancyStats.plannedAdmissions}</p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {widgetId === 'staff' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
                                <CardTitle className="flex items-center gap-2">
                                  <Users className="w-5 h-5 text-green-600" />
                                  Staff & Shifts
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-600">Today's Shifts</p>
                                      <p className="text-2xl font-bold">{todayShifts.length}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Fill Rate</p>
                                      <p className="text-2xl font-bold text-green-600">{shiftFillRate}%</p>
                                    </div>
                                  </div>
                                  {unfilledShifts > 0 && (
                                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                                        <div>
                                          <p className="font-semibold text-orange-900">
                                            {unfilledShifts} Unfilled Shift{unfilledShifts > 1 ? 's' : ''}
                                          </p>
                                          <p className="text-sm text-orange-700">Requires immediate attention</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <Link to={createPageUrl("Schedule")}>
                                    <Button className="w-full" variant="outline">
                                      <Calendar className="w-4 h-4 mr-2" />
                                      View Full Schedule
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {widgetId === 'training' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                                <CardTitle className="flex items-center gap-2">
                                  <GraduationCap className="w-5 h-5 text-purple-600" />
                                  Training Compliance
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Completion Rate</span>
                                    <span className="text-2xl font-bold text-purple-600">{trainingCompletionRate}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all"
                                      style={{ width: `${trainingCompletionRate}%` }}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                      <p className="text-sm text-gray-600">Expiring Soon</p>
                                      <p className="text-xl font-semibold text-orange-600">{expiringCerts}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Overdue</p>
                                      <p className="text-xl font-semibold text-red-600">{overdueTraining}</p>
                                    </div>
                                  </div>
                                  <Link to={createPageUrl("StaffTraining")}>
                                    <Button className="w-full" variant="outline">
                                      <GraduationCap className="w-4 h-4 mr-2" />
                                      View Training
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {widgetId === 'incidents' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
                                <CardTitle className="flex items-center gap-2">
                                  <Shield className="w-5 h-5 text-red-600" />
                                  Incidents & Safety
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-600">This Month</p>
                                      <p className="text-2xl font-bold">{recentIncidents.length}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Unresolved</p>
                                      <p className="text-2xl font-bold text-orange-600">{unresolvedIncidents}</p>
                                    </div>
                                  </div>
                                  {criticalIncidents > 0 && (
                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                        <div>
                                          <p className="font-semibold text-red-900">
                                            {criticalIncidents} Critical Incident{criticalIncidents > 1 ? 's' : ''}
                                          </p>
                                          <p className="text-sm text-red-700">Requires immediate review</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <Link to={createPageUrl("IncidentManagement")}>
                                    <Button className="w-full" variant="outline">
                                      <Shield className="w-4 h-4 mr-2" />
                                      View All Incidents
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {widgetId === 'finance' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-green-50">
                                <CardTitle className="flex items-center gap-2">
                                  <DollarSign className="w-5 h-5 text-emerald-600" />
                                  Financial Summary
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total Revenue</span>
                                    <span className="text-2xl font-bold text-emerald-600">
                                      £{financeStats.totalRevenue.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600 mb-1">Paid</p>
                                      <p className="text-lg font-semibold text-green-600">{financeStats.paid}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600 mb-1">Pending</p>
                                      <p className="text-lg font-semibold text-yellow-600">{financeStats.pending}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600 mb-1">Overdue</p>
                                      <p className="text-lg font-semibold text-red-600">{financeStats.overdue}</p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {widgetId === 'communication' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                                <CardTitle className="flex items-center gap-2">
                                  <MessageSquare className="w-5 h-5 text-amber-600" />
                                  Communication & Alerts
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Bell className="w-5 h-5 text-blue-600" />
                                      <span className="text-sm font-medium">Pending Leave Requests</span>
                                    </div>
                                    <Badge className="bg-blue-600">{pendingLeave}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="w-5 h-5 text-purple-600" />
                                      <span className="text-sm font-medium">New Feedback</span>
                                    </div>
                                    <Badge className="bg-purple-600">{newFeedback}</Badge>
                                  </div>
                                  {criticalAlerts > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                        <span className="text-sm font-medium">Critical Alerts</span>
                                      </div>
                                      <Badge className="bg-red-600">{criticalAlerts}</Badge>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {widgetId === 'dailyLog' && (
                            <Card className="shadow-lg">
                              <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
                                <CardTitle className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-cyan-600" />
                                  Today's Daily Log
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-600">Total Entries</p>
                                      <p className="text-2xl font-bold">{dailyLogs.length}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Follow-ups</p>
                                      <p className="text-2xl font-bold text-orange-600">
                                        {dailyLogs.filter(l => l && l.follow_up_required).length}
                                      </p>
                                    </div>
                                  </div>
                                  {dailyLogs.length > 0 ? (
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {dailyLogs.slice(0, 3).map(log => (
                                        <div key={log.id} className="p-2 bg-gray-50 rounded-lg text-sm">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">{log.visitor_name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {log.entry_type?.replace(/_/g, ' ')}
                                            </Badge>
                                          </div>
                                          {log.arrival_time && (
                                            <span className="text-xs text-gray-500">{log.arrival_time}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 text-center py-2">No entries today</p>
                                  )}
                                  <Link to={createPageUrl("DailyLog")}>
                                    <Button className="w-full" variant="outline">
                                      <FileText className="w-4 h-4 mr-2" />
                                      View Daily Log
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
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

        {/* Customizer Dialog */}
        {showCustomizer && (
          <DashboardCustomizer
            currentPreferences={modulePreferences}
            onSave={handleSavePreferences}
            onClose={() => setShowCustomizer(false)}
          />
        )}
      </div>
    </div>
  );
}