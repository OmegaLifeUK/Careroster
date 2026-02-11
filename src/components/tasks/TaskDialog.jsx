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
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function TaskDialog({ task, client, qualifications = [], onClose }) {
  const [formData, setFormData] = useState({
    client_id: client?.id || task?.client_id || "",
    task_title: task?.task_title || task?.task_name || "",
    task_description: task?.task_description || task?.description || "",
    task_type: task?.task_type || "personal_care",
    task_category: task?.task_category || task?.category || "personal_care",
    priority_level: task?.priority_level || task?.priority || "medium",
    duration_estimate_minutes: task?.duration_estimate_minutes || task?.estimated_duration_minutes || 15,
    scheduled_date: task?.scheduled_date || "",
    scheduled_time: task?.scheduled_time || "",
    time_of_day: task?.time_of_day || "anytime",
    recurrence_type: task?.recurrence_type || "one_off",
    recurrence_days: task?.recurrence_days || [],
    recurrence_end_date: task?.recurrence_end_date || "",
    frequency: task?.frequency || "once",
    location: task?.location || "home",
    task_status: task?.task_status || "scheduled",
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
    
    if (!formData.task_title) {
      toast.error("Validation Error", "Please enter a task title");
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
                <Label htmlFor="task_title">Task Title *</Label>
                <Input
                  id="task_title"
                  value={formData.task_title}
                  onChange={(e) => handleInputChange("task_title", e.target.value)}
                  placeholder="e.g., Assist with morning wash, Administer medication"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="task_description">Description</Label>
                <Textarea
                  id="task_description"
                  value={formData.task_description}
                  onChange={(e) => handleInputChange("task_description", e.target.value)}
                  placeholder="Detailed description of the task"
                  className="h-20"
                />
              </div>

              <div>
                <Label htmlFor="task_type">Task Type *</Label>
                <Select value={formData.task_type} onValueChange={(value) => handleInputChange("task_type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_care">Personal Care</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="nutrition_meals">Nutrition & Meals</SelectItem>
                    <SelectItem value="mobility_support">Mobility Support</SelectItem>
                    <SelectItem value="clinical_support">Clinical Support</SelectItem>
                    <SelectItem value="emotional_support">Emotional Support</SelectItem>
                    <SelectItem value="domestic_support">Domestic Support</SelectItem>
                    <SelectItem value="child_supervision">Child Supervision</SelectItem>
                    <SelectItem value="education_development">Education & Development</SelectItem>
                    <SelectItem value="community_access">Community Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task_category">Category *</Label>
                <Select value={formData.task_category} onValueChange={(value) => handleInputChange("task_category", value)}>
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
                <Label htmlFor="priority_level">Priority *</Label>
                <Select value={formData.priority_level} onValueChange={(value) => handleInputChange("priority_level", value)}>
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
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recurrence_type">Schedule Type *</Label>
                <Select value={formData.recurrence_type} onValueChange={(value) => handleInputChange("recurrence_type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_off">One-Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type === "weekly" && (
                <div className="md:col-span-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                      <label key={day} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <Checkbox
                          checked={formData.recurrence_days?.includes(day)}
                          onCheckedChange={(checked) => {
                            const days = formData.recurrence_days || [];
                            handleInputChange("recurrence_days", checked 
                              ? [...days, day]
                              : days.filter(d => d !== day)
                            );
                          }}
                        />
                        <span className="text-sm capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => handleInputChange("scheduled_date", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="scheduled_time">Scheduled Time (Optional)</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => handleInputChange("scheduled_time", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="time_of_day">Time of Day</Label>
                <Select value={formData.time_of_day} onValueChange={(value) => handleInputChange("time_of_day", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anytime">Anytime</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="lunchtime">Lunchtime</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="dinner_time">Dinner Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type !== "one_off" && (
                <div>
                  <Label htmlFor="recurrence_end_date">Recurrence End Date (Optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => handleInputChange("recurrence_end_date", e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="duration_estimate_minutes">Estimated Duration (minutes)</Label>
                <Input
                  id="duration_estimate_minutes"
                  type="number"
                  value={formData.duration_estimate_minutes}
                  onChange={(e) => handleInputChange("duration_estimate_minutes", parseInt(e.target.value))}
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select value={formData.location} onValueChange={(value) => handleInputChange("location", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                  </SelectContent>
                </Select>
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