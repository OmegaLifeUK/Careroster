import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Star,
  MapPin,
  UserCheck
} from "lucide-react";
import { format, parseISO, isWithinInterval, subMonths, differenceInMinutes } from "date-fns";
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import StaffHoursReport from "@/components/reports/StaffHoursReport";
import ClientVisitsReport from "@/components/reports/ClientVisitsReport";
import OutingsReport from "@/components/reports/OutingsReport";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [reportType, setReportType] = useState("overview");

  // Fetch all data
  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets-all'],
    queryFn: async () => {
      const data = await base44.entities.TimesheetEntry.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-all'],
    queryFn: async () => {
      const data = await base44.entities.Shift.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-all'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers-all'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: async () => {
      const data = await base44.entities.ClientInvoice.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips-all'],
    queryFn: async () => {
      const data = await base44.entities.Payslip.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback-all'],
    queryFn: async () => {
      try {
        const data = await base44.entities.ClientFeedback.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits-all'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Visit.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['daily-logs-all'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DailyLog.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['availability-all'],
    queryFn: async () => {
      try {
        const data = await base44.entities.CarerAvailability.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const allStaff = [...staff, ...carers];
  const allClients = clients;

  // Filter data based on selections
  const filteredData = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

    const filteredTimesheets = timesheets.filter(t => {
      try {
        const tDate = parseISO(t.timesheet_date);
        const dateMatch = isWithinInterval(tDate, { start: from, end: to });
        const staffMatch = selectedStaff === "all" || t.staff_id === selectedStaff;
        const clientMatch = selectedClient === "all" || t.client_id === selectedClient;
        return dateMatch && staffMatch && clientMatch;
      } catch {
        return false;
      }
    });

    const filteredShifts = shifts.filter(s => {
      try {
        const sDate = parseISO(s.date);
        const dateMatch = isWithinInterval(sDate, { start: from, end: to });
        const staffMatch = selectedStaff === "all" || s.carer_id === selectedStaff;
        const clientMatch = selectedClient === "all" || s.client_id === selectedClient;
        return dateMatch && staffMatch && clientMatch;
      } catch {
        return false;
      }
    });

    const filteredInvoices = invoices.filter(i => {
      try {
        const iDate = parseISO(i.invoice_date);
        const dateMatch = isWithinInterval(iDate, { start: from, end: to });
        const clientMatch = selectedClient === "all" || i.client_id === selectedClient;
        return dateMatch && clientMatch;
      } catch {
        return false;
      }
    });

    const filteredPayslips = payslips.filter(p => {
      try {
        const pDate = parseISO(p.pay_date);
        const dateMatch = isWithinInterval(pDate, { start: from, end: to });
        const staffMatch = selectedStaff === "all" || p.staff_id === selectedStaff;
        return dateMatch && staffMatch;
      } catch {
        return false;
      }
    });

    const filteredFeedback = feedback.filter(f => {
      try {
        const fDate = parseISO(f.created_date);
        const dateMatch = isWithinInterval(fDate, { start: from, end: to });
        const clientMatch = selectedClient === "all" || f.client_id === selectedClient;
        const staffMatch = selectedStaff === "all" || f.staff_id === selectedStaff;
        return dateMatch && clientMatch && staffMatch;
      } catch {
        return false;
      }
    });

    return {
      timesheets: filteredTimesheets,
      shifts: filteredShifts,
      invoices: filteredInvoices,
      payslips: filteredPayslips,
      feedback: filteredFeedback
    };
  }, [timesheets, shifts, invoices, payslips, feedback, dateFrom, dateTo, selectedStaff, selectedClient]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Staff Performance
    const totalHours = filteredData.timesheets.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const standardHours = filteredData.timesheets.filter(t => t.pay_bucket === 'standard').reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const overtimeHours = filteredData.timesheets.filter(t => t.pay_bucket === 'overtime').reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const averageRating = filteredData.feedback.length > 0 
      ? filteredData.feedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / filteredData.feedback.length 
      : 0;
    
    // Financial Summaries
    const totalRevenue = filteredData.invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalCosts = filteredData.payslips.reduce((sum, p) => sum + (p.gross_pay || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;
    
    // Cost per client
    const clientCosts = {};
    filteredData.timesheets.forEach(t => {
      if (t.client_id) {
        clientCosts[t.client_id] = (clientCosts[t.client_id] || 0) + (t.gross_pay || 0);
      }
    });
    const avgCostPerClient = Object.keys(clientCosts).length > 0 
      ? Object.values(clientCosts).reduce((a, b) => a + b, 0) / Object.keys(clientCosts).length 
      : 0;
    
    // Operational Efficiency
    const totalShifts = filteredData.shifts.length;
    const unfilledShifts = filteredData.shifts.filter(s => s.status === 'unfilled' || !s.carer_id).length;
    const vacancyRate = totalShifts > 0 ? (unfilledShifts / totalShifts) * 100 : 0;
    
    // Response time (clock in variance)
    const lateClockIns = filteredData.timesheets.filter(t => t.is_clocked_in_late).length;
    const onTimeRate = filteredData.timesheets.length > 0 
      ? ((filteredData.timesheets.length - lateClockIns) / filteredData.timesheets.length) * 100 
      : 100;

    // Staff breakdown
    const staffPerformance = {};
    filteredData.timesheets.forEach(t => {
      if (!staffPerformance[t.staff_id]) {
        staffPerformance[t.staff_id] = {
          totalHours: 0,
          overtimeHours: 0,
          shifts: 0,
          grossPay: 0
        };
      }
      staffPerformance[t.staff_id].totalHours += t.actual_hours || 0;
      staffPerformance[t.staff_id].shifts += 1;
      staffPerformance[t.staff_id].grossPay += t.gross_pay || 0;
      if (t.pay_bucket === 'overtime') {
        staffPerformance[t.staff_id].overtimeHours += t.actual_hours || 0;
      }
    });

    // Client breakdown
    const clientRevenue = {};
    filteredData.invoices.forEach(i => {
      if (i.client_id) {
        clientRevenue[i.client_id] = (clientRevenue[i.client_id] || 0) + (i.total_amount || 0);
      }
    });

    return {
      staffPerformance: {
        totalHours,
        standardHours,
        overtimeHours,
        averageRating,
        breakdown: staffPerformance
      },
      financial: {
        totalRevenue,
        totalCosts,
        profit: totalRevenue - totalCosts,
        profitMargin,
        avgCostPerClient,
        clientRevenue
      },
      operational: {
        totalShifts,
        unfilledShifts,
        vacancyRate,
        onTimeRate,
        completionRate: totalShifts > 0 ? ((totalShifts - unfilledShifts) / totalShifts) * 100 : 0
      }
    };
  }, [filteredData]);

  // Chart data
  const staffPerformanceChartData = useMemo(() => {
    return Object.entries(metrics.staffPerformance.breakdown).map(([staffId, data]) => {
      const staffMember = allStaff.find(s => s.id === staffId);
      return {
        name: staffMember?.full_name || 'Unknown',
        hours: data.totalHours,
        overtime: data.overtimeHours,
        shifts: data.shifts
      };
    }).sort((a, b) => b.hours - a.hours).slice(0, 10);
  }, [metrics, allStaff]);

  const clientRevenueChartData = useMemo(() => {
    return Object.entries(metrics.financial.clientRevenue).map(([clientId, revenue]) => {
      const client = allClients.find(c => c.id === clientId);
      return {
        name: client?.full_name || 'Unknown',
        value: revenue
      };
    }).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [metrics, allClients]);

  const exportReport = () => {
    const reportData = {
      period: `${dateFrom} to ${dateTo}`,
      metrics: metrics,
      staff: selectedStaff === "all" ? "All Staff" : allStaff.find(s => s.id === selectedStaff)?.full_name,
      client: selectedClient === "all" ? "All Clients" : allClients.find(c => c.id === selectedClient)?.full_name
    };

    const csv = [
      "Business Metrics Report",
      `Period: ${reportData.period}`,
      `Staff Filter: ${reportData.staff}`,
      `Client Filter: ${reportData.client}`,
      "",
      "STAFF PERFORMANCE",
      `Total Hours Worked,${metrics.staffPerformance.totalHours.toFixed(1)}`,
      `Standard Hours,${metrics.staffPerformance.standardHours.toFixed(1)}`,
      `Overtime Hours,${metrics.staffPerformance.overtimeHours.toFixed(1)}`,
      `Average Client Rating,${metrics.staffPerformance.averageRating.toFixed(2)}`,
      "",
      "FINANCIAL SUMMARY",
      `Total Revenue,£${metrics.financial.totalRevenue.toFixed(2)}`,
      `Total Costs,£${metrics.financial.totalCosts.toFixed(2)}`,
      `Net Profit,£${metrics.financial.profit.toFixed(2)}`,
      `Profit Margin,${metrics.financial.profitMargin.toFixed(2)}%`,
      `Average Cost per Client,£${metrics.financial.avgCostPerClient.toFixed(2)}`,
      "",
      "OPERATIONAL EFFICIENCY",
      `Total Shifts,${metrics.operational.totalShifts}`,
      `Unfilled Shifts,${metrics.operational.unfilledShifts}`,
      `Vacancy Rate,${metrics.operational.vacancyRate.toFixed(2)}%`,
      `On-Time Rate,${metrics.operational.onTimeRate.toFixed(2)}%`,
      `Completion Rate,${metrics.operational.completionRate.toFixed(2)}%`
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-report-${dateFrom}-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Analytics</h1>
            <p className="text-gray-500">Comprehensive insights into performance, financials, and operations</p>
          </div>
          <Button onClick={exportReport} className="bg-blue-600">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Staff Member</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {allStaff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Client</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {allClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Type Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
          <Button
            variant={reportType === "overview" ? "default" : "ghost"}
            onClick={() => setReportType("overview")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={reportType === "staffHours" ? "default" : "ghost"}
            onClick={() => setReportType("staffHours")}
            className={reportType === "staffHours" ? "bg-blue-600" : ""}
          >
            <Clock className="w-4 h-4 mr-2" />
            Staff Hours
          </Button>
          <Button
            variant={reportType === "clientVisits" ? "default" : "ghost"}
            onClick={() => setReportType("clientVisits")}
            className={reportType === "clientVisits" ? "bg-green-600" : ""}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Client Visits
          </Button>
          <Button
            variant={reportType === "outings" ? "default" : "ghost"}
            onClick={() => setReportType("outings")}
            className={reportType === "outings" ? "bg-cyan-600" : ""}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Outings
          </Button>
          <Button
            variant={reportType === "staff" ? "default" : "ghost"}
            onClick={() => setReportType("staff")}
          >
            <Users className="w-4 h-4 mr-2" />
            Staff Performance
          </Button>
          <Button
            variant={reportType === "financial" ? "default" : "ghost"}
            onClick={() => setReportType("financial")}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Financial
          </Button>
          <Button
            variant={reportType === "operational" ? "default" : "ghost"}
            onClick={() => setReportType("operational")}
          >
            <Activity className="w-4 h-4 mr-2" />
            Operational
          </Button>
        </div>

        {/* Staff Hours Report */}
        {reportType === "staffHours" && (
          <StaffHoursReport
            timesheets={timesheets}
            shifts={shifts}
            staff={staff}
            carers={carers}
            availability={availability}
            dateFrom={dateFrom}
            dateTo={dateTo}
            selectedStaff={selectedStaff}
          />
        )}

        {/* Client Visits Report */}
        {reportType === "clientVisits" && (
          <ClientVisitsReport
            visits={visits}
            shifts={shifts}
            clients={clients}
            staff={staff}
            carers={carers}
            dateFrom={dateFrom}
            dateTo={dateTo}
            selectedClient={selectedClient}
          />
        )}

        {/* Outings Report */}
        {reportType === "outings" && (
          <OutingsReport
            dailyLogs={dailyLogs}
            clients={clients}
            staff={[...staff, ...carers]}
            dateFrom={dateFrom}
            dateTo={dateTo}
            selectedClient={selectedClient}
            selectedStaff={selectedStaff}
          />
        )}

        {/* Overview Tab */}
        {reportType === "overview" && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.staffPerformance.totalHours.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.staffPerformance.overtimeHours.toFixed(1)} OT hours
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    £{metrics.financial.profit.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    {metrics.financial.profitMargin > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xs text-green-600">{metrics.financial.profitMargin.toFixed(1)}% margin</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                        <span className="text-xs text-red-600">{metrics.financial.profitMargin.toFixed(1)}% margin</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.operational.completionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.operational.unfilledShifts} vacancies
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Client Rating</p>
                    <Star className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.staffPerformance.averageRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {filteredData.feedback.length} responses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Staff Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffPerformanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" fill="#3B82F6" name="Total Hours" />
                      <Bar dataKey="overtime" fill="#EF4444" name="OT Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={clientRevenueChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: £${entry.value.toFixed(0)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {clientRevenueChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Staff Performance Tab */}
        {reportType === "staff" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Hours Worked</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.staffPerformance.totalHours.toFixed(1)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Overtime Hours</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {metrics.staffPerformance.overtimeHours.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.staffPerformance.totalHours > 0 
                      ? ((metrics.staffPerformance.overtimeHours / metrics.staffPerformance.totalHours) * 100).toFixed(1)
                      : 0}% of total
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Average Rating</p>
                  <p className="text-3xl font-bold text-green-600">
                    {metrics.staffPerformance.averageRating.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {filteredData.feedback.length} reviews
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Staff Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={staffPerformanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#3B82F6" name="Total Hours" />
                    <Bar dataKey="overtime" fill="#EF4444" name="Overtime" />
                    <Bar dataKey="shifts" fill="#10B981" name="Shifts" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Detailed Staff Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Staff Member</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total Hours</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Overtime</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Shifts</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Avg per Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.entries(metrics.staffPerformance.breakdown).map(([staffId, data]) => {
                        const staffMember = allStaff.find(s => s.id === staffId);
                        return (
                          <tr key={staffId} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{staffMember?.full_name || 'Unknown'}</td>
                            <td className="px-4 py-2 text-sm font-medium">{data.totalHours.toFixed(1)}</td>
                            <td className="px-4 py-2 text-sm">{data.overtimeHours.toFixed(1)}</td>
                            <td className="px-4 py-2 text-sm">{data.shifts}</td>
                            <td className="px-4 py-2 text-sm">{(data.totalHours / data.shifts).toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Financial Tab */}
        {reportType === "financial" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-green-500">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    £{metrics.financial.totalRevenue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-red-500">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Costs</p>
                  <p className="text-3xl font-bold text-red-600">
                    £{metrics.financial.totalCosts.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-blue-500">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Net Profit</p>
                  <p className="text-3xl font-bold text-blue-600">
                    £{metrics.financial.profit.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Profit Margin</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.financial.profitMargin.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown by Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPie>
                      <Pie
                        data={clientRevenueChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `£${entry.value.toFixed(0)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {clientRevenueChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost per Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.financial.clientRevenue).slice(0, 8).map(([clientId, revenue]) => {
                      const client = allClients.find(c => c.id === clientId);
                      const clientCost = Object.entries(metrics.staffPerformance.breakdown)
                        .reduce((sum, [staffId, data]) => {
                          const staffClientTimesheets = filteredData.timesheets.filter(
                            t => t.staff_id === staffId && t.client_id === clientId
                          );
                          return sum + staffClientTimesheets.reduce((s, t) => s + (t.gross_pay || 0), 0);
                        }, 0);
                      const clientMargin = revenue > 0 ? ((revenue - clientCost) / revenue) * 100 : 0;

                      return (
                        <div key={clientId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{client?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-600">
                              Revenue: £{revenue.toFixed(2)} | Cost: £{clientCost.toFixed(2)}
                            </p>
                          </div>
                          <Badge className={clientMargin > 20 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                            {clientMargin.toFixed(1)}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Average Cost per Client</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-center text-blue-600">
                  £{metrics.financial.avgCostPerClient.toFixed(2)}
                </p>
                <p className="text-center text-gray-600 mt-2">
                  Across {Object.keys(metrics.financial.clientRevenue).length} clients
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Operational Tab */}
        {reportType === "operational" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-l-4 border-blue-500">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Shifts</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.operational.totalShifts}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.operational.unfilledShifts} unfilled
                  </p>
                </CardContent>
              </Card>
              <Card className={`border-l-4 ${metrics.operational.vacancyRate > 10 ? 'border-red-500' : 'border-green-500'}`}>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Vacancy Rate</p>
                  <p className={`text-3xl font-bold ${metrics.operational.vacancyRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics.operational.vacancyRate.toFixed(1)}%
                  </p>
                  <div className="flex items-center mt-1">
                    {metrics.operational.vacancyRate > 10 ? (
                      <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                    )}
                    <span className="text-xs text-gray-600">
                      {metrics.operational.vacancyRate > 10 ? 'Needs attention' : 'Good'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">On-Time Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.operational.onTimeRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Staff punctuality
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shift Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { status: 'completed', label: 'Completed', color: 'bg-green-500' },
                      { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
                      { status: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
                      { status: 'unfilled', label: 'Unfilled', color: 'bg-red-500' }
                    ].map(({ status, label, color }) => {
                      const count = filteredData.shifts.filter(s => s.status === status).length;
                      const percentage = metrics.operational.totalShifts > 0 
                        ? (count / metrics.operational.totalShifts) * 100 
                        : 0;
                      
                      return (
                        <div key={status}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${color} h-2 rounded-full`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operational KPIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Completion Rate</span>
                        <Badge className="bg-green-100 text-green-800">
                          {metrics.operational.completionRate.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${metrics.operational.completionRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Staff Punctuality</span>
                        <Badge className="bg-purple-100 text-purple-800">
                          {metrics.operational.onTimeRate.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${metrics.operational.onTimeRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Fill Rate</span>
                        <Badge className={
                          100 - metrics.operational.vacancyRate > 90 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }>
                          {(100 - metrics.operational.vacancyRate).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={
                            100 - metrics.operational.vacancyRate > 90 
                              ? 'bg-green-500 h-2 rounded-full' 
                              : 'bg-orange-500 h-2 rounded-full'
                          }
                          style={{ width: `${100 - metrics.operational.vacancyRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}