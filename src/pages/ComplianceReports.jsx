import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Download, FileText, BarChart3, PieChart, Calendar } from "lucide-react";

export default function ComplianceReports() {
  const [selectedReport, setSelectedReport] = useState(null);

  const { data: actionPlans = [] } = useQuery({
    queryKey: ['action-plans'],
    queryFn: async () => {
      const data = await base44.entities.ActionPlan.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['audit-records'],
    queryFn: async () => {
      const data = await base44.entities.AuditRecord.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['regulatory-notifications'],
    queryFn: async () => {
      const data = await base44.entities.RegulatoryNotification.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: medicalErrors = [] } = useQuery({
    queryKey: ['medical-errors'],
    queryFn: async () => {
      const data = await base44.entities.MedicalError.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const data = await base44.entities.Complaint.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const reports = [
    {
      title: "Action Plans Summary",
      icon: FileText,
      color: "blue",
      description: "Overview of all action plans and their progress",
      stats: {
        total: actionPlans.length,
        active: actionPlans.filter(ap => ap.status === 'active').length,
        completed: actionPlans.filter(ap => ap.status === 'completed').length
      }
    },
    {
      title: "Audit Compliance Report",
      icon: BarChart3,
      color: "green",
      description: "Summary of audit outcomes and compliance rates",
      stats: {
        total: audits.length,
        pass: audits.filter(a => a.outcome === 'pass').length,
        fail: audits.filter(a => a.outcome === 'fail').length
      }
    },
    {
      title: "Regulatory Notifications",
      icon: PieChart,
      color: "purple",
      description: "Summary of notifications sent to regulators",
      stats: {
        total: notifications.length,
        submitted: notifications.filter(n => n.status === 'submitted').length,
        acknowledged: notifications.filter(n => n.status === 'acknowledged').length
      }
    },
    {
      title: "Medical Errors Analysis",
      icon: TrendingUp,
      color: "red",
      description: "Analysis of medical errors and trends",
      stats: {
        total: medicalErrors.length,
        near_miss: medicalErrors.filter(e => e.severity === 'near_miss').length,
        major: medicalErrors.filter(e => e.severity === 'major').length
      }
    },
    {
      title: "Complaints & Feedback",
      icon: Calendar,
      color: "orange",
      description: "Summary of complaints and their resolution",
      stats: {
        total: complaints.length,
        open: complaints.filter(c => !['resolved', 'closed'].includes(c.status)).length,
        resolved: complaints.filter(c => c.status === 'resolved').length
      }
    }
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Reports</h1>
          <p className="text-gray-500">Generate and view compliance reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report.title} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-${report.color}-100 rounded-lg`}>
                    <report.icon className={`w-6 h-6 text-${report.color}-600`} />
                  </div>
                  <Badge variant="outline">{report.stats.total}</Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2">{report.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                
                <div className="space-y-2 mb-4">
                  {Object.entries(report.stats).slice(1).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader className="border-b">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {actionPlans.slice(0, 5).map(ap => (
                <div key={ap.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{ap.title}</p>
                      <p className="text-xs text-gray-600">{ap.category}</p>
                    </div>
                    <Badge>{ap.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}