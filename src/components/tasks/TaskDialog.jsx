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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function TaskDialog({ task, client, qualifications = [], onClose }) {
  const [formData, setFormData] = useState({
    client_id: client?.id || task?.client_id || "",
    task_name: task?.task_name || "",
    description: task?.description || "",
    category: task?.category || "personal_care",
    frequency: task?.frequency || "every_visit",
    specific_times: task?.specific_times || [],
    priority: task?.priority || "medium",
    estimated_duration_minutes: task?.estimated_duration_minutes || 15,
    requires_two_staff: task?.requires_two_staff || false,
    required_qualifications: task?.required_qualifications || [],
    instructions: task?.instructions || "",
    alerts_if_missed: task?.alerts_if_missed || false,
    alerts_if_refused: task?.alerts_if_refused || false,
    is_active: task?.is_active !== undefined ? task.is_active : true,
    start_date: task?.start_date || new Date().toISOString().split('T')[0],
    end_date: task?.end_date || "",
    source: task?.source || "manual",
  });

  const [timeInput, setTimeInput] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (task) {
        return base44.entities.CareTask.update(task.id, data);
      } else {
        return base44.entities.CareTask.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
      toast.success("Success", task ? "Task updated" : "Task created");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to save task");
      console.error("Save error:", error);
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQualificationToggle = (qualId) => {
    setFormData(prev => {
      const quals = prev.required_qualifications || [];
      const hasQual = quals.includes(qualId);
      return {
        ...prev,
        required_qualifications: hasQual 
          ? quals.filter(q => q !== qualId)
          : [...quals, qualId]
      };
    });
  };

  const addSpecificTime = () => {
    if (timeInput && !formData.specific_times.includes(timeInput)) {
      setFormData(prev => ({
        ...prev,
        specific_times: [...prev.specific_times, timeInput].sort()
      }));
      setTimeInput("");
    }
  };

  const removeSpecificTime = (time) => {
    setFormData(prev => ({
      ...prev,
      specific_times: prev.specific_times.filter(t => t !== time)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.task_name) {
      toast.error("Validation Error", "Please enter a task name");
      return;
    }
    
    if (formData.frequency === "specific_times" && formData.specific_times.length === 0) {
      toast.error("Validation Error", "Please add at least one specific time");
      return;
    }
    
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Care Task" : "Create Care Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="task_name">Task Name *</Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => handleInputChange("task_name", e.target.value)}
                  placeholder="e.g., Assist with morning wash, Administer medication"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Detailed description of the task"
                  className="h-20"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_care">Personal Care</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="nutrition">Nutrition</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="hygiene">Hygiene</SelectItem>
                    <SelectItem value="observation">Observation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={formData.frequency} onValueChange={(value) => handleInputChange("frequency", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="every_visit">Every Visit/Shift</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                    <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="as_needed">As Needed (PRN)</SelectItem>
                    <SelectItem value="specific_times">Specific Times</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === "specific_times" && (
                <div>
                  <Label>Specific Times</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="time"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      placeholder="Add time"
                    />
                    <Button type="button" onClick={addSpecificTime} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specific_times.map(time => (
                      <Badge key={time} variant="outline" className="flex items-center gap-1">
                        {time}
                        <button type="button" onClick={() => removeSpecificTime(time)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="estimated_duration_minutes">Estimated Duration (minutes)</Label>
                <Input
                  id="estimated_duration_minutes"
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => handleInputChange("estimated_duration_minutes", parseInt(e.target.value))}
                  min="1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange("instructions", e.target.value)}
                  placeholder="Specific instructions for completing this task"
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange("start_date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange("end_date", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {qualifications.length > 0 && (
              <div>
                <Label className="mb-2 block">Required Qualifications</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {qualifications.map(qual => (
                    <div key={qual.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`qual-${qual.id}`}
                        checked={formData.required_qualifications?.includes(qual.id)}
                        onCheckedChange={() => handleQualificationToggle(qual.id)}
                      />
                      <Label htmlFor={`qual-${qual.id}`} className="cursor-pointer text-sm">
                        {qual.qualification_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires_two_staff"
                  checked={formData.requires_two_staff}
                  onCheckedChange={(checked) => handleInputChange("requires_two_staff", checked)}
                />
                <Label htmlFor="requires_two_staff" className="cursor-pointer">
                  Requires Two Staff Members
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="alerts_if_missed"
                  checked={formData.alerts_if_missed}
                  onCheckedChange={(checked) => handleInputChange("alerts_if_missed", checked)}
                />
                <Label htmlFor="alerts_if_missed" className="cursor-pointer flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  Generate Alert if Missed
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="alerts_if_refused"
                  checked={formData.alerts_if_refused}
                  onCheckedChange={(checked) => handleInputChange("alerts_if_refused", checked)}
                />
                <Label htmlFor="alerts_if_refused" className="cursor-pointer flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Generate Alert if Refused
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Task is Active
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                task ? "Update Task" : "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}