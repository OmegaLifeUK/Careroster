import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ClipboardCheck,
  AlertTriangle,
  FileText,
  Target,
  Bell,
  Stethoscope,
  Shield,
  CheckCircle,
  TrendingUp,
  Calendar
} from "lucide-react";

export default function ComplianceHub() {
  const { data: actionPlans = [] } = useQuery({
    queryKey: ['action-plans'],
    queryFn: async () => {
      const data = await base44.entities.ActionPlan.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['audit-records'],
    queryFn: async () => {
      const data = await base44.entities.AuditRecord.list('-audit_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['regulatory-notifications'],
    queryFn: async () => {
      const data = await base44.entities.RegulatoryNotification.list('-notification_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: medicalErrors = [] } = useQuery({
    queryKey: ['medical-errors'],
    queryFn: async () => {
      const data = await base44.entities.MedicalError.list('-error_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: mockInspections = [] } = useQuery({
    queryKey: ['mock-inspections'],
    queryFn: async () => {
      const data = await base44.entities.MockInspection.list('-inspection_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const data = await base44.entities.Complaint.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const activeActionPlans = actionPlans.filter(ap => ['active', 'in_progress'].includes(ap.status));
  const overdueActionPlans = actionPlans.filter(ap => ap.status === 'overdue');
  const recentAudits = audits.slice(0, 5);
  const pendingNotifications = notifications.filter(n => n.status === 'draft');
  const openMedicalErrors = medicalErrors.filter(e => !['closed'].includes(e.status));
  const openComplaints = complaints.filter(c => !['resolved', 'closed'].includes(c.status));

  const modules = [
    {
      title: "Action Plans",
      icon: Target,
      color: "blue",
      count: activeActionPlans.length,
      overdue: overdueActionPlans.length,
      url: createPageUrl("ActionPlans"),
      description: "Track compliance actions and progress"
    },
    {
      title: "Audits",
      icon: ClipboardCheck,
      color: "green",
      count: recentAudits.length,
      url: createPageUrl("Audits"),
      description: "Daily, weekly, monthly & ad-hoc audits"
    },
    {
      title: "Regulatory Notifications",
      icon: Bell,
      color: "purple",
      count: pendingNotifications.length,
      url: createPageUrl("RegulatoryNotifications"),
      description: "CQC/Ofsted/CIW notifications"
    },
    {
      title: "Medical Errors",
      icon: Stethoscope,
      color: "red",
      count: openMedicalErrors.length,
      url: createPageUrl("MedicalErrors"),
      description: "Track and manage medication errors"
    },
    {
      title: "Mock Inspections",
      icon: Shield,
      color: "indigo",
      count: mockInspections.length,
      url: createPageUrl("MockInspections"),
      description: "Prepare for regulatory inspections"
    },
    {
      title: "Complaints & Comments",
      icon: FileText,
      color: "orange",
      count: openComplaints.length,
      url: createPageUrl("ComplaintsManagement"),
      description: "Manage complaints and feedback"
    },
    {
      title: "Training Matrix",
      icon: Calendar,
      color: "teal",
      url: createPageUrl("TrainingMatrix"),
      description: "Staff training schedule & compliance"
    },
    {
      title: "Compliance Reports",
      icon: TrendingUp,
      color: "pink",
      url: createPageUrl("ComplianceReports"),
      description: "Generate compliance reports"
    }
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance & Quality Hub</h1>
          <p className="text-gray-500">
            Manage regulatory compliance, audits, and quality assurance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {modules.map((module) => (
            <Link key={module.title} to={module.url}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-${module.color}-100 rounded-lg`}>
                      <module.icon className={`w-6 h-6 text-${module.color}-600`} />
                    </div>
                    {module.count !== undefined && (
                      <Badge variant="outline" className="text-lg">
                        {module.count}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{module.title}</h3>
                  <p className="text-sm text-gray-600">{module.description}</p>
                  {module.overdue > 0 && (
                    <Badge className="mt-3 bg-red-100 text-red-800">
                      {module.overdue} Overdue
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link to={createPageUrl("ActionPlans")}>
            <Card className="hover:shadow-xl transition-shadow cursor-pointer">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Priority Actions
                </CardTitle>
              </CardHeader>
            <CardContent className="p-6">
              {overdueActionPlans.length === 0 && pendingNotifications.length === 0 && openMedicalErrors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>All caught up! No urgent actions required.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueActionPlans.slice(0, 3).map(ap => (
                    <div key={ap.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
                      <p className="font-medium text-sm">{ap.title}</p>
                      <p className="text-xs text-gray-600 mt-1">Overdue action plan</p>
                    </div>
                  ))}
                  {pendingNotifications.slice(0, 2).map(n => (
                    <div key={n.id} className="p-3 border-l-4 border-purple-500 bg-purple-50 rounded">
                      <p className="font-medium text-sm">{n.notification_type}</p>
                      <p className="text-xs text-gray-600 mt-1">Pending regulatory notification</p>
                    </div>
                  ))}
                  {openMedicalErrors.slice(0, 2).map(e => (
                    <div key={e.id} className="p-3 border-l-4 border-orange-500 bg-orange-50 rounded">
                      <p className="font-medium text-sm">{e.error_type}</p>
                      <p className="text-xs text-gray-600 mt-1">Open medical error</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </Link>

          <Link to={createPageUrl("Audits")}>
            <Card className="hover:shadow-xl transition-shadow cursor-pointer">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-green-600" />
                  Recent Audit Activity
                </CardTitle>
              </CardHeader>
            <CardContent className="p-6">
              {recentAudits.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No recent audits</p>
              ) : (
                <div className="space-y-3">
                  {recentAudits.map(audit => (
                    <div key={audit.id} className="p-3 bg-gray-50 rounded border">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{audit.area_audited}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {audit.audit_date} - Score: {audit.percentage_score}%
                          </p>
                        </div>
                        <Badge className={
                          audit.outcome === 'pass' ? 'bg-green-100 text-green-800' :
                          audit.outcome === 'fail' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {audit.outcome}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}