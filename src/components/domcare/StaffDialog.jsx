import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, User, Phone, Mail, Car, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export default function StaffDialog({ staff, onClose, defaultCareSetting }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!staff;

  const [formData, setFormData] = useState({
    full_name: staff?.full_name || "",
    email: staff?.email || "",
    phone: staff?.phone || "",
    care_setting: staff?.care_setting || defaultCareSetting || "domiciliary",
    is_active: staff?.is_active !== false,
    vehicle_type: staff?.vehicle_type || "car",
    max_visits_per_day: staff?.max_visits_per_day || 8,
    hourly_rate: staff?.hourly_rate || 12,
    preferred_areas: staff?.preferred_areas || [],
    address: staff?.address || { street: "", city: "", postcode: "" },
  });

  const [newArea, setNewArea] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success("Staff Added", "New staff member created");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create staff member");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success("Staff Updated", "Changes saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to update staff member");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.phone) {
      toast.error("Missing Fields", "Please fill in all required fields");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: staff.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addArea = () => {
    if (newArea.trim()) {
      setFormData({
        ...formData,
        preferred_areas: [...formData.preferred_areas, newArea.trim()]
      });
      setNewArea("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-green-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Staff Member" : "Add New Staff"}
            </h2>
            <p className="text-blue-100 text-sm">Domiciliary Care Team</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="care_setting">Care Setting <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.care_setting}
                  onValueChange={(value) => setFormData({ ...formData, care_setting: value })}
                >
                  <SelectTrigger id="care_setting">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="domiciliary">Domiciliary</SelectItem>
                    <SelectItem value="supported_living">Supported Living</SelectItem>
                    <SelectItem value="day_centre">Day Centre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="public_transport">Public Transport</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_visits">Max Visits Per Day</Label>
                <Input
                  id="max_visits"
                  type="number"
                  min="1"
                  value={formData.max_visits_per_day}
                  onChange={(e) => setFormData({ ...formData, max_visits_per_day: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Preferred Areas / Postcodes</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="e.g., SW1A 1AA or Westminster"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
                />
                <Button type="button" onClick={addArea} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.preferred_areas.map((area, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                    <span className="text-sm">{area}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        preferred_areas: formData.preferred_areas.filter((_, i) => i !== idx)
                      })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                <span className="font-medium">Active Staff Member</span>
              </Label>
            </div>
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isEditing ? "Update Staff" : "Add Staff"}
          </Button>
        </div>
      </div>
    </div>
  );
}