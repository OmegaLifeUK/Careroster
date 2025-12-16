import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Edit, AlertCircle, CheckCircle, Calendar, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function DoLSManager({ client }) {
  const [showForm, setShowForm] = useState(false);
  const [editingDoLS, setEditingDoLS] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dolsRecords = [], isLoading } = useQuery({
    queryKey: ['dols', client.id],
    queryFn: async () => {
      const records = await base44.entities.DoLS.filter({ client_id: client.id }, '-created_date');
      return records;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDoLS) {
        return await base44.entities.DoLS.update(editingDoLS.id, data);
      } else {
        return await base44.entities.DoLS.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dols'] });
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("DoLS record saved successfully");
      setShowForm(false);
      setEditingDoLS(null);
    },
  });

  const activeDoLS = dolsRecords.find(d => 
    d.dols_status === 'standard_authorisation_granted' || 
    d.dols_status === 'urgent_authorisation_granted'
  );

  const statusColors = {
    not_applicable: "bg-gray-100 text-gray-800",
    screening_required: "bg-yellow-100 text-yellow-800",
    application_submitted: "bg-blue-100 text-blue-800",
    standard_authorisation_granted: "bg-green-100 text-green-800",
    urgent_authorisation_granted: "bg-orange-100 text-orange-800",
    not_authorised: "bg-red-100 text-red-800",
    expired: "bg-red-100 text-red-800",
    under_review: "bg-purple-100 text-purple-800",
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Deprivation of Liberty Safeguards (DoLS)
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage DoLS authorisations and reviews</p>
          </div>
          <Button 
            onClick={() => {
              setEditingDoLS(null);
              setShowForm(true);
            }}
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New DoLS Record
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Active DoLS Alert */}
        {activeDoLS && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            activeDoLS.dols_status === 'urgent_authorisation_granted' 
              ? 'bg-orange-50 border-orange-500' 
              : 'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-start gap-3">
              <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                activeDoLS.dols_status === 'urgent_authorisation_granted' 
                  ? 'text-orange-600' 
                  : 'text-green-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">DoLS Active</span>
                  <Badge className={statusColors[activeDoLS.dols_status]}>
                    {activeDoLS.authorisation_type || 'Standard'} Authorisation
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  {activeDoLS.authorisation_end_date && (
                    <p>
                      <span className="font-medium">Expires:</span>{' '}
                      {format(new Date(activeDoLS.authorisation_end_date), 'PPP')}
                    </p>
                  )}
                  {activeDoLS.review_date && (
                    <p>
                      <span className="font-medium">Next Review:</span>{' '}
                      {format(new Date(activeDoLS.review_date), 'PPP')}
                    </p>
                  )}
                  {activeDoLS.supervisory_body && (
                    <p>
                      <span className="font-medium">Supervisory Body:</span> {activeDoLS.supervisory_body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DoLS Records List */}
        {!showForm && (
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading DoLS records...</p>
            ) : dolsRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No DoLS records</p>
                <p className="text-sm mt-2">Click "New DoLS Record" to add one</p>
              </div>
            ) : (
              dolsRecords.map((record) => (
                <Card key={record.id} className="border-l-4 border-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={statusColors[record.dols_status]}>
                            {record.dols_status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          {record.authorisation_type && (
                            <Badge variant="outline">
                              {record.authorisation_type} authorisation
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {record.referral_date && (
                            <div>
                              <span className="font-medium">Referral Date:</span>{' '}
                              {format(new Date(record.referral_date), 'PPP')}
                            </div>
                          )}
                          {record.authorisation_start_date && (
                            <div>
                              <span className="font-medium">Start Date:</span>{' '}
                              {format(new Date(record.authorisation_start_date), 'PPP')}
                            </div>
                          )}
                          {record.authorisation_end_date && (
                            <div>
                              <span className="font-medium">End Date:</span>{' '}
                              {format(new Date(record.authorisation_end_date), 'PPP')}
                            </div>
                          )}
                          {record.supervisory_body && (
                            <div>
                              <span className="font-medium">Supervisory Body:</span>{' '}
                              {record.supervisory_body}
                            </div>
                          )}
                          {record.case_reference && (
                            <div className="col-span-2">
                              <span className="font-medium">Case Reference:</span>{' '}
                              {record.case_reference}
                            </div>
                          )}
                        </div>

                        {record.reason_for_dols && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">Reason:</span> {record.reason_for_dols}
                          </div>
                        )}

                        {record.restrictions_in_place && record.restrictions_in_place.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">Restrictions:</span>
                            <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                              {record.restrictions_in_place.map((r, idx) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDoLS(record);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* DoLS Form */}
        {showForm && <DoLSForm 
          client={client}
          dols={editingDoLS}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => {
            setShowForm(false);
            setEditingDoLS(null);
          }}
          isSaving={saveMutation.isPending}
        />}
      </CardContent>
    </Card>
  );
}

function DoLSForm({ client, dols, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState(dols || {
    client_id: client.id,
    dols_status: 'screening_required',
    authorisation_type: 'standard',
    restrictions_in_place: [],
    conditions_attached: [],
    imca_appointed: false,
    capacity_assessment_completed: false,
    appeal_rights_explained: false,
    care_plan_updated: false,
    family_notified: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>DoLS Status *</Label>
          <Select
            value={formData.dols_status}
            onValueChange={(value) => setFormData({ ...formData, dols_status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_applicable">Not Applicable</SelectItem>
              <SelectItem value="screening_required">Screening Required</SelectItem>
              <SelectItem value="application_submitted">Application Submitted</SelectItem>
              <SelectItem value="standard_authorisation_granted">Standard Authorisation Granted</SelectItem>
              <SelectItem value="urgent_authorisation_granted">Urgent Authorisation Granted</SelectItem>
              <SelectItem value="not_authorised">Not Authorised</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Authorisation Type</Label>
          <Select
            value={formData.authorisation_type}
            onValueChange={(value) => setFormData({ ...formData, authorisation_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="not_applicable">Not Applicable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Referral Date</Label>
          <Input
            type="date"
            value={formData.referral_date || ''}
            onChange={(e) => setFormData({ ...formData, referral_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Authorisation Start Date</Label>
          <Input
            type="date"
            value={formData.authorisation_start_date || ''}
            onChange={(e) => setFormData({ ...formData, authorisation_start_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Authorisation End Date</Label>
          <Input
            type="date"
            value={formData.authorisation_end_date || ''}
            onChange={(e) => setFormData({ ...formData, authorisation_end_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Review Date</Label>
          <Input
            type="date"
            value={formData.review_date || ''}
            onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Supervisory Body</Label>
          <Input
            value={formData.supervisory_body || ''}
            onChange={(e) => setFormData({ ...formData, supervisory_body: e.target.value })}
            placeholder="Local authority name"
          />
        </div>

        <div>
          <Label>Case Reference</Label>
          <Input
            value={formData.case_reference || ''}
            onChange={(e) => setFormData({ ...formData, case_reference: e.target.value })}
            placeholder="DoLS case reference number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Best Interests Assessor</Label>
          <Input
            value={formData.best_interests_assessor || ''}
            onChange={(e) => setFormData({ ...formData, best_interests_assessor: e.target.value })}
          />
        </div>

        <div>
          <Label>Mental Health Assessor</Label>
          <Input
            value={formData.mental_health_assessor || ''}
            onChange={(e) => setFormData({ ...formData, mental_health_assessor: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Reason for DoLS</Label>
        <Textarea
          value={formData.reason_for_dols || ''}
          onChange={(e) => setFormData({ ...formData, reason_for_dols: e.target.value })}
          rows={3}
          placeholder="Explain why DoLS is required..."
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.imca_appointed}
            onChange={(e) => setFormData({ ...formData, imca_appointed: e.target.checked })}
            className="rounded"
          />
          IMCA Appointed
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.capacity_assessment_completed}
            onChange={(e) => setFormData({ ...formData, capacity_assessment_completed: e.target.checked })}
            className="rounded"
          />
          Mental Capacity Assessment Completed
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.appeal_rights_explained}
            onChange={(e) => setFormData({ ...formData, appeal_rights_explained: e.target.checked })}
            className="rounded"
          />
          Appeal Rights Explained
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.care_plan_updated}
            onChange={(e) => setFormData({ ...formData, care_plan_updated: e.target.checked })}
            className="rounded"
          />
          Care Plan Updated
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.family_notified}
            onChange={(e) => setFormData({ ...formData, family_notified: e.target.checked })}
            className="rounded"
          />
          Family/Next of Kin Notified
        </Label>
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save DoLS Record'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}