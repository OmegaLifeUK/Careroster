import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";

export default function VisitDialog({ visit, staff, clients, runs, onClose }) {
  const [formData, setFormData] = useState({
    client_id: visit?.client_id || "",
    assigned_staff_id: visit?.assigned_staff_id || "",
    run_id: visit?.run_id || "",
    scheduled_start: visit?.scheduled_start ? format(new Date(visit.scheduled_start), "yyyy-MM-dd'T'HH:mm") : "",
    scheduled_end: visit?.scheduled_end ? format(new Date(visit.scheduled_end), "yyyy-MM-dd'T'HH:mm") : "",
    status: visit?.status || "draft",
    visit_notes: visit?.visit_notes || "",
    tasks: visit?.tasks || [],
  });

  const [taskInput, setTaskInput] = useState("");

  const queryClient = useQueryClient();

  const createVisitMutation = useMutation({
    mutationFn: (data) => base44.entities.Visit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      onClose();
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Visit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const visitData = {
      ...formData,
      scheduled_start: new Date(formData.scheduled_start).toISOString(),
      scheduled_end: new Date(formData.scheduled_end).toISOString(),
    };

    if (visit) {
      updateVisitMutation.mutate({ id: visit.id, data: visitData });
    } else {
      createVisitMutation.mutate(visitData);
    }
  };

  const addTask = () => {
    if (taskInput.trim()) {
      setFormData({ ...formData, tasks: [...formData.tasks, taskInput.trim()] });
      setTaskInput("");
    }
  };

  const removeTask = (index) => {
    setFormData({ ...formData, tasks: formData.tasks.filter((_, i) => i !== index) });
  };

  const activeStaff = staff.filter(s => s.is_active);
  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {visit ? "Edit Visit" : "Create New Visit"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_id" className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Client *
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name} - {client.address?.postcode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_start" className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Start Time *
              </Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="scheduled_end" className="mb-2 block">
                End Time *
              </Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_end}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <Label htmlFor="run_id" className="mb-2 block">Run (Optional)</Label>
              <Select
                value={formData.run_id}
                onValueChange={(value) => setFormData({ ...formData, run_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No run" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No run</SelectItem>
                  {runs.map(run => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.run_name} - {run.run_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="visit_notes" className="mb-2 block">Visit Notes</Label>
            <Textarea
              value={formData.visit_notes}
              onChange={(e) => setFormData({ ...formData, visit_notes: e.target.value })}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">Tasks</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add a task..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
              />
              <Button type="button" onClick={addTask} variant="outline">Add</Button>
            </div>
            <div className="space-y-1">
              {formData.tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm">{task}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createVisitMutation.isPending || updateVisitMutation.isPending}
            >
              {visit ? "Update Visit" : "Create Visit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}