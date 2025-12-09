import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Home, MapPin, Users, Key, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export default function PropertyDialog({ property, staff = [], onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!property;

  const [formData, setFormData] = useState({
    property_name: property?.property_name || "",
    address: property?.address || { street: "", city: "", postcode: "" },
    property_type: property?.property_type || "shared_house",
    total_capacity: property?.total_capacity || 1,
    current_occupancy: property?.current_occupancy || 0,
    support_model: property?.support_model || "visiting_support",
    facilities: property?.facilities || [],
    access_instructions: property?.access_instructions || "",
    landlord: property?.landlord || "",
    rent_amount: property?.rent_amount || 0,
    property_manager_id: property?.property_manager_id || "",
    status: property?.status || "active",
  });

  const [newFacility, setNewFacility] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportedLivingProperty.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported-living-properties'] });
      toast.success("Property Added", "New property created successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create property");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportedLivingProperty.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported-living-properties'] });
      toast.success("Property Updated", "Changes saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to update property");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.property_name) {
      toast.error("Missing Field", "Property name is required");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: property.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFacility = () => {
    if (newFacility.trim()) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, newFacility.trim()]
      });
      setNewFacility("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Property" : "Add New Property"}
            </h2>
            <p className="text-indigo-100 text-sm">Supported Living Property</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="property_name">Property Name <span className="text-red-500">*</span></Label>
              <Input
                id="property_name"
                value={formData.property_name}
                onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="mb-2 block">Address</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, city: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Postcode"
                    value={formData.address.postcode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, postcode: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property_type">Property Type</Label>
                <Select
                  value={formData.property_type}
                  onValueChange={(value) => setFormData({ ...formData, property_type: value })}
                >
                  <SelectTrigger id="property_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_flat">Single Flat</SelectItem>
                    <SelectItem value="shared_house">Shared House</SelectItem>
                    <SelectItem value="cluster_flat">Cluster Flat</SelectItem>
                    <SelectItem value="bungalow">Bungalow</SelectItem>
                    <SelectItem value="bedsit">Bedsit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="support_model">Support Model</Label>
                <Select
                  value={formData.support_model}
                  onValueChange={(value) => setFormData({ ...formData, support_model: value })}
                >
                  <SelectTrigger id="support_model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visiting_support">Visiting Support</SelectItem>
                    <SelectItem value="on_site_support">On-Site Support</SelectItem>
                    <SelectItem value="sleep_in">Sleep-In</SelectItem>
                    <SelectItem value="waking_night">Waking Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="capacity">Total Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.total_capacity}
                  onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="occupancy">Current Occupancy</Label>
                <Input
                  id="occupancy"
                  type="number"
                  min="0"
                  max={formData.total_capacity}
                  value={formData.current_occupancy}
                  onChange={(e) => setFormData({ ...formData, current_occupancy: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="rent">Rent/Month (£)</Label>
                <Input
                  id="rent"
                  type="number"
                  min="0"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="landlord">Landlord</Label>
                <Input
                  id="landlord"
                  value={formData.landlord}
                  onChange={(e) => setFormData({ ...formData, landlord: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="property_manager">Property Manager</Label>
                <Select
                  value={formData.property_manager_id}
                  onValueChange={(value) => setFormData({ ...formData, property_manager_id: value })}
                >
                  <SelectTrigger id="property_manager">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => s.is_active !== false).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="access_instructions" className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4" />
                Access Instructions
              </Label>
              <Textarea
                id="access_instructions"
                value={formData.access_instructions}
                onChange={(e) => setFormData({ ...formData, access_instructions: e.target.value })}
                placeholder="Key safe location, entry codes, access notes..."
                rows={2}
              />
            </div>

            <div>
              <Label className="mb-2 block">Facilities</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newFacility}
                  onChange={(e) => setNewFacility(e.target.value)}
                  placeholder="Add facility..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFacility())}
                />
                <Button type="button" onClick={addFacility} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.facilities.map((facility, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-sm">{facility}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        facilities: formData.facilities.filter((_, i) => i !== idx)
                      })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isEditing ? "Update Property" : "Add Property"}
          </Button>
        </div>
      </div>
    </div>
  );
}