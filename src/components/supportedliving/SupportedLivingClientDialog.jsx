import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Phone, Mail, Home, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export default function SupportedLivingClientDialog({ client, properties = [], staff = [], onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!client;

  const [formData, setFormData] = useState({
    full_name: client?.full_name || "",
    date_of_birth: client?.date_of_birth || "",
    phone: client?.phone || "",
    email: client?.email || "",
    property_id: client?.property_id || "",
    tenancy_start_date: client?.tenancy_start_date || "",
    support_level: client?.support_level || "medium",
    support_hours_per_week: client?.support_hours_per_week || 10,
    key_worker_id: client?.key_worker_id || "",
    preferred_staff: client?.preferred_staff || [],
    life_skills_goals: client?.life_skills_goals || [],
    funding_type: client?.funding_type || "local_authority",
    emergency_contact: client?.emergency_contact || { name: "", phone: "", relationship: "" },
    status: client?.status || "active",
  });

  const [newGoal, setNewGoal] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportedLivingClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported-living-clients'] });
      toast.success("Client Added", "New client created successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create client");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportedLivingClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported-living-clients'] });
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

  const addGoal = () => {
    if (newGoal.trim()) {
      setFormData({
        ...formData,
        life_skills_goals: [...formData.life_skills_goals, newGoal.trim()]
      });
      setNewGoal("");
    }
  };

  const toggleStaff = (staffId) => {
    setFormData({
      ...formData,
      preferred_staff: formData.preferred_staff.includes(staffId)
        ? formData.preferred_staff.filter(id => id !== staffId)
        : [...formData.preferred_staff, staffId]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Client" : "Add New Client"}
            </h2>
            <p className="text-indigo-100 text-sm">Supported Living Tenant</p>
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
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property">Property</Label>
                <Select
                  value={formData.property_id}
                  onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                >
                  <SelectTrigger id="property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.filter(p => p.status === 'active' || p.status === 'full').map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.property_name} ({p.current_occupancy}/{p.total_capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tenancy_start">Tenancy Start Date</Label>
                <Input
                  id="tenancy_start"
                  type="date"
                  value={formData.tenancy_start_date}
                  onChange={(e) => setFormData({ ...formData, tenancy_start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="support_level">Support Level</Label>
                <Select
                  value={formData.support_level}
                  onValueChange={(value) => setFormData({ ...formData, support_level: value })}
                >
                  <SelectTrigger id="support_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="intensive">Intensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hours_per_week">Support Hours/Week</Label>
                <Input
                  id="hours_per_week"
                  type="number"
                  min="0"
                  value={formData.support_hours_per_week}
                  onChange={(e) => setFormData({ ...formData, support_hours_per_week: parseInt(e.target.value) })}
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
            </div>

            <div>
              <Label htmlFor="key_worker">Key Worker</Label>
              <Select
                value={formData.key_worker_id}
                onValueChange={(value) => setFormData({ ...formData, key_worker_id: value })}
              >
                <SelectTrigger id="key_worker">
                  <SelectValue placeholder="Select key worker" />
                </SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.is_active !== false).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Life Skills Goals</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Add goal..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                />
                <Button type="button" onClick={addGoal} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.life_skills_goals.map((goal, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                    <span className="text-sm">{goal}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        life_skills_goals: formData.life_skills_goals.filter((_, i) => i !== idx)
                      })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
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
            className="bg-indigo-600 hover:bg-indigo-700"
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