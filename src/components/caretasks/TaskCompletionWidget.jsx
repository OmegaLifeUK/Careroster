import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  User,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const statusOptions = [
  { value: "completed", label: "Completed", icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-300" },
  { value: "partially_completed", label: "Partially Completed", icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "not_completed", label: "Not Completed", icon: XCircle, color: "bg-red-100 text-red-800 border-red-300" },
  { value: "refused", label: "Refused by Client", icon: AlertTriangle, color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "not_applicable", label: "Not Applicable", icon: FileText, color: "bg-gray-100 text-gray-800 border-gray-300" },
];

export default function TaskCompletionWidget({ 
  clientId, 
  carePlanId, 
  shiftId, 
  visitId,
  onComplete 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTasks, setExpandedTasks] = useState({});
  const [taskNotes, setTaskNotes] = useState({});
  const [taskStatuses, setTaskStatuses] = useState({});

  const { data: carePlan } = useQuery({
    queryKey: ['care-plan', carePlanId],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.filter({ id: carePlanId });
      return Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
    },
    enabled: !!carePlanId,
  });

  const { data: existingCompletions = [] } = useQuery({
    queryKey: ['task-completions', shiftId, visitId],
    queryFn: async () => {
      const query = shiftId ? { shift_id: shiftId } : { visit_id: visitId };
      const data = await base44.entities.CareTaskCompletion.filter(query);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!(shiftId || visitId),
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const user = await base44.auth.me();
      const staffMember = staff.find(s => s.email === user.email);
      
      const completion = await base44.entities.CareTaskCompletion.create({
        ...taskData,
        completed_by_staff_id: staffMember?.id || user.email,
      });
      
      // Create alert if critical task incomplete
      if (taskData.is_critical && taskData.completion_status !== 'completed') {
        const alert = await base44.entities.ClientAlert.create({
          client_id: clientId,
          alert_type: "care_issue",
          severity: "high",
          title: `Critical Task Incomplete: ${taskData.task_name}`,
          description: `${taskData.task_name} was marked as ${taskData.completion_status}. ${taskData.completion_notes || 'No notes provided.'}`,
          status: "active",
          requires_acknowledgment: true,
        });
        
        await base44.entities.CareTaskCompletion.update(completion.id, {
          alert_created: true,
          alert_id: alert.id
        });
      }
      
      return completion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
      toast.success("Task Recorded", "Task completion has been recorded");
    },
    onError: (error) => {
      toast.error("Error", "Failed to record task completion");
      console.error(error);
    },
  });

  const handleCompleteTask = (task, status) => {
    const needsNote = status !== 'completed';
    const note = taskNotes[task.task_id] || '';
    
    if (needsNote && !note.trim()) {
      toast.error("Note Required", "Please provide a note explaining why this task was not fully completed");
      return;
    }

    completeTaskMutation.mutate({
      shift_id: shiftId,
      visit_id: visitId,
      client_id: clientId,
      care_plan_id: carePlanId,
      task_id: task.task_id,
      task_name: task.task_name,
      task_category: task.category,
      is_critical: task.category === 'medication' || task.category === 'healthcare',
      completion_status: status,
      completed_by_staff_id: "", // Will be set by backend
      completion_date: new Date().toISOString(),
      completion_notes: note,
    });

    setTaskStatuses({ ...taskStatuses, [task.task_id]: status });
  };

  const toggleTask = (taskId) => {
    setExpandedTasks({ ...expandedTasks, [taskId]: !expandedTasks[taskId] });
  };

  if (!carePlan || !carePlan.care_tasks || carePlan.care_tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No care tasks defined in care plan</p>
        </CardContent>
      </Card>
    );
  }

  const activeTasks = carePlan.care_tasks.filter(t => t.is_active !== false);
  const completedTaskIds = existingCompletions.map(c => c.task_id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Care Tasks</h3>
        <Badge variant="outline">
          {completedTaskIds.length} / {activeTasks.length} completed
        </Badge>
      </div>

      {activeTasks.map((task) => {
        const isCompleted = completedTaskIds.includes(task.task_id);
        const isExpanded = expandedTasks[task.task_id];
        const completion = existingCompletions.find(c => c.task_id === task.task_id);
        const isCritical = task.category === 'medication' || task.category === 'healthcare';

        return (
          <Card 
            key={task.task_id} 
            className={`${isCompleted ? 'bg-green-50 border-green-200' : ''} ${isCritical ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <CardHeader 
              className="py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleTask(task.task_id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">{task.task_name}</CardTitle>
                      {isCritical && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Critical</Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {task.category?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600">{task.description}</p>
                    )}
                    {task.frequency && (
                      <p className="text-xs text-gray-500 mt-1">
                        Frequency: {task.frequency.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                {isCompleted ? (
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        {completion?.completion_status.replace('_', ' ')}
                      </span>
                    </div>
                    {completion?.completion_notes && (
                      <p className="text-sm text-gray-700 mt-2">{completion.completion_notes}</p>
                    )}
                    {completion?.alert_created && (
                      <div className="mt-2 flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs">Alert created for this task</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {task.special_instructions && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Instructions:</strong> {task.special_instructions}
                        </p>
                      </div>
                    )}

                    <Textarea
                      placeholder="Add notes about this task..."
                      value={taskNotes[task.task_id] || ''}
                      onChange={(e) => setTaskNotes({ ...taskNotes, [task.task_id]: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <Button
                            key={option.value}
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteTask(task, option.value)}
                            disabled={completeTaskMutation.isPending}
                            className={`${option.color} hover:opacity-80 border`}
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}