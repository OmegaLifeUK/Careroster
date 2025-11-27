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
  { value: "visitor", label: "General Visitor", category: "visitors" },
  { value: "family_visit", label: "Family Visit", category: "visitors" },
  { value: "doctor_appointment", label: "Doctor Appointment", category: "visitors" },
  { value: "nurse_visit", label: "Nurse Visit", category: "visitors" },
  { value: "social_worker_visit", label: "Social Worker Visit", category: "visitors" },
  { value: "therapist_visit", label: "Therapist Visit", category: "visitors" },
  { value: "maintenance", label: "Maintenance", category: "visitors" },
  { value: "delivery", label: "Delivery", category: "visitors" },
  { value: "contractor", label: "Contractor", category: "visitors" },
  { value: "inspection", label: "Inspection", category: "visitors" },
  { value: "emergency_services", label: "Emergency Services", category: "visitors" },
  { value: "outing_activity", label: "Outing - Activity / Day Trip", category: "outings" },
  { value: "outing_gp_clinic", label: "Outing - GP / Clinic Appointment", category: "outings" },
  { value: "outing_hospital", label: "Outing - Hospital Visit", category: "outings" },
  { value: "outing_school", label: "Outing - School / Education", category: "outings" },
  { value: "outing_shopping", label: "Outing - Shopping", category: "outings" },
  { value: "outing_day_trip", label: "Outing - Day Trip / Excursion", category: "outings" },
  { value: "outing_community", label: "Outing - Community Event", category: "outings" },
  { value: "outing_other", label: "Outing - Other", category: "outings" },
  { value: "other", label: "Other", category: "other" }
];

const TRANSPORT_TYPES = [
  { value: "walking", label: "Walking" },
  { value: "car", label: "Car" },
  { value: "taxi", label: "Taxi" },
  { value: "bus", label: "Bus" },
  { value: "minibus", label: "Minibus" },
  { value: "wheelchair_transport", label: "Wheelchair Transport" },
  { value: "ambulance", label: "Ambulance" },
  { value: "other", label: "Other" }
];

export default function DailyLogDialog({ entry, defaultDate, clients = [], staff = [], onClose }) {
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
    follow_up_notes: entry?.follow_up_notes || "",
    outing_destination: entry?.outing_destination || "",
    outing_transport: entry?.outing_transport || "",
    accompanying_staff: entry?.accompanying_staff || [],
    outing_outcome: entry?.outing_outcome || "",
    risk_assessment_completed: entry?.risk_assessment_completed || false
  });

  const isOuting = formData.entry_type?.startsWith('outing_');

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
    if (!formData.entry_type) {
      toast.error("Required", "Please select entry type");
      return;
    }
    if (!isOuting && !formData.visitor_name) {
      toast.error("Required", "Please fill in visitor name");
      return;
    }
    if (isOuting && !formData.client_id) {
      toast.error("Required", "Please select the client for this outing");
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
                  <SelectItem value="__header_visitors" disabled className="font-bold text-gray-500">
                    — Visitors —
                  </SelectItem>
                  {ENTRY_TYPES.filter(t => t.category === 'visitors').map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__header_outings" disabled className="font-bold text-gray-500 mt-2">
                    — Outings —
                  </SelectItem>
                  {ENTRY_TYPES.filter(t => t.category === 'outings').map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__header_other" disabled className="font-bold text-gray-500 mt-2">
                    — Other —
                  </SelectItem>
                  {ENTRY_TYPES.filter(t => t.category === 'other').map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visitor fields - shown when NOT an outing */}
          {!isOuting && (
            <>
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
            </>
          )}

          {/* Outing fields - shown when IS an outing */}
          {isOuting && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900">Outing Details</h3>
              
              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.client_id || "none"}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select client...</SelectItem>
                    {activeClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Destination</Label>
                <Input
                  value={formData.outing_destination}
                  onChange={(e) => setFormData({ ...formData, outing_destination: e.target.value })}
                  placeholder="e.g., Dr Smith's Surgery, ABC School, Town Centre"
                />
              </div>

              <div>
                <Label>Transport</Label>
                <Select
                  value={formData.outing_transport || "none"}
                  onValueChange={(v) => setFormData({ ...formData, outing_transport: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {TRANSPORT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Accompanying Staff</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(staff || []).filter(s => s?.is_active !== false).map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm p-2 bg-white rounded border cursor-pointer hover:bg-blue-50">
                      <Checkbox
                        checked={formData.accompanying_staff?.includes(s.id)}
                        onCheckedChange={(checked) => {
                          const current = formData.accompanying_staff || [];
                          setFormData({
                            ...formData,
                            accompanying_staff: checked
                              ? [...current, s.id]
                              : current.filter(id => id !== s.id)
                          });
                        }}
                      />
                      {s.full_name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <Checkbox
                  id="risk-assessment"
                  checked={formData.risk_assessment_completed}
                  onCheckedChange={(checked) => setFormData({ ...formData, risk_assessment_completed: checked })}
                />
                <Label htmlFor="risk-assessment" className="cursor-pointer">
                  Risk assessment completed for this outing
                </Label>
              </div>

              <div>
                <Label>Outing Outcome / Summary</Label>
                <Textarea
                  value={formData.outing_outcome}
                  onChange={(e) => setFormData({ ...formData, outing_outcome: e.target.value })}
                  placeholder="How did the outing go? Any issues or concerns?"
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isOuting ? "Departure Time (Left)" : "Arrival Time (In)"}</Label>
              <Input
                type="time"
                value={isOuting ? formData.departure_time : formData.arrival_time}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [isOuting ? 'departure_time' : 'arrival_time']: e.target.value 
                })}
              />
            </div>
            <div>
              <Label>{isOuting ? "Return Time (Back)" : "Departure Time (Out)"}</Label>
              <Input
                type="time"
                value={isOuting ? formData.arrival_time : formData.departure_time}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [isOuting ? 'arrival_time' : 'departure_time']: e.target.value 
                })}
              />
            </div>
          </div>

          <div>
            <Label>{isOuting ? "Purpose of Outing" : "Purpose of Visit"}</Label>
            <Input
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder={isOuting ? "Reason for the outing" : "Reason for the visit"}
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