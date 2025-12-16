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
import { FileText, Upload, Download, Trash2, Eye, Lock, Calendar, AlertCircle, Sparkles } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function DocumentManager({ client }) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    document_type: "other",
    document_name: "",
    file: null,
    expiry_date: "",
    is_confidential: false,
    access_level: "all_staff",
    tags: "",
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', client.id],
    queryFn: async () => {
      const docs = await base44.entities.ClientDocument.filter({ client_id: client.id }, '-upload_date');
      return docs;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file, document_name: formData.document_name || file.name });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      // Upload file to Base44 storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.file });
      
      const staffMember = staff.find(s => s.email === currentUser?.email);
      
      // Create document record
      await base44.entities.ClientDocument.create({
        client_id: client.id,
        document_type: formData.document_type,
        document_name: formData.document_name,
        file_url: file_url,
        file_type: formData.file.type,
        file_size: formData.file.size,
        uploaded_by_staff_id: staffMember?.id || currentUser?.id || "system",
        upload_date: new Date().toISOString(),
        expiry_date: formData.expiry_date || null,
        is_confidential: formData.is_confidential,
        access_level: formData.access_level,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        notes: formData.notes,
      });

      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      setShowUploadForm(false);
      setFormData({
        document_type: "other",
        document_name: "",
        file: null,
        expiry_date: "",
        is_confidential: false,
        access_level: "all_staff",
        tags: "",
        notes: "",
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (document) => {
    window.open(document.file_url, '_blank');
  };

  const handleDelete = (documentId) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const handleGenerateFromDocuments = async () => {
    const assessmentDocs = documents.filter(doc => 
      doc.document_type === 'assessment' || 
      doc.document_type === 'care_plan' ||
      doc.document_type === 'medical_report'
    );

    if (assessmentDocs.length === 0) {
      toast.error("No assessment documents", "Please upload assessment or medical documents first");
      return;
    }

    setGenerating(true);
    try {
      toast.info("Generating care plan", "AI is analyzing uploaded documents...");

      const { AssessmentToCarePlanWorkflow } = await import('./AssessmentToCarePlanWorkflow');

      const assessment = {
        type: 'uploaded_documents',
        id: `docs_${client.id}`,
        client_id: client.id,
        documents: assessmentDocs.map(doc => ({
          document_name: doc.document_name,
          document_url: doc.file_url,
          document_type: doc.document_type,
          uploaded_date: doc.upload_date
        })),
        documentCount: assessmentDocs.length
      };

      const aiResult = await AssessmentToCarePlanWorkflow.generateCarePlanFromAssessment(
        assessment,
        client.id
      );

      if (!aiResult.success) {
        toast.error("Generation failed", aiResult.error);
        return;
      }

      const draftResult = await AssessmentToCarePlanWorkflow.createDraftCarePlan(
        aiResult.carePlanData,
        client.id,
        assessment
      );

      if (!draftResult.success) {
        toast.error("Failed to create care plan", draftResult.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      
      toast.success(
        "Care plan created from documents", 
        "Draft care plan ready for review - switch to Care Plan tab"
      );
    } catch (error) {
      toast.error("Error", error.message);
    } finally {
      setGenerating(false);
    }
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || "Unknown Staff";
  };

  const documentTypeColors = {
    care_plan: "bg-blue-100 text-blue-800",
    assessment: "bg-purple-100 text-purple-800",
    medical_report: "bg-red-100 text-red-800",
    consent_form: "bg-green-100 text-green-800",
    advance_directive: "bg-orange-100 text-orange-800",
    risk_assessment: "bg-yellow-100 text-yellow-800",
    photo_id: "bg-cyan-100 text-cyan-800",
    insurance: "bg-indigo-100 text-indigo-800",
    medication_list: "bg-pink-100 text-pink-800",
    other: "bg-gray-100 text-gray-800",
  };

  const checkExpiry = (document) => {
    if (document.expiry_date) {
      try {
        return isPast(parseISO(document.expiry_date));
      } catch {
        return false;
      }
    }
    return false;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Document Management
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Store and manage client-related documents</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateFromDocuments}
              disabled={generating || documents.length === 0}
              size="sm" 
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {generating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Care Plan
                </>
              )}
            </Button>
            <Button onClick={() => setShowUploadForm(!showUploadForm)} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Info banner for transfers */}
        {documents.length > 0 && documents.some(d => 
          d.document_type === 'assessment' || d.document_type === 'care_plan' || d.document_type === 'medical_report'
        ) && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">
                  Assessment documents detected
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Click "Generate Care Plan" to automatically create care plan, medications, and risk assessments from uploaded documents
                </p>
              </div>
            </div>
          </div>
        )}

        {showUploadForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-blue-50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New Document
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="document_type">Document Type *</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="care_plan">Care Plan</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="medical_report">Medical Report</SelectItem>
                    <SelectItem value="consent_form">Consent Form</SelectItem>
                    <SelectItem value="advance_directive">Advance Directive</SelectItem>
                    <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                    <SelectItem value="photo_id">Photo ID</SelectItem>
                    <SelectItem value="insurance">Insurance Document</SelectItem>
                    <SelectItem value="medication_list">Medication List</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="document_name">Document Name *</Label>
                <Input
                  id="document_name"
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  required
                  placeholder="Enter document name"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="file">Select File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>

              <div>
                <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="access_level">Access Level</Label>
                <Select
                  value={formData.access_level}
                  onValueChange={(value) => setFormData({ ...formData, access_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_staff">All Staff</SelectItem>
                    <SelectItem value="senior_staff_only">Senior Staff Only</SelectItem>
                    <SelectItem value="admin_only">Admin Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., urgent, review, annual"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_confidential}
                    onChange={(e) => setFormData({ ...formData, is_confidential: e.target.checked })}
                    className="rounded"
                  />
                  <Lock className="w-4 h-4" />
                  Mark as Confidential
                </Label>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this document"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowUploadForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Documents List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading documents...</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            documents.map((document) => {
              const isExpired = checkExpiry(document);
              
              return (
                <Card key={document.id} className={`border-l-4 ${
                  isExpired ? 'border-red-500' : 'border-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-lg">{document.document_name}</h4>
                          <Badge className={documentTypeColors[document.document_type]}>
                            {document.document_type.replace('_', ' ')}
                          </Badge>
                          {document.is_confidential && (
                            <Badge className="bg-red-100 text-red-800">
                              <Lock className="w-3 h-3 mr-1" />
                              Confidential
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge className="bg-red-500 text-white">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                          <div className="text-gray-600">
                            <strong>Uploaded:</strong> {format(parseISO(document.upload_date || document.created_date), "MMM d, yyyy")}
                          </div>
                          <div className="text-gray-600">
                            <strong>By:</strong> {getStaffName(document.uploaded_by_staff_id)}
                          </div>
                          <div className="text-gray-600">
                            <strong>Size:</strong> {formatFileSize(document.file_size)}
                          </div>
                          {document.expiry_date && (
                            <div className={isExpired ? "text-red-600" : "text-gray-600"}>
                              <Calendar className="w-3 h-3 inline mr-1" />
                              <strong>Expires:</strong> {format(parseISO(document.expiry_date), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>

                        {document.tags && document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {document.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {document.notes && (
                          <div className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                            {document.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(document)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpired && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-900">
                          <strong>Document Expired:</strong> This document has passed its expiry date and may need updating.
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