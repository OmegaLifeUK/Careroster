import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Calendar, Clock, Users, User, MapPin, Repeat } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export default function SessionDialog({ session, activities = [], staff = [], clients = [], onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!session;

  const [formData, setFormData] = useState({
    activity_id: session?.activity_id || "",
    session_date: session?.session_date || new Date().toISOString().split('T')[0],
    start_time: session?.start_time || "09:00",
    end_time: session?.end_time || "16:00",
    location: session?.location || "",
    max_capacity: session?.max_capacity || 10,
    facilitator_staff_ids: session?.facilitator_staff_ids || [],
    registered_clients: session?.registered_clients || [],
    session_notes: session?.session_notes || "",
    status: session?.status || "scheduled",
    is_recurring: session?.is_recurring || false,
    recurrence_pattern: session?.recurrence_pattern || "weekly",
  });

  const selectedActivity = activities.find(a => a.id === formData.activity_id);

  useEffect(() => {
    if (selectedActivity) {
      setFormData(prev => ({
        ...prev,
        location: prev.location || selectedActivity.location || "",
        max_capacity: prev.max_capacity || selectedActivity.max_participants || 10,
      }));
    }
  }, [selectedActivity]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DayCentreSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-sessions'] });
      toast.success("Session Created", "Session scheduled successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create session");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DayCentreSession.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-sessions'] });
      toast.success("Session Updated", "Changes saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to update session");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.activity_id || !formData.session_date || !formData.start_time || !formData.end_time) {
      toast.error("Missing Fields", "Please fill in all required fields");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: session.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleStaff = (staffId) => {
    setFormData(prev => ({
      ...prev,
      facilitator_staff_ids: prev.facilitator_staff_ids.includes(staffId)
        ? prev.facilitator_staff_ids.filter(id => id !== staffId)
        : [...prev.facilitator_staff_ids, staffId]
    }));
  };

  const toggleClient = (clientId) => {
    setFormData(prev => ({
      ...prev,
      registered_clients: prev.registered_clients.includes(clientId)
        ? prev.registered_clients.filter(id => id !== clientId)
        : [...prev.registered_clients, clientId]
    }));
  };

  const activeStaff = staff.filter(s => s.is_active !== false);
  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Session" : "Schedule New Session"}
            </h2>
            <p className="text-amber-100 text-sm">
              {isEditing ? "Update session details" : "Create a new activity session"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Activity Selection */}
            <div>
              <Label htmlFor="activity_id" className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                Activity <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.activity_id}
                onValueChange={(value) => setFormData({ ...formData, activity_id: value })}
              >
                <SelectTrigger id="activity_id">
                  <SelectValue placeholder="Select an activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.filter(a => a.is_active !== false).map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.activity_name} ({activity.category?.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedActivity && (
                <p className="text-sm text-gray-600 mt-1">{selectedActivity.description}</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="session_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="session_date"
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="start_time" className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time" className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Location and Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Main Hall, Art Room"
                />
              </div>
              <div>
                <Label htmlFor="max_capacity" className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  Max Capacity
                </Label>
                <Input
                  id="max_capacity"
                  type="number"
                  min="1"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="mb-2 block">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
              <div className="flex-1">
                <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="w-4 h-4" />
                  Recurring Session
                </Label>
                <p className="text-sm text-gray-600">Schedule this session to repeat</p>
              </div>
              {formData.is_recurring && (
                <Select
                  value={formData.recurrence_pattern}
                  onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Facilitators */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                Facilitators ({formData.facilitator_staff_ids.length} selected)
              </Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {activeStaff.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No staff available</p>
                  ) : (
                    activeStaff.map((staffMember) => (
                      <div key={staffMember.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`staff-${staffMember.id}`}
                          checked={formData.facilitator_staff_ids.includes(staffMember.id)}
                          onCheckedChange={() => toggleStaff(staffMember.id)}
                        />
                        <Label htmlFor={`staff-${staffMember.id}`} className="cursor-pointer flex-1">
                          {staffMember.full_name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Registered Clients */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                Registered Participants ({formData.registered_clients.length}/{formData.max_capacity})
              </Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {activeClients.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No clients available</p>
                  ) : (
                    activeClients.map((client) => (
                      <div key={client.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={formData.registered_clients.includes(client.id)}
                          onCheckedChange={() => toggleClient(client.id)}
                          disabled={
                            !formData.registered_clients.includes(client.id) &&
                            formData.registered_clients.length >= formData.max_capacity
                          }
                        />
                        <Label
                          htmlFor={`client-${client.id}`}
                          className={`cursor-pointer flex-1 ${
                            !formData.registered_clients.includes(client.id) &&
                            formData.registered_clients.length >= formData.max_capacity
                              ? 'opacity-50'
                              : ''
                          }`}
                        >
                          {client.full_name}
                          {client.mobility && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({client.mobility.replace('_', ' ')})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {formData.registered_clients.length >= formData.max_capacity && (
                <p className="text-sm text-orange-600 mt-2">Session is at full capacity</p>
              )}
            </div>

            {/* Session Notes */}
            <div>
              <Label htmlFor="session_notes" className="mb-2 block">Session Notes</Label>
              <Textarea
                id="session_notes"
                value={formData.session_notes}
                onChange={(e) => setFormData({ ...formData, session_notes: e.target.value })}
                placeholder="Add any special notes or instructions for this session..."
                rows={3}
              />
            </div>
          </div>
        </form>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-amber-600 hover:bg-amber-700"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isEditing
              ? "Update Session"
              : "Schedule Session"}
          </Button>
        </div>
      </div>
    </div>
  );
}