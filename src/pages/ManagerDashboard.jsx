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
import PredictiveScheduling from "../components/schedule/PredictiveScheduling";

const DEFAULT_PREFERENCES = {
  occupancy: true,
  staff: true,
  training: true,
  incidents: true,
  finance: true,
  communication: true,
};

export default function ManagerDashboard() {
  const [dateRange, setDateRange] = useState("today");
  const [selectedModule, setSelectedModule] = useState("all");
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [user, setUser] = useState(null);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        if (userData.dashboard_preferences) {
          setModulePreferences(userData.dashboard_preferences);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.MedicationLog.list('-administration_time'),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list('-assigned_date'),
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['training-modules'],
    queryFn: () => base44.entities.TrainingModule.list(),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date'),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts'],
    queryFn: () => base44.entities.ClientAlert.filter({ status: 'active' }),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const occupancyStats = {
    totalBeds: 50,
    occupied: clients.filter(c => c.status === 'active').length,
    plannedAdmissions: 3,
  };
  occupancyStats.occupancyRate = ((occupancyStats.occupied / occupancyStats.totalBeds) * 100).toFixed(1);

  const todayMeds = medications.filter(m => {
    try {
      return isToday(parseISO(m.administration_time));
    } catch {
      return false;
    }
  });
  const overdueMeds = todayMeds.filter(m => m.status === 'missed').length;
  const upcomingMeds = medications.filter(m => {
    try {
      const medTime = parseISO(m.administration_time);
      return medTime > new Date() && medTime < addDays(new Date(), 1);
    } catch {
      return false;
    }
  }).length;

  const todayShifts = shifts.filter(shift => {
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });
  const unfilledShifts = shifts.filter(s => s.status === 'unfilled').length;
  const shiftFillRate = todayShifts.length > 0
    ? (((todayShifts.length - todayShifts.filter(s => s.status === 'unfilled').length) / todayShifts.length) * 100).toFixed(1)
    : 100;

  const expiringCerts = trainingAssignments.filter(a => {
    if (!a.expiry_date) return false;
    try {
      const expiry = parseISO(a.expiry_date);
      return expiry < addDays(new Date(), 30) && expiry > new Date();
    } catch {
      return false;
    }
  }).length;

  const overdueTraining = trainingAssignments.filter(a => {
    if (!a.due_date) return false;
    try {
      return isPast(parseISO(a.due_date)) && a.status !== 'completed';
    } catch {
      return false;
    }
  }).length;

  const trainingCompletionRate = trainingAssignments.length > 0
    ? ((trainingAssignments.filter(a => a.status === 'completed').length / trainingAssignments.length) * 100).toFixed(1)
    : 0;

  const recentIncidents = incidents.filter(inc => {
    try {
      return parseISO(inc.incident_date) > subMonths(new Date(), 1);
    } catch {
      return false;
    }
  });
  const unresolvedIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length;

  const incidentTrends = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  }).map(month => {
    const monthIncidents = incidents.filter(inc => {
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
      critical: monthIncidents.filter(i => i.severity === 'critical').length
    };
  });

  const financeStats = {
    overdue: 15,
    pending: 25,
    paid: 60,
    totalRevenue: 125000,
  };

  const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;
  const newFeedback = feedback.filter(f => f.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  const handleSavePreferences = async (preferences) => {
    try {
      if (user && user.id) {
        await base44.auth.updateMe({
          dashboard_preferences: preferences
        });
        setModulePreferences(preferences);
        setShowCustomizer(false);
      } else {
        console.warn("User not loaded, cannot save preferences.");
        alert("User data not available. Please refresh and try again.");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  const exportDashboard = () => {
    const report = `Manager's Dashboard Report - ${format(new Date(), 'yyyy-MM-dd HH:mm')}

OCCUPANCY & COMPLIANCE
- Beds Occupied: ${occupancyStats.occupied}/${occupancyStats.totalBeds} (${occupancyStats.occupancyRate}%)
- Planned Admissions: ${occupancyStats.plannedAdmissions}
- Overdue Medications: ${overdueMeds}
- Critical Alerts: ${criticalAlerts}

STAFF MANAGEMENT
- Today's Shifts: ${todayShifts.length}
- Unfilled Shifts: ${unfilledShifts}
- Shift Fill Rate: ${shiftFillRate}%
- Active Staff: ${carers.filter(c => c.status === 'active').length}

TRAINING & CERTIFICATION
- Expiring Certifications: ${expiringCerts}
- Overdue Training: ${overdueTraining}
- Completion Rate: ${trainingCompletionRate}%

INCIDENT REPORTING
- Total Incidents (30 days): ${recentIncidents.length}
- Critical: ${criticalIncidents}
- Unresolved: ${unresolvedIncidents}

FINANCE & BILLING
- Paid: ${financeStats.paid}%
- Pending: ${financeStats.pending}%
- Overdue: ${financeStats.overdue}%

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
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Manager's Dashboard
            </h1>
            <p className="text-gray-500">Real-time operational, clinical, and compliance overview</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportDashboard}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizer(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
          </div>
        </div>

        {(criticalAlerts > 0 || criticalIncidents > 0 || overdueMeds > 0) && (
          <Card className="mb-6 border-l-4 border-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Critical Attention Required</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    {criticalAlerts > 0 && (
                      <span className="text-red-800">• {criticalAlerts} Critical Client Alert{criticalAlerts !== 1 ? 's' : ''}</span>
                    )}
                    {criticalIncidents > 0 && (
                      <span className="text-red-800">• {criticalIncidents} Critical Incident{criticalIncidents !== 1 ? 's' : ''}</span>
                    )}
                    {overdueMeds > 0 && (
                      <span className="text-red-800">• {overdueMeds} Overdue Medication{overdueMeds !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <PredictiveScheduling
            shifts={shifts}
            carers={carers}
            clients={clients}
          />
        </div>

        {modulePreferences.occupancy && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              Occupancy & Compliance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Link to={createPageUrl("Clients")} className="block">
                <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Home className="w-5 h-5 text-blue-600" />
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">{occupancyStats.occupancyRate}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Beds Occupied</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {occupancyStats.occupied}/{occupancyStats.totalBeds}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Planned Admissions</p>
                  <p className="text-2xl font-bold text-green-600">{occupancyStats.plannedAdmissions}</p>
                </CardContent>
              </Card>

              <Card className={`hover:shadow-lg transition-shadow ${overdueMeds > 0 ? 'ring-2 ring-red-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 ${overdueMeds > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg`}>
                      <Shield className={`w-5 h-5 ${overdueMeds > 0 ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    {overdueMeds > 0 && <Badge className="bg-red-500 text-white animate-pulse">Alert</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Overdue Meds</p>
                  <p className={`text-2xl font-bold ${overdueMeds > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {overdueMeds}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Upcoming Meds</p>
                  <p className="text-2xl font-bold text-orange-600">{upcomingMeds}</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Open Audits</p>
                  <p className="text-2xl font-bold text-purple-600">2</p>
                  <p className="text-xs text-gray-500 mt-1">3 actions pending</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {modulePreferences.staff && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Staff Management
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Roster & Attendance</CardTitle>
                    <Link
                      to={createPageUrl("Schedule")}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Full Schedule →
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to={createPageUrl("Schedule")} className="block">
                      <div className="p-4 bg-blue-50 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer">
                        <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                        <p className="text-xs text-gray-600">Today's Shifts</p>
                        <p className="text-2xl font-bold text-blue-900">{todayShifts.length}</p>
                      </div>
                    </Link>
                    <Link to={createPageUrl("Schedule")} className="block">
                      <div className={`p-4 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer ${unfilledShifts > 0 ? 'bg-red-50 ring-2 ring-red-300' : 'bg-green-50'}`}>
                        <AlertTriangle className={`w-6 h-6 mb-2 ${unfilledShifts > 0 ? 'text-red-600' : 'text-green-600'}`} />
                        <p className="text-xs text-gray-600">Unfilled</p>
                        <p className={`text-2xl font-bold ${unfilledShifts > 0 ? 'text-red-900' : 'text-green-900'}`}>
                          {unfilledShifts}
                        </p>
                      </div>
                    </Link>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                      <p className="text-xs text-gray-600">Fill Rate</p>
                      <p className="text-2xl font-bold text-green-900">{shiftFillRate}%</p>
                    </div>
                    <Link to={createPageUrl("LeaveRequests")} className="block">
                      <div className="p-4 bg-orange-50 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer">
                        <Clock className="w-6 h-6 text-orange-600 mb-2" />
                        <p className="text-xs text-gray-600">On Leave</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {carers.filter(c => c.status === 'on_leave').length}
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Active Staff</span>
                      <span className="text-lg font-bold text-gray-900">
                        {carers.filter(c => c.status === 'active').length}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(carers.filter(c => c.status === 'active').length / carers.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-lg">Performance Reviews</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-900 mb-1">Expiring Soon</p>
                      <p className="text-3xl font-bold text-yellow-900">5</p>
                      <p className="text-xs text-yellow-700 mt-1">Within next 30 days</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Logged Notes</p>
                      <p className="text-3xl font-bold text-blue-900">12</p>
                      <p className="text-xs text-blue-700 mt-1">This month</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-1">Completed</p>
                      <p className="text-3xl font-bold text-green-900">28</p>
                      <p className="text-xs text-green-700 mt-1">This quarter</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {modulePreferences.training && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              Training & Certification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to={createPageUrl("StaffTraining")} className="block">
                <Card className={`hover:shadow-xl hover:scale-105 transition-all cursor-pointer ${expiringCerts > 0 ? 'ring-2 ring-orange-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      </div>
                      {expiringCerts > 0 && <Badge className="bg-orange-500 text-white">Action</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Expiring Certs</p>
                    <p className="text-2xl font-bold text-orange-600">{expiringCerts}</p>
                    <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("StaffTraining")} className="block">
                <Card className={`hover:shadow-xl hover:scale-105 transition-all cursor-pointer ${overdueTraining > 0 ? 'ring-2 ring-red-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 ${overdueTraining > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg`}>
                        <Clock className={`w-5 h-5 ${overdueTraining > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Overdue Training</p>
                    <p className={`text-2xl font-bold ${overdueTraining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {overdueTraining}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("StaffTraining")} className="block">
                <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {trainingAssignments.filter(a => a.status === 'in_progress').length}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("StaffTraining")} className="block">
                <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">{trainingCompletionRate}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {trainingAssignments.filter(a => a.status === 'completed').length}/{trainingAssignments.length}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {modulePreferences.incidents && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Incident Reporting
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Monthly Incident Trends</CardTitle>
                    <Link
                      to={createPageUrl("IncidentManagement")}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All Incidents →
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64 flex items-end justify-between gap-2">
                    {incidentTrends.map((trend, index) => {
                      const maxCount = Math.max(...incidentTrends.map(t => t.count), 1);
                      const height = (trend.count / maxCount) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full relative" style={{ height: '200px' }}>
                            <div
                              className="absolute bottom-0 w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-lg hover:from-orange-500 hover:to-orange-400 transition-all cursor-pointer"
                              style={{ height: `${height}%` }}
                              title={`${trend.count} incidents (${trend.critical} critical)`}
                            >
                              {trend.count > 0 && (
                                <div className="text-center text-white font-bold text-sm pt-2">
                                  {trend.count}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">{trend.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-red-50 to-pink-50">
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Link to={createPageUrl("IncidentManagement")} className="block">
                      <div className="p-3 bg-blue-50 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer">
                        <p className="text-sm font-medium text-blue-900 mb-1">Total (30 days)</p>
                        <p className="text-3xl font-bold text-blue-900">{recentIncidents.length}</p>
                      </div>
                    </Link>

                    <Link to={createPageUrl("IncidentManagement")} className="block">
                      <div className={`p-3 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer ${criticalIncidents > 0 ? 'bg-red-50 ring-2 ring-red-300' : 'bg-green-50'}`}>
                        <p className={`text-sm font-medium mb-1 ${criticalIncidents > 0 ? 'text-red-900' : 'text-green-900'}`}>
                          Critical
                        </p>
                        <p className={`text-3xl font-bold ${criticalIncidents > 0 ? 'text-red-900' : 'text-green-900'}`}>
                          {criticalIncidents}
                        </p>
                      </div>
                    </Link>

                    <Link to={createPageUrl("IncidentManagement")} className="block">
                      <div className={`p-3 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer ${unresolvedIncidents > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                        <p className={`text-sm font-medium mb-1 ${unresolvedIncidents > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                          Unresolved
                        </p>
                        <p className={`text-3xl font-bold ${unresolvedIncidents > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                          {unresolvedIncidents}
                        </p>
                      </div>
                    </Link>

                    <Link to={createPageUrl("IncidentManagement")} className="block">
                      <div className="p-3 bg-green-50 rounded-lg hover:shadow-md hover:scale-105 transition-all cursor-pointer">
                        <p className="text-sm font-medium text-green-900 mb-1">Resolved</p>
                        <p className="text-3xl font-bold text-green-900">
                          {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}
                        </p>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {modulePreferences.finance && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Finance & Billing
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-green-50">
                  <CardTitle className="text-lg">Billing Status</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-900">Overdue</span>
                      <span className="text-2xl font-bold text-red-900">{financeStats.overdue}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium text-yellow-900">Pending</span>
                      <span className="text-2xl font-bold text-yellow-900">{financeStats.pending}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-900">Paid</span>
                      <span className="text-2xl font-bold text-green-900">{financeStats.paid}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-lg">Billing Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#dcfce7" strokeWidth="20" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="20" strokeDasharray={`${financeStats.paid * 2.51} 251`} className="transition-all duration-500" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#eab308" strokeWidth="20" strokeDasharray={`${financeStats.pending * 2.51} 251`} strokeDashoffset={`-${financeStats.paid * 2.51}`} className="transition-all duration-500" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray={`${financeStats.overdue * 2.51} 251`} strokeDashoffset={`-${(financeStats.paid + financeStats.pending) * 2.51}`} className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-2xl font-bold text-gray-900">100%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-lg">Revenue</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-700 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-emerald-900">
                        £{(financeStats.totalRevenue / 1000).toFixed(0)}k
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">This month</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 mb-1">Outstanding</p>
                      <p className="text-3xl font-bold text-blue-900">
                        £{((financeStats.totalRevenue * (financeStats.overdue + financeStats.pending) / 100) / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 mb-1">Collections</p>
                      <p className="text-3xl font-bold text-green-900">
                        £{((financeStats.totalRevenue * financeStats.paid / 100) / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {modulePreferences.communication && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Communication
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Staff Announcements</span>
                    <Badge className="bg-blue-500 text-white">3 New</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                      <p className="text-sm font-medium text-blue-900">New policy update</p>
                      <p className="text-xs text-blue-700 mt-1">Posted 2 hours ago</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-900">Training session reminder</p>
                      <p className="text-xs text-gray-600 mt-1">Posted yesterday</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-900">Team meeting minutes</p>
                      <p className="text-xs text-gray-600 mt-1">Posted 2 days ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Family Updates</span>
                    <Badge className="bg-purple-500 text-white">{newFeedback}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-green-900">Compliments</p>
                        <p className="text-xs text-green-700">This week</p>
                      </div>
                      <span className="text-2xl font-bold text-green-900">
                        {feedback.filter(f => f.feedback_type === 'compliment').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-orange-900">Pending</p>
                        <p className="text-xs text-orange-700">Requires response</p>
                      </div>
                      <span className="text-2xl font-bold text-orange-900">{newFeedback}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-yellow-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Alerts & Requests</span>
                    {(pendingLeave + criticalAlerts) > 0 && (
                      <Badge className="bg-orange-500 text-white">{pendingLeave + criticalAlerts}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">Leave Requests</p>
                          <p className="text-xs text-yellow-700">Pending approval</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-yellow-900">{pendingLeave}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Critical Alerts</p>
                          <p className="text-xs text-red-700">Require attention</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-900">{criticalAlerts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Link to={createPageUrl("Reports")} className="block">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full hover:shadow-md hover:scale-105 transition-all">
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">View Reports</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Schedule")} className="block">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full hover:shadow-md hover:scale-105 transition-all">
                  <Calendar className="w-5 h-5" />
                  <span className="text-xs">Manage Roster</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Carers")} className="block">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full hover:shadow-md hover:scale-105 transition-all">
                  <Users className="w-5 h-5" />
                  <span className="text-xs">Staff List</span>
                </Button>
              </Link>
              <Link to={createPageUrl("IncidentManagement")} className="block">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full hover:shadow-md hover:scale-105 transition-all">
                  <Shield className="w-5 h-5" />
                  <span className="text-xs">Incidents</span>
                </Button>
              </Link>
              <Link to={createPageUrl("StaffTraining")} className="block">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full hover:shadow-md hover:scale-105 transition-all">
                  <GraduationCap className="w-5 h-5" />
                  <span className="text-xs">Training</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Notifications")} className="block">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full hover:shadow-md hover:scale-105 transition-all">
                  <Bell className="w-5 h-5" />
                  <span className="text-xs">Notifications</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

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