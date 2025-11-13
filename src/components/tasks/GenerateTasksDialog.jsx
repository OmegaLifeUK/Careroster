import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const frequencyLabels = {
  every_visit: "Every Visit/Shift",
  daily: "Daily",
  twice_daily: "Twice Daily",
  three_times_daily: "3x Daily",
  weekly: "Weekly",
  as_needed: "As Needed",
  specific_times: "Specific Times",
};

export default function GenerateTasksDialog({ client, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTasksMutation = useMutation({
    mutationFn: async (tasks) => {
      return base44.entities.CareTask.bulkCreate(tasks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
      toast.success("Success", `${selectedTasks.length} tasks created`);
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create tasks");
      console.error("Create error:", error);
    },
  });

  const generateTasks = async () => {
    setIsGenerating(true);
    try {
      const careNeeds = client.care_needs || [];
      const medicalNotes = client.medical_notes || "";
      
      const prompt = `Based on the following client information, generate a comprehensive list of care tasks:

Client: ${client.full_name}
Care Needs: ${careNeeds.join(', ')}
Medical Notes: ${medicalNotes}
Mobility: ${client.mobility || 'Not specified'}

Generate specific, actionable care tasks that staff should complete. For each task, provide:
- task_name (brief, clear name)
- description (what needs to be done)
- category (one of: personal_care, medication, mobility, nutrition, social, medical, safety, activities, hygiene, observation)
- frequency (one of: every_visit, daily, twice_daily, three_times_daily, weekly, as_needed)
- priority (one of: low, medium, high, critical)
- estimated_duration_minutes (realistic estimate)
- requires_two_staff (true/false)
- instructions (detailed step-by-step)
- alerts_if_missed (true for critical tasks)
- alerts_if_refused (true for important tasks that client might refuse)

Be specific and practical. Cover all aspects of their care needs.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  frequency: { type: "string" },
                  priority: { type: "string" },
                  estimated_duration_minutes: { type: "number" },
                  requires_two_staff: { type: "boolean" },
                  instructions: { type: "string" },
                  alerts_if_missed: { type: "boolean" },
                  alerts_if_refused: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      const tasks = response.tasks.map(task => ({
        ...task,
        client_id: client.id,
        is_active: true,
        source: "ai_generated",
        start_date: new Date().toISOString().split('T')[0]
      }));

      setGeneratedTasks(tasks);
      setSelectedTasks(tasks.map((_, idx) => idx));
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Error", "Failed to generate tasks");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTask = (index) => {
    setSelectedTasks(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleCreate = () => {
    const tasksToCreate = selectedTasks.map(idx => generatedTasks[idx]);
    createTasksMutation.mutate(tasksToCreate);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Task Generator
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {generatedTasks.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto text-purple-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Generate Care Tasks with AI</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                AI will analyze {client.full_name}'s care needs and medical notes to create a comprehensive list of tasks for your care team.
              </p>
              <Button
                onClick={generateTasks}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Tasks...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Tasks
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-900 font-medium mb-1">✨ Generated {generatedTasks.length} tasks</p>
                <p className="text-sm text-green-700">
                  Review and select which tasks to add to {client.full_name}'s care plan
                </p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">{selectedTasks.length} of {generatedTasks.length} selected</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTasks(generatedTasks.map((_, idx) => idx))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTasks([])}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {generatedTasks.map((task, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTasks.includes(index)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleToggleTask(index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {selectedTasks.includes(index) ? (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
                          <Badge className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">{frequencyLabels[task.frequency] || task.frequency}</Badge>
                          {task.category && (
                            <Badge variant="outline" className="capitalize">
                              {task.category.replace('_', ' ')}
                            </Badge>
                          )}
                          {task.estimated_duration_minutes && (
                            <Badge variant="outline">
                              {task.estimated_duration_minutes}min
                            </Badge>
                          )}
                          {task.requires_two_staff && (
                            <Badge className="bg-purple-100 text-purple-800">
                              2 Staff
                            </Badge>
                          )}
                          {(task.alerts_if_missed || task.alerts_if_refused) && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Alerts
                            </Badge>
                          )}
                        </div>

                        {task.instructions && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                            <p className="font-medium mb-1">Instructions:</p>
                            <p className="line-clamp-2">{task.instructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {generatedTasks.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={generateTasks}
                disabled={isGenerating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTasksMutation.isPending || selectedTasks.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createTasksMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}