import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, AlertCircle, MinusCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaskCompletionTracker({ shift, visit, client, staffId }) {
  const [completingTask, setCompletingTask] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    status: "completed",
    completion_notes: "",
    refusal_reason: "",
    missed_reason: "",
    client_response: "neutral",
    variations_from_plan: "",
    duration_minutes: 0,
    follow_up_required: false,
    follow_up_details: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const entityType = shift ? 'shift' : 'visit';
  const entityId = shift?.id || visit?.id;

  const { data: tasks = [] } = useQuery({
    queryKey: ['care-tasks', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const data = await base44.entities.CareTask.filter({ client_id: client.id, is_active: true });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!client?.id,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['task-completions', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const filter = shift ? { shift_id: entityId } : { visit_id: entityId };
      const data = await base44.entities.TaskCompletion.filter(filter);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!entityId,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (data) => {
      const completion = await base44.entities.TaskCompletion.create(data);
      
      // Generate alert if needed
      if ((data.status === 'missed' || data.status === 'refused') && completingTask) {
        const task = tasks.find(t => t.id === completingTask.id);
        const shouldAlert = 
          (data.status === 'missed' && task?.alerts_if_missed) ||
          (data.status === 'refused' && task?.alerts_if_refused);
        
        if (shouldAlert) {
          await base44.entities.ClientAlert.create({
            client_id: client.id,
            alert_type: task.category === 'medication' ? 'medication' : 'other',
            severity: task.priority === 'critical' ? 'critical' : 'high',
            title: `${data.status === 'missed' ? 'Missed' : 'Refused'}: ${task.task_name}`,
            description: data.status === 'missed' 
              ? `Task "${task.task_name}" was not completed. Reason: ${data.missed_reason}`
              : `Client refused task "${task.task_name}". Reason: ${data.refusal_reason}`,
            status: 'active',
            created_by_staff_id: staffId,
            display_on_sections: ['dashboard', 'care_plan', 'visits', 'schedule'],
            requires_acknowledgment: true,
            action_required: data.follow_up_required ? data.follow_up_details : 'Review and follow up',
          });
        }
      }
      
      return completion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
      toast.success("Success", "Task status recorded");
      setCompletingTask(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error", "Failed to record task completion");
      console.error("Complete error:", error);
    },
  });

  const resetForm = () => {
    setCompletionForm({
      status: "completed",
      completion_notes: "",
      refusal_reason: "",
      missed_reason: "",
      client_response: "neutral",
      variations_from_plan: "",
      duration_minutes: 0,
      follow_up_required: false,
      follow_up_details: "",
    });
  };

  const handleQuickComplete = (task, status) => {
    if (status === 'completed') {
      completeTaskMutation.mutate({
        care_task_id: task.id,
        client_id: client.id,
        shift_id: shift?.id,
        visit_id: visit?.id,
        completed_by_staff_id: staffId,
        scheduled_datetime: new Date().toISOString(),
        completed_datetime: new Date().toISOString(),
        status: 'completed',
        duration_minutes: task.estimated_duration_minutes || 0,
        client_response: 'positive',
      });
    } else {
      setCompletingTask(task);
      setCompletionForm({ ...completionForm, status });
    }
  };

  const handleSubmitCompletion = () => {
    const data = {
      care_task_id: completingTask.id,
      client_id: client.id,
      shift_id: shift?.id,
      visit_id: visit?.id,
      completed_by_staff_id: staffId,
      scheduled_datetime: new Date().toISOString(),
      completed_datetime: completionForm.status === 'completed' ? new Date().toISOString() : null,
      ...completionForm,
    };
    
    completeTaskMutation.mutate(data);
  };

  const getCompletionStatus = (taskId) => {
    return completions.find(c => c.care_task_id === taskId);
  };

  const statusIcons = {
    completed: <CheckCircle className="w-5 h-5 text-green-600" />,
    refused: <XCircle className="w-5 h-5 text-red-600" />,
    missed: <AlertCircle className="w-5 h-5 text-orange-600" />,
    partially_completed: <MinusCircle className="w-5 h-5 text-yellow-600" />,
    pending: <Clock className="w-5 h-5 text-gray-400" />,
  };

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    refused: "bg-red-100 text-red-800",
    missed: "bg-orange-100 text-orange-800",
    partially_completed: "bg-yellow-100 text-yellow-800",
    pending: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center justify-between">
            <span>Care Tasks Checklist</span>
            <Badge variant="outline">
              {completions.filter(c => c.status === 'completed').length} / {tasks.length} Completed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No care tasks assigned to this client</p>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const completion = getCompletionStatus(task.id);
                const isCompleted = !!completion;

                return (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg ${
                      isCompleted 
                        ? 'bg-gray-50 border-gray-300' 
                        : task.priority === 'critical' 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          {isCompleted && statusIcons[completion.status]}
                          <div className="flex-1">
                            <h4 className={`font-semibold ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                              {task.task_name}
                            </h4>
                            <p className="text-sm text-gray-600">{task.description}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {task.category.replace('_', ' ')}
                          </Badge>
                          <Badge className={`text-xs ${task.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {task.priority}
                          </Badge>
                          {task.estimated_duration_minutes && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {task.estimated_duration_minutes}min
                            </Badge>
                          )}
                          {task.requires_two_staff && (
                            <Badge className="text-xs bg-purple-100 text-purple-800">
                              2 Staff Required
                            </Badge>
                          )}
                        </div>

                        {task.instructions && (
                          <p className="text-xs text-gray-500 italic mb-2">
                            Instructions: {task.instructions}
                          </p>
                        )}

                        {isCompleted && completion.completion_notes && (
                          <div className="mt-2 p-2 bg-white rounded border text-xs">
                            <p className="font-medium text-gray-700 mb-1">Completion Notes:</p>
                            <p className="text-gray-600">{completion.completion_notes}</p>
                          </div>
                        )}
                      </div>

                      {!isCompleted && (
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleQuickComplete(task, 'completed')}
                            className="bg-green-600 hover:bg-green-700 w-24"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Done
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickComplete(task, 'refused')}
                            className="w-24"
                          >
                            Refused
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickComplete(task, 'missed')}
                            className="w-24"
                          >
                            Missed
                          </Button>
                        </div>
                      )}

                      {isCompleted && (
                        <Badge className={statusColors[completion.status]}>
                          {completion.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {completingTask && (
        <Dialog open onOpenChange={() => setCompletingTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Task Status: {completingTask.task_name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Status</Label>
                <Select value={completionForm.status} onValueChange={(value) => setCompletionForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="refused">Refused by Client</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="partially_completed">Partially Completed</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {completionForm.status === 'refused' && (
                <div>
                  <Label>Reason for Refusal</Label>
                  <Textarea
                    value={completionForm.refusal_reason}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, refusal_reason: e.target.value }))}
                    placeholder="Why did the client refuse?"
                    className="h-20"
                  />
                </div>
              )}

              {completionForm.status === 'missed' && (
                <div>
                  <Label>Reason for Missing</Label>
                  <Textarea
                    value={completionForm.missed_reason}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, missed_reason: e.target.value }))}
                    placeholder="Why was this task not completed?"
                    className="h-20"
                  />
                </div>
              )}

              <div>
                <Label>Completion Notes</Label>
                <Textarea
                  value={completionForm.completion_notes}
                  onChange={(e) => setCompletionForm(prev => ({ ...prev, completion_notes: e.target.value }))}
                  placeholder="Notes about how the task was completed"
                  className="h-24"
                />
              </div>

              {completionForm.status === 'completed' && (
                <>
                  <div>
                    <Label>Client Response</Label>
                    <Select value={completionForm.client_response} onValueChange={(value) => setCompletionForm(prev => ({ ...prev, client_response: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="anxious">Anxious</SelectItem>
                        <SelectItem value="distressed">Distressed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Variations from Plan</Label>
                    <Textarea
                      value={completionForm.variations_from_plan}
                      onChange={(e) => setCompletionForm(prev => ({ ...prev, variations_from_plan: e.target.value }))}
                      placeholder="Any variations from the care plan?"
                      className="h-20"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                <input
                  type="checkbox"
                  id="follow_up"
                  checked={completionForm.follow_up_required}
                  onChange={(e) => setCompletionForm(prev => ({ ...prev, follow_up_required: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="follow_up" className="cursor-pointer">
                  Follow-up Required
                </Label>
              </div>

              {completionForm.follow_up_required && (
                <div>
                  <Label>Follow-up Details</Label>
                  <Textarea
                    value={completionForm.follow_up_details}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, follow_up_details: e.target.value }))}
                    placeholder="What follow-up action is needed?"
                    className="h-20"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCompletingTask(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCompletion}
                disabled={completeTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {completeTaskMutation.isPending ? "Recording..." : "Record Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}