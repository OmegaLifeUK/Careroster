import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BookOpen, 
  Plus, 
  Upload, 
  FileText, 
  CheckCircle,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function PolicyLibrary() {
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const p = await base44.entities.PolicyLibrary.list('-approval_date');
      return Array.isArray(p) ? p : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PolicyLibrary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success("Deleted", "Policy removed");
    }
  });

  const mandatoryCategories = [
    "safeguarding_adults",
    "safeguarding_children",
    "health_safety",
    "infection_control",
    "medication_management",
    "gdpr_confidentiality",
    "complaints",
    "whistleblowing"
  ];

  const mandatoryStatus = mandatoryCategories.map(cat => ({
    category: cat,
    uploaded: policies.some(p => p.policy_category === cat && p.status === 'approved')
  }));

  const filteredPolicies = filter === "all" 
    ? policies 
    : policies.filter(p => p.policy_category === filter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-purple-600" />
            Policy Library
          </h1>
          <p className="text-gray-600 mt-1">Organisational policies and procedures</p>
        </div>
        <Button onClick={() => { setEditingPolicy(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Policy
        </Button>
      </div>

      {/* Mandatory Policies Status */}
      <Card className="mb-6 border-purple-200">
        <CardHeader>
          <CardTitle className="text-base">Mandatory Policies (CQC/Ofsted Required)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {mandatoryStatus.map(policy => (
              <div 
                key={policy.category}
                className={`p-3 rounded border flex items-center gap-2 ${
                  policy.uploaded ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                {policy.uploaded ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm capitalize">{policy.category.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Policies</SelectItem>
            {mandatoryCategories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Policies List */}
      <div className="space-y-3">
        {filteredPolicies.map(policy => (
          <Card key={policy.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">{policy.policy_name}</h3>
                    <Badge className={
                      policy.status === 'approved' ? 'bg-green-600' :
                      policy.status === 'under_review' ? 'bg-amber-600' :
                      'bg-gray-400'
                    }>
                      {policy.status}
                    </Badge>
                    {policy.is_mandatory && (
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Category: <span className="capitalize">{policy.policy_category?.replace(/_/g, ' ')}</span></p>
                    <p>Version: {policy.version_number || 'N/A'}</p>
                    {policy.approval_date && (
                      <p>Approved: {format(new Date(policy.approval_date), 'dd/MM/yyyy')}</p>
                    )}
                    {policy.review_date && (
                      <p>Review due: {format(new Date(policy.review_date), 'dd/MM/yyyy')}</p>
                    )}
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
                    onClick={() => { setEditingPolicy(policy); setShowForm(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (confirm("Delete this policy?")) {
                        deleteMutation.mutate(policy.id);
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <PolicyForm 
          policy={editingPolicy}
          onClose={() => { setShowForm(false); setEditingPolicy(null); }}
        />
      )}
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
        approval_date: formData.status === 'approved' && !formData.approval_date ? format(new Date(), 'yyyy-MM-dd') : formData.approval_date
      };

      if (policy) {
        return base44.entities.PolicyLibrary.update(policy.id, data);
      } else {
        return base44.entities.PolicyLibrary.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success("Saved", "Policy saved successfully");
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
        <CardHeader>
          <CardTitle>{policy ? 'Edit Policy' : 'Add New Policy'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Policy Name *</Label>
            <Input
              value={formData.policy_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, policy_name: e.target.value }))}
              placeholder="e.g., Safeguarding Adults Policy"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select 
                value={formData.policy_category} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, policy_category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safeguarding_adults">Safeguarding Adults</SelectItem>
                  <SelectItem value="safeguarding_children">Safeguarding Children</SelectItem>
                  <SelectItem value="health_safety">Health & Safety</SelectItem>
                  <SelectItem value="infection_control">Infection Control</SelectItem>
                  <SelectItem value="medication_management">Medication Management</SelectItem>
                  <SelectItem value="gdpr_confidentiality">GDPR & Confidentiality</SelectItem>
                  <SelectItem value="complaints">Complaints</SelectItem>
                  <SelectItem value="whistleblowing">Whistleblowing</SelectItem>
                  <SelectItem value="moving_handling">Moving & Handling</SelectItem>
                  <SelectItem value="recruitment">Recruitment</SelectItem>
                  <SelectItem value="equality_diversity">Equality & Diversity</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
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
              {["all_staff", "managers_only", "care_staff", "admin_staff"].map(val => (
                <div key={val} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.applies_to?.includes(val)}
                    onCheckedChange={() => toggleAppliesTo(val)}
                  />
                  <Label className="capitalize">{val.replace(/_/g, ' ')}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Policy Document *</Label>
            {formData.policy_file_url ? (
              <div className="flex items-center gap-2 text-green-700 mt-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Uploaded</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(formData.policy_file_url, '_blank')}
                >
                  View
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