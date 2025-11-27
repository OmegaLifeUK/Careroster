import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Clock, 
  Users, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from "date-fns";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PayrollDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const { data: currentPeriod } = useQuery({
    queryKey: ['current-payroll-period'],
    queryFn: async () => {
      const periods = await base44.entities.PayrollPeriod.filter({ status: "draft" });
      return Array.isArray(periods) && periods.length > 0 ? periods[0] : null;
    },
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheet-entries'],
    queryFn: async () => {
      const data = await base44.entities.TimesheetEntry.list('-timesheet_date', 500);
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: async () => {
      const data = await base44.entities.Payslip.list('-pay_date', 100);
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      const data = await base44.entities.ClientInvoice.list('-invoice_date', 100);
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

  // Calculate statistics
  const pendingTimesheets = timesheets.filter(t => t.status === 'pending' || t.status === 'requires_adjustment').length;
  const totalHoursThisPeriod = timesheets
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + (t.actual_hours || 0), 0);
  const estimatedPayrollCost = timesheets
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + (t.gross_pay || 0), 0);
  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
  const outstandingInvoiceValue = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.balance_due || 0), 0);

  const nmwIssues = timesheets.filter(t => 
    t.pay_rate_applied && t.pay_rate_applied < 11.44 // Current NMW rate
  ).length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              Payroll & Finance
            </h1>
            <p className="text-gray-500">Manage payroll, timesheets, and client invoicing</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("TimesheetReconciliation")}>
              <Button className="bg-blue-600">
                <Clock className="w-4 h-4 mr-2" />
                Timesheet Reconciliation
              </Button>
            </Link>
            <Link to={createPageUrl("PayrollProcessing")}>
              <Button className="bg-green-600">
                <FileText className="w-4 h-4 mr-2" />
                Process Payroll
              </Button>
            </Link>
          </div>
        </div>

        {/* Current Period Info */}
        {currentPeriod && (
          <Card className="mb-6 border-l-4 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{currentPeriod.period_name}</h3>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(currentPeriod.start_date), 'MMM d')} - {format(parseISO(currentPeriod.end_date), 'MMM d, yyyy')}
                  </p>
                  <Badge className="mt-2">{currentPeriod.status}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Pay Date</p>
                  <p className="text-lg font-bold">{format(parseISO(currentPeriod.pay_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alert Banner */}
        {(pendingTimesheets > 0 || nmwIssues > 0) && (
          <Card className="mb-6 border-l-4 border-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-900">Action Required</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    {pendingTimesheets > 0 && (
                      <span className="text-orange-800">• {pendingTimesheets} timesheets need approval</span>
                    )}
                    {nmwIssues > 0 && (
                      <span className="text-orange-800">• {nmwIssues} potential NMW compliance issues</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link to={createPageUrl("TimesheetReconciliation")} className="block">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-blue-600" />
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-sm text-blue-800 mb-1">Total Hours (Approved)</p>
                <p className="text-3xl font-bold text-blue-900">{totalHoursThisPeriod.toFixed(1)}</p>
                <p className="text-xs text-blue-700 mt-1">{staff.length} staff members</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("PayrollProcessing")} className="block">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm text-green-800 mb-1">Est. Payroll Cost</p>
                <p className="text-3xl font-bold text-green-900">£{estimatedPayrollCost.toLocaleString()}</p>
                <p className="text-xs text-green-700 mt-1">Current period</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("TimesheetReconciliation")} className="block">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-orange-600" />
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-sm text-orange-800 mb-1">Pending Timesheets</p>
                <p className="text-3xl font-bold text-orange-900">{pendingTimesheets}</p>
                <p className="text-xs text-orange-700 mt-1">Need approval</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("InvoiceManagement")} className="block">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-purple-600" />
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-sm text-purple-800 mb-1">Outstanding Invoices</p>
                <p className="text-3xl font-bold text-purple-900">£{outstandingInvoiceValue.toLocaleString()}</p>
                <p className="text-xs text-purple-700 mt-1">{outstandingInvoices} invoices</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to={createPageUrl("TimesheetReconciliation")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="border-b bg-blue-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Timesheet Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-3">
                  Review and approve staff timesheets, handle adjustments
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{pendingTimesheets} pending</Badge>
                  <Button size="sm">Review →</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("PayrollProcessing")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="border-b bg-green-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Process Payroll
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-3">
                  Generate payslips, calculate deductions, export to accounting
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{staff.length} staff</Badge>
                  <Button size="sm">Process →</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("InvoiceManagement")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="border-b bg-purple-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Client Invoicing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-3">
                  Create and manage client invoices, track payments
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{outstandingInvoices} outstanding</Badge>
                  <Button size="sm">Manage →</Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Payroll Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payslips.slice(0, 5).map((payslip) => {
                const staffMember = staff.find(s => s.id === payslip.staff_id);
                return (
                  <div key={payslip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">{staffMember?.full_name || 'Staff Member'}</p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(payslip.pay_date), 'MMM d, yyyy')} • {payslip.total_hours}h
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">£{payslip.net_pay?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Net Pay</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}