import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Phone,
  FileText,
  CheckCircle,
  Edit2,
  Save
} from "lucide-react";
import { format, parseISO } from "date-fns";

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  reported: "bg-gray-100 text-gray-800",
  under_investigation: "bg-blue-100 text-blue-800",
  investigated: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-400 text-gray-800",
  referred_externally: "bg-orange-100 text-orange-800",
};

export default function IncidentDetail({ incident, clients, staff, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: incident.status,
    investigation_findings: incident.investigation?.findings || "",
    resolution_notes: incident.resolution_notes || "",
    lessons_learned: incident.lessons_learned || "",
    cqc_notification_sent: incident.cqc_notification_sent || false,
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.update(incident.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...incident,
      ...formData,
      investigation: {
        ...incident.investigation,
        findings: formData.investigation_findings,
      }
    });
  };

  const client = clients.find(c => c.id === incident.client_id);
  const reportingStaff = staff.find(s => s.id === incident.reported_by_staff_id);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Button variant="outline" onClick={onClose} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Incidents
        </Button>

        {/* Header */}
        <Card className="mb-6 border-l-4 border-red-500">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-6 h-6 text-red-600" />
                  <CardTitle className="text-2xl capitalize">
                    {incident.incident_type.replace(/_/g, ' ')}
                  </CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={SEVERITY_COLORS[incident.severity]}>
                    {incident.severity}
                  </Badge>
                  <Badge className={STATUS_COLORS[incident.status]}>
                    {incident.status.replace(/_/g, ' ')}
                  </Badge>
                  {incident.is_safeguarding_concern && (
                    <Badge className="bg-red-500 text-white">SAFEGUARDING</Badge>
                  )}
                  {incident.requires_notification_to_cqc && (
                    <Badge className="bg-purple-500 text-white">CQC NOTIFIABLE</Badge>
                  )}
                  {incident.incident_reference && (
                    <Badge variant="outline">Ref: {incident.incident_reference}</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel Edit' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Incident Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">What Happened</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{incident.description}</p>
                  </div>

                  {incident.immediate_action_taken && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">Immediate Action Taken</p>
                      <p className="text-sm text-blue-800">{incident.immediate_action_taken}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Date & Time</p>
                      <p className="text-gray-900">
                        {format(parseISO(incident.incident_date), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Location</p>
                      <p className="text-gray-900">{incident.location}</p>
                      {incident.location_detail && (
                        <p className="text-sm text-gray-600">({incident.location_detail})</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safeguarding Details */}
            {incident.is_safeguarding_concern && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="border-b border-red-200">
                  <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Safeguarding Concern
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-red-900 mb-2">Types of Concern:</p>
                      <div className="flex flex-wrap gap-2">
                        {incident.safeguarding_type?.map((type, idx) => (
                          <Badge key={idx} className="bg-red-600 text-white capitalize">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded border border-red-200">
                      <p className="text-sm font-medium text-red-900 mb-1">Required Actions:</p>
                      <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                        <li>Notify Local Authority Safeguarding Team immediately</li>
                        <li>Complete safeguarding investigation</li>
                        <li>Notify CQC if serious harm or risk</li>
                        <li>Document all actions taken</li>
                        <li>Consider police involvement if criminal offense</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Investigation & Resolution */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Investigation & Resolution</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reported">Reported</SelectItem>
                          <SelectItem value="under_investigation">Under Investigation</SelectItem>
                          <SelectItem value="investigated">Investigated</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="referred_externally">Referred Externally</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Investigation Findings</Label>
                      <Textarea
                        value={formData.investigation_findings}
                        onChange={(e) => setFormData({ ...formData, investigation_findings: e.target.value })}
                        rows={4}
                        placeholder="Document investigation findings..."
                      />
                    </div>

                    <div>
                      <Label>Resolution Notes</Label>
                      <Textarea
                        value={formData.resolution_notes}
                        onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                        rows={4}
                        placeholder="How was this resolved?"
                      />
                    </div>

                    <div>
                      <Label>Lessons Learned</Label>
                      <Textarea
                        value={formData.lessons_learned}
                        onChange={(e) => setFormData({ ...formData, lessons_learned: e.target.value })}
                        rows={3}
                        placeholder="What did we learn from this incident?"
                      />
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incident.investigation?.findings && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Investigation Findings</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{incident.investigation.findings}</p>
                      </div>
                    )}

                    {incident.resolution_notes && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-medium text-green-900 mb-2">Resolution</p>
                        <p className="text-sm text-green-800">{incident.resolution_notes}</p>
                      </div>
                    )}

                    {incident.lessons_learned && (
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-medium text-purple-900 mb-2">Lessons Learned</p>
                        <p className="text-sm text-purple-800">{incident.lessons_learned}</p>
                      </div>
                    )}

                    {!incident.investigation?.findings && !incident.resolution_notes && (
                      <p className="text-gray-500 text-center py-4">No investigation details recorded yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            {client && (
              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-sm">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.full_name}</p>
                    {client.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reporter Info */}
            {reportingStaff && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-sm">Reported By</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-gray-900">{reportingStaff.full_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(parseISO(incident.reported_date), "dd/MM/yyyy HH:mm")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notifications */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Family Notified</span>
                  {incident.family_notified ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-sm">CQC Notification</span>
                  {incident.cqc_notification_sent ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : incident.requires_notification_to_cqc ? (
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  ) : (
                    <span className="text-xs text-gray-500">N/A</span>
                  )}
                </div>

                {incident.police_involved && (
                  <div className="p-2 bg-red-50 rounded border border-red-200">
                    <p className="text-sm font-medium text-red-900">Police Involved</p>
                    {incident.police_reference && (
                      <p className="text-xs text-red-700 mt-1">Ref: {incident.police_reference}</p>
                    )}
                  </div>
                )}

                {incident.authorities_notified && incident.authorities_notified.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-2">Authorities Notified:</p>
                    {incident.authorities_notified.map((auth, idx) => (
                      <div key={idx} className="text-xs text-gray-600 mb-1">
                        • {auth.authority.replace(/_/g, ' ').toUpperCase()}
                        {auth.reference_number && ` (${auth.reference_number})`}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CQC Requirements */}
            {incident.requires_notification_to_cqc && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="border-b border-purple-200">
                  <CardTitle className="text-sm text-purple-900">CQC Requirements</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-purple-800 mb-2">
                    This incident requires statutory notification to CQC
                  </p>
                  <ul className="text-xs text-purple-700 list-disc list-inside space-y-1">
                    <li>Notify without delay</li>
                    <li>Use CQC notification portal</li>
                    <li>Provide full details</li>
                    <li>Keep reference number</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}