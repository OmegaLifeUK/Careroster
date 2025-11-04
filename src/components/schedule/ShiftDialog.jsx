import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import CarerSuggestions from "./CarerSuggestions";

export default function ShiftDialog({ shift, carers, clients, shifts, leaveRequests, onClose }) {
  const [formData, setFormData] = useState({
    client_id: shift?.client_id || "",
    carer_id: shift?.carer_id || "",
    date: shift?.date || format(new Date(), "yyyy-MM-dd"),
    start_time: shift?.start_time || "09:00",
    end_time: shift?.end_time || "17:00",
    shift_type: shift?.shift_type || "morning",
    status: shift?.status || "unfilled",
    tasks: shift?.tasks?.join(", ") || "",
    notes: shift?.notes || "",
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const shiftData = {
        ...data,
        tasks: data.tasks ? data.tasks.split(",").map(t => t.trim()).filter(Boolean) : [],
        duration_hours: calculateDuration(data.start_time, data.end_time),
      };

      if (shift) {
        return base44.entities.Shift.update(shift.id, shiftData);
      } else {
        return base44.entities.Shift.create(shiftData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === "client_id" && value && !formData.carer_id) {
      setShowSuggestions(true);
    }
  };

  const handleSelectCarer = (carerId) => {
    setFormData(prev => ({ 
      ...prev, 
      carer_id: carerId,
      status: "scheduled"
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.date || !formData.start_time || !formData.end_time) {
      alert("Please fill in all required fields");
      return;
    }

    saveMutation.mutate(formData);
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {shift ? "Edit Shift" : "Create New Shift"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleInputChange("client_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.status === 'active').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange("start_time", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange("end_time", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shift_type">Shift Type</Label>
                <Select
                  value={formData.shift_type}
                  onValueChange={(value) => handleInputChange("shift_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="supervision">Supervision</SelectItem>
                    <SelectItem value="shadowing">Shadowing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tasks">Tasks (comma separated)</Label>
                <Textarea
                  id="tasks"
                  value={formData.tasks}
                  onChange={(e) => handleInputChange("tasks", e.target.value)}
                  placeholder="e.g., Medication, Personal care, Meal preparation"
                  className="h-24"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes or instructions"
                  className="h-24"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Assigned Carer</Label>
                {formData.client_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                  >
                    {showSuggestions ? "Hide" : "Show"} Suggestions
                  </Button>
                )}
              </div>

              {formData.carer_id && !showSuggestions ? (
                <div className="p-4 border rounded-lg bg-green-50">
                  <p className="text-sm text-gray-600 mb-1">Currently Assigned:</p>
                  <p className="font-medium text-lg">
                    {carers.find(c => c.id === formData.carer_id)?.full_name}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, carer_id: "", status: "unfilled" }));
                      setShowSuggestions(true);
                    }}
                  >
                    Change Carer
                  </Button>
                </div>
              ) : null}

              {showSuggestions && formData.client_id && (
                <CarerSuggestions
                  client={selectedClient}
                  carers={carers}
                  shifts={shifts}
                  leaveRequests={leaveRequests}
                  selectedDate={formData.date}
                  startTime={formData.start_time}
                  endTime={formData.end_time}
                  onSelectCarer={handleSelectCarer}
                  currentShiftId={shift?.id}
                />
              )}

              {!formData.client_id && (
                <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-400">
                  <p>Select a client first to see carer suggestions</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
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
                shift ? "Update Shift" : "Create Shift"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}