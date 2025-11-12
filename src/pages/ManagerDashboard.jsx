import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCircle,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  Bell,
  FileText,
  GraduationCap,
  Activity,
  Home,
  Download,
  Settings,
  BarChart3,
  MessageSquare,
  Shield
} from "lucide-react";
import { format, parseISO, isToday, isPast, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";

const DEFAULT_PREFERENCES = {
  occupancy: true,
  staff: true,
  training: true,
  incidents: true,
  finance: true,
  communication: true,
};

export default function ManagerDashboard() {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [user, setUser] = useState(null);
  const [modulePreferences, setModulePreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        if (userData.dashboard_preferences) {
          setModulePreferences(userData.dashboard_preferences);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => base44.entities.MedicationLog.list('-administration_time'),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list('-assigned_date'),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date'),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts'],
    queryFn: () => base44.entities.ClientAlert.filter({ status: 'active' }),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const occupancyStats = {
    totalBeds: 50,
    occupied: clients.filter(c => c.status === 'active').length,
    plannedAdmissions: 3,
  };
  occupancyStats.occupancyRate = ((occupancyStats.occupied / occupancyStats.totalBeds) * 100).toFixed(1);

  const todayMeds = medications.filter(m => {
    try {
      return isToday(parseISO(m.administration_time));
    } catch {
      return false;
    }
  });
  const overdueMeds = todayMeds.filter(m => m.status === 'missed').length;
  const upcomingMeds = medications.filter(m => {
    try {
      const medTime = parseISO(m.administration_time);
      return medTime > new Date() && medTime < addDays(new Date(), 1);
    } catch {
      return false;
    }
  }).length;

  const todayShifts = shifts.filter(shift => {
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });
  const unfilledShifts = shifts.filter(s => s.status === 'unfilled').length;
  const shiftFillRate = todayShifts.length > 0
    ? (((todayShifts.length - todayShifts.filter(s => s.status === 'unfilled').length) / todayShifts.length) * 100).toFixed(1)
    : 100;

  const expiringCerts = trainingAssignments.filter(a => {
    if (!a.expiry_date) return false;
    try {
      const expiry = parseISO(a.expiry_date);
      return expiry < addDays(new Date(), 30) && expiry > new Date();
    } catch {
      return false;
    }
  }).length;

  const overdueTraining = trainingAssignments.filter(a => {
    if (!a.due_date) return false;
    try {
      return isPast(parseISO(a.due_date)) && a.status !== 'completed';
    } catch {
      return false;
    }
  }).length;

  const trainingCompletionRate = trainingAssignments.length > 0
    ? ((trainingAssignments.filter(a => a.status === 'completed').length / trainingAssignments.length) * 100).toFixed(1)
    : 0;

  const recentIncidents = incidents.filter(inc => {
    try {
      return parseISO(inc.incident_date) > subMonths(new Date(), 1);
    } catch {
      return false;
    }
  });
  const unresolvedIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length;

  const incidentTrends = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  }).map(month => {
    const monthIncidents = incidents.filter(inc => {
      try {
        const incDate = parseISO(inc.incident_date);
        return incDate >= startOfMonth(month) && incDate <= endOfMonth(month);
      } catch {
        return false;
      }
    });
    return {
      month: format(month, 'MMM'),
      count: monthIncidents.length,
      critical: monthIncidents.filter(i => i.severity === 'critical').length
    };
  });

  const financeStats = {
    overdue: 15,
    pending: 25,
    paid: 60,
    totalRevenue: 125000,
  };

  const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;
  const newFeedback = feedback.filter(f => f.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  const handleSavePreferences = async (preferences) => {
    try {
      if (user && user.id) {
        await base44.auth.updateMe({
          dashboard_preferences: preferences
        });
        setModulePreferences(preferences);
        setShowCustomizer(false);
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  const exportDashboard = () => {
    const report = `Manager's Dashboard Report - ${format(new Date(), 'yyyy-MM-dd HH:mm')}

OCCUPANCY & COMPLIANCE
- Beds Occupied: ${occupancyStats.occupied}/${occupancyStats.totalBeds} (${occupancyStats.occupancyRate}%)

STAFF MANAGEMENT
- Today's Shifts: ${todayShifts.length}
- Unfilled Shifts: ${unfilledShifts}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Dashboard</h1>
            <p className="text-gray-500">Operational overview</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportDashboard}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCustomizer(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active Clients</p>
              <p className="text-2xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active Carers</p>
              <p className="text-2xl font-bold">{carers.filter(c => c.status === 'active').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Today's Shifts</p>
              <p className="text-2xl font-bold">{todayShifts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Unfilled Shifts</p>
              <p className="text-2xl font-bold text-orange-600">{unfilledShifts}</p>
            </CardContent>
          </Card>
        </div>

        {showCustomizer && (
          <DashboardCustomizer
            currentPreferences={modulePreferences}
            onSave={handleSavePreferences}
            onClose={() => setShowCustomizer(false)}
          />
        )}
      </div>
    </div>
  );
}