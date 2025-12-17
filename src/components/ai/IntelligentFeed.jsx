import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  Shield,
  Pill,
  Users,
  TrendingUp,
  Bell
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PRIORITY_COLORS = {
  critical: "bg-red-100 border-red-300 text-red-900",
  high: "bg-orange-100 border-orange-300 text-orange-900",
  medium: "bg-yellow-100 border-yellow-300 text-yellow-900",
  low: "bg-blue-100 border-blue-300 text-blue-900",
  info: "bg-gray-100 border-gray-300 text-gray-900"
};

const PRIORITY_ICONS = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Clock,
  low: Bell,
  info: TrendingUp
};

export default function IntelligentFeed({ limit = 10 }) {
  const navigate = useNavigate();

  const { data: feedItems = [], isLoading } = useQuery({
    queryKey: ['intelligent-feed'],
    queryFn: async () => {
      const items = [];
      const today = new Date();

      // Fetch all necessary data
      const [carePlans, dols, dnacpr, tasks, incidents, training, shifts, visits, clients] = await Promise.all([
        base44.entities.CarePlan.list(),
        base44.entities.DoLS.list(),
        base44.entities.DNACPR.list(),
        base44.entities.CareTask.list(),
        base44.entities.Incident.list(),
        base44.entities.TrainingAssignment.list(),
        base44.entities.Shift.list(),
        base44.entities.Visit.list(),
        base44.entities.Client.list()
      ]);

      // Critical: DoLS expiring within 30 days
      dols.forEach(d => {
        if (d.authorisation_end_date && d.dols_status.includes('granted')) {
          const expiryDate = parseISO(d.authorisation_end_date);
          const daysUntil = differenceInDays(expiryDate, today);
          if (daysUntil <= 30 && daysUntil >= 0) {
            const client = clients.find(c => c.id === d.client_id);
            items.push({
              id: `dols-${d.id}`,
              priority: daysUntil <= 7 ? 'critical' : 'high',
              type: 'dols_expiry',
              title: `DoLS Authorisation Expiring Soon`,
              description: `DoLS for ${client?.full_name || 'client'} expires in ${daysUntil} days (${format(expiryDate, 'MMM d, yyyy')})`,
              daysUntil,
              icon: Shield,
              clientId: d.client_id,
              action: { label: 'Review DoLS', clientId: d.client_id, tab: 'dols' },
              timestamp: expiryDate
            });
          }
        }
      });

      // Critical: DNACPR review dates
      dnacpr.forEach(d => {
        if (d.review_date && d.status === 'active') {
          const reviewDate = parseISO(d.review_date);
          const daysUntil = differenceInDays(reviewDate, today);
          if (daysUntil <= 14 && daysUntil >= -7) {
            const client = clients.find(c => c.id === d.client_id);
            items.push({
              id: `dnacpr-${d.id}`,
              priority: daysUntil <= 0 ? 'critical' : 'high',
              type: 'dnacpr_review',
              title: daysUntil <= 0 ? 'DNACPR Review Overdue' : 'DNACPR Review Due Soon',
              description: `${client?.full_name || 'Client'} DNACPR review ${daysUntil <= 0 ? 'overdue by ' + Math.abs(daysUntil) : 'due in ' + daysUntil} days`,
              daysUntil,
              icon: AlertTriangle,
              clientId: d.client_id,
              action: { label: 'Review DNACPR', clientId: d.client_id, tab: 'dnacpr' },
              timestamp: reviewDate
            });
          }
        }
      });

      // High: Care Plan reviews overdue
      carePlans.forEach(cp => {
        if (cp.review_date && cp.status === 'active') {
          const reviewDate = parseISO(cp.review_date);
          const daysOverdue = differenceInDays(today, reviewDate);
          if (daysOverdue > 0) {
            const client = clients.find(c => c.id === cp.client_id);
            items.push({
              id: `careplan-${cp.id}`,
              priority: daysOverdue > 30 ? 'high' : 'medium',
              type: 'careplan_review',
              title: 'Care Plan Review Overdue',
              description: `${client?.full_name || 'Client'} care plan review overdue by ${daysOverdue} days`,
              daysOverdue,
              icon: FileText,
              clientId: cp.client_id,
              action: { label: 'Review Plan', clientId: cp.client_id, tab: 'care_plan' },
              timestamp: reviewDate
            });
          }
        }
      });

      // High: Unassigned shifts in next 48 hours
      shifts.forEach(s => {
        if (!s.carer_id && s.status === 'published' && s.date) {
          const shiftDate = parseISO(s.date);
          const hoursUntil = differenceInDays(shiftDate, today) * 24;
          if (hoursUntil <= 48 && hoursUntil >= 0) {
            const client = clients.find(c => c.id === s.client_id);
            items.push({
              id: `shift-${s.id}`,
              priority: hoursUntil <= 24 ? 'high' : 'medium',
              type: 'unassigned_shift',
              title: 'Unassigned Shift',
              description: `${client?.full_name || 'Client'} shift in ${Math.floor(hoursUntil)} hours needs assignment`,
              hoursUntil,
              icon: Calendar,
              shiftId: s.id,
              action: { label: 'Assign Staff', url: createPageUrl('Schedule'), shiftId: s.id },
              timestamp: shiftDate
            });
          }
        }
      });

      // Medium: Training expiring within 60 days
      training.forEach(t => {
        if (t.expiry_date && t.status === 'completed') {
          const expiryDate = parseISO(t.expiry_date);
          const daysUntil = differenceInDays(expiryDate, today);
          if (daysUntil <= 60 && daysUntil >= 0) {
            items.push({
              id: `training-${t.id}`,
              priority: daysUntil <= 14 ? 'high' : 'medium',
              type: 'training_expiry',
              title: 'Training Certificate Expiring',
              description: `Training expires in ${daysUntil} days`,
              daysUntil,
              icon: Users,
              action: { label: 'View Training', url: createPageUrl('StaffTraining') },
              timestamp: expiryDate
            });
          }
        }
      });

      // High: Recent critical incidents
      incidents.forEach(i => {
        if (i.severity === 'critical' || i.severity === 'major') {
          const incidentDate = parseISO(i.created_date);
          const daysAgo = differenceInDays(today, incidentDate);
          if (daysAgo <= 7) {
            items.push({
              id: `incident-${i.id}`,
              priority: i.severity === 'critical' ? 'critical' : 'high',
              type: 'incident',
              title: `${i.severity === 'critical' ? 'Critical' : 'Major'} Incident Reported`,
              description: i.incident_type || 'Requires review and action',
              daysAgo,
              icon: XCircle,
              action: { label: 'View Incident', url: createPageUrl('IncidentManagement') },
              timestamp: incidentDate
            });
          }
        }
      });

      // Medium: Incomplete tasks
      const overdueTasks = tasks.filter(t => {
        if (t.status !== 'pending' || !t.due_date) return false;
        const dueDate = parseISO(t.due_date);
        return differenceInDays(today, dueDate) > 0;
      });

      if (overdueTasks.length > 0) {
        items.push({
          id: 'tasks-overdue',
          priority: 'medium',
          type: 'tasks_overdue',
          title: `${overdueTasks.length} Overdue Tasks`,
          description: `Tasks requiring immediate attention`,
          count: overdueTasks.length,
          icon: CheckCircle,
          action: { label: 'View Tasks', url: createPageUrl('StaffTasks') },
          timestamp: today
        });
      }

      // Sort by priority and timestamp
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      items.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      return items.slice(0, limit);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Intelligent Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading insights...</p>
        </CardContent>
      </Card>
    );
  }

  if (feedItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Intelligent Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="text-sm text-gray-600">All caught up! No urgent items.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Intelligent Feed
          </CardTitle>
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            {feedItems.length} items
          </Badge>
        </div>
        <p className="text-sm text-gray-600">Proactive alerts and insights</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {feedItems.map((item) => {
            const Icon = item.icon || PRIORITY_ICONS[item.priority];
            
            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-l-4 ${PRIORITY_COLORS[item.priority]}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90 mb-2">{item.description}</p>
                    {item.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (item.action.clientId) {
                            // Navigate to client detail page with specific tab
                            navigate(createPageUrl('Clients'), { 
                              state: { 
                                selectedClientId: item.action.clientId, 
                                activeTab: item.action.tab,
                                fromIntelligentFeed: true,
                                timestamp: Date.now()
                              },
                              replace: false
                            });
                          } else {
                            navigate(item.action.url);
                          }
                        }}
                        className="text-xs h-7"
                      >
                        {item.action.label}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs opacity-60 whitespace-nowrap">
                    {format(item.timestamp, 'MMM d')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}