import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Home,
  Building,
  Activity
} from "lucide-react";
import { format } from "date-fns";

export default function SafeguardingDashboard() {
  const { data: alerts = [] } = useQuery({
    queryKey: ['all-safeguarding-alerts'],
    queryFn: () => base44.entities.SafeguardingAlert.list('-alert_date', 50),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['high-risk-cases'],
    queryFn: async () => {
      const all = await base44.entities.Case.list();
      return all.filter(c => c.risk_level === 'high' || c.risk_level === 'critical');
    },
  });

  const { data: courtDeadlines = [] } = useQuery({
    queryKey: ['overdue-deadlines'],
    queryFn: async () => {
      const all = await base44.entities.CourtDeadline.list();
      return all.filter(d => d.status === 'overdue');
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['outstanding-documents'],
    queryFn: async () => {
      const all = await base44.entities.CaseDocument.list();
      return all.filter(d => d.status === 'outstanding' && d.is_mandatory);
    },
  });

  // Cross-service statistics
  const stats = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    openAlerts: alerts.filter(a => a.status === 'open' || a.status === 'investigating').length,
    highRiskCases: cases.length,
    overdueDeadlines: courtDeadlines.length,
    outstandingDocs: documents.length,
    
    // By service
    dayCentre: alerts.filter(a => a.service_area === 'day_centre').length,
    childrensHome: alerts.filter(a => a.service_area === 'childrens_home').length,
    supportedLiving: alerts.filter(a => a.service_area === 'supported_living').length,
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-600" />
            Cross-Service Safeguarding Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Unified oversight across all services: Day Centre, Children's Homes, Supported Living
          </p>
        </div>

        {/* Critical Alerts Banner */}
        {stats.criticalAlerts > 0 && (
          <Card className="bg-red-600 text-white border-red-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <p className="text-xl font-bold">{stats.criticalAlerts} Critical Alert{stats.criticalAlerts > 1 ? 's' : ''} Require Immediate Action</p>
                  <p className="text-red-100 text-sm mt-1">Immediate management review and escalation required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              <p className="text-xs text-gray-600">Total Alerts</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-orange-600 mb-2" />
              <p className="text-2xl font-bold text-orange-600">{stats.openAlerts}</p>
              <p className="text-xs text-gray-600">Open Alerts</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">{stats.highRiskCases}</p>
              <p className="text-xs text-gray-600">High Risk Cases</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-600">{stats.overdueDeadlines}</p>
              <p className="text-xs text-gray-600">Overdue Deadlines</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{stats.outstandingDocs}</p>
              <p className="text-xs text-gray-600">Outstanding Docs</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
              <p className="text-xs text-gray-600">Critical</p>
            </CardContent>
          </Card>
        </div>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Service Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <Activity className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-blue-600">{stats.dayCentre}</p>
                <p className="text-sm text-gray-600">Day Centre</p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50">
                <Home className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-600">{stats.childrensHome}</p>
                <p className="text-sm text-gray-600">Children's Homes</p>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50">
                <Building className="w-6 h-6 text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-purple-600">{stats.supportedLiving}</p>
                <p className="text-sm text-gray-600">Supported Living</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Recent Safeguarding Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 border-l-4 rounded-lg ${
                    alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                    alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.service_area?.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900">{alert.alert_type?.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-700 mt-1">{alert.description}</p>
                      {alert.action_taken && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Action Taken:</span> {alert.action_taken}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mt-3">
                    <span>Raised: {format(new Date(alert.alert_date), 'MMM d, yyyy HH:mm')}</span>
                    {alert.reported_by && (
                      <>
                        <span>•</span>
                        <span>By: {alert.reported_by}</span>
                      </>
                    )}
                    {alert.escalated_to && (
                      <>
                        <span>•</span>
                        <span>Escalated to: {alert.escalated_to}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No safeguarding alerts recorded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}