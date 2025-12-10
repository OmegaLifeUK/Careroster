import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  X,
  Bell,
  Clock,
  Pill,
  Calendar,
  Shield
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

const ALERT_TYPE_ICONS = {
  medication: Pill,
  behavioral: AlertCircle,
  medical: AlertCircle,
  fall_risk: AlertTriangle,
  dietary: Info,
  mobility: Info,
  safeguarding: Shield,
  other: Bell,
};

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-900",
    badge: "bg-red-600 text-white",
    icon: "text-red-600"
  },
  high: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
    badge: "bg-orange-600 text-white",
    icon: "text-orange-600"
  },
  medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-900",
    badge: "bg-yellow-600 text-white",
    icon: "text-yellow-600"
  },
  low: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-900",
    badge: "bg-blue-600 text-white",
    icon: "text-blue-600"
  }
};

export default function AlertsWidget({ alerts = [], compact = false, showAll = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async ({ alertId, userId, userName }) => {
      const alert = Array.isArray(alerts) ? alerts.find(a => a && a.id === alertId) : null;
      if (!alert) return;

      const acknowledgments = alert.acknowledgments || [];
      const alreadyAcknowledged = acknowledgments.some(ack => 
        ack && ack.staff_id === userId
      );

      if (!alreadyAcknowledged) {
        return await base44.entities.ClientAlert.update(alertId, {
          acknowledgments: [
            ...acknowledgments,
            {
              staff_id: userId,
              staff_name: userName,
              acknowledged_at: new Date().toISOString()
            }
          ]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
      toast.success("Alert Acknowledged", "You have acknowledged this alert");
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, userId, notes }) => {
      return await base44.entities.ClientAlert.update(alertId, {
        status: 'resolved',
        resolved_by_staff_id: userId,
        resolved_date: new Date().toISOString(),
        resolution_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
      toast.success("Alert Resolved", "Alert has been marked as resolved");
    },
  });

  const handleAcknowledge = async (alertId) => {
    try {
      const user = await base44.auth.me();
      await acknowledgeAlertMutation.mutateAsync({
        alertId,
        userId: user.id || user.email,
        userName: user.full_name
      });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const handleResolve = async (alertId) => {
    const notes = prompt("Add resolution notes (optional):");
    try {
      const user = await base44.auth.me();
      await resolveAlertMutation.mutateAsync({
        alertId,
        userId: user.id || user.email,
        notes: notes || "Resolved by manager"
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const activeAlerts = Array.isArray(alerts) 
    ? alerts.filter(a => a && a.status === 'active').sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a?.severity] || 3) - (severityOrder[b?.severity] || 3);
      })
    : [];

  const displayAlerts = showAll ? activeAlerts : activeAlerts.slice(0, compact ? 3 : 5);

  if (activeAlerts.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="text-green-900 font-semibold">All Clear!</p>
            <p className="text-sm text-green-700 mt-1">No active system alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          System Alerts
          <Badge className="bg-red-600 text-white ml-auto">
            {activeAlerts.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-1.5">
          {displayAlerts.map((alert) => {
            if (!alert) return null;
            
            const Icon = ALERT_TYPE_ICONS[alert.alert_type] || Bell;
            const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium;
            const requiresAck = alert.requires_acknowledgment;
            const hasAcknowledged = Array.isArray(alert.acknowledgments) && alert.acknowledgments.length > 0;

            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-2 ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${styles.icon} mt-0.5 flex-shrink-0`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <h4 className={`font-semibold text-sm ${styles.text}`}>
                        {alert.title}
                      </h4>
                      <Badge className={`${styles.badge} text-xs px-1.5 py-0 h-5`}>
                        {alert.severity}
                      </Badge>
                    </div>
                    
                    <p className={`text-xs ${styles.text} mb-1.5 leading-tight`}>
                      {alert.description}
                    </p>

                    {alert.action_required && (
                      <div className="mt-1 px-2 py-1 bg-white/50 rounded text-xs font-medium">
                        ⚡ {alert.action_required}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      {format(parseISO(alert.created_date), "MMM d, HH:mm")}
                    </div>

                    {requiresAck && hasAcknowledged && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Acknowledged
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-1.5">
                      {requiresAck && !hasAcknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs h-6 px-2"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(alert.id)}
                        className="text-xs h-6 px-2"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!showAll && activeAlerts.length > displayAlerts.length && (
            <div className="text-center pt-1">
              <p className="text-xs text-gray-600">
                + {activeAlerts.length - displayAlerts.length} more alerts
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}