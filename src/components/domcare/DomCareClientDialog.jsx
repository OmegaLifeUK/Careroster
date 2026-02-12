import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Phone, MapPin, Key } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export default function DomCareClientDialog({ client, staff = [], onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!client;

  const [formData, setFormData] = useState({
    full_name: client?.full_name || "",
    phone: client?.phone || "",
    address: client?.address || { street: "", city: "", postcode: "" },
    access_instructions: client?.access_instructions || "",
    emergency_contact: client?.emergency_contact || { name: "", phone: "", relationship: "" },
    care_needs: client?.care_needs || [],
    medical_notes: client?.medical_notes || "",
    standard_visit_duration: client?.standard_visit_duration || 30,
    preferred_staff: client?.preferred_staff || [],
    funding_type: client?.funding_type || "local_authority",
    status: client?.status || "active",
  });

  const [newCareNeed, setNewCareNeed] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DomCareClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domcare-clients'] });
      toast.success("Client Added", "New client created successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create client");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // If client status changed to inactive/archived, cancel future visits
      if (client.status === 'active' && (data.status === 'inactive' || data.status === 'archived')) {
        const allVisits = await base44.entities.Visit.list();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureVisits = allVisits.filter(visit => {
          if (visit.client_id !== client.id) return false;
          if (!visit.scheduled_start) return false;
          const visitDate = new Date(visit.scheduled_start);
          return visitDate >= today;
        });
        
        // Cancel all future visits
        for (const visit of futureVisits) {
          await base44.entities.Visit.update(visit.id, {
            status: 'cancelled',
            visit_notes: `${visit.visit_notes || ''}\n[System] Client ${data.status === 'archived' ? 'archived' : 'discharged'} - visit cancelled`.trim()
          });
        }
        
        // Notify managers
        if (futureVisits.length > 0) {
          await base44.entities.Notification.create({
            recipient_id: 'admin',
            title: `Visits Cancelled - Client ${data.status === 'archived' ? 'Archived' : 'Discharged'}`,
            message: `${futureVisits.length} future visit(s) cancelled for ${data.full_name} due to ${data.status} status.`,
            type: 'general',
            priority: 'high',
            is_read: false,
          });
        }
      }
      
      return await base44.entities.DomCareClient.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domcare-clients'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success("Client Updated", "Changes saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to update client");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.full_name) {
      toast.error("Missing Field", "Client name is required");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: client.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addCareNeed = () => {
    if (newCareNeed.trim()) {
      setFormData({
        ...formData,
        care_needs: [...formData.care_needs, newCareNeed.trim()]
      });
      setNewCareNeed("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-green-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Client" : "Add New Client"}
            </h2>
            <p className="text-blue-100 text-sm">Domiciliary Care Client</p>
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
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

            <div>
              <Label htmlFor="access_instructions" className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4" />
                Access Instructions
              </Label>
              <Textarea
                id="access_instructions"
                value={formData.access_instructions}
                onChange={(e) => setFormData({ ...formData, access_instructions: e.target.value })}
                placeholder="Key safe location, entry codes, special access notes..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="visit_duration">Standard Visit (mins)</Label>
                <Input
                  id="visit_duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.standard_visit_duration}
                  onChange={(e) => setFormData({ ...formData, standard_visit_duration: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="funding_type">Funding Type</Label>
                <Select
                  value={formData.funding_type}
                  onValueChange={(value) => setFormData({ ...formData, funding_type: value })}
                >
                  <SelectTrigger id="funding_type">
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
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Care Needs</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newCareNeed}
                  onChange={(e) => setNewCareNeed(e.target.value)}
                  placeholder="Add care need..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCareNeed())}
                />
                <Button type="button" onClick={addCareNeed} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.care_needs.map((need, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                    <span className="text-sm">{need}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        care_needs: formData.care_needs.filter((_, i) => i !== idx)
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
              <Label htmlFor="medical_notes">Medical Notes</Label>
              <Textarea
                id="medical_notes"
                value={formData.medical_notes}
                onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                placeholder="Important medical information..."
                rows={2}
              />
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <Label className="mb-3 block font-semibold text-red-900">Emergency Contact</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Name"
                  value={formData.emergency_contact.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                  })}
                />
                <Input
                  placeholder="Phone"
                  value={formData.emergency_contact.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                  })}
                />
                <Input
                  placeholder="Relationship"
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                  })}
                />
              </div>
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
              : isEditing ? "Update Client" : "Add Client"}
          </Button>
        </div>
      </div>
    </div>
  );
}