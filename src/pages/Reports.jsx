import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Users, 
  UserCircle, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Download,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

import CarerHoursReport from "../components/reports/CarerHoursReport";
import ClientVisitsReport from "../components/reports/ClientVisitsReport";
import ShiftFillRateReport from "../components/reports/ShiftFillRateReport";
import MileageReport from "../components/reports/MileageReport";
import PayrollReport from "../components/reports/PayrollReport";
import StaffPerformanceReport from "../components/reports/StaffPerformanceReport";
import FinancialSummaryReport from "../components/reports/FinancialSummaryReport";
import OperationalEfficiencyReport from "../components/reports/OperationalEfficiencyReport";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("staff-performance");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const data = await base44.entities.Shift.list('-date');
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

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const data = await base44.entities.TimesheetEntry.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const data = await base44.entities.ClientInvoice.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: async () => {
      const data = await base44.entities.Payslip.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      const data = await base44.entities.ClientFeedback.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const allStaff = [...carers, ...staff];
  const allClients = clients;

  const reportTypes = [
    {
      id: "staff-performance",
      title: "Staff Performance",
      description: "Hours worked, overtime, feedback ratings",
      icon: BarChart3,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "financial-summary",
      title: "Financial Summary",
      description: "Revenue, costs, profit margins",
      icon: DollarSign,
      color: "from-green-500 to-green-600",
    },
    {
      id: "operational-efficiency",
      title: "Operational Efficiency",
      description: "Vacancy rates, response times",
      icon: Activity,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "carer-hours",
      title: "Carer Hours",
      description: "Track working hours",
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      id: "client-visits",
      title: "Client Visits",
      description: "Visit summaries",
      icon: UserCircle,
      color: "from-pink-500 to-pink-600",
    },
    {
      id: "shift-fill",
      title: "Shift Fill Rates",
      description: "Coverage analysis",
      icon: Calendar,
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "mileage",
      title: "Mileage",
      description: "Travel tracking",
      icon: TrendingUp,
      color: "from-amber-500 to-amber-600",
    },
    {
      id: "payroll",
      title: "Payroll",
      description: "Earnings summary",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
    },
  ];

  const renderReport = () => {
    const filters = { dateFrom, dateTo, selectedStaff, selectedClient };
    
    switch (activeTab) {
      case "staff-performance":
        return <StaffPerformanceReport 
          timesheets={timesheets} 
          staff={allStaff} 
          feedback={feedback}
          shifts={shifts}
          filters={filters}
        />;
      case "financial-summary":
        return <FinancialSummaryReport 
          invoices={invoices} 
          payslips={payslips} 
          clients={allClients}
          staff={allStaff}
          filters={filters}
        />;
      case "operational-efficiency":
        return <OperationalEfficiencyReport 
          shifts={shifts} 
          staff={allStaff}
          clients={allClients}
          timesheets={timesheets}
          filters={filters}
        />;
      case "carer-hours":
        return <CarerHoursReport shifts={shifts} carers={carers} />;
      case "client-visits":
        return <ClientVisitsReport shifts={shifts} clients={clients} carers={carers} />;
      case "shift-fill":
        return <ShiftFillRateReport shifts={shifts} carers={carers} clients={clients} />;
      case "mileage":
        return <MileageReport shifts={shifts} carers={carers} clients={clients} />;
      case "payroll":
        return <PayrollReport shifts={shifts} carers={carers} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-500">Generate comprehensive reports for your care operations</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex-1">
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
              <div className="flex-1">
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

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTab === report.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setActiveTab(report.id)}
            >
              <CardContent className="p-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center mb-2`}>
                  <report.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-xs mb-1">{report.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{report.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {renderReport()}
      </div>
    </div>
  );
}