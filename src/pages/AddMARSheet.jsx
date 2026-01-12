import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Pill, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/toast";

export default function AddMARSheet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    client_id: "",
    medication_name: "",
    dosage: "",
    route: "",
    frequency: "",
    prescribed_by: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    mar_status: "active"
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return Array.isArray(allClients) ? allClients : [];
    },
  });

  const createMARSheetMutation = useMutation({
    mutationFn: async (marData) => {
      const marSheet = await base44.entities.MARSheet.create(marData);

      // Create audit notification
      await base44.entities.Notification.create({
        notification_type: 'mar_sheet_created',
        message: `New MAR sheet created: ${marData.medication_name} for client`,
        priority: 'normal',
        is_read: false,
        metadata: {
          mar_sheet_id: marSheet.id,
          client_id: marData.client_id,
          medication_name: marData.medication_name
        }
      });

      return marSheet;
    },
    onSuccess: () => {
      toast.success("MAR Sheet created successfully");
      queryClient.invalidateQueries({ queryKey: ['mar-sheets'] });
      navigate(createPageUrl("Clients"));
    },
    onError: (error) => {
      toast.error("Failed to create MAR Sheet", error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.medication_name || !formData.dosage || 
        !formData.route || !formData.frequency) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMARSheetMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Clients"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add MAR Sheet</h1>
            <p className="text-sm text-gray-600 mt-1">
              CQC KLOEs: Safe, Effective - Medication Administration Record
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Medication Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-600" />
                Medication Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleChange('client_id', value)}
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
                <Label htmlFor="medication_name">Medication Name *</Label>
                <Input
                  id="medication_name"
                  value={formData.medication_name}
                  onChange={(e) => handleChange('medication_name', e.target.value)}
                  placeholder="e.g., Paracetamol"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    value={formData.dosage}
                    onChange={(e) => handleChange('dosage', e.target.value)}
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="route">Route *</Label>
                  <Select
                    value={formData.route}
                    onValueChange={(value) => handleChange('route', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="sublingual">Sublingual</SelectItem>
                      <SelectItem value="topical">Topical</SelectItem>
                      <SelectItem value="inhaled">Inhaled</SelectItem>
                      <SelectItem value="injection">Injection</SelectItem>
                      <SelectItem value="intravenous">Intravenous</SelectItem>
                      <SelectItem value="rectal">Rectal</SelectItem>
                      <SelectItem value="transdermal">Transdermal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => handleChange('frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once_daily">Once Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                    <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                    <SelectItem value="four_times_daily">Four Times Daily</SelectItem>
                    <SelectItem value="as_required">As Required (PRN)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Prescriber */}
          <Card>
            <CardHeader>
              <CardTitle>Prescriber Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prescribed_by">Prescribed By</Label>
                <Input
                  id="prescribed_by"
                  value={formData.prescribed_by}
                  onChange={(e) => handleChange('prescribed_by', e.target.value)}
                  placeholder="Dr. Name / Prescriber details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date (if applicable)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Rules Notice */}
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 mb-1">Safety Rules</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• If medication is <strong>refused</strong> or <strong>omitted</strong>, an incident report will be auto-created</li>
                    <li>• Registered Manager will be notified immediately</li>
                    <li>• All MAR entries require signature for accountability</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Clients"))}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMARSheetMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMARSheetMutation.isPending ? "Creating..." : "Create MAR Sheet"}
            </Button>
          </div>
        </form>

        {/* Compliance Note */}
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-green-900 mb-2">CQC Compliance</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>SAFE:</strong> Accurate medication records prevent errors and ensure safe administration</p>
              <p><strong>EFFECTIVE:</strong> MAR sheets track adherence and effectiveness of prescribed treatments</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}