import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, XCircle, AlertCircle, Mail, ClipboardList, FileText, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function OnboardingTracker({ clientId }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workflows = [] } = useQuery({
    queryKey: ['onboarding-workflow', clientId],
    queryFn: async () => {
      const data = await base44.entities.OnboardingWorkflow.filter({ client_id: clientId });
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ workflowId, stepIndex, status }) => {
      const workflow = workflows.find(w => w.id === workflowId);
      const steps = [...workflow.steps];
      steps[stepIndex].status = status;
      steps[stepIndex].completed_date = new Date().toISOString();

      const progress = Math.round((steps.filter(s => s.status === "completed").length / steps.length) * 100);
      const allCompleted = steps.every(s => s.status === "completed" || s.status === "skipped");

      return base44.entities.OnboardingWorkflow.update(workflowId, {
        steps: steps,
        progress_percentage: progress,
        workflow_status: allCompleted ? "completed" : "in_progress",
        completion_date: allCompleted ? new Date().toISOString() : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-workflow']);
      toast.success("Step updated successfully");
    },
  });

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No onboarding workflow found for this client
        </CardContent>
      </Card>
    );
  }

  const workflow = workflows[0];
  const assignedStaff = staff.find(s => s.id === workflow.assigned_staff_id);

  const stepIcons = {
    email: Mail,
    task: ClipboardList,
    document: FileText,
    assessment: ClipboardList,
    system: Calendar
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    skipped: "bg-gray-100 text-gray-600"
  };

  const statusIcons = {
    pending: Clock,
    in_progress: AlertCircle,
    completed: CheckCircle,
    failed: XCircle,
    skipped: XCircle
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Onboarding Progress</CardTitle>
            <Badge className={
              workflow.workflow_status === "completed" ? "bg-green-100 text-green-800" :
              workflow.workflow_status === "in_progress" ? "bg-blue-100 text-blue-800" :
              workflow.workflow_status === "failed" ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            }>
              {workflow.workflow_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">{workflow.progress_percentage}%</span>
              </div>
              <Progress value={workflow.progress_percentage} />
            </div>

            {assignedStaff && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Assigned to:</span>
                <span className="font-medium">{assignedStaff.full_name}</span>
              </div>
            )}

            {workflow.expected_completion_date && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Expected completion:</span>
                <span className="font-medium">
                  {format(parseISO(workflow.expected_completion_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflow.steps.map((step, index) => {
              const StepIcon = stepIcons[step.step_type] || ClipboardList;
              const StatusIcon = statusIcons[step.status] || Clock;

              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === "completed" ? "bg-green-100" :
                      step.status === "in_progress" ? "bg-blue-100" :
                      step.status === "failed" ? "bg-red-100" :
                      "bg-gray-100"
                    }`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{step.step_name}</p>
                        {step.completed_date && (
                          <p className="text-xs text-gray-600 mt-1">
                            Completed {format(parseISO(step.completed_date), "MMM d, yyyy 'at' HH:mm")}
                          </p>
                        )}
                        {step.notes && (
                          <p className="text-xs text-gray-600 mt-1">{step.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[step.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {step.status}
                        </Badge>
                      </div>
                    </div>

                    {step.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStepMutation.mutate({ 
                            workflowId: workflow.id, 
                            stepIndex: index, 
                            status: "completed" 
                          })}
                        >
                          Mark Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStepMutation.mutate({ 
                            workflowId: workflow.id, 
                            stepIndex: index, 
                            status: "skipped" 
                          })}
                        >
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}