import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  Clock, 
  CheckCircle,
  AlertCircle,
  PlayCircle,
  FileText
} from "lucide-react";
import { format, parseISO, isPast, isBefore, addDays } from "date-fns";

export default function MyTraining({ staffMember }) {
  const queryClient = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-training', staffMember.id],
    queryFn: async () => {
      const allAssignments = await base44.entities.TrainingAssignment.filter({
        staff_id: staffMember.id
      }, '-assigned_date');
      return allAssignments;
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['training-modules'],
    queryFn: () => base44.entities.TrainingModule.list(),
  });

  const startTrainingMutation = useMutation({
    mutationFn: (assignmentId) => 
      base44.entities.TrainingAssignment.update(assignmentId, {
        status: "in_progress",
        started_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-training'] });
    },
  });

  const completeTrainingMutation = useMutation({
    mutationFn: (assignmentId) =>
      base44.entities.TrainingAssignment.update(assignmentId, {
        status: "completed",
        completed_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-training'] });
    },
  });

  const getModule = (moduleId) => {
    return modules.find(m => m.id === moduleId);
  };

  const checkStatus = (assignment) => {
    if (assignment.status === 'completed') return 'completed';
    if (assignment.due_date && isPast(parseISO(assignment.due_date))) return 'overdue';
    if (assignment.due_date && isBefore(parseISO(assignment.due_date), addDays(new Date(), 7))) return 'due_soon';
    return assignment.status;
  };

  const pendingAssignments = assignments.filter(a => a.status !== 'completed');
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const completionRate = assignments.length > 0 
    ? ((completedAssignments.length / assignments.length) * 100).toFixed(0)
    : 0;

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    not_started: "bg-gray-100 text-gray-800",
    overdue: "bg-red-100 text-red-800",
    due_soon: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            My Training
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          {/* Progress Overview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{completionRate}%</span>
            </div>
            <Progress value={parseFloat(completionRate)} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {completedAssignments.length} of {assignments.length} training modules completed
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-orange-50">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <p className="text-xs text-orange-700 mb-1">Pending</p>
                <p className="text-2xl font-bold text-orange-900">{pendingAssignments.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-blue-700 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-blue-900">
                  {assignments.filter(a => a.status === 'in_progress').length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xs text-green-700 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-900">{completedAssignments.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Training */}
          {pendingAssignments.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Training ({pendingAssignments.length})
              </h3>
              <div className="space-y-3">
                {pendingAssignments.map((assignment) => {
                  const module = getModule(assignment.training_module_id);
                  if (!module) return null;
                  
                  const status = checkStatus(assignment);

                  return (
                    <Card key={assignment.id} className={`border-l-4 ${
                      status === 'overdue' ? 'border-red-500' :
                      status === 'due_soon' ? 'border-orange-500' :
                      'border-blue-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{module.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                          </div>
                          <Badge className={statusColors[status]}>
                            {status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="text-sm">
                            <span className="text-gray-600">Due:</span>
                            <span className="font-medium ml-1">
                              {assignment.due_date 
                                ? format(parseISO(assignment.due_date), "MMM d, yyyy")
                                : "No deadline"
                              }
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium ml-1">{module.duration_minutes} mins</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {assignment.status === 'not_started' && (
                            <Button
                              size="sm"
                              onClick={() => startTrainingMutation.mutate(assignment.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Start Training
                            </Button>
                          )}
                          {assignment.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => completeTrainingMutation.mutate(assignment.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark Complete
                            </Button>
                          )}
                          {module.material_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(module.material_url, '_blank')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Material
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Training */}
          {completedAssignments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Completed Training ({completedAssignments.length})
              </h3>
              <div className="space-y-2">
                {completedAssignments.map((assignment) => {
                  const module = getModule(assignment.training_module_id);
                  if (!module) return null;

                  return (
                    <Card key={assignment.id} className="bg-green-50 border-green-200">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{module.title}</h4>
                            <p className="text-xs text-gray-600">
                              Completed: {format(parseISO(assignment.completed_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {assignments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No training assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}