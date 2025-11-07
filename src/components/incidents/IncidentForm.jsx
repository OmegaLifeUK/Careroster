import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, AlertTriangle, Save, X } from "lucide-react";
import { format } from "date-fns";

export default function IncidentForm({ incident, clients, staff, onClose }) {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const [formData, setFormData] = useState(incident || {
    incident_type: "accident",
    severity: "medium",
    is_safeguarding_concern: false,
    safeguarding_type: [],
    client_id: "",
    staff_id: "",
    incident_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    reported_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    location: "",
    location_detail: "",
    description: "",
    what_happened: "",
    immediate_action_taken: "",
    family_notified: false,
    requires_notification_to_cqc: false,
    police_involved: false,
    status: "reported",
    priority: "medium",
  });

  const [showSafeguardingFields, setShowSafeguardingFields] = useState(formData.is_safeguarding_concern);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const reportingStaff = staff.find(s => s.email === currentUser?.email);
      
      // Generate incident reference
      const incidentCount = await base44.entities.Incident.list();
      const reference = `INC-${format(new Date(), "yyyyMMdd")}-${String(incidentCount.length + 1).padStart(4, '0')}`;

      const incidentData = {
        ...data,
        incident_reference: reference,
        reported_by_staff_id: reportingStaff?.id || currentUser?.id,
        reported_date: new Date().toISOString(),
      };

      const newIncident = await base44.entities.Incident.create(incidentData);

      // If safeguarding concern, create urgent notifications
      if (data.is_safeguarding_concern) {
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        await Promise.all(
          admins.map(admin =>
            base44.entities.DomCareNotification.create({
              recipient_id: admin.email,
              title: `🚨 SAFEGUARDING ALERT: ${data.incident_type}`,
              message: `Safeguarding concern reported for client. Immediate action required. Ref: ${reference}`,
              type: "sos_alert",
              priority: "urgent",
              is_read: false,
              related_entity_id: newIncident.id,
              related_entity_type: "staff",
            })
          )
        );
      }

      // If requires CQC notification
      if (data.requires_notification_to_cqc) {
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        await Promise.all(
          admins.map(admin =>
            base44.entities.DomCareNotification.create({
              recipient_id: admin.email,
              title: `CQC Notification Required: ${reference}`,
              message: `Incident requires CQC notification. Type: ${data.incident_type}`,
              type: "general",
              priority: "high",
              is_read: false,
              related_entity_id: newIncident.id,
              related_entity_type: "staff",
            })
          )
        );
      }

      return newIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.update(incident.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (incident) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSafeguardingToggle = (checked) => {
    setFormData({ ...formData, is_safeguarding_concern: checked });
    setShowSafeguardingFields(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, severity: 'critical', requires_notification_to_cqc: true }));
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" />
                {incident ? 'Edit Incident' : 'Report New Incident'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Safeguarding Alert */}
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="is_safeguarding"
                    checked={formData.is_safeguarding_concern}
                    onCheckedChange={handleSafeguardingToggle}
                  />
                  <div className="flex-1">
                    <Label htmlFor="is_safeguarding" className="text-red-900 font-semibold text-lg cursor-pointer">
                      This is a SAFEGUARDING concern
                    </Label>
                    <p className="text-sm text-red-700 mt-1">
                      Check this box if the incident involves potential abuse, neglect, or harm to a vulnerable adult
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="incident_type">Incident Type *</Label>
                  <Select
                    value={formData.incident_type}
                    onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safeguarding_concern">Safeguarding Concern</SelectItem>
                      <SelectItem value="accident">Accident</SelectItem>
                      <SelectItem value="injury">Injury</SelectItem>
                      <SelectItem value="fall">Fall</SelectItem>
                      <SelectItem value="medication_error">Medication Error</SelectItem>
                      <SelectItem value="abuse_allegation">Abuse Allegation</SelectItem>
                      <SelectItem value="near_miss">Near Miss</SelectItem>
                      <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                      <SelectItem value="pressure_sore">Pressure Sore</SelectItem>
                      <SelectItem value="choking">Choking</SelectItem>
                      <SelectItem value="missing_person">Missing Person</SelectItem>
                      <SelectItem value="death">Death</SelectItem>
                      <SelectItem value="aggressive_behavior">Aggressive Behavior</SelectItem>
                      <SelectItem value="self_harm">Self Harm</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="severity">Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client_id">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="incident_date">Incident Date & Time *</Label>
                  <Input
                    id="incident_date"
                    type="datetime-local"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Client's home, Day centre"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location_detail">Location Detail</Label>
                  <Input
                    id="location_detail"
                    value={formData.location_detail}
                    onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
                    placeholder="e.g., Bathroom, Bedroom"
                  />
                </div>
              </div>

              {/* Safeguarding Details */}
              {showSafeguardingFields && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Safeguarding Details
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    Select all types of safeguarding concerns that apply:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "physical_abuse", label: "Physical Abuse" },
                      { value: "sexual_abuse", label: "Sexual Abuse" },
                      { value: "emotional_abuse", label: "Emotional/Psychological Abuse" },
                      { value: "financial_abuse", label: "Financial Abuse" },
                      { value: "neglect", label: "Neglect" },
                      { value: "discriminatory_abuse", label: "Discriminatory Abuse" },
                      { value: "domestic_abuse", label: "Domestic Abuse" },
                      { value: "modern_slavery", label: "Modern Slavery" },
                      { value: "self_neglect", label: "Self-Neglect" },
                      { value: "organisational_abuse", label: "Organisational Abuse" },
                    ].map(type => (
                      <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.safeguarding_type?.includes(type.value)}
                          onCheckedChange={(checked) => {
                            const current = formData.safeguarding_type || [];
                            setFormData({
                              ...formData,
                              safeguarding_type: checked
                                ? [...current, type.value]
                                : current.filter(t => t !== type.value)
                            });
                          }}
                        />
                        <span className="text-sm text-red-900">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <Label htmlFor="description">What Happened? * (Factual account)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide a detailed factual account of what happened..."
                  rows={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Record facts only - who, what, when, where. Avoid opinions or assumptions.
                </p>
              </div>

              {/* Immediate Action */}
              <div>
                <Label htmlFor="immediate_action">Immediate Action Taken *</Label>
                <Textarea
                  id="immediate_action"
                  value={formData.immediate_action_taken}
                  onChange={(e) => setFormData({ ...formData, immediate_action_taken: e.target.value })}
                  placeholder="What immediate actions were taken? (e.g., first aid given, ambulance called)"
                  rows={4}
                  required
                />
              </div>

              {/* Notifications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg">
                  <Checkbox
                    checked={formData.family_notified}
                    onCheckedChange={(checked) => setFormData({ ...formData, family_notified: checked })}
                  />
                  <span className="text-sm font-medium">Family Notified</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg bg-purple-50">
                  <Checkbox
                    checked={formData.requires_notification_to_cqc}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_notification_to_cqc: checked })}
                  />
                  <span className="text-sm font-medium text-purple-900">CQC Notification Required</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg bg-red-50">
                  <Checkbox
                    checked={formData.police_involved}
                    onCheckedChange={(checked) => setFormData({ ...formData, police_involved: checked })}
                  />
                  <span className="text-sm font-medium text-red-900">Police Involved</span>
                </label>
              </div>

              {/* Important Notice */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important CQC Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>All safeguarding concerns must be reported to local authority within 24 hours</li>
                      <li>CQC must be notified of serious incidents without delay</li>
                      <li>Deaths, serious injuries, and safeguarding concerns require statutory notifications</li>
                      <li>Ensure all relevant parties have been informed as per your policy</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {incident ? 'Update Incident' : 'Submit Incident Report'}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}