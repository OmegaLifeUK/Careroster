import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Bell,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

export default function AlertBanner({ clientId, section = "dashboard", compact = false }) {
  const [expanded, setExpanded] = React.useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts-banner', clientId, section],
    queryFn: async () => {
      const allAlerts = await base44.entities.ClientAlert.filter({ 
        client_id: clientId,
        status: 'active'
      }, '-severity,-created_date');
      
      // Filter by section
      return allAlerts.filter(alert => 
        alert.display_on_sections?.includes('all') || 
        alert.display_on_sections?.includes(section)
      );
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');
  const otherAlerts = alerts.filter(a => !['critical', 'high'].includes(a.severity));

  const displayAlerts = compact && !expanded 
    ? [...criticalAlerts, ...highAlerts].slice(0, 2)
    : alerts;

  return (
    <div className="mb-4 space-y-2">
      {displayAlerts.map(alert => (
        <Card key={alert.id} className={`border-l-4 ${
          alert.severity === 'critical' ? 'border-red-600 bg-red-50' :
          alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
          alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
          'border-blue-500 bg-blue-50'
        } shadow-md`}>
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-200' :
                alert.severity === 'high' ? 'bg-orange-200' :
                alert.severity === 'medium' ? 'bg-yellow-200' :
                'bg-blue-200'
              }`}>
                {alert.severity === 'critical' || alert.severity === 'high' ? (
                  <AlertTriangle className={`w-5 h-5 ${
                    alert.severity === 'critical' ? 'text-red-700' : 'text-orange-700'
                  }`} />
                ) : (
                  <Bell className={`w-5 h-5 ${
                    alert.severity === 'medium' ? 'text-yellow-700' : 'text-blue-700'
                  }`} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  <Badge className={SEVERITY_COLORS[alert.severity]}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {alert.alert_type.replace('_', ' ')}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                
                {alert.action_required && (
                  <div className={`p-2 rounded text-xs ${
                    alert.severity === 'critical' ? 'bg-red-100 border border-red-300 text-red-900' :
                    alert.severity === 'high' ? 'bg-orange-100 border border-orange-300 text-orange-900' :
                    'bg-blue-100 border border-blue-300 text-blue-900'
                  }`}>
                    <strong>Action Required:</strong> {alert.action_required}
                  </div>
                )}

                {alert.requires_acknowledgment && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <Eye className="w-3 h-3" />
                    <span>Requires acknowledgment before proceeding</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {compact && alerts.length > 2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show {alerts.length - 2} More Alert{alerts.length - 2 !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}

      {alerts.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {criticalAlerts.length > 0 && (
            <span className="text-red-600 font-medium">
              {criticalAlerts.length} Critical
            </span>
          )}
          {criticalAlerts.length > 0 && highAlerts.length > 0 && <span className="mx-2">•</span>}
          {highAlerts.length > 0 && (
            <span className="text-orange-600 font-medium">
              {highAlerts.length} High
            </span>
          )}
          {(criticalAlerts.length > 0 || highAlerts.length > 0) && otherAlerts.length > 0 && <span className="mx-2">•</span>}
          {otherAlerts.length > 0 && (
            <span>{otherAlerts.length} Other</span>
          )}
        </div>
      )}
    </div>
  );
}