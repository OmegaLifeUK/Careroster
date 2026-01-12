import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Heart, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function CareTaskCompletionWidget({ clientId, shiftId, visitId, user, onTasksUpdate }) {
  const [expandedTasks, setExpandedTasks] = useState({});
  const [completions, setCompletions] = useState({});
  const [signatureFile, setSignatureFile] = useState(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: careTasks = [] } = useQuery({
    queryKey: ['care-tasks-widget', clientId, shiftId, visitId],
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const allTasks = await base44.entities.CareTask.list();
        const today = new Date().toISOString().split('T')[0];
        return Array.isArray(allTasks) 
          ? allTasks.filter(t => 
              t.client_id === clientId && 
              t.task_status !== 'completed' &&
              t.task_status !== 'cancelled' &&
              t.scheduled_date === today &&
              // Show tasks linked to this shift or visit, or general tasks for the client
              (t.shift_id === shiftId || t.visit_id === visitId || (!t.shift_id && !t.visit_id))
            )
          : [];
      } catch (error) {
        console.log("Care tasks not available");
        return [];
      }
    },
    enabled: !!clientId
  });

  const { data: medicationDetails = [] } = useQuery({
    queryKey: ['medication-details', careTasks.map(t => t.id)],
    queryFn: async () => {
      if (!careTasks || careTasks.length === 0) return [];
      try {
        const allDetails = await base44.entities.MedicationTaskDetails.list();
        return Array.isArray(allDetails) 
          ? allDetails.filter(d => careTasks.some(t => t.id === d.care_task_id))
          : [];
      } catch (error) {
        return [];
      }
    },
    enabled: careTasks && careTasks.length > 0,
  });

  const { data: existingCompletions = [] } = useQuery({
    queryKey: ['task-completions-widget', shiftId, clientId],
    queryFn: async () => {
      if (!shiftId) return [];
      try {
        const allCompletions = await base44.entities.TaskCompletionRecord.list();
        return Array.isArray(allCompletions) 
          ? allCompletions.filter(c => careTasks.some(t => t.id === c.care_task_id))
          : [];
      } catch (error) {
        console.log("Task completions not available");
        return [];
      }
    },
    enabled: !!shiftId && careTasks.length > 0
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, outcome, notes, serviceUserResponse, medicationData }) => {
      // Upload signature if provided
      let signatureUrl = null;
      if (signatureFile) {
        setUploadingSignature(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: signatureFile });
          signatureUrl = file_url;
        } catch (error) {
          console.error("Failed to upload signature:", error);
        }
        setUploadingSignature(false);
      }

      // Create task completion record
      await base44.entities.TaskCompletionRecord.create({
        care_task_id: taskId,
        completed_by_id: user?.id || user?.email,
        completion_date_time: new Date().toISOString(),
        outcome: outcome,
        reason_not_completed: outcome === 'unable_to_complete' ? notes : null,
        notes: notes || '',
        service_user_response: serviceUserResponse,
        signature_url: signatureUrl
      });

      // Update task status
      const newStatus = outcome === 'completed_as_planned' ? 'completed' : 'missed';
      await base44.entities.CareTask.update(taskId, {
        task_status: newStatus
      });

      // Handle medication tasks
      if (medicationData && medicationData.isMedication) {
        const medDetails = medicationDetails.find(m => m.care_task_id === taskId);
        if (medDetails) {
          await base44.entities.MedicationTaskDetails.update(medDetails.id, {
            medication_administered: medicationData.administered,
            medication_refused: medicationData.refused,
            time_administered: new Date().toTimeString().slice(0, 5)
          });

          // If medication refused, create incident report
          if (medicationData.refused) {
            await base44.entities.Incident.create({
              client_id: clientId,
              incident_type: 'medication_refusal',
              severity: 'medium',
              description: `Medication refused: ${medDetails.medication_name} - ${notes}`,
              reported_by: user?.email || user?.id,
              incident_date: new Date().toISOString(),
              status: 'reported'
            });

            // Notify manager
            await base44.entities.Notification.create({
              notification_type: 'medication_refused',
              message: `Medication refused by client - ${medDetails.medication_name}`,
              priority: 'urgent',
              is_read: false
            });
          }
        }
      }

      // Alert for missed tasks
      const task = careTasks.find(t => t.id === taskId);
      if (outcome !== 'completed_as_planned' && task?.priority_level === 'critical') {
        await base44.entities.Notification.create({
          notification_type: 'critical_task_missed',
          message: `Critical task "${task.task_title}" not completed as planned`,
          priority: 'urgent',
          is_read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['care-tasks-widget']);
      queryClient.invalidateQueries(['task-completions-widget']);
      toast.success("Task completed successfully");
      if (onTasksUpdate) {
        onTasksUpdate();
      }
      setSignatureFile(null);
    },
    onError: (error) => {
      toast.error("Failed to complete task", error.message);
    }
  });

  const updateCompletion = (taskId, field, value) => {
    setCompletions(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleTaskCompletion = (taskId) => {
    const completion = completions[taskId];
    if (!completion?.outcome) {
      toast.error("Please select an outcome");
      return;
    }

    const task = careTasks.find(t => t.id === taskId);
    const medDetails = medicationDetails.find(m => m.care_task_id === taskId);

    completeTaskMutation.mutate({ 
      taskId, 
      outcome: completion.outcome,
      notes: completion.notes || '',
      serviceUserResponse: completion.serviceUserResponse,
      medicationData: medDetails ? {
        isMedication: true,
        administered: completion.medicationAdministered || false,
        refused: completion.medicationRefused || false
      } : null
    });
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
    }
  };

  const toggleExpanded = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const isTaskCompleted = (taskId) => {
    return existingCompletions.some(c => c.care_task_id === taskId);
  };

  if (careTasks.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-purple-900">Care Tasks for Today</h4>
          <Badge variant="outline">{careTasks.length} tasks</Badge>
        </div>

        <div className="space-y-3">
          {careTasks.map((task) => {
            const isExpanded = expandedTasks[task.id];
            const isCompleted = isTaskCompleted(task.id);
            const medDetails = medicationDetails.find(m => m.care_task_id === task.id);
            const isMedication = task.task_type === 'medication';

            return (
              <div
                key={task.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Heart className="w-5 h-5 text-purple-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.task_title}</p>
                      {task.task_description && (
                        <p className="text-xs text-gray-600 mt-1">{task.task_description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {task.task_category}
                        </Badge>
                        <Badge 
                          className={
                            task.priority_level === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : task.priority_level === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {task.priority_level}
                        </Badge>
                        {task.scheduled_time && (
                          <Badge variant="outline" className="text-xs">
                            {task.scheduled_time}
                          </Badge>
                        )}
                      </div>
                      {medDetails && (
                        <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                          <p><strong>Medication:</strong> {medDetails.medication_name}</p>
                          <p><strong>Dosage:</strong> {medDetails.dosage} - <strong>Route:</strong> {medDetails.route}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isCompleted && <Badge className="bg-green-600">Completed</Badge>}
                    {!isCompleted && (
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
                    )}
                  </div>
                </div>

                {isExpanded && !isCompleted && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Outcome *</Label>
                      <Select
                        value={completions[task.id]?.outcome || ''}
                        onValueChange={(value) => updateCompletion(task.id, 'outcome', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed_as_planned">Completed As Planned</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="unable_to_complete">Unable To Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isMedication && medDetails && (
                      <div className="space-y-2 p-3 bg-purple-50 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`med-admin-${task.id}`}
                            checked={completions[task.id]?.medicationAdministered || false}
                            onCheckedChange={(checked) => updateCompletion(task.id, 'medicationAdministered', checked)}
                          />
                          <Label htmlFor={`med-admin-${task.id}`} className="text-sm font-normal">
                            Medication Administered
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`med-refused-${task.id}`}
                            checked={completions[task.id]?.medicationRefused || false}
                            onCheckedChange={(checked) => updateCompletion(task.id, 'medicationRefused', checked)}
                          />
                          <Label htmlFor={`med-refused-${task.id}`} className="text-sm font-normal text-red-700">
                            Medication Refused (will create incident report)
                          </Label>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium">Service User Response</Label>
                      <Select
                        value={completions[task.id]?.serviceUserResponse || ''}
                        onValueChange={(value) => updateCompletion(task.id, 'serviceUserResponse', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select response" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Notes</Label>
                      <Textarea
                        value={completions[task.id]?.notes || ''}
                        onChange={(e) => updateCompletion(task.id, 'notes', e.target.value)}
                        placeholder="Add notes about this task..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Signature</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="text-sm"
                        />
                        {signatureFile && (
                          <Badge className="bg-green-100 text-green-800">
                            <Upload className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleTaskCompletion(task.id)}
                      disabled={completeTaskMutation.isPending || uploadingSignature}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {completeTaskMutation.isPending ? "Saving..." : "Complete Task"}
                    </Button>
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