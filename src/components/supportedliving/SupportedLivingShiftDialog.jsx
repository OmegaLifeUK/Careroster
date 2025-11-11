import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export default function SupportedLivingShiftDialog({ shift, properties, clients, staff, onSave, onClose }) {
  const [formData, setFormData] = useState({
    property_id: "",
    staff_id: "",
    date: "",
    start_time: "",
    end_time: "",
    shift_type: "visiting_support",
    clients_supported: [],
    planned_activities: [],
    status: "draft",
    shift_notes: "",
  });

  const [newActivity, setNewActivity] = useState("");

  useEffect(() => {
    if (shift) {
      setFormData({
        property_id: shift.property_id || "",
        staff_id: shift.staff_id || "",
        date: shift.date || "",
        start_time: shift.start_time || "",
        end_time: shift.end_time || "",
        shift_type: shift.shift_type || "visiting_support",
        clients_supported: shift.clients_supported || [],
        planned_activities: shift.planned_activities || [],
        status: shift.status || "draft",
        shift_notes: shift.shift_notes || "",
      });
    } else {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: today }));
    }
  }, [shift]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.property_id || !formData.date || !formData.start_time || !formData.end_time) {
      alert("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  const handleClientToggle = (clientId) => {
    setFormData(prev => ({
      ...prev,
      clients_supported: prev.clients_supported.includes(clientId)
        ? prev.clients_supported.filter(id => id !== clientId)
        : [...prev.clients_supported, clientId]
    }));
  };

  const handleAddActivity = () => {
    if (newActivity.trim()) {
      setFormData(prev => ({
        ...prev,
        planned_activities: [...prev.planned_activities, newActivity.trim()]
      }));
      setNewActivity("");
    }
  };

  const handleRemoveActivity = (index) => {
    setFormData(prev => ({
      ...prev,
      planned_activities: prev.planned_activities.filter((_, idx) => idx !== index)
    }));
  };

  const propertyClients = clients.filter(c => c.property_id === formData.property_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {shift ? 'Edit Shift' : 'Create New Shift'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Property & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property *
              </label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData({...formData, property_id: e.target.value, clients_supported: []})}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value="">Select property...</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>
                    {prop.property_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Time & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shift Type *
              </label>
              <select
                value={formData.shift_type}
                onChange={(e) => setFormData({...formData, shift_type: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value="visiting_support">Visiting Support</option>
                <option value="core_hours">Core Hours</option>
                <option value="sleep_in">Sleep-In</option>
                <option value="waking_night">Waking Night</option>
                <option value="on_call">On-Call</option>
              </select>
            </div>
          </div>

          {/* Staff Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Staff Member
            </label>
            <select
              value={formData.staff_id}
              onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Unassigned</option>
              {staff.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Clients Supported */}
          {formData.property_id && propertyClients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clients Supported
              </label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {propertyClients.map(client => (
                  <label key={client.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.clients_supported.includes(client.id)}
                      onChange={() => handleClientToggle(client.id)}
                      className="w-4 h-4"
                    />
                    <span>{client.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Planned Activities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planned Activities
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add activity..."
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddActivity}
                variant="outline"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.planned_activities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.planned_activities.map((activity, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1">
                    {activity}
                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(idx)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Shift Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift Notes
            </label>
            <Textarea
              placeholder="Add any special instructions or notes..."
              value={formData.shift_notes}
              onChange={(e) => setFormData({...formData, shift_notes: e.target.value})}
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full p-2 border rounded-lg"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {shift ? 'Update Shift' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}