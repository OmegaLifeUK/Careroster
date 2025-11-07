import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Bed,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  MessageSquare,
  FileText,
  Settings,
  Download,
  Filter,
  Bell,
  Activity,
  Award,
  Briefcase,
  PieChart,
  BarChart3,
  Eye,
  EyeOff
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, addDays, startOfMonth, endOfMonth } from "date-fns";

export default function ManagerDashboard() {
  const [dateRange, setDateRange] = useState("today");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [visibleModules, setVisibleModules] = useState({
    occupancy: true,
    staff: true,
    training: true,
    incidents: true,
    finance: true,
    communication: true,
  });

  // Data queries
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medication-logs'],
    queryFn: () => base44.entities.MedicationLog.list('-administration_time'),
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts'],
    queryFn: () => base44.entities.ClientAlert.filter({ status: 'active' }),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date'),
  });

  // Calculate KPIs
  const totalBeds = 50; // Configure based on facility
  const occupiedBeds = clients.filter(c => c.status === 'active').length;
  const occupancyRate = ((occupiedBeds / totalBeds) * 100).toFixed(1);
  
  const plannedAdmissions = clients.filter(c => c.status === 'inactive').length;
  
  const overdueMedications = medications.filter(m => 
    m.status === 'missed' || (m.status !== 'administered' && isAfter(new Date(), parseISO(m.administration_time)))
  ).length;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  const availableStaff = carers.filter(c => c.status === 'active').length;
  const onLeaveStaff = carers.filter(c => c.status === 'on_leave').length;

  const unfilledShifts = shifts.filter(s => s.status === 'unfilled').length;

  const expiringTraining = trainingAssignments.filter(t => 
    t.expiry_date && isBefore(parseISO(t.expiry_date), addDays(new Date(), 30)) && t.status === 'completed'
  ).length;

  const overdueTraining = trainingAssignments.filter(t =>
    t.status === 'overdue' || (t.due_date && isAfter(new Date(), parseISO(t.due_date)) && t.status !== 'completed')
  ).length;

  const openIncidents = incidents.filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
  const urgentIncidents = incidents.filter(i => 
    i.severity === 'critical' && i.status !== 'closed' && i.status !== 'resolved'
  ).length;

  const newFeedback = feedback.filter(f => f.status === 'new').length;
  const complaints = feedback.filter(f => f.feedback_type === 'complaint' && f.status !== 'closed').length;

  // Monthly incident trends (mock data - in production, aggregate from actual data)
  const monthlyIncidents = [
    { month: 'Jan', count: 12 },
    { month: 'Feb', count: 8 },
    { month: 'Mar', count: 15 },
    { month: 'Apr', count: 10 },
    { month: 'May', count: 7 },
    { month: 'Jun', count: 9 },
    { month: 'Jul', count: 11 },
    { month: 'Aug', count: 13 },
    { month: 'Sep', count: 6 },
    { month: 'Oct', count: 14 },
    { month: 'Nov', count: 10 },
    { month: 'Dec', count: 8 },
  ];

  const maxIncidents = Math.max(...monthlyIncidents.map(m => m.count));

  // Finance mock data (in production, integrate with finance system)
  const billingStatus = {
    overdue: 15,
    pending: 35,
    paid: 50,
  };

  const toggleModule = (module) => {
    setVisibleModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  const exportDashboard = () => {
    // Generate CSV or PDF export
    alert("Dashboard export functionality - integrate with reporting system");
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[98%] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Dashboard</h1>
            <p className="text-gray-500">Real-time operational overview</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="domiciliary">Domiciliary</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportDashboard}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
          </div>
        </div>

        {/* Alert Banner */}
        {(urgentIncidents > 0 || criticalAlerts > 0 || complaints > 0) && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-red-600 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Urgent Attention Required</h3>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {urgentIncidents > 0 && (
                      <Badge className="bg-red-600 text-white">
                        {urgentIncidents} Critical Incident{urgentIncidents !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {criticalAlerts > 0 && (
                      <Badge className="bg-orange-600 text-white">
                        {criticalAlerts} Critical Alert{criticalAlerts !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {complaints > 0 && (
                      <Badge className="bg-yellow-600 text-white">
                        {complaints} Open Complaint{complaints !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Module Visibility Toggles */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 mr-2">Visible Modules:</span>
              {Object.entries(visibleModules).map(([key, visible]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={visible ? "default" : "outline"}
                  onClick={() => toggleModule(key)}
                  className="capitalize"
                >
                  {visible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                  {key}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* OCCUPANCY & COMPLIANCE */}
        {visibleModules.occupancy && (
          <Card className="mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-blue-600" />
                Occupancy & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Bed className="w-8 h-8 opacity-80" />
                      <span className="text-3xl font-bold">{occupiedBeds}/{totalBeds}</span>
                    </div>
                    <p className="text-sm opacity-90">Beds Occupied</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">Occupancy Rate: {occupancyRate}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-8 h-8 opacity-80" />
                      <span className="text-3xl font-bold">{plannedAdmissions}</span>
                    </div>
                    <p className="text-sm opacity-90">Planned Admissions</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">This Month</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${overdueMedications > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className={`w-8 h-8 opacity-80 ${overdueMedications > 0 ? 'animate-pulse' : ''}`} />
                      <span className="text-3xl font-bold">{overdueMedications}</span>
                    </div>
                    <p className="text-sm opacity-90">Medication Alerts</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">Overdue Administration</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${criticalAlerts > 0 ? 'from-orange-500 to-orange-600' : 'from-blue-500 to-blue-600'} text-white`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="w-8 h-8 opacity-80" />
                      <span className="text-3xl font-bold">{criticalAlerts}</span>
                    </div>
                    <p className="text-sm opacity-90">Critical Alerts</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">Require Immediate Action</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STAFF MANAGEMENT */}
        {visibleModules.staff && (
          <Card className="mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Staff Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{availableStaff}</p>
                        <p className="text-sm text-gray-600">Available Staff</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {onLeaveStaff} on leave
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 ${unfilledShifts > 0 ? 'bg-orange-100' : 'bg-green-100'} rounded-lg`}>
                        <Calendar className={`w-6 h-6 ${unfilledShifts > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{unfilledShifts}</p>
                        <p className="text-sm text-gray-600">Unfilled Shifts</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Next 7 days
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{shifts.filter(s => s.status === 'completed').length}</p>
                        <p className="text-sm text-gray-600">Shifts Completed</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      This month
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">12</p>
                        <p className="text-sm text-gray-600">Performance Reviews</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Due this month
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TRAINING & CERTIFICATION */}
        {visibleModules.training && (
          <Card className="mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Training & Certification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-8 h-8 opacity-80" />
                      <span className="text-3xl font-bold">{expiringTraining}</span>
                    </div>
                    <p className="text-sm opacity-90">Expiring Soon</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">Within 30 days</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${overdueTraining > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className={`w-8 h-8 opacity-80 ${overdueTraining > 0 ? 'animate-pulse' : ''}`} />
                      <span className="text-3xl font-bold">{overdueTraining}</span>
                    </div>
                    <p className="text-sm opacity-90">Overdue Training</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">Requires immediate attention</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="w-8 h-8 opacity-80" />
                      <span className="text-3xl font-bold">
                        {((trainingAssignments.filter(t => t.status === 'completed').length / trainingAssignments.length) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm opacity-90">Completion Rate</p>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs">{trainingAssignments.filter(t => t.status === 'completed').length} of {trainingAssignments.length} completed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* INCIDENT REPORTING */}
          {visibleModules.incidents && (
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Incident Reporting
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-gray-600" />
                        <p className="text-sm text-gray-600">Total Incidents</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{incidents.length}</p>
                      <p className="text-xs text-gray-500 mt-1">This month</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                        <p className="text-sm text-gray-600">Open</p>
                      </div>
                      <p className="text-3xl font-bold text-orange-600">{openIncidents}</p>
                      <p className="text-xs text-gray-500 mt-1">Require action</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Trend Chart */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Incident Trends</h4>
                  <div className="flex items-end justify-between gap-2 h-40">
                    {monthlyIncidents.map((data, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-red-500 to-orange-500 rounded-t transition-all hover:opacity-80"
                          style={{ height: `${(data.count / maxIncidents) * 100}%` }}
                          title={`${data.month}: ${data.count} incidents`}
                        />
                        <span className="text-xs text-gray-600">{data.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resolution Status</span>
                    <Badge className="bg-green-100 text-green-800">
                      {((incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length / incidents.length) * 100).toFixed(0)}% Resolved
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FINANCE */}
          {visibleModules.finance && (
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-green-50">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Finance & Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48">
                    {/* Pie Chart Visualization */}
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* Paid - Green */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="20"
                        strokeDasharray={`${billingStatus.paid * 2.51} 251`}
                        strokeDashoffset="0"
                      />
                      {/* Pending - Yellow */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="20"
                        strokeDasharray={`${billingStatus.pending * 2.51} 251`}
                        strokeDashoffset={`-${billingStatus.paid * 2.51}`}
                      />
                      {/* Overdue - Red */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="20"
                        strokeDasharray={`${billingStatus.overdue * 2.51} 251`}
                        strokeDashoffset={`-${(billingStatus.paid + billingStatus.pending) * 2.51}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">100%</p>
                        <p className="text-xs text-gray-500">Total Billing</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium text-green-900">Paid</span>
                    </div>
                    <span className="text-lg font-bold text-green-900">{billingStatus.paid}%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <span className="text-sm font-medium text-yellow-900">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-900">{billingStatus.pending}%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-sm font-medium text-red-900">Overdue</span>
                    </div>
                    <span className="text-lg font-bold text-red-900">{billingStatus.overdue}%</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button className="w-full" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View Detailed Financial Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* COMMUNICATION */}
        {visibleModules.communication && (
          <Card>
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Communication & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{newFeedback}</p>
                        <p className="text-sm text-gray-600">New Feedback</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Requires response
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 ${complaints > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg`}>
                        <AlertTriangle className={`w-6 h-6 ${complaints > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{complaints}</p>
                        <p className="text-sm text-gray-600">Open Complaints</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Require follow-up
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {feedback.length > 0 
                            ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
                            : "N/A"
                          }
                        </p>
                        <p className="text-sm text-gray-600">Avg Satisfaction</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Out of 5 stars
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Bell className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">8</p>
                        <p className="text-sm text-gray-600">Announcements</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Pending distribution
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">New family inquiry received</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Bell className="w-4 h-4 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Staff meeting reminder sent</p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm">Schedule</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">Staff Roster</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <FileText className="w-5 h-5" />
                <span className="text-sm">Reports</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm">Messages</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}