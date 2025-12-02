import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Play,
  Calendar,
  Users,
  FileText,
  Download,
  Mail
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/components/ui/toast";

const DATE_RANGES = [
  { id: "last_7_days", label: "Last 7 Days", getRange: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { id: "last_30_days", label: "Last 30 Days", getRange: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { id: "last_90_days", label: "Last 90 Days", getRange: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
  { id: "this_month", label: "This Month", getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { id: "last_month", label: "Last Month", getRange: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { id: "last_3_months", label: "Last 3 Months", getRange: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { id: "last_6_months", label: "Last 6 Months", getRange: () => ({ start: subMonths(new Date(), 6), end: new Date() }) },
  { id: "last_year", label: "Last Year", getRange: () => ({ start: subMonths(new Date(), 12), end: new Date() }) },
  { id: "custom", label: "Custom Range", getRange: () => null },
];

export default function ReportGenerator({ reportType, onBack, onGenerated }) {
  const [params, setParams] = useState({
    dateRange: "last_30_days",
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    clientIds: [],
    staffIds: [],
    includeCharts: true,
    includeSummary: true,
    includeDetails: true,
    outputFormat: "pdf",
    emailRecipients: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-report'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
    enabled: ['client_progress', 'medication_compliance', 'occupancy'].includes(reportType),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-for-report'],
    queryFn: async () => {
      const carers = await base44.entities.Carer.list();
      const staffList = await base44.entities.Staff.list();
      return [...(Array.isArray(carers) ? carers : []), ...(Array.isArray(staffList) ? staffList : [])];
    },
    enabled: ['staff_performance', 'training_compliance', 'payroll_summary'].includes(reportType),
  });

  const handleDateRangeChange = (rangeId) => {
    setParams(prev => ({ ...prev, dateRange: rangeId }));
    const rangeConfig = DATE_RANGES.find(r => r.id === rangeId);
    if (rangeConfig && rangeId !== 'custom') {
      const range = rangeConfig.getRange();
      if (range) {
        setParams(prev => ({
          ...prev,
          startDate: format(range.start, 'yyyy-MM-dd'),
          endDate: format(range.end, 'yyyy-MM-dd'),
        }));
      }
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      const user = await base44.auth.me();
      
      // Fetch data based on report type
      let reportData = {};
      const startDate = params.startDate;
      const endDate = params.endDate;

      switch (reportType) {
        case 'client_progress':
          reportData = await generateClientProgressReport(startDate, endDate, params.clientIds);
          break;
        case 'staff_performance':
          reportData = await generateStaffPerformanceReport(startDate, endDate, params.staffIds);
          break;
        case 'compliance':
          reportData = await generateComplianceReport(startDate, endDate);
          break;
        case 'payroll_summary':
          reportData = await generatePayrollReport(startDate, endDate, params.staffIds);
          break;
        case 'incident_trends':
          reportData = await generateIncidentReport(startDate, endDate);
          break;
        case 'training_compliance':
          reportData = await generateTrainingReport(startDate, endDate, params.staffIds);
          break;
        case 'audit_summary':
          reportData = await generateAuditReport(startDate, endDate);
          break;
        case 'medication_compliance':
          reportData = await generateMedicationReport(startDate, endDate, params.clientIds);
          break;
        default:
          reportData = { summary: "Report type not implemented" };
      }

      // Save generated report
      const report = await base44.entities.GeneratedReport.create({
        report_name: `${getReportTitle(reportType)} - ${format(new Date(), 'MMM d, yyyy')}`,
        report_type: reportType,
        generated_date: new Date().toISOString(),
        generated_by: user.email,
        parameters_used: params,
        report_data: reportData,
        status: 'completed',
      });

      // Send email if recipients specified
      if (params.emailRecipients) {
        const recipients = params.emailRecipients.split(',').map(e => e.trim()).filter(Boolean);
        for (const recipient of recipients) {
          try {
            await base44.integrations.Core.SendEmail({
              to: recipient,
              subject: `Report: ${report.report_name}`,
              body: formatReportEmail(report.report_name, reportData),
            });
          } catch (e) {
            console.error("Email error:", e);
          }
        }
        await base44.entities.GeneratedReport.update(report.id, { sent_to: recipients });
      }

      toast.success("Report Generated", "Your report is ready");
      onGenerated(report);
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Generation Failed", error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const getReportTitle = (type) => {
    const titles = {
      client_progress: "Client Progress Report",
      staff_performance: "Staff Performance Report",
      compliance: "Compliance Summary Report",
      payroll_summary: "Payroll Summary Report",
      incident_trends: "Incident Trends Report",
      training_compliance: "Training Compliance Report",
      audit_summary: "Audit Summary Report",
      medication_compliance: "Medication Compliance Report",
    };
    return titles[type] || "Report";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">{getReportTitle(reportType)}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {DATE_RANGES.map(range => (
                  <Badge
                    key={range.id}
                    variant={params.dateRange === range.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleDateRangeChange(range.id)}
                  >
                    {range.label}
                  </Badge>
                ))}
              </div>
              {params.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={params.startDate}
                      onChange={(e) => setParams(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={params.endDate}
                      onChange={(e) => setParams(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters based on report type */}
          {['client_progress', 'medication_compliance', 'occupancy'].includes(reportType) && clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Client Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">Leave empty for all clients</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`client-${client.id}`}
                        checked={params.clientIds.includes(client.id)}
                        onCheckedChange={(checked) => {
                          setParams(prev => ({
                            ...prev,
                            clientIds: checked
                              ? [...prev.clientIds, client.id]
                              : prev.clientIds.filter(id => id !== client.id)
                          }));
                        }}
                      />
                      <Label htmlFor={`client-${client.id}`} className="text-sm cursor-pointer">
                        {client.full_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {['staff_performance', 'training_compliance', 'payroll_summary'].includes(reportType) && staff.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Staff Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">Leave empty for all staff</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {staff.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`staff-${s.id}`}
                        checked={params.staffIds.includes(s.id)}
                        onCheckedChange={(checked) => {
                          setParams(prev => ({
                            ...prev,
                            staffIds: checked
                              ? [...prev.staffIds, s.id]
                              : prev.staffIds.filter(id => id !== s.id)
                          }));
                        }}
                      />
                      <Label htmlFor={`staff-${s.id}`} className="text-sm cursor-pointer">
                        {s.full_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Report Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-charts"
                    checked={params.includeCharts}
                    onCheckedChange={(checked) => setParams(prev => ({ ...prev, includeCharts: checked }))}
                  />
                  <Label htmlFor="include-charts">Include Charts</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-summary"
                    checked={params.includeSummary}
                    onCheckedChange={(checked) => setParams(prev => ({ ...prev, includeSummary: checked }))}
                  />
                  <Label htmlFor="include-summary">Include Summary</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-details"
                    checked={params.includeDetails}
                    onCheckedChange={(checked) => setParams(prev => ({ ...prev, includeDetails: checked }))}
                  />
                  <Label htmlFor="include-details">Include Details</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Recipients (comma separated)</Label>
              <Input
                placeholder="email1@example.com, email2@example.com"
                value={params.emailRecipients}
                onChange={(e) => setParams(prev => ({ ...prev, emailRecipients: e.target.value }))}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">Leave empty to skip emailing</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ready to Generate</h3>
              <p className="text-sm text-gray-600 mb-4">
                Report period: {format(new Date(params.startDate), 'MMM d, yyyy')} - {format(new Date(params.endDate), 'MMM d, yyyy')}
              </p>
              <Button
                className="w-full"
                onClick={generateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Report generation functions
async function generateClientProgressReport(startDate, endDate, clientIds) {
  const progressRecords = await base44.entities.ClientProgressRecord.filter({});
  const clients = await base44.entities.Client.list();
  
  const filteredRecords = progressRecords.filter(r => {
    const date = new Date(r.record_date);
    const inRange = date >= new Date(startDate) && date <= new Date(endDate);
    const clientMatch = clientIds.length === 0 || clientIds.includes(r.client_id);
    return inRange && clientMatch;
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.full_name; });

  const summary = {
    total_records: filteredRecords.length,
    clients_tracked: [...new Set(filteredRecords.map(r => r.client_id))].length,
    improvements: filteredRecords.filter(r => ['significant_improvement', 'improvement'].includes(r.overall_progress)).length,
    stable: filteredRecords.filter(r => r.overall_progress === 'stable').length,
    declines: filteredRecords.filter(r => ['slight_decline', 'significant_decline'].includes(r.overall_progress)).length,
    average_rating: filteredRecords.length > 0 
      ? (filteredRecords.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / filteredRecords.length).toFixed(1)
      : 0,
  };

  const byClient = {};
  filteredRecords.forEach(r => {
    if (!byClient[r.client_id]) {
      byClient[r.client_id] = { name: clientMap[r.client_id] || 'Unknown', records: [] };
    }
    byClient[r.client_id].records.push(r);
  });

  return { summary, by_client: byClient, period: { start: startDate, end: endDate } };
}

async function generateStaffPerformanceReport(startDate, endDate, staffIds) {
  const supervisions = await base44.entities.StaffSupervision.filter({});
  const shifts = await base44.entities.Shift.filter({ status: 'completed' });
  const carers = await base44.entities.Carer.list();
  const staffList = await base44.entities.Staff.list();
  
  const allStaff = [...(Array.isArray(carers) ? carers : []), ...(Array.isArray(staffList) ? staffList : [])];
  const staffMap = {};
  allStaff.forEach(s => { staffMap[s.id] = s.full_name; });

  const filteredSupervisions = supervisions.filter(s => {
    const date = new Date(s.supervision_date);
    const inRange = date >= new Date(startDate) && date <= new Date(endDate);
    const staffMatch = staffIds.length === 0 || staffIds.includes(s.staff_id);
    return inRange && staffMatch;
  });

  const filteredShifts = shifts.filter(s => {
    const date = new Date(s.date);
    const inRange = date >= new Date(startDate) && date <= new Date(endDate);
    const staffMatch = staffIds.length === 0 || staffIds.includes(s.carer_id);
    return inRange && staffMatch;
  });

  const summary = {
    total_supervisions: filteredSupervisions.length,
    staff_supervised: [...new Set(filteredSupervisions.map(s => s.staff_id))].length,
    shifts_completed: filteredShifts.length,
    performance_ratings: {
      exceeds: filteredSupervisions.filter(s => s.overall_performance_rating === 'exceeds_expectations').length,
      meets: filteredSupervisions.filter(s => s.overall_performance_rating === 'meets_expectations').length,
      requires_improvement: filteredSupervisions.filter(s => s.overall_performance_rating === 'requires_improvement').length,
      unsatisfactory: filteredSupervisions.filter(s => s.overall_performance_rating === 'unsatisfactory').length,
    },
  };

  return { summary, supervisions: filteredSupervisions.slice(0, 20), period: { start: startDate, end: endDate } };
}

async function generateComplianceReport(startDate, endDate) {
  const tasks = await base44.entities.ComplianceTask.filter({});
  const audits = await base44.entities.QualityAudit.filter({});
  
  const filteredTasks = tasks.filter(t => {
    const date = new Date(t.due_date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const summary = {
    total_tasks: filteredTasks.length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    overdue: filteredTasks.filter(t => t.status === 'overdue').length,
    pending: filteredTasks.filter(t => t.status === 'pending').length,
    compliance_rate: filteredTasks.length > 0 
      ? ((filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100).toFixed(1)
      : 100,
    by_category: {},
  };

  filteredTasks.forEach(t => {
    if (!summary.by_category[t.category]) {
      summary.by_category[t.category] = { total: 0, completed: 0 };
    }
    summary.by_category[t.category].total++;
    if (t.status === 'completed') summary.by_category[t.category].completed++;
  });

  return { summary, tasks: filteredTasks.slice(0, 30), period: { start: startDate, end: endDate } };
}

async function generatePayrollReport(startDate, endDate, staffIds) {
  const timesheets = await base44.entities.TimesheetEntry.filter({});
  const payslips = await base44.entities.Payslip.filter({});
  
  const filteredTimesheets = timesheets.filter(t => {
    const date = new Date(t.timesheet_date);
    const inRange = date >= new Date(startDate) && date <= new Date(endDate);
    const staffMatch = staffIds.length === 0 || staffIds.includes(t.staff_id);
    return inRange && staffMatch;
  });

  const summary = {
    total_entries: filteredTimesheets.length,
    total_hours: filteredTimesheets.reduce((sum, t) => sum + (t.actual_hours || 0), 0).toFixed(1),
    total_gross_pay: filteredTimesheets.reduce((sum, t) => sum + (t.gross_pay || 0), 0).toFixed(2),
    by_pay_bucket: {},
    staff_count: [...new Set(filteredTimesheets.map(t => t.staff_id))].length,
  };

  filteredTimesheets.forEach(t => {
    const bucket = t.pay_bucket || 'standard';
    if (!summary.by_pay_bucket[bucket]) {
      summary.by_pay_bucket[bucket] = { hours: 0, pay: 0 };
    }
    summary.by_pay_bucket[bucket].hours += t.actual_hours || 0;
    summary.by_pay_bucket[bucket].pay += t.gross_pay || 0;
  });

  return { summary, period: { start: startDate, end: endDate } };
}

async function generateIncidentReport(startDate, endDate) {
  const incidents = await base44.entities.IncidentReport.filter({});
  
  const filteredIncidents = incidents.filter(i => {
    const date = new Date(i.incident_date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const summary = {
    total_incidents: filteredIncidents.length,
    by_type: {},
    by_severity: {},
    resolved: filteredIncidents.filter(i => ['resolved', 'closed'].includes(i.status)).length,
    open: filteredIncidents.filter(i => !['resolved', 'closed'].includes(i.status)).length,
  };

  filteredIncidents.forEach(i => {
    summary.by_type[i.incident_type] = (summary.by_type[i.incident_type] || 0) + 1;
    summary.by_severity[i.severity] = (summary.by_severity[i.severity] || 0) + 1;
  });

  return { summary, incidents: filteredIncidents.slice(0, 20), period: { start: startDate, end: endDate } };
}

async function generateTrainingReport(startDate, endDate, staffIds) {
  const assignments = await base44.entities.TrainingAssignment.filter({});
  const modules = await base44.entities.TrainingModule.list();
  
  const moduleMap = {};
  (Array.isArray(modules) ? modules : []).forEach(m => { moduleMap[m.id] = m.module_name; });

  const filteredAssignments = assignments.filter(a => {
    const staffMatch = staffIds.length === 0 || staffIds.includes(a.staff_id);
    return staffMatch;
  });

  const summary = {
    total_assignments: filteredAssignments.length,
    completed: filteredAssignments.filter(a => a.status === 'completed').length,
    overdue: filteredAssignments.filter(a => a.status === 'overdue').length,
    in_progress: filteredAssignments.filter(a => a.status === 'in_progress').length,
    compliance_rate: filteredAssignments.length > 0
      ? ((filteredAssignments.filter(a => a.status === 'completed').length / filteredAssignments.length) * 100).toFixed(1)
      : 100,
  };

  return { summary, assignments: filteredAssignments.slice(0, 30), period: { start: startDate, end: endDate } };
}

async function generateAuditReport(startDate, endDate) {
  const audits = await base44.entities.QualityAudit.filter({});
  
  const filteredAudits = audits.filter(a => {
    const date = new Date(a.audit_date || a.created_date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const summary = {
    total_audits: filteredAudits.length,
    average_score: filteredAudits.length > 0
      ? (filteredAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / filteredAudits.length).toFixed(1)
      : 0,
    by_status: {},
  };

  filteredAudits.forEach(a => {
    summary.by_status[a.status] = (summary.by_status[a.status] || 0) + 1;
  });

  return { summary, audits: filteredAudits.slice(0, 20), period: { start: startDate, end: endDate } };
}

async function generateMedicationReport(startDate, endDate, clientIds) {
  const logs = await base44.entities.MedicationLog.filter({});
  const marSheets = await base44.entities.MARSheet.filter({});
  
  const filteredLogs = logs.filter(l => {
    const date = new Date(l.administration_time);
    const inRange = date >= new Date(startDate) && date <= new Date(endDate);
    const clientMatch = clientIds.length === 0 || clientIds.includes(l.client_id);
    return inRange && clientMatch;
  });

  const summary = {
    total_administrations: filteredLogs.length,
    administered: filteredLogs.filter(l => l.status === 'administered').length,
    refused: filteredLogs.filter(l => l.status === 'refused').length,
    missed: filteredLogs.filter(l => l.status === 'missed').length,
    compliance_rate: filteredLogs.length > 0
      ? ((filteredLogs.filter(l => l.status === 'administered').length / filteredLogs.length) * 100).toFixed(1)
      : 100,
    active_mar_sheets: marSheets.length,
  };

  return { summary, period: { start: startDate, end: endDate } };
}

function formatReportEmail(reportName, data) {
  let body = `<h2>${reportName}</h2>`;
  body += `<p>Generated on ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>`;
  
  if (data.summary) {
    body += `<h3>Summary</h3><ul>`;
    Object.entries(data.summary).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        body += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
      }
    });
    body += `</ul>`;
  }
  
  if (data.period) {
    body += `<p><em>Period: ${data.period.start} to ${data.period.end}</em></p>`;
  }
  
  return body;
}