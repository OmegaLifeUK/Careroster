import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  UserCircle, 
  Calendar, 
  Clock, 
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isFuture } from "date-fns";

import StatsCard from "../components/dashboard/StatsCard";
import TodayShifts from "../components/dashboard/TodayShifts";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const activeCarers = carers.filter(c => c.status === 'active').length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  
  const todayShifts = shifts.filter(shift => {
    try {
      return isToday(parseISO(shift.date));
    } catch {
      return false;
    }
  });

  const upcomingShifts = shifts.filter(shift => {
    try {
      return isFuture(parseISO(shift.date));
    } catch {
      return false;
    }
  }).length;

  const unfilledShifts = shifts.filter(s => s.status === 'unfilled').length;
  const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;

  const isLoading = carersLoading || clientsLoading || shiftsLoading || leaveLoading;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-500">Overview of your care management system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Active Carers"
            value={activeCarers}
            icon={Users}
            bgColor="from-blue-500 to-blue-600"
            isLoading={isLoading}
          />
          <StatsCard
            title="Active Clients"
            value={activeClients}
            icon={UserCircle}
            bgColor="from-green-500 to-green-600"
            isLoading={isLoading}
          />
          <StatsCard
            title="Today's Shifts"
            value={todayShifts.length}
            icon={Calendar}
            bgColor="from-purple-500 to-purple-600"
            isLoading={isLoading}
          />
          <StatsCard
            title="Unfilled Shifts"
            value={unfilledShifts}
            icon={AlertCircle}
            bgColor="from-orange-500 to-orange-600"
            isLoading={isLoading}
            alert={unfilledShifts > 0}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TodayShifts shifts={todayShifts} carers={carers} clients={clients} isLoading={isLoading} />
          </div>
          <div>
            <QuickActions 
              pendingLeave={pendingLeave}
              unfilledShifts={unfilledShifts}
            />
          </div>
        </div>

        <RecentActivity 
          shifts={shifts.slice(0, 10)} 
          leaveRequests={leaveRequests.slice(0, 5)}
          carers={carers}
          clients={clients}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}