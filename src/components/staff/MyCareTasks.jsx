import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, Clock, Heart } from "lucide-react";
import { format } from "date-fns";

export default function MyCareTasks({ user }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ['my-shifts-tasks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const allShifts = await base44.entities.Shift.list();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log('[MyCareTasks] All shifts:', allShifts?.length);
        console.log('[MyCareTasks] User:', user.email, user.id);

        return Array.isArray(allShifts) 
          ? allShifts.filter(s => {
              const shiftDate = new Date(s.shift_date || s.date);
              return (s.carer_id === user.email || s.carer_id === user.id) && 
                     shiftDate >= today && 
                     shiftDate < tomorrow &&
                     s.status !== 'cancelled';
            })
          : [];
      } catch (error) {
        console.log("Shifts not available:", error);
        return [];
      }
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['my-visits-tasks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const allVisits = await base44.entities.Visit.list();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log('[MyCareTasks] All visits:', allVisits?.length);

        return Array.isArray(allVisits) 
          ? allVisits.filter(v => {
              const visitDate = new Date(v.scheduled_start);
              return (v.assigned_staff_id === user.email || v.assigned_staff_id === user.id) && 
                     visitDate >= today && 
                     visitDate < tomorrow &&
                     v.status !== 'cancelled';
            })
          : [];
      } catch (error) {
        console.log("Visits not available:", error);
        return [];
      }
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-tasks'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: domClients = [] } = useQuery({
    queryKey: ['dom-clients-for-tasks'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DomCareClient.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  });

  const { data: careTasks = [] } = useQuery({
    queryKey: ['care-tasks-for-staff', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const clientIds = [
          ...shifts.map(s => s.client_id).filter(Boolean),
          ...visits.map(v => v.client_id).filter(Boolean)
        ];

        if (clientIds.length === 0) return [];

        const allTasks = await base44.entities.CareTask.list();
        return Array.isArray(allTasks) 
          ? allTasks.filter(t => 
              clientIds.includes(t.client_id) && 
              t.is_active &&
              t.frequency !== 'as_needed'
            )
          : [];
      } catch (error) {
        console.log("Care tasks not available");
        return [];
      }
    },
    enabled: !!user?.email && (shifts.length > 0 || visits.length > 0),
    refetchInterval: 30000,
  });

  const { data: taskCompletions = [] } = useQuery({
    queryKey: ['task-completions-today', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const allCompletions = await base44.entities.TaskCompletion.list();
        const today = new Date().toISOString().split('T')[0];
        
        return Array.isArray(allCompletions) 
          ? allCompletions.filter(c => 
              c.completed_by === user.email && 
              c.completion_date?.startsWith(today)
            )
          : [];
      } catch (error) {
        console.log("Task completions not available");
        return [];
      }
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId) || 
                   domClients.find(c => c.id === clientId);
    return client?.full_name || 'Unknown Client';
  };

  const isTaskCompleted = (taskId) => {
    return taskCompletions.some(c => c.care_task_id === taskId);
  };

  const groupedTasks = careTasks.reduce((acc, task) => {
    const clientId = task.client_id;
    if (!acc[clientId]) {
      acc[clientId] = [];
    }
    acc[clientId].push(task);
    return acc;
  }, {});

  const totalTasks = careTasks.length;
  const completedTasks = careTasks.filter(t => isTaskCompleted(t.id)).length;

  if (shifts.length === 0 && visits.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No shifts or visits scheduled for today</p>
        </CardContent>
      </Card>
    );
  }

  if (careTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No care tasks assigned for today's clients</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Care Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedTasks}/{totalTasks}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalTasks - completedTasks} remaining
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
              {completedTasks === totalTasks ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Heart className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedTasks).map(([clientId, tasks]) => (
        <Card key={clientId}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {getClientName(clientId).charAt(0)}
              </div>
              {getClientName(clientId)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task) => {
                const completed = isTaskCompleted(task.id);
                
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border transition-all ${
                      completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${completed ? 'text-green-900' : 'text-gray-900'}`}>
                          {task.task_name}
                        </p>
                        {task.task_description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {task.task_description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {task.frequency}
                          </Badge>
                          {task.time_of_day && (
                            <Badge variant="outline" className="text-xs">
                              {task.time_of_day}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge className={completed ? 'bg-green-600' : 'bg-gray-400'}>
                        {completed ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {completedTasks === totalTasks && totalTasks > 0 && (
        <Card className="bg-green-50 border-2 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">All care tasks completed!</p>
              <p className="text-sm text-green-700">Great work today</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}