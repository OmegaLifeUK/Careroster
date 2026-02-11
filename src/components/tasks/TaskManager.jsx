import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, ListChecks, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast";

import TaskCard from "./TaskCard";
import TaskDialog from "./TaskDialog";
import GenerateTasksDialog from "./GenerateTasksDialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TaskManager({ client }) {
  const navigate = useNavigate();
  const [editingTask, setEditingTask] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['care-tasks', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const data = await base44.entities.CareTask.filter({ client_id: client.id, is_active: true });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!client?.id,
  });

  const { data: qualifications = [] } = useQuery({
    queryKey: ['qualifications'],
    queryFn: async () => {
      const data = await base44.entities.Qualification.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.CareTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
      toast.success("Task Deleted", "Care task removed successfully");
    },
    onError: (error) => {
      toast.error("Error", "Failed to delete task");
      console.error("Delete error:", error);
    },
  });

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this care task?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {});

  const categoryLabels = {
    personal_care: "Personal Care",
    medication: "Medication",
    mobility: "Mobility",
    nutrition: "Nutrition",
    social: "Social",
    medical: "Medical",
    safety: "Safety",
    activities: "Activities",
    hygiene: "Hygiene",
    observation: "Observation",
    other: "Other"
  };

  const stats = {
    total: tasks.length,
    critical: tasks.filter(t => t.priority === 'critical').length,
    high: tasks.filter(t => t.priority === 'high').length,
    twoStaff: tasks.filter(t => t.requires_two_staff).length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-blue-600" />
              Care Tasks
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGenerateDialog(true)}
                className="bg-gradient-to-r from-purple-50 to-pink-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate from Care Needs
              </Button>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setShowDialog(true);
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">Critical Priority</p>
              <p className="text-2xl font-bold text-red-900">{stats.critical}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-700">High Priority</p>
              <p className="text-2xl font-bold text-orange-900">{stats.high}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">Two Staff Required</p>
              <p className="text-2xl font-bold text-purple-900">{stats.twoStaff}</p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <ListChecks className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">No care tasks defined yet</p>
              <p className="text-sm text-gray-400 mb-4">
                Create tasks manually or use AI to generate from care needs
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate from Care Needs
                </Button>
                <Button onClick={() => {
                  setEditingTask(null);
                  setShowDialog(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
                <div key={category}>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    {categoryLabels[category]}
                    <Badge variant="outline">{categoryTasks.length}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        qualifications={qualifications}
                        onEdit={() => {
                          setEditingTask(task);
                          setShowDialog(true);
                        }}
                        onDelete={() => handleDelete(task.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showGenerateDialog && (
        <GenerateTasksDialog
          client={client}
          onClose={() => setShowGenerateDialog(false)}
        />
      )}

      {showDialog && (
        <TaskDialog
          task={editingTask}
          client={client}
          qualifications={qualifications}
          onClose={() => {
            setShowDialog(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}