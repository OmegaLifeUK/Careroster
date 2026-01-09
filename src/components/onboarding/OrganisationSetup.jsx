import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Upload, 
  CheckCircle, 
  FileText, 
  Loader2,
  Shield,
  BookOpen
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function OrganisationSetup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.OrganisationProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const p = await base44.entities.PolicyLibrary.list();
      return Array.isArray(p) ? p : [];
    }
  });

  const [formData, setFormData] = useState(orgProfile || {
    care_setting_types: [],
    regulators: [],
    organisation_status: 'incomplete'
  });
  const [uploading, setUploading] = useState(false);

  const mandatoryPolicies = [
    "safeguarding_adults",
    "safeguarding_children",
    "health_safety",
    "infection_control",
    "medication_management",
    "gdpr_confidentiality",
    "complaints",
    "whistleblowing"
  ];

  const policyStatus = mandatoryPolicies.map(mp => ({
    category: mp,
    uploaded: policies.some(p => p.policy_category === mp && p.status === 'approved')
  }));

  const allPoliciesUploaded = policyStatus.every(p => p.uploaded);
  const policiesProgress = (policyStatus.filter(p => p.uploaded).length / mandatoryPolicies.length) * 100;

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...formData,
        mandatory_policies_uploaded: allPoliciesUploaded,
        organisation_status: allPoliciesUploaded && 
                            formData.cqc_registration_number && 
                            formData.registered_manager_email ? 'compliant' : 'incomplete'
      };

      if (orgProfile) {
        return base44.entities.OrganisationProfile.update(orgProfile.id, data);
      } else {
        return base44.entities.OrganisationProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-profile'] });
      toast.success("Saved", "Organisation profile updated");
    }
  });

  const toggleSettingType = (type) => {
    setFormData(prev => ({
      ...prev,
      care_setting_types: prev.care_setting_types?.includes(type)
        ? prev.care_setting_types.filter(t => t !== type)
        : [...(prev.care_setting_types || []), type]
    }));
  };

  const toggleRegulator = (reg) => {
    setFormData(prev => ({
      ...prev,
      regulators: prev.regulators?.includes(reg)
        ? prev.regulators.filter(r => r !== reg)
        : [...(prev.regulators || []), reg]
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          Organisation Regulatory Setup
        </h1>
        <p className="text-gray-600 mt-1">
          Configure your organisation profile for CQC/Ofsted compliance
        </p>
      </div>

      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organisation Details</CardTitle>
            <Badge className={
              formData.organisation_status === 'compliant' ? 'bg-green-600' : 'bg-amber-600'
            }>
              {formData.organisation_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Organisation Name *</Label>
            <Input
              value={formData.organisation_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, organisation_name: e.target.value }))}
              placeholder="Legal organisation name"
            />
          </div>

          <div>
            <Label>Care Settings Operated *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["domiciliary", "residential", "supported_living", "children_services", "day_centre"].map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.care_setting_types?.includes(type)}
                    onCheckedChange={() => toggleSettingType(type)}
                  />
                  <Label className="capitalize">{type.replace(/_/g, ' ')}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Regulators *</Label>
            <div className="flex gap-4 mt-2">
              {["CQC", "Ofsted"].map(reg => (
                <div key={reg} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.regulators?.includes(reg)}
                    onCheckedChange={() => toggleRegulator(reg)}
                  />
                  <Label>{reg}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>CQC Registration Number</Label>
              <Input
                value={formData.cqc_registration_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cqc_registration_number: e.target.value }))}
                placeholder="1-123456789"
              />
            </div>
            <div>
              <Label>Ofsted URN</Label>
              <Input
                value={formData.ofsted_registration_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ofsted_registration_number: e.target.value }))}
                placeholder="URN number"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Registered Manager Name *</Label>
              <Input
                value={formData.registered_manager_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, registered_manager_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Registered Manager Email *</Label>
              <Input
                type="email"
                value={formData.registered_manager_email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, registered_manager_email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Statement of Purpose</Label>
            {formData.statement_of_purpose_url ? (
              <div className="flex items-center gap-2 text-green-700 mt-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Uploaded</span>
              </div>
            ) : (
              <label className="cursor-pointer block mt-1">
                <div className="border-2 border-dashed rounded p-4 text-center hover:bg-gray-50">
                  <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-600">Upload Statement of Purpose</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'statement_of_purpose_url')}
                />
              </label>
            )}
          </div>

          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || uploading}
            className="w-full bg-blue-600"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Save Organisation Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Mandatory Policy Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={policiesProgress} className="mb-4" />
          <p className="text-sm text-gray-600 mb-4">
            {policyStatus.filter(p => p.uploaded).length} of {mandatoryPolicies.length} mandatory policies uploaded
          </p>
          
          <div className="space-y-2">
            {policyStatus.map((policy) => (
              <div 
                key={policy.category}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2">
                  {policy.uploaded ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-300" />
                  )}
                  <span className="text-sm capitalize">{policy.category.replace(/_/g, ' ')}</span>
                </div>
                <Badge className={policy.uploaded ? 'bg-green-600' : 'bg-gray-400'}>
                  {policy.uploaded ? 'Uploaded' : 'Required'}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Upload policies from the Compliance Hub → Policy Library
          </p>
        </CardContent>
      </Card>
    </div>
  );
}