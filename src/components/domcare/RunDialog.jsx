import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Navigation, User, Calendar } from "lucide-react";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function RunDialog({ run, staff, onClose }) {
  const [formData, setFormData] = useState({
    run_name: run?.run_name || "",
    assigned_staff_id: run?.assigned_staff_id || "",
    run_date: run?.run_date || format(new Date(), "yyyy-MM-dd"),
    start_time: run?.start_time || "08:00",
    end_time: run?.end_time || "17:00",
    status: run?.status || "draft",
    is_recurring: run?.is_recurring || false,
    recurrence_pattern: run?.recurrence_pattern || [],
    notes: run?.notes || "",
  });

  const queryClient = useQueryClient();

  const createRunMutation = useMutation({
    mutationFn: (data) => base44.entities.Run.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      onClose();
    },
  });

  const updateRunMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Run.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (run) {
      updateRunMutation.mutate({ id: run.id, data: formData });
    } else {
      createRunMutation.mutate(formData);
    }
  };

  const toggleDay = (day) => {
    const pattern = formData.recurrence_pattern || [];
    if (pattern.includes(day)) {
      setFormData({ 
        ...formData, 
        recurrence_pattern: pattern.filter(d => d !== day) 
      });
    } else {
      setFormData({ 
        ...formData, 
        recurrence_pattern: [...pattern, day] 
      });
    }
  };

  const activeStaff = staff.filter(s => s.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-purple-600" />
            {run ? "Edit Run" : "Create New Run"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <Label htmlFor="run_name" className="mb-2 block">Run Name *</Label>
            <Input
              id="run_name"
              value={formData.run_name}
              onChange={(e) => setFormData({ ...formData, run_name: e.target.value })}
              placeholder="e.g., Morning North, Afternoon Central"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigned_staff_id" className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-green-600" />
                Assigned Staff
              </Label>
              <Select
                value={formData.assigned_staff_id}
                onValueChange={(value) => setFormData({ ...formData, assigned_staff_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {activeStaff.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="run_date" className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Run Date *
              </Label>
              <Input
                type="date"
                value={formData.run_date}
                onChange={(e) => setFormData({ ...formData, run_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="mb-2 block">Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="end_time" className="mb-2 block">End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status" className="mb-2 block">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
              <Label className="cursor-pointer">Recurring Run</Label>
            </div>

            {formData.is_recurring && (
              <div>
                <Label className="mb-2 block text-sm text-gray-600">Repeat on:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.recurrence_pattern?.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <Label className="cursor-pointer text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes" className="mb-2 block">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this run..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={createRunMutation.isPending || updateRunMutation.isPending}
            >
              {run ? "Update Run" : "Create Run"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}