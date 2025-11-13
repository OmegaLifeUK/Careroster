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
    <div className="mb-6 space-y-2">
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
            } animate-pulse-glow`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 ${
                alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
              }`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <AlertDescription className="font-semibold text-gray-900">
                    {alert.title}
                  </AlertDescription>
                  <Badge className={
                    alert.severity === 'critical' 
                      ? 'bg-red-600' 
                      : 'bg-orange-600'
                  }>
                    {alert.severity}
                  </Badge>
                </div>
                <AlertDescription className="text-sm text-gray-700">
                  {alert.description}
                </AlertDescription>
                {alert.action_required && (
                  <div className="mt-2 text-xs font-medium text-gray-900 bg-white/60 p-2 rounded">
                    ⚡ {alert.action_required}
                  </div>
                )}
              </div>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDismiss(alert.id)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Alert>
        );
      })}
      
      {criticalAlerts.length > 3 && (
        <div className="text-center">
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              View All {criticalAlerts.length} Alerts
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}