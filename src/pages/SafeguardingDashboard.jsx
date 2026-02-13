import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Shield, FileText, Calendar, Activity, Lock } from "lucide-react";
import { format } from "date-fns";
import CrossServiceInsights from "@/components/safeguarding/CrossServiceInsights";
import IncidentPatternAnalysis from "@/components/safeguarding/IncidentPatternAnalysis";
import SafeguardingAuditLog from "@/components/safeguarding/SafeguardingAuditLog";

export default function SafeguardingDashboard() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Role-based access control
  const hasFullAccess = user?.role === 'admin';
  const canViewAuditLog = user?.role === 'admin';

  // Fetch all safeguarding alerts
  const { data: allAlerts = [] } = useQuery({
    queryKey: ['all-safeguarding-alerts'],
    queryFn: () => base44.entities.SafeguardingAlert.list('-alert_date'),
  });

  // Fetch court deadlines
  const { data: courtDeadlines = [] } = useQuery({
    queryKey: ['court-deadlines'],
    queryFn: () => base44.entities.CourtDeadline.list('-deadline_date'),
  });

  // Fetch high-risk cases
  const { data: highRiskCases = [] } = useQuery({
    queryKey: ['high-risk-cases'],
    queryFn: async () => {
      const cases = await base44.entities.Case.list();
      return cases.filter(c => c.risk_level === 'high' || c.risk_level === 'critical');
    },
  });

  // Fetch overdue documents
  const { data: overdueDocuments = [] } = useQuery({
    queryKey: ['overdue-documents'],
    queryFn: async () => {
      const docs = await base44.entities.CaseDocument.list();
      return docs.filter(d => 
        d.status === 'outstanding' && 
        d.due_date && 
        new Date(d.due_date) < new Date() &&
        d.is_mandatory
      );
    },
  });

  // Fetch incidents for pattern analysis
  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      try {
        return await base44.entities.Incident.list('-created_date', 100);
      } catch {
        return [];
      }
    },
  });

  // Split alerts by service area
  const dayCentreAlerts = allAlerts.filter(a => a.service_area === 'day_centre');
  const residentialAlerts = allAlerts.filter(a => a.service_area === 'childrens_home');
  const supportedLivingAlerts = allAlerts.filter(a => a.service_area === 'supported_living');

  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical' && a.status === 'open');
  const openAlerts = allAlerts.filter(a => a.status === 'open');

  const overdueDeadlines = courtDeadlines.filter(d => 
    new Date(d.deadline_date) < new Date() && d.status === 'upcoming'
  );

  const upcomingDeadlines = courtDeadlines.filter(d => {
    const daysUntil = Math.ceil((new Date(d.deadline_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 7 && d.status === 'upcoming';
  });

  const getSeverityColor = (severity) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[severity] || "bg-gray-100 text-gray-800";
  };

  if (!hasFullAccess) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Access Restricted</h3>
            <p className="text-sm text-gray-600">
              This dashboard requires administrator privileges to access safeguarding data across all services.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-600" />
            Cross-Service Safeguarding Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time safeguarding oversight across Day Centre, Children's Homes & Supported Living
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Admin Access
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-900">{criticalAlerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Alerts</p>
                <p className="text-2xl font-bold text-orange-900">{openAlerts.length}</p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High-Risk Cases</p>
                <p className="text-2xl font-bold text-blue-900">{highRiskCases.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Deadlines</p>
                <p className="text-2xl font-bold text-purple-900">{overdueDeadlines.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Docs</p>
                <p className="text-2xl font-bold text-gray-900">{overdueDocuments.length}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Cross-Service Insights</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="alerts">All Alerts</TabsTrigger>
          {canViewAuditLog && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
        </TabsList>

        <TabsContent value="insights">
          <CrossServiceInsights
            dayCentreAlerts={dayCentreAlerts}
            residentialAlerts={residentialAlerts}
            supportedLivingAlerts={supportedLivingAlerts}
            courtDeadlines={courtDeadlines}
            overdueDocuments={overdueDocuments}
          />
        </TabsContent>

        <TabsContent value="patterns">
          <IncidentPatternAnalysis 
            alerts={allAlerts}
            incidents={incidents}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>All Safeguarding Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allAlerts.slice(0, 20).map((alert) => (
                <div key={alert.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity?.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {alert.service_area?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className={
                        alert.status === 'open' ? 'bg-red-50 text-red-700' :
                        alert.status === 'investigating' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-green-50 text-green-700'
                      }>
                        {alert.status}
                      </Badge>
                      {alert.audit_locked && (
                        <Lock className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-600">
                      {format(new Date(alert.alert_date || alert.created_date), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="font-medium">{alert.alert_type?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-700 mt-1">{alert.description}</p>
                  {alert.reported_by && (
                    <p className="text-xs text-gray-600 mt-2">Reported by: {alert.reported_by}</p>
                  )}
                  {alert.action_taken && (
                    <p className="text-xs text-gray-600">Action: {alert.action_taken}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewAuditLog && (
          <TabsContent value="audit">
            <SafeguardingAuditLog />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}