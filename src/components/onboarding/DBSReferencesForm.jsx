import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addYears } from "date-fns";

export default function DBSReferencesForm({ staffId, existingRecord, onComplete }) {
  const [formData, setFormData] = useState(existingRecord || {
    staff_id: staffId,
    dbs_level: 'enhanced',
    dbs_status: 'pending',
    all_references_satisfactory: false,
    reference_1: {},
    reference_2: {},
    reference_3: {}
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFileUpload = async (file, field) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success("Uploaded", "Document uploaded");
    } catch (error) {
      toast.error("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReferenceChange = (refNumber, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`reference_${refNumber}`]: {
        ...prev[`reference_${refNumber}`],
        [field]: value
      }
    }));
  };

  const handleReferenceUpload = async (file, refNumber) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleReferenceChange(refNumber, 'reference_url', file_url);
      handleReferenceChange(refNumber, 'received_date', format(new Date(), 'yyyy-MM-dd'));
      toast.success("Uploaded", `Reference ${refNumber} uploaded`);
    } catch (error) {
      toast.error("Upload Failed", error.message);
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
        verification_date: format(new Date(), 'yyyy-MM-dd')
      };

      if (existingRecord) {
        return base44.entities.DBSAndReferences.update(existingRecord.id, data);
      } else {
        return base44.entities.DBSAndReferences.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbs-references'] });
      toast.success("Saved", "DBS and references updated");
      onComplete?.();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          DBS Check & Employment References
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DBS Section */}
        <div className="space-y-4 p-4 bg-red-50 rounded-lg">
          <h3 className="font-semibold">DBS Check Details</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>DBS Level *</Label>
              <Select 
                value={formData.dbs_level} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, dbs_level: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="enhanced">Enhanced</SelectItem>
                  <SelectItem value="enhanced_barred_list">Enhanced + Barred List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>DBS Status *</Label>
              <Select 
                value={formData.dbs_status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, dbs_status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="clear">Clear</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>DBS Certificate Number</Label>
              <Input
                value={formData.dbs_reference_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dbs_reference_number: e.target.value }))}
                placeholder="001234567890"
              />
            </div>

            <div>
              <Label>DBS Issue Date</Label>
              <Input
                type="date"
                value={formData.dbs_issue_date || ''}
                onChange={(e) => {
                  const issueDate = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    dbs_issue_date: issueDate,
                    dbs_review_date: issueDate ? format(addYears(new Date(issueDate), 3), 'yyyy-MM-dd') : ''
                  }));
                }}
              />
            </div>

            <div>
              <Label>DBS Review Date (Auto: +3 years)</Label>
              <Input
                type="date"
                value={formData.dbs_review_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dbs_review_date: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.dbs_update_service}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dbs_update_service: checked }))}
              />
              <Label>Subscribed to DBS Update Service</Label>
            </div>
          </div>

          <div>
            <Label>DBS Certificate (Upload Scan)</Label>
            {formData.dbs_certificate_url ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Uploaded</span>
              </div>
            ) : (
              <label className="cursor-pointer block mt-1">
                <div className="border-2 border-dashed rounded p-3 text-center hover:bg-gray-50">
                  <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-600">Upload DBS Certificate</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'dbs_certificate_url')}
                />
              </label>
            )}
          </div>
        </div>

        {/* References Section */}
        <div className="space-y-4">
          <h3 className="font-semibold">Employment References (Minimum 2 Required)</h3>
          
          {[1, 2, 3].map(refNum => (
            <Card key={refNum} className="border">
              <CardHeader className="pb-3">
                <h4 className="font-medium text-sm">Reference {refNum} {refNum <= 2 && '*'}</h4>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Referee Name</Label>
                    <Input
                      value={formData[`reference_${refNum}`]?.referee_name || ''}
                      onChange={(e) => handleReferenceChange(refNum, 'referee_name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Organisation</Label>
                    <Input
                      value={formData[`reference_${refNum}`]?.referee_organisation || ''}
                      onChange={(e) => handleReferenceChange(refNum, 'referee_organisation', e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Contact (Email/Phone)</Label>
                    <Input
                      value={formData[`reference_${refNum}`]?.referee_contact || ''}
                      onChange={(e) => handleReferenceChange(refNum, 'referee_contact', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData[`reference_${refNum}`]?.satisfactory || false}
                      onCheckedChange={(checked) => handleReferenceChange(refNum, 'satisfactory', checked)}
                    />
                    <Label className="text-sm">Reference Satisfactory</Label>
                  </div>
                </div>

                {formData[`reference_${refNum}`]?.reference_url ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Reference uploaded</span>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="border-2 border-dashed rounded p-2 text-center hover:bg-gray-50">
                      <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-600">Upload Reference {refNum}</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/*"
                      onChange={(e) => e.target.files[0] && handleReferenceUpload(e.target.files[0], refNum)}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded">
            <Checkbox
              checked={formData.all_references_satisfactory}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, all_references_satisfactory: checked }))}
            />
            <Label className="font-medium">
              All references received and satisfactory *
            </Label>
          </div>
        </div>

        <div>
          <Label>Verification Notes</Label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>

        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || uploading}
          className="w-full bg-green-600"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Save DBS & References
        </Button>
      </CardContent>
    </Card>
  );
}