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
import { Pill, Plus, Clock, User, AlertCircle, CheckCircle, XCircle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MedicationManagement({ client }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    administration_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    status: "administered",
    notes: "",
    side_effects: "",
    witnessed_by: "",
  });

  const queryClient = useQueryClient();

  const { data: medicationLogs = [], isLoading } = useQuery({
    queryKey: ['medication-logs', client.id],
    queryFn: async () => {
      const logs = await base44.entities.MedicationLog.filter({ client_id: client.id }, '-administration_time');
      return logs;
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const addMedicationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setShowAddForm(false);
      setFormData({
        medication_name: "",
        dosage: "",
        frequency: "",
        administration_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: "administered",
        notes: "",
        side_effects: "",
        witnessed_by: "",
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Find staff member by email match with current user
    const staffMember = staff.find(s => s.email === currentUser?.email);
    
    await addMedicationLogMutation.mutate({
      client_id: client.id,
      ...formData,
      administered_by_staff_id: staffMember?.id || currentUser?.id || "system",
    });
  };

  const statusColors = {
    administered: "bg-green-100 text-green-800",
    refused: "bg-yellow-100 text-yellow-800",
    missed: "bg-red-100 text-red-800",
    not_required: "bg-gray-100 text-gray-800",
  };

  const statusIcons = {
    administered: CheckCircle,
    refused: XCircle,
    missed: AlertCircle,
    not_required: FileText,
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || "Unknown Staff";
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" />
              Medication Management
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Track medication administration and logs</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Log Medication
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-purple-50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Add Medication Administration Log
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="medication_name">Medication Name *</Label>
                <Input
                  id="medication_name"
                  value={formData.medication_name}
                  onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                  required
                  placeholder="e.g., Paracetamol"
                />
              </div>

              <div>
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
                  placeholder="e.g., 500mg"
                />
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Input
                  id="frequency"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., Twice daily"
                />
              </div>

              <div>
                <Label htmlFor="administration_time">Administration Time *</Label>
                <Input
                  id="administration_time"
                  type="datetime-local"
                  value={formData.administration_time}
                  onChange={(e) => setFormData({ ...formData, administration_time: e.target.value })}
                  required
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
                    <SelectItem value="administered">Administered</SelectItem>
                    <SelectItem value="refused">Refused</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="not_required">Not Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="witnessed_by">Witnessed By (if required)</Label>
                <Input
                  id="witnessed_by"
                  value={formData.witnessed_by}
                  onChange={(e) => setFormData({ ...formData, witnessed_by: e.target.value })}
                  placeholder="Name of witness"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about administration"
                  rows={2}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="side_effects">Side Effects Observed</Label>
                <Textarea
                  id="side_effects"
                  value={formData.side_effects}
                  onChange={(e) => setFormData({ ...formData, side_effects: e.target.value })}
                  placeholder="Any observed side effects or reactions"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={addMedicationLogMutation.isPending}>
                {addMedicationLogMutation.isPending ? "Saving..." : "Save Log"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Medication Logs List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading medication logs...</p>
          ) : medicationLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Pill className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No medication logs recorded yet</p>
            </div>
          ) : (
            medicationLogs.map((log) => {
              const StatusIcon = statusIcons[log.status];
              
              return (
                <Card key={log.id} className="border-l-4 border-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{log.medication_name}</h4>
                          <Badge className={statusColors[log.status]}>
                            {log.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Dosage: <strong>{log.dosage}</strong></p>
                        {log.frequency && (
                          <p className="text-sm text-gray-600">Frequency: {log.frequency}</p>
                        )}
                      </div>
                      <StatusIcon className={`w-6 h-6 ${
                        log.status === 'administered' ? 'text-green-600' :
                        log.status === 'refused' ? 'text-yellow-600' :
                        log.status === 'missed' ? 'text-red-600' :
                        'text-gray-600'
                      }`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{format(parseISO(log.administration_time), "MMM d, yyyy 'at' HH:mm")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>By: {getStaffName(log.administered_by_staff_id)}</span>
                      </div>
                    </div>

                    {log.witnessed_by && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <strong>Witnessed by:</strong> {log.witnessed_by}
                      </div>
                    )}

                    {log.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Notes:</strong> {log.notes}
                      </div>
                    )}

                    {log.side_effects && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div>
                            <strong className="text-orange-900">Side Effects:</strong>
                            <p className="text-orange-800">{log.side_effects}</p>
                          </div>
                        </div>
                      </div>
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