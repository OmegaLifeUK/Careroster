import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { geocodeAndUpdateAddress, assignMandatoryTraining } from "@/components/workflow/AutomatedWorkflowEngine";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CarerDialog({ carer, qualifications, onClose }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: carer?.full_name || "",
    email: carer?.email || "",
    phone: carer?.phone || "",
    care_setting: carer?.care_setting || "residential",
    status: carer?.status || "active",
    employment_type: carer?.employment_type || "full_time",
    hourly_rate: carer?.hourly_rate || 15,
    available_for_overtime: carer?.available_for_overtime || false,
    overtime_max_hours: carer?.overtime_max_hours || "",
    qualifications: carer?.qualifications || [],
    address: carer?.address || { street: "", city: "", postcode: "" },
    emergency_contact: carer?.emergency_contact || { name: "", phone: "", relationship: "" },
    dbs_certificate_number: carer?.dbs_certificate_number || "",
    dbs_expiry: carer?.dbs_expiry || "",
  });

  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [newCarerId, setNewCarerId] = useState(null);

  const queryClient = useQueryClient();

  // Check existing users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        return [];
      }
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email) => {
      return await base44.users.inviteUser(email, "user");
    },
    onSuccess: () => {
      toast.success("Invitation Sent", "User will receive an email to set up their Staff Portal account");
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to send invitation", error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      console.log("saveMutation running with data:", data);
      try {
        if (carer) {
          console.log("Updating existing carer:", carer.id);
          return await base44.entities.Carer.update(carer.id, data);
        } else {
          console.log("Creating new carer...");
          // Create new carer and auto-setup availability
          const newCarer = await base44.entities.Carer.create(data);
          console.log("New carer created:", newCarer);
        
        // Auto-create default working hours based on employment type
        const defaultHours = data.employment_type === 'full_time' 
          ? { start: "08:00", end: "18:00", maxWeek: 40 }
          : data.employment_type === 'part_time'
          ? { start: "09:00", end: "15:00", maxWeek: 20 }
          : { start: "09:00", end: "17:00", maxWeek: 30 };
        
        // Create working hours for Mon-Fri
        const workingDays = [1, 2, 3, 4, 5]; // Mon-Fri
        await Promise.all(workingDays.map(day => 
          base44.entities.CarerAvailability.create({
            carer_id: newCarer.id,
            availability_type: "working_hours",
            day_of_week: day,
            start_time: defaultHours.start,
            end_time: defaultHours.end,
            is_recurring: true,
            max_hours_per_week: defaultHours.maxWeek,
            notes: "Auto-generated default availability"
          })
        ));
        
        // Set weekends as day off
        await Promise.all([0, 6].map(day =>
          base44.entities.CarerAvailability.create({
            carer_id: newCarer.id,
            availability_type: "day_off",
            day_of_week: day,
            is_recurring: true,
            reason: "Weekend"
          })
        ));
        
        // Auto-geocode address if postcode provided
        if (data.address?.postcode) {
          geocodeAndUpdateAddress('Carer', newCarer.id, data.address).then(result => {
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['carers'] });
            }
          });
        }
        
        // Auto-assign mandatory training
        assignMandatoryTraining(newCarer.id).then(result => {
          if (result.assigned > 0) {
            queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
          }
        });
        
          return newCarer;
        }
      } catch (error) {
        console.error("Error in saveMutation:", error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['carers'] });
      queryClient.invalidateQueries({ queryKey: ['carer-availability'] });
      
      if (!carer) {
        // New carer created - check if user account exists
        const emailExists = allUsers.some(u => u.email === result.email);
        
        if (emailExists) {
          toast.success("Carer Onboarded & Linked", "Carer created and linked to existing user account. Ready for Staff Portal!");
        } else {
          // Prompt to invite
          setNewCarerId(result.id);
          setShowInvitePrompt(true);
          toast.success("Carer Onboarded", "Carer created with availability, location, and training assigned. Ready for scheduling!");
        }
      } else {
        toast.success("Carer Updated", "Carer details updated successfully");
        onClose();
      }
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Error", `Failed to ${carer ? 'update' : 'create'} carer: ${error.message || 'Unknown error'}`);
    },
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

  const handleQualificationToggle = (qualId) => {
    setFormData(prev => {
      const quals = prev.qualifications || [];
      const hasQual = quals.includes(qualId);
      return {
        ...prev,
        qualifications: hasQual 
          ? quals.filter(q => q !== qualId)
          : [...quals, qualId]
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.full_name || !formData.email || !formData.phone) {
      toast.error("Validation Error", "Please fill in all required fields (Name, Email, Phone)");
      return;
    }
    
    // Clean data - remove empty string numbers
    const cleanData = { ...formData };
    if (cleanData.overtime_max_hours === "" || cleanData.overtime_max_hours === null) {
      delete cleanData.overtime_max_hours;
    }
    
    saveMutation.mutate(cleanData);
  };

  return (
    <>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{carer ? "Edit Carer" : "Add New Carer"}</DialogTitle>
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
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
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select value={formData.employment_type} onValueChange={(value) => handleInputChange("employment_type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange("hourly_rate", parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  id="available_for_overtime"
                  checked={formData.available_for_overtime}
                  onCheckedChange={(checked) => handleInputChange("available_for_overtime", checked)}
                />
                <Label htmlFor="available_for_overtime" className="cursor-pointer font-medium">
                  Available for Overtime
                </Label>
              </div>
              {formData.available_for_overtime && (
                <div className="ml-6">
                  <Label htmlFor="overtime_max_hours" className="text-sm">Max extra hours per week</Label>
                  <Input
                    id="overtime_max_hours"
                    type="number"
                    min="1"
                    max="40"
                    placeholder="e.g. 10"
                    value={formData.overtime_max_hours}
                    onChange={(e) => handleInputChange("overtime_max_hours", e.target.value ? parseInt(e.target.value) : "")}
                    className="w-32 mt-1"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Qualifications</Label>
              <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-gray-50">
                {qualifications.map(qual => (
                  <div key={qual.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`qual-${qual.id}`}
                      checked={formData.qualifications?.includes(qual.id)}
                      onCheckedChange={() => handleQualificationToggle(qual.id)}
                    />
                    <Label htmlFor={`qual-${qual.id}`} className="cursor-pointer">
                      {qual.qualification_name}
                    </Label>
                  </div>
                ))}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dbs_certificate_number">DBS Certificate Number</Label>
                <Input
                  id="dbs_certificate_number"
                  value={formData.dbs_certificate_number}
                  onChange={(e) => handleInputChange("dbs_certificate_number", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dbs_expiry">DBS Expiry Date</Label>
                <Input
                  id="dbs_expiry"
                  type="date"
                  value={formData.dbs_expiry}
                  onChange={(e) => handleInputChange("dbs_expiry", e.target.value)}
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
                carer ? "Update Carer" : "Create Carer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showInvitePrompt} onOpenChange={setShowInvitePrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invite to Staff Portal?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{formData.full_name}</strong> has been successfully created as a carer.
            <br /><br />
            Would you like to send them an email invitation to set up their Staff Portal account? 
            This will allow them to view their shifts, complete care tasks, and access the mobile app.
            <br /><br />
            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">{formData.email}</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setShowInvitePrompt(false); onClose(); }}>
            Skip for Now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => inviteUserMutation.mutate(formData.email)}
            disabled={inviteUserMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {inviteUserMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}