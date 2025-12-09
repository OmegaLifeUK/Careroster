import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Activity, MapPin, Users, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export default function ActivityDialog({ activity, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!activity;

  const [formData, setFormData] = useState({
    activity_name: activity?.activity_name || "",
    description: activity?.description || "",
    category: activity?.category || "arts_crafts",
    max_participants: activity?.max_participants || 10,
    staff_required: activity?.staff_required || 1,
    location: activity?.location || "main_hall",
    equipment_needed: activity?.equipment_needed || [],
    risk_level: activity?.risk_level || "low",
    accessibility: activity?.accessibility || [],
    benefits: activity?.benefits || [],
    is_active: activity?.is_active !== false,
  });

  const [newEquipment, setNewEquipment] = useState("");
  const [newBenefit, setNewBenefit] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DayCentreActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-activities'] });
      toast.success("Activity Created", "New activity added successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create activity");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DayCentreActivity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-activities'] });
      toast.success("Activity Updated", "Changes saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to update activity");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.activity_name || !formData.category) {
      toast.error("Missing Fields", "Please fill in all required fields");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: activity.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addEquipment = () => {
    if (newEquipment.trim()) {
      setFormData({
        ...formData,
        equipment_needed: [...formData.equipment_needed, newEquipment.trim()]
      });
      setNewEquipment("");
    }
  };

  const removeEquipment = (index) => {
    setFormData({
      ...formData,
      equipment_needed: formData.equipment_needed.filter((_, i) => i !== index)
    });
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()]
      });
      setNewBenefit("");
    }
  };

  const removeBenefit = (index) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index)
    });
  };

  const toggleAccessibility = (feature) => {
    setFormData({
      ...formData,
      accessibility: formData.accessibility.includes(feature)
        ? formData.accessibility.filter(f => f !== feature)
        : [...formData.accessibility, feature]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Activity" : "Create New Activity"}
            </h2>
            <p className="text-amber-100 text-sm">
              {isEditing ? "Update activity details" : "Add a new activity to your library"}
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
            {/* Activity Name */}
            <div>
              <Label htmlFor="activity_name" className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" />
                Activity Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="activity_name"
                value={formData.activity_name}
                onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                placeholder="e.g., Morning Art Class, Gentle Exercise"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="mb-2 block">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the activity and what participants will do..."
                rows={3}
              />
            </div>

            {/* Category and Risk Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="mb-2 block">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arts_crafts">Arts & Crafts</SelectItem>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="life_skills">Life Skills</SelectItem>
                    <SelectItem value="therapeutic">Therapeutic</SelectItem>
                    <SelectItem value="recreational">Recreational</SelectItem>
                    <SelectItem value="community_access">Community Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="risk_level" className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Level
                </Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                >
                  <SelectTrigger id="risk_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location, Max Participants, Staff Required */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                >
                  <SelectTrigger id="location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_hall">Main Hall</SelectItem>
                    <SelectItem value="art_room">Art Room</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="garden">Garden</SelectItem>
                    <SelectItem value="quiet_room">Quiet Room</SelectItem>
                    <SelectItem value="gym">Gym</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="max_participants" className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  Max Participants
                </Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="staff_required" className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  Staff Required
                </Label>
                <Input
                  id="staff_required"
                  type="number"
                  min="1"
                  value={formData.staff_required}
                  onChange={(e) => setFormData({ ...formData, staff_required: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Equipment Needed */}
            <div>
              <Label className="mb-2 block">Equipment Needed</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  placeholder="Add equipment item..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
                />
                <Button type="button" onClick={addEquipment} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.equipment_needed.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                    <span className="text-sm">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeEquipment(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <Label className="mb-2 block">Therapeutic/Developmental Benefits</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add benefit..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                />
                <Button type="button" onClick={addBenefit} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.benefits.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
                    <span className="text-sm">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeBenefit(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Accessibility Features */}
            <div>
              <Label className="mb-3 block">Accessibility Features</Label>
              <div className="space-y-2">
                {[
                  { value: 'wheelchair_accessible', label: 'Wheelchair Accessible' },
                  { value: 'sensory_friendly', label: 'Sensory Friendly' },
                  { value: 'low_mobility_suitable', label: 'Low Mobility Suitable' },
                  { value: 'adapted_equipment', label: 'Adapted Equipment Available' },
                ].map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`accessibility-${value}`}
                      checked={formData.accessibility.includes(value)}
                      onCheckedChange={() => toggleAccessibility(value)}
                    />
                    <Label htmlFor={`accessibility-${value}`} className="cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer flex-1">
                <span className="font-medium">Active Activity</span>
                <p className="text-sm text-gray-600">Uncheck to hide from session scheduling</p>
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
            className="bg-amber-600 hover:bg-amber-700"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isEditing
              ? "Update Activity"
              : "Create Activity"}
          </Button>
        </div>
      </div>
    </div>
  );
}