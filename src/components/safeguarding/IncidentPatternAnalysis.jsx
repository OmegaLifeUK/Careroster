import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Users } from "lucide-react";

export default function IncidentPatternAnalysis({ alerts = [], incidents = [] }) {
  
  // Pattern detection: repeated alert types for same client/case
  const detectPatterns = () => {
    const patterns = {};
    
    alerts.forEach(alert => {
      const key = `${alert.client_id || alert.case_id}-${alert.alert_type}`;
      if (!patterns[key]) {
        patterns[key] = {
          clientId: alert.client_id || alert.case_id,
          alertType: alert.alert_type,
          service: alert.service_area,
          count: 0,
          alerts: []
        };
      }
      patterns[key].count++;
      patterns[key].alerts.push(alert);
    });

    return Object.values(patterns).filter(p => p.count >= 2).sort((a, b) => b.count - a.count);
  };

  // DNA (Did Not Attend) pattern detection
  const dnaPatterns = alerts.filter(a => a.alert_type === 'repeated_dna');

  // Escalating risk patterns
  const escalatingRisks = alerts.filter(a => a.alert_type === 'risk_escalation');

  const repeatedPatterns = detectPatterns();

  return (
    <div className="space-y-6">
      {/* Pattern Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{repeatedPatterns.length}</p>
            <p className="text-sm text-gray-600">Repeated Patterns</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{dnaPatterns.length}</p>
            <p className="text-sm text-gray-600">DNA Patterns</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{escalatingRisks.length}</p>
            <p className="text-sm text-gray-600">Risk Escalations</p>
          </CardContent>
        </Card>
      </div>

      {/* Repeated Incident Patterns */}
      {repeatedPatterns.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Repeated Incident Patterns Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              These patterns indicate recurring issues that may require intervention or policy review
            </p>
            
            {repeatedPatterns.slice(0, 5).map((pattern, idx) => (
              <div key={idx} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge className="bg-orange-100 text-orange-800">
                      {pattern.count} occurrences
                    </Badge>
                    <Badge className="ml-2 bg-gray-100 text-gray-800">
                      {pattern.service?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="font-medium text-orange-900 capitalize">
                  {pattern.alertType?.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Client/Case ID: {pattern.clientId}
                </p>
                <div className="mt-3 text-xs text-gray-600">
                  <p className="font-semibold">Recent occurrences:</p>
                  {pattern.alerts.slice(-3).map((alert, i) => (
                    <p key={i}>• {new Date(alert.alert_date || alert.created_date).toLocaleDateString()}</p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DNA Patterns */}
      {dnaPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Repeated Non-Attendance Concerns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dnaPatterns.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-3 border rounded-lg">
                <p className="font-medium">{alert.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Service: {alert.service_area?.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Escalations */}
      {escalatingRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Escalation Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalatingRisks.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                <Badge className="bg-red-100 text-red-800">{alert.severity}</Badge>
                <p className="font-medium mt-2">{alert.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {alert.escalated_to ? `Escalated to: ${alert.escalated_to}` : 'Pending escalation'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}