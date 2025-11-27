import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const ENTRY_TYPES = [
  { value: "visitor", label: "General Visitor" },
  { value: "family_visit", label: "Family Visit" },
  { value: "doctor_appointment", label: "Doctor Appointment" },
  { value: "nurse_visit", label: "Nurse Visit" },
  { value: "social_worker_visit", label: "Social Worker Visit" },
  { value: "therapist_visit", label: "Therapist Visit" },
  { value: "maintenance", label: "Maintenance" },
  { value: "delivery", label: "Delivery" },
  { value: "contractor", label: "Contractor" },
  { value: "inspection", label: "Inspection" },
  { value: "emergency_services", label: "Emergency Services" },
  { value: "other", label: "Other" }
];

export default function DailyLogDialog({ entry, defaultDate, clients = [], onClose }) {
  const [formData, setFormData] = useState({
    log_date: entry?.log_date || defaultDate,
    entry_type: entry?.entry_type || "visitor",
    visitor_name: entry?.visitor_name || "",
    visitor_organization: entry?.visitor_organization || "",
    client_id: entry?.client_id || "",
    arrival_time: entry?.arrival_time || "",
    departure_time: entry?.departure_time || "",
    purpose: entry?.purpose || "",
    notes: entry?.notes || "",
    follow_up_required: entry?.follow_up_required || false,
    follow_up_notes: entry?.follow_up_notes || ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (entry) {
        return base44.entities.DailyLog.update(entry.id, data);
      }
      return base44.entities.DailyLog.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      toast.success("Saved", entry ? "Entry updated" : "Entry added");
      onClose();
    },
    onError: () => {
      toast.error("Error", "Failed to save entry");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.visitor_name || !formData.entry_type) {
      toast.error("Required", "Please fill in visitor name and type");
      return;
    }
    saveMutation.mutate(formData);
  };

  const activeClients = clients.filter(c => c?.status === 'active');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Log Entry" : "Add Log Entry"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.log_date}
                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Entry Type *</Label>
              <Select
                value={formData.entry_type}
                onValueChange={(v) => setFormData({ ...formData, entry_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Visitor Name *</Label>
            <Input
              value={formData.visitor_name}
              onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
              placeholder="Name of visitor"
            />
          </div>

          <div>
            <Label>Organization / Company</Label>
            <Input
              value={formData.visitor_organization}
              onChange={(e) => setFormData({ ...formData, visitor_organization: e.target.value })}
              placeholder="e.g., NHS, Social Services, ABC Plumbing"
            />
          </div>

          <div>
            <Label>Related Client (optional)</Label>
            <Select
              value={formData.client_id || "none"}
              onValueChange={(v) => setFormData({ ...formData, client_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client if applicable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {activeClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Arrival Time</Label>
              <Input
                type="time"
                value={formData.arrival_time}
                onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Departure Time</Label>
              <Input
                type="time"
                value={formData.departure_time}
                onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Purpose of Visit</Label>
            <Input
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Reason for the visit"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or observations"
              rows={3}
            />
          </div>

          <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <Checkbox
                id="follow-up"
                checked={formData.follow_up_required}
                onCheckedChange={(checked) => setFormData({ ...formData, follow_up_required: checked })}
              />
              <Label htmlFor="follow-up" className="cursor-pointer font-medium text-orange-800">
                Follow-up action required
              </Label>
            </div>
            {formData.follow_up_required && (
              <div>
                <Label>Follow-up Details</Label>
                <Textarea
                  value={formData.follow_up_notes}
                  onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                  placeholder="What needs to be done?"
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                entry ? "Update Entry" : "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}