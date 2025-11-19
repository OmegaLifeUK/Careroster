import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Plus, AlertTriangle, Activity } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function MedicalErrors() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [formData, setFormData] = useState({
    error_type: "medication_error",
    severity: "minor",
    error_date: "",
    description: "",
    harm_caused: "none",
    immediate_actions: "",
    family_notified: false
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: medicalErrors = [] } = useQuery({
    queryKey: ['medical-errors'],
    queryFn: async () => {
      const data = await base44.entities.MedicalError.list('-error_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-errors'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalError.create({
      ...data,
      discovered_date: new Date().toISOString(),
      status: 'reported'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-errors'] });
      setShowDialog(false);
      resetForm();
      toast.success("Success", "Medical error reported successfully");
    },
  });

  const resetForm = () => {
    setFormData({
      error_type: "medication_error",
      severity: "minor",
      error_date: "",
      description: "",
      harm_caused: "none",
      immediate_actions: "",
      family_notified: false
    });
  };

  const severityColors = {
    near_miss: "bg-blue-100 text-blue-800",
    minor: "bg-yellow-100 text-yellow-800",
    moderate: "bg-orange-100 text-orange-800",
    major: "bg-red-100 text-red-800",
    catastrophic: "bg-red-600 text-white"
  };

  const statusColors = {
    reported: "bg-yellow-100 text-yellow-800",
    investigating: "bg-blue-100 text-blue-800",
    reviewed: "bg-purple-100 text-purple-800",
    action_plan_created: "bg-green-100 text-green-800",
    closed: "bg-gray-300 text-gray-600"
  };

  if (selectedError) {
    const client = clients.find(c => c.id === selectedError.client_id);
    
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedError(null)} className="mb-4">
            ← Back to Medical Errors
          </Button>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedError.error_type.replace(/_/g, ' ')}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Client: {client?.full_name || 'Unknown'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={severityColors[selectedError.severity]}>
                    {selectedError.severity}
                  </Badge>
                  <Badge className={statusColors[selectedError.status]}>
                    {selectedError.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Error Date</Label>
                    <p className="font-medium">{selectedError.error_date}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Discovered Date</Label>
                    <p className="font-medium">{selectedError.discovered_date}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Description</Label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded">{selectedError.description}</p>
                </div>

                {selectedError.medication_details && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Medication Details</Label>
                    <div className="bg-purple-50 p-4 rounded space-y-2">
                      <p><strong>Medication:</strong> {selectedError.medication_details.medication_name}</p>
                      <p><strong>Intended Dose:</strong> {selectedError.medication_details.intended_dose}</p>
                      <p><strong>Actual Dose:</strong> {selectedError.medication_details.actual_dose}</p>
                      <p><strong>Error Stage:</strong> {selectedError.medication_details.error_stage}</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Harm Caused</Label>
                  <Badge className={selectedError.harm_caused === "none" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selectedError.harm_caused}
                  </Badge>
                  {selectedError.harm_description && (
                    <p className="text-sm text-gray-700 mt-2">{selectedError.harm_description}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Immediate Actions</Label>
                  <p className="text-gray-900 bg-blue-50 p-4 rounded">{selectedError.immediate_actions}</p>
                </div>

                {selectedError.root_cause_analysis && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Root Cause Analysis</Label>
                    <p className="text-gray-900 bg-yellow-50 p-4 rounded">{selectedError.root_cause_analysis}</p>
                  </div>
                )}

                {selectedError.corrective_actions && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Corrective Actions</Label>
                    <p className="text-gray-900 bg-green-50 p-4 rounded">{selectedError.corrective_actions}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Medical Errors</h1>
            <p className="text-gray-500">Track and manage medication & medical errors</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Report Error
          </Button>
        </div>

        <div className="space-y-4">
          {medicalErrors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No medical errors reported</p>
              </CardContent>
            </Card>
          ) : (
            medicalErrors.map(error => {
              const client = clients.find(c => c.id === error.client_id);
              
              return (
                <Card 
                  key={error.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedError(error)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <h3 className="font-semibold text-lg">
                            {error.error_type.replace(/_/g, ' ')}
                          </h3>
                          <Badge className={severityColors[error.severity]}>
                            {error.severity}
                          </Badge>
                          <Badge className={statusColors[error.status]}>
                            {error.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{error.description}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Client: {client?.full_name || 'Unknown'}</span>
                          <span>Date: {error.error_date}</span>
                          <span>Harm: {error.harm_caused}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle>Report Medical Error</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Error Type *</Label>
                      <Select value={formData.error_type} onValueChange={(val) => setFormData({ ...formData, error_type: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["medication_error", "treatment_error", "diagnostic_error", "documentation_error", "communication_error", "equipment_failure", "other"].map(type => (
                            <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Severity *</Label>
                      <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["near_miss", "minor", "moderate", "major", "catastrophic"].map(sev => (
                            <SelectItem key={sev} value={sev}>{sev.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Error Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.error_date}
                      onChange={(e) => setFormData({ ...formData, error_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what happened in detail"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Harm Caused</Label>
                    <Select value={formData.harm_caused} onValueChange={(val) => setFormData({ ...formData, harm_caused: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["none", "minimal", "temporary", "permanent", "death"].map(harm => (
                          <SelectItem key={harm} value={harm}>{harm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Immediate Actions Taken</Label>
                    <Textarea
                      value={formData.immediate_actions}
                      onChange={(e) => setFormData({ ...formData, immediate_actions: e.target.value })}
                      placeholder="What actions were taken immediately"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="family"
                      checked={formData.family_notified}
                      onChange={(e) => setFormData({ ...formData, family_notified: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="family">Family/Next of Kin Notified</Label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-red-600 hover:bg-red-700">
                      {createMutation.isPending ? "Reporting..." : "Report Error"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}