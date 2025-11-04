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
import { FileCheck, Plus, CheckCircle, XCircle, Clock, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";

export default function ConsentManagement({ client }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    consent_type: "care_plan",
    consent_title: "",
    description: "",
    status: "pending",
    granted_date: format(new Date(), "yyyy-MM-dd"),
    expiry_date: "",
    granted_by: client.full_name,
    granted_by_relationship: "self",
    witness_name: "",
    witness_role: "",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: consents = [], isLoading } = useQuery({
    queryKey: ['client-consents', client.id],
    queryFn: async () => {
      const consentsList = await base44.entities.ClientConsent.filter({ client_id: client.id }, '-granted_date');
      return consentsList;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const addConsentMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientConsent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-consents'] });
      setShowAddForm(false);
      setFormData({
        consent_type: "care_plan",
        consent_title: "",
        description: "",
        status: "pending",
        granted_date: format(new Date(), "yyyy-MM-dd"),
        expiry_date: "",
        granted_by: client.full_name,
        granted_by_relationship: "self",
        witness_name: "",
        witness_role: "",
        notes: "",
      });
    },
  });

  const updateConsentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientConsent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-consents'] });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const staffMember = staff.find(s => s.email === currentUser?.email);
    
    await addConsentMutation.mutate({
      client_id: client.id,
      ...formData,
      recorded_by_staff_id: staffMember?.id || currentUser?.id || "system",
    });
  };

  const handleStatusChange = (consentId, newStatus) => {
    updateConsentMutation.mutate({
      id: consentId,
      data: { status: newStatus }
    });
  };

  const statusColors = {
    granted: "bg-green-100 text-green-800",
    refused: "bg-red-100 text-red-800",
    withdrawn: "bg-orange-100 text-orange-800",
    expired: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  const statusIcons = {
    granted: CheckCircle,
    refused: XCircle,
    withdrawn: AlertTriangle,
    expired: Clock,
    pending: FileText,
  };

  const checkExpiry = (consent) => {
    if (consent.expiry_date && consent.status === 'granted') {
      try {
        if (isPast(parseISO(consent.expiry_date))) {
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              Consent Management
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Track client agreements and permissions</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Consent
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-green-50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Add New Consent Record
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="consent_type">Consent Type *</Label>
                <Select
                  value={formData.consent_type}
                  onValueChange={(value) => setFormData({ ...formData, consent_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="care_plan">Care Plan</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="data_sharing">Data Sharing</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="medical_treatment">Medical Treatment</SelectItem>
                    <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                    <SelectItem value="personal_care">Personal Care</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="consent_title">Consent Title *</Label>
                <Input
                  id="consent_title"
                  value={formData.consent_title}
                  onChange={(e) => setFormData({ ...formData, consent_title: e.target.value })}
                  required
                  placeholder="e.g., Consent to Administer Medication"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Detailed description of what is being consented to"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="granted">Granted</SelectItem>
                    <SelectItem value="refused">Refused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="granted_date">Date Granted</Label>
                <Input
                  id="granted_date"
                  type="date"
                  value={formData.granted_date}
                  onChange={(e) => setFormData({ ...formData, granted_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="granted_by">Granted By *</Label>
                <Input
                  id="granted_by"
                  value={formData.granted_by}
                  onChange={(e) => setFormData({ ...formData, granted_by: e.target.value })}
                  required
                  placeholder="Name of person granting consent"
                />
              </div>

              <div>
                <Label htmlFor="granted_by_relationship">Relationship to Client</Label>
                <Input
                  id="granted_by_relationship"
                  value={formData.granted_by_relationship}
                  onChange={(e) => setFormData({ ...formData, granted_by_relationship: e.target.value })}
                  placeholder="e.g., self, daughter, guardian"
                />
              </div>

              <div>
                <Label htmlFor="witness_name">Witness Name (if applicable)</Label>
                <Input
                  id="witness_name"
                  value={formData.witness_name}
                  onChange={(e) => setFormData({ ...formData, witness_name: e.target.value })}
                  placeholder="Name of witness"
                />
              </div>

              <div>
                <Label htmlFor="witness_role">Witness Role</Label>
                <Input
                  id="witness_role"
                  value={formData.witness_role}
                  onChange={(e) => setFormData({ ...formData, witness_role: e.target.value })}
                  placeholder="e.g., Care Manager, Family Member"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any conditions or additional information"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={addConsentMutation.isPending}>
                {addConsentMutation.isPending ? "Saving..." : "Save Consent"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Consents List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading consents...</p>
          ) : consents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No consent records yet</p>
            </div>
          ) : (
            consents.map((consent) => {
              const StatusIcon = statusIcons[consent.status];
              const isExpired = checkExpiry(consent);
              
              return (
                <Card key={consent.id} className={`border-l-4 ${
                  isExpired ? 'border-orange-500' : 'border-green-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{consent.consent_title}</h4>
                          <Badge className={statusColors[isExpired ? 'expired' : consent.status]}>
                            {isExpired ? 'Expired' : consent.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {consent.consent_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{consent.description}</p>
                      </div>
                      <StatusIcon className={`w-6 h-6 ${
                        isExpired ? 'text-orange-600' :
                        consent.status === 'granted' ? 'text-green-600' :
                        consent.status === 'refused' ? 'text-red-600' :
                        consent.status === 'withdrawn' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                      <div className="p-2 bg-gray-50 rounded">
                        <strong>Granted by:</strong> {consent.granted_by}
                        {consent.granted_by_relationship && ` (${consent.granted_by_relationship})`}
                      </div>
                      {consent.granted_date && (
                        <div className="p-2 bg-gray-50 rounded">
                          <strong>Date:</strong> {format(parseISO(consent.granted_date), "MMM d, yyyy")}
                        </div>
                      )}
                      {consent.expiry_date && (
                        <div className={`p-2 rounded ${isExpired ? 'bg-orange-100' : 'bg-blue-50'}`}>
                          <strong>Expires:</strong> {format(parseISO(consent.expiry_date), "MMM d, yyyy")}
                        </div>
                      )}
                      {consent.witness_name && (
                        <div className="p-2 bg-gray-50 rounded">
                          <strong>Witnessed by:</strong> {consent.witness_name}
                          {consent.witness_role && ` (${consent.witness_role})`}
                        </div>
                      )}
                    </div>

                    {consent.notes && (
                      <div className="p-2 bg-blue-50 rounded text-sm mb-3">
                        <strong>Notes:</strong> {consent.notes}
                      </div>
                    )}

                    {isExpired && consent.status === 'granted' && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-orange-900 font-medium">This consent has expired</p>
                          <p className="text-xs text-orange-700">Please obtain renewed consent</p>
                        </div>
                      </div>
                    )}

                    {consent.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(consent.id, 'granted')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark as Granted
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(consent.id, 'refused')}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Mark as Refused
                        </Button>
                      </div>
                    )}

                    {consent.status === 'granted' && !isExpired && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(consent.id, 'withdrawn')}
                        className="mt-3 text-orange-600 hover:bg-orange-50"
                      >
                        Withdraw Consent
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}