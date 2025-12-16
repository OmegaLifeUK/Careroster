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
import { Heart, Plus, Edit, AlertCircle, Upload, FileText } from "lucide-react";
import { format, isPast } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function DNACPRManager({ client }) {
  const [showForm, setShowForm] = useState(false);
  const [editingDNACPR, setEditingDNACPR] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dnacprRecords = [], isLoading } = useQuery({
    queryKey: ['dnacpr', client.id],
    queryFn: async () => {
      const records = await base44.entities.DNACPR.filter({ client_id: client.id }, '-decision_date');
      return records;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDNACPR) {
        return await base44.entities.DNACPR.update(editingDNACPR.id, data);
      } else {
        return await base44.entities.DNACPR.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnacpr'] });
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("DNACPR record saved successfully");
      setShowForm(false);
      setEditingDNACPR(null);
    },
  });

  const activeDNACPR = dnacprRecords.find(d => d.status === 'active');

  const statusColors = {
    active: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    withdrawn: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    not_in_place: "bg-green-100 text-green-800",
  };

  const needsReview = activeDNACPR && activeDNACPR.review_date && 
    isPast(new Date(activeDNACPR.review_date));

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-red-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              DNACPR (Do Not Attempt CPR)
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage resuscitation decisions and treatment ceilings</p>
          </div>
          <Button 
            onClick={() => {
              setEditingDNACPR(null);
              setShowForm(true);
            }}
            size="sm" 
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New DNACPR
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Active DNACPR Alert */}
        {activeDNACPR && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            needsReview ? 'bg-orange-50 border-orange-500' : 'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-start gap-3">
              <Heart className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                needsReview ? 'text-orange-600' : 'text-red-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">DNACPR Active</span>
                  <Badge className="bg-red-500 text-white">DO NOT RESUSCITATE</Badge>
                  {needsReview && (
                    <Badge className="bg-orange-500 text-white">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Review Overdue
                    </Badge>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  {activeDNACPR.decision_date && (
                    <p>
                      <span className="font-medium">Decision Date:</span>{' '}
                      {format(new Date(activeDNACPR.decision_date), 'PPP')}
                    </p>
                  )}
                  {activeDNACPR.decision_made_by && (
                    <p>
                      <span className="font-medium">Decision Maker:</span> {activeDNACPR.decision_made_by}
                      {activeDNACPR.decision_maker_role && ` (${activeDNACPR.decision_maker_role})`}
                    </p>
                  )}
                  {activeDNACPR.review_date && (
                    <p className={needsReview ? 'text-orange-700 font-medium' : ''}>
                      <span className="font-medium">Review Date:</span>{' '}
                      {format(new Date(activeDNACPR.review_date), 'PPP')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DNACPR Records List */}
        {!showForm && (
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading DNACPR records...</p>
            ) : dnacprRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No DNACPR records</p>
                <p className="text-sm mt-2">Click "New DNACPR" to add one</p>
              </div>
            ) : (
              dnacprRecords.map((record) => (
                <Card key={record.id} className="border-l-4 border-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={statusColors[record.status]}>
                            {record.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          {record.mental_capacity && (
                            <Badge variant="outline">
                              {record.mental_capacity.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {record.decision_date && (
                            <div>
                              <span className="font-medium">Decision Date:</span>{' '}
                              {format(new Date(record.decision_date), 'PPP')}
                            </div>
                          )}
                          {record.review_date && (
                            <div>
                              <span className="font-medium">Review Date:</span>{' '}
                              {format(new Date(record.review_date), 'PPP')}
                            </div>
                          )}
                          {record.decision_made_by && (
                            <div className="col-span-2">
                              <span className="font-medium">Decision Maker:</span>{' '}
                              {record.decision_made_by}
                              {record.decision_maker_role && ` - ${record.decision_maker_role}`}
                            </div>
                          )}
                          {record.patient_involvement && (
                            <div className="col-span-2">
                              <span className="font-medium">Patient Involvement:</span>{' '}
                              {record.patient_involvement.replace(/_/g, ' ')}
                            </div>
                          )}
                        </div>

                        {record.clinical_reasons && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">Clinical Reasons:</span> {record.clinical_reasons}
                          </div>
                        )}

                        {record.form_document_url && (
                          <div className="mt-2">
                            <a 
                              href={record.form_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              View DNACPR Form
                            </a>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDNACPR(record);
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

        {/* DNACPR Form */}
        {showForm && <DNACPRForm 
          client={client}
          dnacpr={editingDNACPR}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => {
            setShowForm(false);
            setEditingDNACPR(null);
          }}
          isSaving={saveMutation.isPending}
        />}
      </CardContent>
    </Card>
  );
}

function DNACPRForm({ client, dnacpr, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState(dnacpr || {
    client_id: client.id,
    status: 'active',
    discussion_with_patient: false,
    family_involved: false,
    emergency_services_aware: false,
    care_plan_updated: false,
    staff_briefed: false,
    gp_notified: false,
    advanced_decision_exists: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="not_in_place">Not In Place</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Decision Date *</Label>
          <Input
            type="date"
            value={formData.decision_date || ''}
            onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
            required
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
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={formData.expiry_date || ''}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Decision Made By *</Label>
          <Input
            value={formData.decision_made_by || ''}
            onChange={(e) => setFormData({ ...formData, decision_made_by: e.target.value })}
            placeholder="Senior clinician name"
            required
          />
        </div>

        <div>
          <Label>Decision Maker Role</Label>
          <Input
            value={formData.decision_maker_role || ''}
            onChange={(e) => setFormData({ ...formData, decision_maker_role: e.target.value })}
            placeholder="e.g., Consultant, GP"
          />
        </div>

        <div>
          <Label>GMC Number</Label>
          <Input
            value={formData.decision_maker_gmc || ''}
            onChange={(e) => setFormData({ ...formData, decision_maker_gmc: e.target.value })}
          />
        </div>

        <div>
          <Label>Mental Capacity</Label>
          <Select
            value={formData.mental_capacity}
            onValueChange={(value) => setFormData({ ...formData, mental_capacity: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="has_capacity">Has Capacity</SelectItem>
              <SelectItem value="lacks_capacity_for_this_decision">Lacks Capacity for This Decision</SelectItem>
              <SelectItem value="fluctuating_capacity">Fluctuating Capacity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Patient Involvement</Label>
        <Select
          value={formData.patient_involvement}
          onValueChange={(value) => setFormData({ ...formData, patient_involvement: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="patient_has_capacity_and_agrees">Patient Has Capacity and Agrees</SelectItem>
            <SelectItem value="patient_has_capacity_and_disagrees">Patient Has Capacity and Disagrees</SelectItem>
            <SelectItem value="patient_lacks_capacity">Patient Lacks Capacity</SelectItem>
            <SelectItem value="patient_not_informed_clinical_reasons">Patient Not Informed - Clinical Reasons</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Clinical Reasons *</Label>
        <Textarea
          value={formData.clinical_reasons || ''}
          onChange={(e) => setFormData({ ...formData, clinical_reasons: e.target.value })}
          rows={3}
          placeholder="Clinical reasons for DNACPR decision..."
          required
        />
      </div>

      <div>
        <Label>Anticipated Circumstances</Label>
        <Textarea
          value={formData.anticipated_circumstances || ''}
          onChange={(e) => setFormData({ ...formData, anticipated_circumstances: e.target.value })}
          rows={2}
          placeholder="Circumstances in which DNACPR applies..."
        />
      </div>

      <div>
        <Label>Other Emergency Treatments</Label>
        <Textarea
          value={formData.other_emergency_treatments || ''}
          onChange={(e) => setFormData({ ...formData, other_emergency_treatments: e.target.value })}
          rows={2}
          placeholder="Other treatments that should/shouldn't be given..."
        />
      </div>

      <div>
        <Label>Patient Wishes</Label>
        <Textarea
          value={formData.patient_wishes || ''}
          onChange={(e) => setFormData({ ...formData, patient_wishes: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label>Form Location</Label>
        <Input
          value={formData.form_location || ''}
          onChange={(e) => setFormData({ ...formData, form_location: e.target.value })}
          placeholder="Physical location of signed form"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.discussion_with_patient}
            onChange={(e) => setFormData({ ...formData, discussion_with_patient: e.target.checked })}
            className="rounded"
          />
          Discussion Held with Patient
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.family_involved}
            onChange={(e) => setFormData({ ...formData, family_involved: e.target.checked })}
            className="rounded"
          />
          Family/LPA/IMCA Involved
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.emergency_services_aware}
            onChange={(e) => setFormData({ ...formData, emergency_services_aware: e.target.checked })}
            className="rounded"
          />
          Emergency Services Made Aware
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
            checked={formData.staff_briefed}
            onChange={(e) => setFormData({ ...formData, staff_briefed: e.target.checked })}
            className="rounded"
          />
          All Staff Briefed
        </Label>

        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.gp_notified}
            onChange={(e) => setFormData({ ...formData, gp_notified: e.target.checked })}
            className="rounded"
          />
          GP Notified
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
        <Button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-700">
          {isSaving ? 'Saving...' : 'Save DNACPR'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}