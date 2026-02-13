import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

export default function CrossServiceInsights({ 
  dayCentreAlerts = [], 
  residentialAlerts = [], 
  supportedLivingAlerts = [],
  courtDeadlines = [],
  overdueDocuments = []
}) {
  
  const allAlerts = [
    ...dayCentreAlerts.map(a => ({ ...a, service: 'day_centre' })),
    ...residentialAlerts.map(a => ({ ...a, service: 'residential' })),
    ...supportedLivingAlerts.map(a => ({ ...a, service: 'supported_living' }))
  ];

  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical' && a.status === 'open');
  const highRiskCases = allAlerts.filter(a => a.severity === 'high' && a.status === 'open');
  
  const overdueDeadlines = courtDeadlines.filter(d => 
    new Date(d.deadline_date) < new Date() && d.status === 'upcoming'
  );

  const getServiceColor = (service) => {
    const colors = {
      day_centre: 'bg-amber-100 text-amber-800',
      residential: 'bg-blue-100 text-blue-800',
      supported_living: 'bg-purple-100 text-purple-800'
    };
    return colors[service] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Cross-Service Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-900">{criticalAlerts.length}</p>
            <p className="text-sm text-gray-600">Critical Alerts Open</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-orange-900">{highRiskCases.length}</p>
            <p className="text-sm text-gray-600">High-Risk Cases</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-900">{overdueDeadlines.length}</p>
            <p className="text-sm text-gray-600">Overdue Deadlines</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-900">{overdueDocuments.length}</p>
            <p className="text-sm text-gray-600">Overdue Documents</p>
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
            <div className="p-4 border rounded-lg bg-amber-50">
              <h4 className="font-semibold text-amber-900 mb-2">Day Centre</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Alerts:</span>
                  <span className="font-bold">{dayCentreAlerts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <span className="font-bold text-red-600">
                    {dayCentreAlerts.filter(a => a.severity === 'critical').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>High:</span>
                  <span className="font-bold text-orange-600">
                    {dayCentreAlerts.filter(a => a.severity === 'high').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-2">Children's Homes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Alerts:</span>
                  <span className="font-bold">{residentialAlerts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <span className="font-bold text-red-600">
                    {residentialAlerts.filter(a => a.severity === 'critical').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>High:</span>
                  <span className="font-bold text-orange-600">
                    {residentialAlerts.filter(a => a.severity === 'high').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-purple-50">
              <h4 className="font-semibold text-purple-900 mb-2">Supported Living</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Alerts:</span>
                  <span className="font-bold">{supportedLivingAlerts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <span className="font-bold text-red-600">
                    {supportedLivingAlerts.filter(a => a.severity === 'critical').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>High:</span>
                  <span className="font-bold text-orange-600">
                    {supportedLivingAlerts.filter(a => a.severity === 'high').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts Across Services */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Critical Alerts Requiring Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge className={getServiceColor(alert.service)}>
                      {alert.service?.replace(/_/g, ' ')}
                    </Badge>
                    <Badge className="ml-2 bg-red-100 text-red-800">CRITICAL</Badge>
                  </div>
                  <span className="text-xs text-gray-600">
                    {format(new Date(alert.alert_date || alert.created_date), 'MMM d, HH:mm')}
                  </span>
                </div>
                <p className="font-medium text-red-900">{alert.alert_type?.replace(/_/g, ' ')}</p>
                <p className="text-sm text-red-800 mt-1">{alert.description}</p>
                {alert.reported_by && (
                  <p className="text-xs text-gray-600 mt-2">Reported by: {alert.reported_by}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overdue Court Deadlines */}
      {overdueDeadlines.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Overdue Court Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueDeadlines.slice(0, 5).map((deadline) => (
              <div key={deadline.id} className="p-3 border border-purple-200 rounded-lg bg-purple-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-purple-900">{deadline.deadline_type?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-purple-800 mt-1">{deadline.description}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {Math.ceil((new Date() - new Date(deadline.deadline_date)) / (1000 * 60 * 60 * 24))} days overdue
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Due: {format(new Date(deadline.deadline_date), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}