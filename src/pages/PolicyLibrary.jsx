import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BookOpen, 
  Plus, 
  Search,
  Download,
  Edit,
  Trash2,
  Upload,
  CheckCircle,
  Loader2,
  Filter,
  FileText,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addYears, isPast, differenceInDays } from "date-fns";

export default function PolicyLibrary() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  const mandatoryPolicies = policies.filter(p => p.is_mandatory);
  const approvedMandatory = mandatoryPolicies.filter(p => p.status === 'approved');
  
  const policiesNeedingReview = policies.filter(p => 
    p.review_date && isPast(new Date(p.review_date))
  );

  const policiesReviewingSoon = policies.filter(p => {
    if (!p.review_date) return false;
    const days = differenceInDays(new Date(p.review_date), new Date());
    return days > 0 && days <= 30;
  });

  const filteredPolicies = policies.filter(p => {
    const matchesSearch = p.policy_name?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (categoryFilter !== "all" && p.policy_category !== categoryFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    return true;
  });

  const categories = [
    { value: "safeguarding_adults", label: "Safeguarding Adults" },
    { value: "safeguarding_children", label: "Safeguarding Children" },
    { value: "health_safety", label: "Health & Safety" },
    { value: "infection_control", label: "Infection Control" },
    { value: "medication_management", label: "Medication Management" },
    { value: "gdpr_confidentiality", label: "GDPR & Confidentiality" },
    { value: "complaints", label: "Complaints" },
    { value: "whistleblowing", label: "Whistleblowing" },
    { value: "moving_handling", label: "Moving & Handling" },
    { value: "recruitment", label: "Recruitment" },
    { value: "equality_diversity", label: "Equality & Diversity" },
    { value: "mental_capacity_act", label: "Mental Capacity Act" },
    { value: "dols_liberty_protection", label: "DoLS / Liberty Protection" },
    { value: "fire_safety", label: "Fire Safety" },
    { value: "lone_working", label: "Lone Working" },
    { value: "other", label: "Other" }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-purple-600" />
          Policy Library
        </h1>
        <p className="text-gray-600 mt-1">
          Manage organisational policies and ensure regulatory compliance
        </p>
      </div>

      {/* Metrics */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <FileText className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold">{policies.length}</p>
            <p className="text-sm text-gray-600">Total Policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-3xl font-bold">{approvedMandatory.length}/{mandatoryPolicies.length}</p>
            <p className="text-sm text-gray-600">Mandatory Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
            <p className="text-3xl font-bold">{policiesNeedingReview.length}</p>
            <p className="text-sm text-gray-600">Overdue Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertCircle className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-3xl font-bold">{policiesReviewingSoon.length}</p>
            <p className="text-sm text-gray-600">Review Due Soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {policiesNeedingReview.length > 0 && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">
                  {policiesNeedingReview.length} policies overdue for review
                </p>
                <div className="mt-2 space-y-1">
                  {policiesNeedingReview.slice(0, 3).map(p => (
                    <p key={p.id} className="text-sm text-red-700">
                      • {p.policy_name} (Due: {format(new Date(p.review_date), 'dd/MM/yyyy')})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies..."
            className="pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>
        <Button onClick={() => { setEditingPolicy(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Policy
        </Button>
      </div>

      {/* Policy List */}
      <div className="space-y-2">
        {filteredPolicies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No policies found</p>
            </CardContent>
          </Card>
        ) : (
          filteredPolicies.map(policy => {
            const isOverdue = policy.review_date && isPast(new Date(policy.review_date));
            const reviewSoon = policy.review_date && !isOverdue && 
              differenceInDays(new Date(policy.review_date), new Date()) <= 30;

            return (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-purple-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">{policy.policy_name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {policy.policy_category?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={
                            policy.status === 'approved' ? 'bg-green-600' :
                            policy.status === 'under_review' ? 'bg-amber-600' :
                            policy.status === 'draft' ? 'bg-gray-500' : 'bg-gray-400'
                          }>
                            {policy.status}
                          </Badge>
                          {policy.is_mandatory && (
                            <Badge className="bg-red-600">Mandatory</Badge>
                          )}
                          {policy.version_number && (
                            <Badge variant="outline" className="text-xs">
                              {policy.version_number}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          {policy.approval_date && (
                            <span>Approved: {format(new Date(policy.approval_date), 'dd/MM/yyyy')}</span>
                          )}
                          {policy.review_date && (
                            <span className={isOverdue ? 'text-red-600 font-semibold' : reviewSoon ? 'text-amber-600' : ''}>
                              Review: {format(new Date(policy.review_date), 'dd/MM/yyyy')}
                              {isOverdue && ' (OVERDUE)'}
                              {reviewSoon && ' (DUE SOON)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
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
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
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
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <span className="text-sm">Document uploaded</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(formData.policy_file_url, '_blank')}
                >
                  View PDF
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setFormData(prev => ({ ...prev, policy_file_url: null }))}
                >
                  Replace
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