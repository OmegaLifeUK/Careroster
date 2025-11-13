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
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ClientDialog({ client, carers = [], onClose }) {
  const [formData, setFormData] = useState({
    full_name: client?.full_name || "",
    date_of_birth: client?.date_of_birth || "",
    phone: client?.phone || "",
    status: client?.status || "active",
    funding_type: client?.funding_type || "self_funded",
    mobility: client?.mobility || "independent",
    address: client?.address || { street: "", city: "", postcode: "" },
    emergency_contact: client?.emergency_contact || { name: "", phone: "", relationship: "" },
    care_needs: client?.care_needs || [],
    preferred_carers: client?.preferred_carers || [],
    medical_notes: client?.medical_notes || "",
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (client && client.id) {
        return base44.entities.Client.update(client.id, data);
      } else {
        return base44.entities.Client.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (error) => {
      console.error("Error saving client:", error);
      alert("Failed to save client. Please try again.");
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleCareNeedsChange = (value) => {
    const needs = value.split(',').map(n => n.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, care_needs: needs }));
  };

  const handlePreferredCarerToggle = (carerId) => {
    setFormData(prev => {
      const preferred = prev.preferred_carers || [];
      const hasPreferred = preferred.includes(carerId);
      return {
        ...prev,
        preferred_carers: hasPreferred 
          ? preferred.filter(c => c !== carerId)
          : [...preferred, carerId]
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.full_name) {
      alert("Please enter client name");
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const activeCarers = Array.isArray(carers) ? carers.filter(c => c && c.status === 'active') : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add New Client"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="funding_type">Funding Type</Label>
                <Select value={formData.funding_type} onValueChange={(value) => handleInputChange("funding_type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local_authority">Local Authority</SelectItem>
                    <SelectItem value="self_funded">Self Funded</SelectItem>
                    <SelectItem value="nhs">NHS</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mobility">Mobility</Label>
                <Select value={formData.mobility} onValueChange={(value) => handleInputChange("mobility", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="requires_assistance">Requires Assistance</SelectItem>
                    <SelectItem value="wheelchair_user">Wheelchair User</SelectItem>
                    <SelectItem value="bed_bound">Bed Bound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Address</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Street"
                  value={formData.address.street}
                  onChange={(e) => handleNestedChange("address", "street", e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={formData.address.city}
                  onChange={(e) => handleNestedChange("address", "city", e.target.value)}
                />
                <Input
                  placeholder="Postcode"
                  value={formData.address.postcode}
                  onChange={(e) => handleNestedChange("address", "postcode", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="care_needs">Care Needs (comma separated)</Label>
              <Textarea
                id="care_needs"
                value={Array.isArray(formData.care_needs) ? formData.care_needs.join(', ') : ''}
                onChange={(e) => handleCareNeedsChange(e.target.value)}
                placeholder="e.g., Personal care, Medication management, Meal preparation"
                className="h-20"
              />
            </div>

            {activeCarers.length > 0 && (
              <div>
                <Label className="mb-2 block">Preferred Carers (for continuity of care)</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                  {activeCarers.map(carer => (
                    <div key={carer.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`carer-${carer.id}`}
                        checked={formData.preferred_carers?.includes(carer.id)}
                        onCheckedChange={() => handlePreferredCarerToggle(carer.id)}
                      />
                      <Label htmlFor={`carer-${carer.id}`} className="cursor-pointer text-sm">
                        {carer.full_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="medical_notes">Medical Notes</Label>
              <Textarea
                id="medical_notes"
                value={formData.medical_notes}
                onChange={(e) => handleInputChange("medical_notes", e.target.value)}
                placeholder="Important medical information"
                className="h-24"
              />
            </div>

            <div>
              <Label className="mb-2 block">Emergency Contact</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Name"
                  value={formData.emergency_contact.name}
                  onChange={(e) => handleNestedChange("emergency_contact", "name", e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.emergency_contact.phone}
                  onChange={(e) => handleNestedChange("emergency_contact", "phone", e.target.value)}
                />
                <Input
                  placeholder="Relationship"
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => handleNestedChange("emergency_contact", "relationship", e.target.value)}
                />
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
                client ? "Update Client" : "Create Client"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}