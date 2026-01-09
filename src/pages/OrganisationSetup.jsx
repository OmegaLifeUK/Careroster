import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Upload, 
  CheckCircle, 
  FileText, 
  Loader2,
  Shield,
  AlertCircle,
  BookOpen,
  Download,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addYears } from "date-fns";

export default function OrganisationSetup() {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
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
      const p = await base44.entities.PolicyLibrary.list('-approval_date');
      return Array.isArray(p) ? p : [];
    }
  });

  const mandatoryPolicies = [
    { key: "safeguarding_adults", label: "Safeguarding Adults" },
    { key: "safeguarding_children", label: "Safeguarding Children" },
    { key: "health_safety", label: "Health & Safety" },
    { key: "infection_control", label: "Infection Control" },
    { key: "medication_management", label: "Medication Management" },
    { key: "gdpr_confidentiality", label: "GDPR & Confidentiality" },
    { key: "complaints", label: "Complaints Procedure" },
    { key: "whistleblowing", label: "Whistleblowing" }
  ];

  const mandatoryStatus = mandatoryPolicies.map(mp => ({
    ...mp,
    uploaded: policies.some(p => p.policy_category === mp.key && p.status === 'approved')
  }));

  const allMandatoryUploaded = mandatoryStatus.every(p => p.uploaded);
  const policyProgress = (mandatoryStatus.filter(p => p.uploaded).length / mandatoryPolicies.length) * 100;

  const isCompliant = orgProfile?.organisation_name &&
                      orgProfile?.cqc_registration_number &&
                      orgProfile?.registered_manager_email &&
                      allMandatoryUploaded;

  const deletePolicyMutation = useMutation({
    mutationFn: (id) => base44.entities.PolicyLibrary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success("Deleted", "Policy removed");
    }
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          Organisation Regulatory Setup
        </h1>
        <p className="text-gray-600 mt-1">CQC / Ofsted Compliance Configuration</p>
      </div>

      {/* Overall Compliance Status */}
      <Card className={`mb-6 ${isCompliant ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCompliant ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <p className="font-semibold">
                {isCompliant ? 'Organisation Setup Complete' : 'Setup Incomplete'}
              </p>
              <p className="text-sm">
                {isCompliant 
                  ? 'All regulatory requirements met' 
                  : 'Complete all steps to achieve compliance status'}
              </p>
            </div>
          </div>
          <Badge className={isCompliant ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}>
            {isCompliant ? 'Compliant' : 'Incomplete'}
          </Badge>
        </CardContent>
      </Card>

      {/* Organisation Profile */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Organisation Profile
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setEditingProfile(true)}
            >
              {orgProfile ? <Edit className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {orgProfile ? 'Edit' : 'Create'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orgProfile ? (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Organisation Name</p>
                  <p className="font-medium">{orgProfile.organisation_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Registered Manager</p>
                  <p className="font-medium">{orgProfile.registered_manager_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CQC Registration</p>
                  <p className="font-medium">{orgProfile.cqc_registration_number || 'Not registered'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ofsted URN</p>
                  <p className="font-medium">{orgProfile.ofsted_registration_number || 'Not registered'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Care Settings</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {orgProfile.care_setting_types?.map(type => (
                    <Badge key={type} variant="outline" className="capitalize">
                      {type.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No organisation profile created</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mandatory Policy Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Mandatory Policy Library
            </CardTitle>
            <Button 
              size="sm"
              onClick={() => { setEditingPolicy(null); setShowPolicyForm(true); }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Policy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Mandatory Policies Progress</p>
              <p className="text-sm font-bold">{mandatoryStatus.filter(p => p.uploaded).length}/{mandatoryPolicies.length}</p>
            </div>
            <Progress value={policyProgress} className="h-2" />
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-6">
            {mandatoryStatus.map(policy => (
              <div 
                key={policy.key}
                className={`p-3 rounded border flex items-center justify-between ${
                  policy.uploaded ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {policy.uploaded ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">{policy.label}</span>
                </div>
                <Badge className={policy.uploaded ? 'bg-green-600' : 'bg-red-600'}>
                  {policy.uploaded ? 'Uploaded' : 'Required'}
                </Badge>
              </div>
            ))}
          </div>

          {/* All Policies List */}
          {policies.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm mb-2">All Policies ({policies.length})</h3>
              {policies.map(policy => (
                <div 
                  key={policy.id}
                  className="p-3 border rounded flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">{policy.policy_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {policy.policy_category?.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={
                          policy.status === 'approved' ? 'bg-green-600' :
                          policy.status === 'under_review' ? 'bg-amber-600' : 'bg-gray-400'
                        }>
                          {policy.status}
                        </Badge>
                        {policy.is_mandatory && (
                          <Badge className="bg-red-600">Mandatory</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {policy.policy_file_url && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(policy.policy_file_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => { setEditingPolicy(policy); setShowPolicyForm(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (confirm("Delete this policy?")) {
                          deletePolicyMutation.mutate(policy.id);
                        }
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingProfile && (
        <OrganisationProfileForm 
          profile={orgProfile}
          onClose={() => setEditingProfile(false)}
        />
      )}

      {showPolicyForm && (
        <PolicyForm 
          policy={editingPolicy}
          onClose={() => { setShowPolicyForm(false); setEditingPolicy(null); }}
        />
      )}
    </div>
  );
}

function OrganisationProfileForm({ profile, onClose }) {
  const [formData, setFormData] = useState(profile || {
    care_setting_types: [],
    regulators: [],
    organisation_status: 'incomplete'
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, statement_of_purpose_url: file_url }));
      toast.success("Uploaded", "Statement of Purpose uploaded");
    } catch (error) {
      toast.error("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (profile) {
        return base44.entities.OrganisationProfile.update(profile.id, formData);
      } else {
        return base44.entities.OrganisationProfile.create(formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-profile'] });
      toast.success("Saved", "Organisation profile updated");
      onClose();
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <CardTitle>Organisation Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
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
              {[
                { value: "domiciliary", label: "Domiciliary Care" },
                { value: "residential", label: "Residential Care" },
                { value: "supported_living", label: "Supported Living" },
                { value: "children_services", label: "Children's Services" },
                { value: "day_centre", label: "Day Centre" }
              ].map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.care_setting_types?.includes(type.value)}
                    onCheckedChange={() => toggleSettingType(type.value)}
                  />
                  <Label>{type.label}</Label>
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
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Registered Manager Email *</Label>
              <Input
                type="email"
                value={formData.registered_manager_email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, registered_manager_email: e.target.value }))}
                placeholder="manager@example.com"
              />
            </div>
          </div>

          <div>
            <Label>Statement of Purpose *</Label>
            {formData.statement_of_purpose_url ? (
              <div className="flex items-center gap-2 text-green-700 mt-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Uploaded</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(formData.statement_of_purpose_url, '_blank')}
                >
                  View
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block mt-1">
                <div className="border-2 border-dashed rounded p-6 text-center hover:bg-gray-50">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload Statement of Purpose (PDF)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Last Inspection Date</Label>
              <Input
                type="date"
                value={formData.last_inspection_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, last_inspection_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Last Inspection Rating</Label>
              <select
                value={formData.last_inspection_rating || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, last_inspection_rating: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select rating</option>
                <option value="outstanding">Outstanding</option>
                <option value="good">Good</option>
                <option value="requires_improvement">Requires Improvement</option>
                <option value="inadequate">Inadequate</option>
                <option value="not_yet_rated">Not Yet Rated</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploading}
              className="flex-1 bg-blue-600"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyForm({ policy, onClose }) {
  const [formData, setFormData] = useState(policy || {
    policy_category: '',
    status: 'draft',
    is_mandatory: false,
    applies_to: []
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, policy_file_url: file_url }));
      toast.success("Uploaded", "Policy document uploaded");
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
        approved_by: formData.status === 'approved' ? (user.full_name || user.email) : formData.approved_by,
        approval_date: formData.status === 'approved' && !formData.approval_date ? format(new Date(), 'yyyy-MM-dd') : formData.approval_date,
        review_date: formData.approval_date && !formData.review_date ? format(addYears(new Date(formData.approval_date), 1), 'yyyy-MM-dd') : formData.review_date
      };

      if (policy) {
        return base44.entities.PolicyLibrary.update(policy.id, data);
      } else {
        return base44.entities.PolicyLibrary.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success("Saved", "Policy saved");
      onClose();
    }
  });

  const toggleAppliesTo = (value) => {
    setFormData(prev => ({
      ...prev,
      applies_to: prev.applies_to.includes(value)
        ? prev.applies_to.filter(v => v !== value)
        : [...prev.applies_to, value]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <CardTitle>{policy ? 'Edit Policy' : 'Add New Policy'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Policy Name *</Label>
            <Input
              value={formData.policy_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, policy_name: e.target.value }))}
              placeholder="e.g., Safeguarding Adults Policy 2026"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <select
                value={formData.policy_category}
                onChange={(e) => setFormData(prev => ({ ...prev, policy_category: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select category</option>
                <option value="safeguarding_adults">Safeguarding Adults</option>
                <option value="safeguarding_children">Safeguarding Children</option>
                <option value="health_safety">Health & Safety</option>
                <option value="infection_control">Infection Control</option>
                <option value="medication_management">Medication Management</option>
                <option value="gdpr_confidentiality">GDPR & Confidentiality</option>
                <option value="complaints">Complaints</option>
                <option value="whistleblowing">Whistleblowing</option>
                <option value="moving_handling">Moving & Handling</option>
                <option value="recruitment">Recruitment</option>
                <option value="equality_diversity">Equality & Diversity</option>
                <option value="mental_capacity_act">Mental Capacity Act</option>
                <option value="dols_liberty_protection">DoLS / Liberty Protection</option>
                <option value="fire_safety">Fire Safety</option>
                <option value="lone_working">Lone Working</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label>Version Number</Label>
              <Input
                value={formData.version_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, version_number: e.target.value }))}
                placeholder="v1.0"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <Label>Review Date</Label>
              <Input
                type="date"
                value={formData.review_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, review_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.is_mandatory}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_mandatory: checked }))}
            />
            <Label>Mandatory for regulatory compliance</Label>
          </div>

          <div>
            <Label>Applies To</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { value: "all_staff", label: "All Staff" },
                { value: "managers_only", label: "Managers Only" },
                { value: "care_staff", label: "Care Staff" },
                { value: "admin_staff", label: "Admin Staff" }
              ].map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.applies_to?.includes(opt.value)}
                    onCheckedChange={() => toggleAppliesTo(opt.value)}
                  />
                  <Label>{opt.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Policy Document (PDF) *</Label>
            {formData.policy_file_url ? (
              <div className="flex items-center gap-2 text-green-700 mt-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Uploaded</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(formData.policy_file_url, '_blank')}
                >
                  View PDF
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block mt-1">
                <div className="border-2 border-dashed rounded p-6 text-center hover:bg-gray-50">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload Policy Document (PDF)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploading}
              className="flex-1 bg-purple-600"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save Policy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}