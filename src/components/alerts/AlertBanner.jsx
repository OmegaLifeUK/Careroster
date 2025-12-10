import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Bell, Pill, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AlertBanner({ alerts = [], onDismiss }) {
  const criticalAlerts = Array.isArray(alerts) 
    ? alerts.filter(a => a && a.status === 'active' && (a.severity === 'critical' || a.severity === 'high'))
    : [];

  if (criticalAlerts.length === 0) return null;

  const getAlertIcon = (type) => {
    switch (type) {
      case 'medication': return Pill;
      case 'other': return Calendar;
      default: return Bell;
    }
  };

  return (
    <div className="mb-4 space-y-1.5">
      {criticalAlerts.slice(0, 3).map((alert) => {
        if (!alert) return null;
        
        const Icon = getAlertIcon(alert.alert_type);
        
        return (
          <Alert 
            key={alert.id} 
            className={`${
              alert.severity === 'critical' 
                ? 'bg-red-50 border-red-300' 
                : 'bg-orange-50 border-orange-300'
            } py-2 px-3`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
              }`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <AlertDescription className="font-semibold text-sm text-gray-900">
                    {alert.title}
                  </AlertDescription>
                  <Badge className={`text-xs px-1.5 py-0 h-5 ${
                    alert.severity === 'critical' 
                      ? 'bg-red-600' 
                      : 'bg-orange-600'
                  }`}>
                    {alert.severity}
                  </Badge>
                </div>
                <AlertDescription className="text-xs text-gray-700 leading-tight">
                  {alert.description}
                </AlertDescription>
                {alert.action_required && (
                  <div className="mt-1.5 text-xs font-medium text-gray-900 bg-white/60 px-2 py-1 rounded">
                    ⚡ {alert.action_required}
                  </div>
                )}
              </div>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDismiss(alert.id)}
                  className="flex-shrink-0 h-7 w-7"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Alert>
        );
      })}
      
      {criticalAlerts.length > 3 && (
        <div className="text-center pt-1">
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              View All {criticalAlerts.length} Alerts
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}