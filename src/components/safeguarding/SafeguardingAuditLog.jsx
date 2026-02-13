import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock } from "lucide-react";
import { format } from "date-fns";

export default function SafeguardingAuditLog() {
  
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['safeguarding-audit-logs'],
    queryFn: async () => {
      // Fetch all safeguarding-related actions
      const alerts = await base44.entities.SafeguardingAlert.list('-created_date', 50);
      const riskAssessments = await base44.entities.CaseRiskAssessment.list('-created_date', 50);
      
      // Combine and format as audit entries
      const alertLogs = alerts.map(a => ({
        id: a.id,
        timestamp: a.alert_date || a.created_date,
        action: 'ALERT_CREATED',
        user: a.reported_by || a.created_by,
        details: `${a.alert_type?.replace(/_/g, ' ')} - ${a.severity}`,
        description: a.description,
        service: a.service_area,
        locked: a.audit_locked,
        entityType: 'SafeguardingAlert'
      }));

      const riskLogs = riskAssessments.map(r => ({
        id: r.id,
        timestamp: r.assessment_date || r.created_date,
        action: 'RISK_ASSESSMENT',
        user: r.assessed_by || r.created_by,
        details: `Risk Level: ${r.risk_level} - ${r.risk_category?.replace(/_/g, ' ')}`,
        description: r.risk_description,
        service: 'day_centre',
        locked: r.audit_locked,
        entityType: 'RiskAssessment'
      }));

      return [...alertLogs, ...riskLogs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
  });

  const getActionColor = (action) => {
    const colors = {
      'ALERT_CREATED': 'bg-red-100 text-red-800',
      'RISK_ASSESSMENT': 'bg-orange-100 text-orange-800',
      'CASE_CLOSED': 'bg-gray-100 text-gray-800',
      'ESCALATION': 'bg-purple-100 text-purple-800'
    };
    return colors[action] || 'bg-blue-100 text-blue-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Safeguarding Audit Log (Non-Editable)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {auditLogs.map((log) => (
            <div 
              key={`${log.entityType}-${log.id}`}
              className="p-4 border rounded-lg bg-gray-50 relative"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={getActionColor(log.action)}>
                    {log.action.replace(/_/g, ' ')}
                  </Badge>
                  {log.locked && (
                    <Lock className="w-4 h-4 text-gray-500" title="Audit Locked" />
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
              
              <p className="font-medium text-sm">{log.details}</p>
              
              {log.description && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                  {log.description}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                <span>User: {log.user}</span>
                <span>Service: {log.service?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}

          {auditLogs.length === 0 && (
            <p className="text-center text-gray-500 py-8">No audit logs available</p>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Audit Integrity Notice
          </p>
          <p className="text-xs mt-1">
            All safeguarding actions are automatically logged and cannot be edited or deleted. 
            Logs marked with a lock icon are permanently sealed for regulatory compliance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}