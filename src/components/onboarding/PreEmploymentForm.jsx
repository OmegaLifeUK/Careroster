import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function PreEmploymentForm({ staffId, existingRecord, onComplete }) {
  const [formData, setFormData] = useState(existingRecord || {
    staff_id: staffId,
    right_to_work_confirmed: false,
    employment_history_verified: false,
    status: 'pending'
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFileUpload = async (file, field) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success("Uploaded", "Document uploaded successfully");
    } catch (error) {
      toast.error("Upload Failed", "Could not upload document");
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const data = {
        ...formData,
        verified_by: user.full_name || user.email,
        verification_date: format(new Date(), 'yyyy-MM-dd'),
        status: formData.right_to_work_confirmed && 
                formData.photo_id_url && 
                formData.proof_of_address_url ? 'verified' : 'incomplete'
      };

      if (existingRecord) {
        return base44.entities.PreEmploymentCompliance.update(existingRecord.id, data);
      } else {
        return base44.entities.PreEmploymentCompliance.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-employment'] });
      toast.success("Saved", "Pre-employment checks updated");
      onComplete?.();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Pre-Employment Compliance Checks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Photo ID (Passport / Driving Licence) *</Label>
            <div className="mt-1">
              {formData.photo_id_url ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Uploaded</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(formData.photo_id_url, '_blank')}
                  >
                    View
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed rounded p-3 text-center hover:bg-gray-50">
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm text-gray-600">Upload Photo ID</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'photo_id_url')}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Proof of Address *</Label>
            <div className="mt-1">
              {formData.proof_of_address_url ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Uploaded</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(formData.proof_of_address_url, '_blank')}
                  >
                    View
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed rounded p-3 text-center hover:bg-gray-50">
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm text-gray-600">Upload Proof of Address</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'proof_of_address_url')}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Right to Work Document</Label>
            <div className="mt-1">
              {formData.right_to_work_document_url ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Uploaded</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(formData.right_to_work_document_url, '_blank')}
                  >
                    View
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed rounded p-3 text-center hover:bg-gray-50">
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm text-gray-600">Upload RTW Document</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'right_to_work_document_url')}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Application Form / CV</Label>
            <div className="mt-1">
              {formData.application_form_url ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Uploaded</span>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed rounded p-3 text-center hover:bg-gray-50">
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm text-gray-600">Upload Application</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'application_form_url')}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div 
          className="flex items-center space-x-2 p-3 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => {
            console.log('Div clicked - toggling right to work from:', formData.right_to_work_confirmed);
            setFormData(prev => ({ ...prev, right_to_work_confirmed: !prev.right_to_work_confirmed }));
          }}
        >
          <Checkbox
            checked={!!formData.right_to_work_confirmed}
            onCheckedChange={(checked) => {
              console.log('Checkbox onCheckedChange fired:', checked);
              setFormData(prev => ({ ...prev, right_to_work_confirmed: !!checked }));
            }}
            disabled={false}
          />
          <span className="font-medium flex-1">
            I confirm this person has the right to work in the UK *
          </span>
        </div>

        <div 
          className="flex items-center space-x-2 p-3 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => {
            console.log('Div clicked - toggling employment history from:', formData.employment_history_verified);
            setFormData(prev => ({ ...prev, employment_history_verified: !prev.employment_history_verified }));
          }}
        >
          <Checkbox
            checked={!!formData.employment_history_verified}
            onCheckedChange={(checked) => {
              console.log('Checkbox onCheckedChange fired:', checked);
              setFormData(prev => ({ ...prev, employment_history_verified: !!checked }));
            }}
            disabled={false}
          />
          <span className="font-medium flex-1">
            Employment history verified (gaps explained)
          </span>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes or comments..."
            rows={3}
          />
        </div>

        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || uploading}
          className="w-full bg-blue-600"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Save & Continue
        </Button>
      </CardContent>
    </Card>
  );
}