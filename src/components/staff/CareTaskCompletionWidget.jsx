import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function CareTaskCompletionWidget({ clientId, shiftId, user, onTasksUpdate }) {
  const [expandedTasks, setExpandedTasks] = useState({});
  const [taskNotes, setTaskNotes] = useState({});
  const [taskStatuses, setTaskStatuses] = useState({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: careTasks = [] } = useQuery({
    queryKey: ['care-tasks-widget', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const allTasks = await base44.entities.CareTask.list();
        return Array.isArray(allTasks) 
          ? allTasks.filter(t => t.client_id === clientId && t.is_active)
          : [];
      } catch (error) {
        console.log("Care tasks not available");
        return [];
      }
    },
    enabled: !!clientId
  });

  const { data: existingCompletions = [] } = useQuery({
    queryKey: ['task-completions-widget', shiftId, clientId],
    queryFn: async () => {
      if (!shiftId) return [];
      try {
        const allCompletions = await base44.entities.TaskCompletion.list();
        return Array.isArray(allCompletions) 
          ? allCompletions.filter(c => c.shift_id === shiftId)
          : [];
      } catch (error) {
        console.log("Task completions not available");
        return [];
      }
    },
    enabled: !!shiftId
  });

  const updateCompletionMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }) => {
      const existingCompletion = existingCompletions.find(c => c.care_task_id === taskId);
      
      const completionData = {
        care_task_id: taskId,
        client_id: clientId,
        shift_id: shiftId,
        completed_by: user?.email || user?.id,
        completion_date: new Date().toISOString(),
        completion_status: status,
        notes: notes || '',
      };

      if (existingCompletion) {
        return base44.entities.TaskCompletion.update(existingCompletion.id, completionData);
      } else {
        return base44.entities.TaskCompletion.create(completionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['task-completions-widget']);
      queryClient.invalidateQueries(['task-completions-today']);
      if (onTasksUpdate) {
        onTasksUpdate();
      }
    },
  });

  const handleStatusChange = async (taskId, status) => {
    setTaskStatuses(prev => ({ ...prev, [taskId]: status }));
    
    const notes = taskNotes[taskId] || '';
    
    await updateCompletionMutation.mutateAsync({ taskId, status, notes });
    
    toast.success(
      "Task Updated",
      `Task marked as ${status === 'completed' ? 'completed' : status === 'refused' ? 'refused' : 'not completed'}`
    );
  };

  const handleNotesChange = async (taskId, notes) => {
    setTaskNotes(prev => ({ ...prev, [taskId]: notes }));
    
    const status = taskStatuses[taskId] || getTaskStatus(taskId);
    if (status && status !== 'pending') {
      await updateCompletionMutation.mutateAsync({ taskId, status, notes });
    }
  };

  const toggleExpanded = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getTaskStatus = (taskId) => {
    if (taskStatuses[taskId]) return taskStatuses[taskId];
    const completion = existingCompletions.find(c => c.care_task_id === taskId);
    return completion?.completion_status || 'pending';
  };

  const getTaskNotes = (taskId) => {
    if (taskNotes[taskId]) return taskNotes[taskId];
    const completion = existingCompletions.find(c => c.care_task_id === taskId);
    return completion?.notes || '';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'refused':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'not_completed':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Heart className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'refused':
        return <Badge className="bg-red-600">Refused</Badge>;
      case 'not_completed':
        return <Badge className="bg-orange-600">Not Completed</Badge>;
      default:
        return <Badge className="bg-gray-400">Pending</Badge>;
    }
  };

  if (careTasks.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-purple-900">Care Tasks</h4>
          <Badge variant="outline">{careTasks.length} tasks</Badge>
        </div>

        <div className="space-y-3">
          {careTasks.map((task) => {
            const status = getTaskStatus(task.id);
            const notes = getTaskNotes(task.id);
            const isExpanded = expandedTasks[task.id];

            return (
              <div
                key={task.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  status === 'completed' ? 'bg-green-50 border-green-200' :
                  status === 'refused' ? 'bg-red-50 border-red-200' :
                  status === 'not_completed' ? 'bg-orange-50 border-orange-200' :
                  'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getStatusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.task_name}</p>
                      {task.task_description && (
                        <p className="text-xs text-gray-600 mt-1">{task.task_description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {task.time_of_day && (
                          <Badge variant="outline" className="text-xs">
                            {task.time_of_day}
                          </Badge>
                        )}
                        {task.frequency && (
                          <Badge variant="outline" className="text-xs">
                            {task.frequency}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(task.id)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant={status === 'completed' ? 'default' : 'outline'}
                        onClick={() => handleStatusChange(task.id, 'completed')}
                        className={status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
                        disabled={updateCompletionMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'refused' ? 'default' : 'outline'}
                        onClick={() => handleStatusChange(task.id, 'refused')}
                        className={status === 'refused' ? 'bg-red-600 hover:bg-red-700' : ''}
                        disabled={updateCompletionMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Refused
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'not_completed' ? 'default' : 'outline'}
                        onClick={() => handleStatusChange(task.id, 'not_completed')}
                        className={status === 'not_completed' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                        disabled={updateCompletionMutation.isPending}
                      >
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Not Done
                      </Button>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Notes (optional)
                      </label>
                      <Textarea
                        value={notes}
                        onChange={(e) => handleNotesChange(task.id, e.target.value)}
                        placeholder="Add notes about this task..."
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}