import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, FileText, Send, User, Users, CheckCircle, Clock, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function SessionReportDialog({ session, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const [reportData, setReportData] = useState({
    session_summary: "",
    participants_count: session?.registered_clients?.length || 0,
    attendance_notes: "",
    activities_completed: "",
    participant_feedback: "",
    incidents_or_concerns: "",
    follow_up_required: false,
    recommendations: "",
  });

  const [recipients, setRecipients] = useState({
    internal: [],
    external: [],
  });

  const [externalContact, setExternalContact] = useState({
    name: "",
    email: "",
    organisation: "",
    role: "social_worker",
  });

  const [followUps, setFollowUps] = useState([]);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data.filter(s => s.is_active !== false) : [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['daycentre-activities'],
    queryFn: async () => {
      const data = await base44.entities.DayCentreActivity.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['daycentre-clients'],
    queryFn: async () => {
      const data = await base44.entities.DayCentreClient.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const activity = activities.find(a => a.id === session?.activity_id);

  const sendReportMutation = useMutation({
    mutationFn: async (data) => {
      const reportContent = `
SESSION REPORT
${activity?.activity_name || 'Session'}
Date: ${session?.session_date}
Time: ${session?.start_time} - ${session?.end_time}

SUMMARY
${data.session_summary}

ATTENDANCE
Registered: ${session?.registered_clients?.length || 0}
Attended: ${data.participants_count}
${data.attendance_notes}

ACTIVITIES COMPLETED
${data.activities_completed}

PARTICIPANT FEEDBACK
${data.participant_feedback}

${data.incidents_or_concerns ? `INCIDENTS/CONCERNS\n${data.incidents_or_concerns}\n\n` : ''}
${data.recommendations ? `RECOMMENDATIONS\n${data.recommendations}` : ''}
      `.trim();

      // Send to internal recipients
      for (const staffId of data.recipients.internal) {
        const staffMember = staff.find(s => s.id === staffId);
        if (staffMember?.email) {
          await base44.integrations.Core.SendEmail({
            to: staffMember.email,
            subject: `Day Centre Session Report - ${session?.session_date}`,
            body: reportContent,
          });
        }
      }

      // Send to external recipients
      for (const contact of data.recipients.external) {
        if (contact.email) {
          await base44.integrations.Core.SendEmail({
            to: contact.email,
            subject: `Day Centre Session Report - ${session?.session_date}`,
            body: reportContent,
          });
        }
      }

      // Create follow-ups
      for (const followUp of data.followUps) {
        await base44.entities.CRMFollowUp.create({
          follow_up_type: followUp.type,
          recipient_type: followUp.recipient_type,
          related_entity_type: "report",
          related_entity_id: session?.id,
          title: followUp.title,
          description: followUp.description,
          assigned_to: followUp.assigned_to,
          assigned_to_email: followUp.assigned_to_email,
          external_contact_name: followUp.external_contact_name,
          external_contact_email: followUp.external_contact_email,
          external_contact_organisation: followUp.external_contact_organisation,
          external_contact_role: followUp.external_contact_role,
          priority: followUp.priority,
          status: "pending",
          due_date: followUp.due_date,
          reminder_days_before: followUp.reminder_days_before || 1,
        });
      }

      return reportContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Report Sent", "Session report sent and follow-ups created");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to send report");
      console.error(error);
    },
  });

  const handleAddExternalRecipient = () => {
    if (!externalContact.name || !externalContact.email) {
      toast.error("Missing Info", "Please enter name and email");
      return;
    }

    setRecipients({
      ...recipients,
      external: [...recipients.external, { ...externalContact }]
    });

    setExternalContact({ name: "", email: "", organisation: "", role: "social_worker" });
  };

  const handleAddFollowUp = () => {
    const newFollowUp = {
      type: "information_request",
      recipient_type: "external",
      title: "",
      description: "",
      external_contact_name: "",
      external_contact_email: "",
      external_contact_organisation: "",
      external_contact_role: "social_worker",
      priority: "medium",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reminder_days_before: 1,
    };
    setFollowUps([...followUps, newFollowUp]);
  };

  const updateFollowUp = (index, field, value) => {
    const updated = [...followUps];
    updated[index][field] = value;
    setFollowUps(updated);
  };

  const removeFollowUp = (index) => {
    setFollowUps(followUps.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!reportData.session_summary) {
      toast.error("Missing Summary", "Please provide a session summary");
      return;
    }

    sendReportMutation.mutate({
      ...reportData,
      recipients,
      followUps,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Session Report</h2>
            <p className="text-amber-100 text-sm">
              {activity?.activity_name} - {session?.session_date}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                step >= s ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              <span className={`text-sm font-medium ${step >= s ? 'text-gray-900' : 'text-gray-500'}`}>
                {s === 1 ? 'Report Details' : s === 2 ? 'Recipients' : 'Follow-ups'}
              </span>
              {s < 3 && <div className="w-12 h-0.5 bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Registered</p>
                  <p className="text-2xl font-bold text-blue-900">{session?.registered_clients?.length || 0}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Label htmlFor="attended" className="text-sm text-green-700 mb-2 block">Attended</Label>
                  <Input
                    id="attended"
                    type="number"
                    min="0"
                    max={session?.registered_clients?.length || 0}
                    value={reportData.participants_count}
                    onChange={(e) => setReportData({ ...reportData, participants_count: parseInt(e.target.value) })}
                    className="text-xl font-bold"
                  />
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700 mb-1">Facilitators</p>
                  <p className="text-2xl font-bold text-amber-900">{session?.facilitator_staff_ids?.length || 0}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Session Summary <span className="text-red-500">*</span></Label>
                <Textarea
                  id="summary"
                  value={reportData.session_summary}
                  onChange={(e) => setReportData({ ...reportData, session_summary: e.target.value })}
                  placeholder="Provide an overview of how the session went..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="attendance_notes">Attendance Notes</Label>
                <Textarea
                  id="attendance_notes"
                  value={reportData.attendance_notes}
                  onChange={(e) => setReportData({ ...reportData, attendance_notes: e.target.value })}
                  placeholder="Any notable attendance issues or changes..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="activities">Activities Completed</Label>
                <Textarea
                  id="activities"
                  value={reportData.activities_completed}
                  onChange={(e) => setReportData({ ...reportData, activities_completed: e.target.value })}
                  placeholder="What activities were completed and how they went..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="feedback">Participant Feedback</Label>
                <Textarea
                  id="feedback"
                  value={reportData.participant_feedback}
                  onChange={(e) => setReportData({ ...reportData, participant_feedback: e.target.value })}
                  placeholder="How participants responded, engagement levels..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="incidents">Incidents or Concerns</Label>
                <Textarea
                  id="incidents"
                  value={reportData.incidents_or_concerns}
                  onChange={(e) => setReportData({ ...reportData, incidents_or_concerns: e.target.value })}
                  placeholder="Any incidents, accidents, or concerns..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={reportData.recommendations}
                  onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
                  placeholder="Suggestions for future sessions or improvements..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Internal Recipients ({recipients.internal.length} selected)
                </Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {staff.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`staff-${s.id}`}
                          checked={recipients.internal.includes(s.id)}
                          onCheckedChange={(checked) => {
                            setRecipients({
                              ...recipients,
                              internal: checked 
                                ? [...recipients.internal, s.id]
                                : recipients.internal.filter(id => id !== s.id)
                            });
                          }}
                        />
                        <Label htmlFor={`staff-${s.id}`} className="cursor-pointer flex-1">
                          {s.full_name} <span className="text-xs text-gray-500">({s.email})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  External Recipients
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-4 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Name"
                    value={externalContact.name}
                    onChange={(e) => setExternalContact({ ...externalContact, name: e.target.value })}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={externalContact.email}
                    onChange={(e) => setExternalContact({ ...externalContact, email: e.target.value })}
                  />
                  <Input
                    placeholder="Organisation"
                    value={externalContact.organisation}
                    onChange={(e) => setExternalContact({ ...externalContact, organisation: e.target.value })}
                  />
                  <Select
                    value={externalContact.role}
                    onValueChange={(value) => setExternalContact({ ...externalContact, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_worker">Social Worker</SelectItem>
                      <SelectItem value="family_member">Family Member</SelectItem>
                      <SelectItem value="gp">GP</SelectItem>
                      <SelectItem value="local_authority">Local Authority</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handleAddExternalRecipient}
                    size="sm"
                    className="md:col-span-2"
                  >
                    Add Recipient
                  </Button>
                </div>

                {recipients.external.length > 0 && (
                  <div className="space-y-2">
                    {recipients.external.map((contact, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.email} • {contact.role.replace('_', ' ')}</p>
                          {contact.organisation && (
                            <p className="text-xs text-gray-400">{contact.organisation}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setRecipients({
                            ...recipients,
                            external: recipients.external.filter((_, i) => i !== idx)
                          })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Follow-up Actions</Label>
                <Button type="button" onClick={handleAddFollowUp} size="sm">
                  Add Follow-up
                </Button>
              </div>

              {followUps.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No follow-up actions yet</p>
                  <Button type="button" onClick={handleAddFollowUp} variant="outline" className="mt-4">
                    Add Follow-up Action
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUps.map((followUp, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-semibold">Follow-up {idx + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeFollowUp(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs mb-1 block">Type</Label>
                          <Select
                            value={followUp.type}
                            onValueChange={(value) => updateFollowUp(idx, 'type', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone_call">Phone Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="document_chase">Document Chase</SelectItem>
                              <SelectItem value="report_request">Report Request</SelectItem>
                              <SelectItem value="information_request">Information Request</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs mb-1 block">Priority</Label>
                          <Select
                            value={followUp.priority}
                            onValueChange={(value) => updateFollowUp(idx, 'priority', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs mb-1 block">Title</Label>
                          <Input
                            value={followUp.title}
                            onChange={(e) => updateFollowUp(idx, 'title', e.target.value)}
                            placeholder="Brief description of follow-up needed"
                            className="h-9"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs mb-1 block">Description</Label>
                          <Textarea
                            value={followUp.description}
                            onChange={(e) => updateFollowUp(idx, 'description', e.target.value)}
                            placeholder="Detailed description..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label className="text-xs mb-1 block">Recipient Type</Label>
                          <Select
                            value={followUp.recipient_type}
                            onValueChange={(value) => updateFollowUp(idx, 'recipient_type', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="internal">Internal Staff</SelectItem>
                              <SelectItem value="external">External Contact</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {followUp.recipient_type === 'internal' ? (
                          <div>
                            <Label className="text-xs mb-1 block">Assign To</Label>
                            <Select
                              value={followUp.assigned_to}
                              onValueChange={(value) => {
                                const staffMember = staff.find(s => s.id === value);
                                updateFollowUp(idx, 'assigned_to', value);
                                updateFollowUp(idx, 'assigned_to_email', staffMember?.email || '');
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select staff" />
                              </SelectTrigger>
                              <SelectContent>
                                {staff.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <>
                            <div>
                              <Label className="text-xs mb-1 block">Contact Name</Label>
                              <Input
                                value={followUp.external_contact_name}
                                onChange={(e) => updateFollowUp(idx, 'external_contact_name', e.target.value)}
                                className="h-9"
                                placeholder="e.g., Jane Smith"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Contact Email</Label>
                              <Input
                                type="email"
                                value={followUp.external_contact_email}
                                onChange={(e) => updateFollowUp(idx, 'external_contact_email', e.target.value)}
                                className="h-9"
                                placeholder="email@example.com"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Organisation</Label>
                              <Input
                                value={followUp.external_contact_organisation}
                                onChange={(e) => updateFollowUp(idx, 'external_contact_organisation', e.target.value)}
                                className="h-9"
                                placeholder="e.g., Bristol Social Services"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Role</Label>
                              <Select
                                value={followUp.external_contact_role}
                                onValueChange={(value) => updateFollowUp(idx, 'external_contact_role', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="social_worker">Social Worker</SelectItem>
                                  <SelectItem value="family_member">Family Member</SelectItem>
                                  <SelectItem value="gp">GP</SelectItem>
                                  <SelectItem value="local_authority">Local Authority</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        <div>
                          <Label className="text-xs mb-1 block">Due Date</Label>
                          <Input
                            type="date"
                            value={followUp.due_date}
                            onChange={(e) => updateFollowUp(idx, 'due_date', e.target.value)}
                            className="h-9"
                          />
                        </div>

                        <div>
                          <Label className="text-xs mb-1 block">Reminder (days before)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={followUp.reminder_days_before}
                            onChange={(e) => updateFollowUp(idx, 'reminder_days_before', parseInt(e.target.value))}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={step === 1 && !reportData.session_summary}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={sendReportMutation.isPending}
              >
                {sendReportMutation.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Report & Create Follow-ups
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}