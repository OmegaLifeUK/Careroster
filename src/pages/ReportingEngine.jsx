import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Play,
  Clock,
  Download,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  AlertTriangle,
  GraduationCap,
  ClipboardCheck,
  Activity,
  Pill,
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  Trash2,
  Edit,
  Eye
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { useToast } from "@/components/ui/toast";
import ReportGenerator from "@/components/reports/ReportGenerator";
import ScheduledReportDialog from "@/components/reports/ScheduledReportDialog";
import ReportViewer from "@/components/reports/ReportViewer";

const REPORT_TYPES = [
  { id: "client_progress", label: "Client Progress", icon: TrendingUp, color: "bg-blue-100 text-blue-700", description: "Behavioural, educational, social, health progress" },
  { id: "staff_performance", label: "Staff Performance", icon: Users, color: "bg-green-100 text-green-700", description: "Supervision completion, attendance, feedback" },
  { id: "compliance", label: "Compliance Summary", icon: Shield, color: "bg-purple-100 text-purple-700", description: "Audit results, policy compliance, gaps" },
  { id: "payroll_summary", label: "Payroll Summary", icon: DollarSign, color: "bg-amber-100 text-amber-700", description: "Hours, pay, overtime, deductions" },
  { id: "incident_trends", label: "Incident Trends", icon: AlertTriangle, color: "bg-red-100 text-red-700", description: "Incident patterns, categories, resolutions" },
  { id: "training_compliance", label: "Training Compliance", icon: GraduationCap, color: "bg-indigo-100 text-indigo-700", description: "Training completion, expiring, gaps" },
  { id: "audit_summary", label: "Audit Summary", icon: ClipboardCheck, color: "bg-cyan-100 text-cyan-700", description: "Audit scores, trends, action plans" },
  { id: "occupancy", label: "Occupancy Report", icon: Activity, color: "bg-teal-100 text-teal-700", description: "Bed occupancy, admissions, discharges" },
  { id: "medication_compliance", label: "Medication Compliance", icon: Pill, color: "bg-pink-100 text-pink-700", description: "MAR completion, errors, refusals" },
];

export default function ReportingEngine() {
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: scheduledReports = [], isLoading: loadingScheduled } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => base44.entities.ScheduledReport.list(),
  });

  const { data: generatedReports = [], isLoading: loadingGenerated } = useQuery({
    queryKey: ['generated-reports'],
    queryFn: () => base44.entities.GeneratedReport.filter({}, '-generated_date', 50),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success("Schedule deleted");
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ScheduledReport.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success("Schedule updated");
    },
  });

  const getReportTypeInfo = (type) => REPORT_TYPES.find(r => r.id === type) || REPORT_TYPES[0];

  const activeSchedules = Array.isArray(scheduledReports) ? scheduledReports.filter(s => s.is_active) : [];
  const recentReports = Array.isArray(generatedReports) ? generatedReports.slice(0, 10) : [];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting Engine</h1>
            <p className="text-gray-600">Generate, schedule, and manage reports</p>
          </div>
          <Button onClick={() => { setEditingSchedule(null); setShowScheduleDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSchedules.length}</p>
                <p className="text-xs text-gray-500">Active Schedules</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentReports.length}</p>
                <p className="text-xs text-gray-500">Reports This Month</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeSchedules.filter(s => {
                    const next = new Date(s.next_run_date);
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return next <= tomorrow;
                  }).length}
                </p>
                <p className="text-xs text-gray-500">Due Today/Tomorrow</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {recentReports.filter(r => r.sent_to?.length > 0).length}
                </p>
                <p className="text-xs text-gray-500">Reports Sent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="generate">Generate Report</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
            <TabsTrigger value="history">Report History</TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            {selectedReportType ? (
              <ReportGenerator
                reportType={selectedReportType}
                onBack={() => setSelectedReportType(null)}
                onGenerated={(report) => {
                  queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
                  setViewingReport(report);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORT_TYPES.map(type => (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                    onClick={() => setSelectedReportType(type.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${type.color}`}>
                          <type.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{type.label}</h3>
                          <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-4">
                        <Play className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scheduled">
            {loadingScheduled ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : scheduledReports.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-700">No Scheduled Reports</h3>
                  <p className="text-sm text-gray-500 mt-1">Create a schedule to automate report generation</p>
                  <Button className="mt-4" onClick={() => setShowScheduleDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Schedule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {scheduledReports.map(schedule => {
                  const typeInfo = getReportTypeInfo(schedule.report_type);
                  return (
                    <Card key={schedule.id} className={!schedule.is_active ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                              <typeInfo.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{schedule.report_name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{typeInfo.label}</Badge>
                                <Badge variant="outline" className="capitalize">{schedule.schedule_frequency}</Badge>
                                {schedule.recipients?.length > 0 && (
                                  <Badge variant="outline">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {schedule.recipients.length} recipient(s)
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p className="text-gray-500">Next run</p>
                              <p className="font-medium">
                                {schedule.next_run_date
                                  ? format(new Date(schedule.next_run_date), 'MMM d, yyyy HH:mm')
                                  : 'Not scheduled'}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingSchedule(schedule); setShowScheduleDialog(true); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleScheduleMutation.mutate({ id: schedule.id, is_active: !schedule.is_active })}
                              >
                                {schedule.is_active ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Delete this schedule?")) {
                                    deleteScheduleMutation.mutate(schedule.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {loadingGenerated ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : generatedReports.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-700">No Reports Generated</h3>
                  <p className="text-sm text-gray-500 mt-1">Generate your first report to see it here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {generatedReports.map(report => {
                  const typeInfo = getReportTypeInfo(report.report_type);
                  return (
                    <Card key={report.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                              <typeInfo.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{report.report_name}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <span>{format(new Date(report.generated_date || report.created_date), 'MMM d, yyyy HH:mm')}</span>
                                <span>•</span>
                                <span>by {report.generated_by || 'System'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              report.status === 'completed' ? 'bg-green-100 text-green-700' :
                              report.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>
                              {report.status}
                            </Badge>
                            {report.status === 'completed' && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                {report.file_url && (
                                  <Button variant="outline" size="sm" onClick={() => window.open(report.file_url, '_blank')}>
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showScheduleDialog && (
        <ScheduledReportDialog
          schedule={editingSchedule}
          onClose={() => { setShowScheduleDialog(false); setEditingSchedule(null); }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
            setShowScheduleDialog(false);
            setEditingSchedule(null);
          }}
        />
      )}

      {viewingReport && (
        <ReportViewer
          report={viewingReport}
          onClose={() => setViewingReport(null)}
        />
      )}
    </div>
  );
}