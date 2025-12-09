import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Phone, MapPin, Calendar, Users, Bus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export default function DayCentreClientDialog({ client, staff = [], onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!client;

  const [formData, setFormData] = useState({
    full_name: client?.full_name || "",
    date_of_birth: client?.date_of_birth || "",
    phone: client?.phone || "",
    address: client?.address || { street: "", city: "", postcode: "" },
    emergency_contact: client?.emergency_contact || { name: "", phone: "", relationship: "" },
    mobility: client?.mobility || "independent",
    transport_arrangement: client?.transport_arrangement || "self_transport",
    pick_up_time: client?.pick_up_time || "",
    drop_off_time: client?.drop_off_time || "",
    contracted_sessions_per_week: client?.contracted_sessions_per_week || 2,
    attendance_days: client?.attendance_days || [],
    dietary_requirements: client?.dietary_requirements || [],
    interests_and_hobbies: client?.interests_and_hobbies || [],
    support_needs: client?.support_needs || "",
    key_worker_id: client?.key_worker_id || "",
    funding_type: client?.funding_type || "local_authority",
    status: client?.status || "active",
  });

  const [newInterest, setNewInterest] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DayCentreClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-clients'] });
      toast.success("Client Added", "New client created successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create client");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DayCentreClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-clients'] });
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

  const toggleDay = (day) => {
    setFormData({
      ...formData,
      attendance_days: formData.attendance_days.includes(day)
        ? formData.attendance_days.filter(d => d !== day)
        : [...formData.attendance_days, day]
    });
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      setFormData({
        ...formData,
        interests_and_hobbies: [...formData.interests_and_hobbies, newInterest.trim()]
      });
      setNewInterest("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Client" : "Add New Client"}
            </h2>
            <p className="text-amber-100 text-sm">Day Centre Participant</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
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

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Address */}
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

            {/* Mobility and Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="mobility">Mobility</Label>
                <Select
                  value={formData.mobility}
                  onValueChange={(value) => setFormData({ ...formData, mobility: value })}
                >
                  <SelectTrigger id="mobility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="requires_assistance">Requires Assistance</SelectItem>
                    <SelectItem value="wheelchair_user">Wheelchair User</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transport */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="transport">Transport</Label>
                <Select
                  value={formData.transport_arrangement}
                  onValueChange={(value) => setFormData({ ...formData, transport_arrangement: value })}
                >
                  <SelectTrigger id="transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self_transport">Self Transport</SelectItem>
                    <SelectItem value="family_transport">Family Transport</SelectItem>
                    <SelectItem value="centre_transport">Centre Transport</SelectItem>
                    <SelectItem value="taxi">Taxi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pick_up_time">Pick-up Time</Label>
                <Input
                  id="pick_up_time"
                  type="time"
                  value={formData.pick_up_time}
                  onChange={(e) => setFormData({ ...formData, pick_up_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="drop_off_time">Drop-off Time</Label>
                <Input
                  id="drop_off_time"
                  type="time"
                  value={formData.drop_off_time}
                  onChange={(e) => setFormData({ ...formData, drop_off_time: e.target.value })}
                />
              </div>
            </div>

            {/* Sessions and Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessions_per_week">Sessions Per Week</Label>
                <Input
                  id="sessions_per_week"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.contracted_sessions_per_week}
                  onChange={(e) => setFormData({ ...formData, contracted_sessions_per_week: parseInt(e.target.value) })}
                />
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
            </div>

            {/* Attendance Days */}
            <div>
              <Label className="mb-3 block">Attendance Days</Label>
              <div className="flex flex-wrap gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.attendance_days.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day)}
                    className={formData.attendance_days.includes(day) ? "bg-amber-500" : ""}
                  >
                    {day.substring(0, 3).toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <Label className="mb-2 block">Interests & Hobbies</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add interest..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                />
                <Button type="button" onClick={addInterest} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.interests_and_hobbies.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                    <span className="text-sm">{item}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        interests_and_hobbies: formData.interests_and_hobbies.filter((_, i) => i !== idx)
                      })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Needs */}
            <div>
              <Label htmlFor="support_needs">Support Needs</Label>
              <Textarea
                id="support_needs"
                value={formData.support_needs}
                onChange={(e) => setFormData({ ...formData, support_needs: e.target.value })}
                placeholder="Describe any specific support needs..."
                rows={3}
              />
            </div>

            {/* Emergency Contact */}
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
            className="bg-amber-600 hover:bg-amber-700"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isEditing
              ? "Update Client"
              : "Add Client"}
          </Button>
        </div>
      </div>
    </div>
  );
}