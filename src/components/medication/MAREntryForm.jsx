import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Upload } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function MAREntryForm({ marSheet, clientId, onSuccess }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().slice(0, 5),
    administered: false,
    refused: false,
    omitted: false,
    reason: ""
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const createMAREntryMutation = useMutation({
    mutationFn: async (entryData) => {
      // Upload signature
      let signatureUrl = null;
      if (signatureFile) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: signatureFile });
          signatureUrl = file_url;
        } catch (error) {
          console.error("Failed to upload signature:", error);
        }
      }

      // Create MAR entry
      const entry = await base44.entities.MAREntry.create({
        mar_sheet_id: marSheet.id,
        entry_date: entryData.entry_date,
        entry_time: entryData.entry_time,
        administered: entryData.administered,
        refused: entryData.refused,
        omitted: entryData.omitted,
        reason: entryData.reason,
        administered_by_id: user?.id || user?.email,
        signature_url: signatureUrl
      });

      // SAFETY RULES: If refused or omitted, create incident and notify
      if (entryData.refused || entryData.omitted) {
        // Create incident report
        await base44.entities.Incident.create({
          client_id: clientId,
          incident_type: entryData.refused ? 'medication_refusal' : 'medication_omission',
          severity: 'medium',
          description: `Medication ${entryData.refused ? 'refused' : 'omitted'}: ${marSheet.medication_name} (${marSheet.dosage})\nReason: ${entryData.reason}`,
          reported_by: user?.email || user?.id,
          incident_date: new Date().toISOString(),
          status: 'reported'
        });

        // Notify Registered Manager
        await base44.entities.Notification.create({
          notification_type: entryData.refused ? 'medication_refused' : 'medication_omitted',
          message: `URGENT: Medication ${entryData.refused ? 'refused' : 'omitted'} - ${marSheet.medication_name} for client`,
          priority: 'urgent',
          is_read: false,
          metadata: {
            mar_sheet_id: marSheet.id,
            mar_entry_id: entry.id,
            client_id: clientId,
            medication_name: marSheet.medication_name,
            reason: entryData.reason
          }
        });
      }

      return entry;
    },
    onSuccess: () => {
      toast.success("MAR entry recorded successfully");
      queryClient.invalidateQueries({ queryKey: ['mar-entries'] });
      if (onSuccess) onSuccess();
      // Reset form
      setFormData({
        entry_date: new Date().toISOString().split('T')[0],
        entry_time: new Date().toTimeString().slice(0, 5),
        administered: false,
        refused: false,
        omitted: false,
        reason: ""
      });
      setSignatureFile(null);
    },
    onError: (error) => {
      toast.error("Failed to record MAR entry", error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.administered && !formData.refused && !formData.omitted) {
      toast.error("Please indicate whether medication was administered, refused, or omitted");
      return;
    }

    if ((formData.refused || formData.omitted) && !formData.reason) {
      toast.error("Please provide a reason for refusal or omission");
      return;
    }

    if (!signatureFile) {
      toast.error("Signature is required");
      return;
    }

    createMAREntryMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    // Ensure only one option is selected
    if (field === 'administered' && value) {
      setFormData(prev => ({ ...prev, administered: true, refused: false, omitted: false }));
    } else if (field === 'refused' && value) {
      setFormData(prev => ({ ...prev, administered: false, refused: true, omitted: false }));
    } else if (field === 'omitted' && value) {
      setFormData(prev => ({ ...prev, administered: false, refused: false, omitted: true }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
    }
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="text-lg">Record Administration</CardTitle>
        <div className="text-sm text-gray-600">
          <p><strong>Medication:</strong> {marSheet.medication_name}</p>
          <p><strong>Dosage:</strong> {marSheet.dosage} - <strong>Route:</strong> {marSheet.route}</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_date">Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => handleChange('entry_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="entry_time">Time</Label>
              <Input
                id="entry_time"
                type="time"
                value={formData.entry_time}
                onChange={(e) => handleChange('entry_time', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Administration Status *</Label>
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50">
              <Checkbox
                id="administered"
                checked={formData.administered}
                onCheckedChange={(checked) => handleChange('administered', checked)}
              />
              <Label htmlFor="administered" className="font-normal flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Administered
              </Label>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-red-50">
              <Checkbox
                id="refused"
                checked={formData.refused}
                onCheckedChange={(checked) => handleChange('refused', checked)}
              />
              <Label htmlFor="refused" className="font-normal flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Refused (will create incident report)
              </Label>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-orange-50">
              <Checkbox
                id="omitted"
                checked={formData.omitted}
                onCheckedChange={(checked) => handleChange('omitted', checked)}
              />
              <Label htmlFor="omitted" className="font-normal flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                Omitted (will create incident report)
              </Label>
            </div>
          </div>

          {(formData.refused || formData.omitted) && (
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Provide detailed reason for refusal or omission..."
                rows={3}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="signature">Signature *</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="signature"
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="text-sm"
                required
              />
              {signatureFile && (
                <Badge className="bg-green-100 text-green-800">
                  <Upload className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={createMAREntryMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {createMAREntryMutation.isPending ? "Recording..." : "Record Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}