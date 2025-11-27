import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Paperclip, 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  CheckCircle,
  Clock,
  Eye,
  Plus,
  X,
  Loader2,
  File,
  FileSpreadsheet,
  FileImage,
  FolderOpen,
  Search
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

const DOCUMENT_TYPES = [
  { value: "supervision_form", label: "Supervision Form" },
  { value: "care_plan", label: "Care Plan" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "medication_chart", label: "Medication Chart" },
  { value: "daily_notes", label: "Daily Notes Template" },
  { value: "incident_form", label: "Incident Form" },
  { value: "consent_form", label: "Consent Form" },
  { value: "assessment", label: "Assessment" },
  { value: "training_record", label: "Training Record" },
  { value: "other", label: "Other" }
];

const getFileIcon = (url) => {
  if (!url) return File;
  const ext = url.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FileImage;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  return FileText;
};

export default function DocumentAttachment({ 
  documents = [], 
  onDocumentsChange, 
  entityType = "shift",
  entityId,
  showCompletionStatus = false,
  editable = true 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [attachMode, setAttachMode] = useState("system"); // "system" or "upload"
  const [searchTerm, setSearchTerm] = useState("");
  const [newDoc, setNewDoc] = useState({
    document_name: "",
    document_type: "other",
    requires_completion: false
  });
  const { toast } = useToast();

  // Fetch form templates from the system
  const { data: formTemplates = [] } = useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const data = await base44.entities.FormTemplate.filter({ is_active: true });
      return Array.isArray(data) ? data : [];
    },
    enabled: showAddForm
  });

  // Filter templates based on search
  const filteredTemplates = formTemplates.filter(t => 
    t.form_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTemplate = (template) => {
    const newDocument = {
      document_name: template.form_name,
      document_url: null, // Will be filled when form is completed
      document_type: template.category || "other",
      form_template_id: template.id,
      uploaded_date: new Date().toISOString(),
      uploaded_by: "System",
      requires_completion: true,
      completed: false,
      is_form_template: true
    };

    const updatedDocs = [...documents, newDocument];
    onDocumentsChange(updatedDocs);
    
    setShowAddForm(false);
    setSearchTerm("");
    toast.success("Form Attached", `${template.form_name} has been added`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const docName = newDoc.document_name || file.name;
      const newDocument = {
        document_name: docName,
        document_url: file_url,
        document_type: newDoc.document_type,
        uploaded_date: new Date().toISOString(),
        uploaded_by: "System",
        requires_completion: newDoc.requires_completion,
        completed: false
      };

      const updatedDocs = [...documents, newDocument];
      onDocumentsChange(updatedDocs);
      
      setNewDoc({ document_name: "", document_type: "other", requires_completion: false });
      setShowAddForm(false);
      toast.success("Document Attached", `${docName} has been added`);
    } catch (error) {
      toast.error("Upload Failed", "Could not upload document");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = (index) => {
    const updatedDocs = documents.filter((_, i) => i !== index);
    onDocumentsChange(updatedDocs);
    toast.success("Removed", "Document removed");
  };

  const handleMarkComplete = (index) => {
    const updatedDocs = [...documents];
    updatedDocs[index] = {
      ...updatedDocs[index],
      completed: true,
      completed_date: new Date().toISOString(),
      completed_by: "System"
    };
    onDocumentsChange(updatedDocs);
    toast.success("Completed", "Document marked as complete");
  };

  const pendingDocs = documents.filter(d => d.requires_completion && !d.completed);
  const completedDocs = documents.filter(d => d.completed);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attached Documents
            {documents.length > 0 && (
              <Badge variant="outline">{documents.length}</Badge>
            )}
          </CardTitle>
          {editable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
              {showAddForm ? "" : "Attach"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Document Form */}
        {showAddForm && (
          <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
            <Tabs value={attachMode} onValueChange={setAttachMode}>
              <TabsList className="w-full">
                <TabsTrigger value="system" className="flex-1">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Select from System
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="mt-3 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredTemplates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchTerm ? "No forms match your search" : "No form templates available"}
                    </p>
                  ) : (
                    filteredTemplates.map(template => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{template.form_name}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {template.category?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400" />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Document Name</label>
                    <Input
                      placeholder="e.g. Supervision Notes"
                      value={newDoc.document_name}
                      onChange={(e) => setNewDoc({ ...newDoc, document_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Document Type</label>
                    <Select 
                      value={newDoc.document_type} 
                      onValueChange={(v) => setNewDoc({ ...newDoc, document_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {showCompletionStatus && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newDoc.requires_completion}
                      onChange={(e) => setNewDoc({ ...newDoc, requires_completion: e.target.checked })}
                      className="rounded"
                    />
                    Requires completion during {entityType}
                  </label>
                )}

                <label className="block">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <Button
                    type="button"
                    className="w-full"
                    disabled={isUploading}
                    onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? "Uploading..." : "Upload & Attach"}
                  </Button>
                </label>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Pending Documents */}
        {showCompletionStatus && pendingDocs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-orange-600 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending Completion ({pendingDocs.length})
            </p>
            <div className="space-y-2">
              {pendingDocs.map((doc, idx) => {
                const actualIdx = documents.findIndex(d => d === doc);
                const FileIcon = getFileIcon(doc.document_url);
                return (
                  <DocumentRow
                    key={idx}
                    doc={doc}
                    FileIcon={FileIcon}
                    onRemove={() => handleRemoveDocument(actualIdx)}
                    onComplete={() => handleMarkComplete(actualIdx)}
                    showComplete={showCompletionStatus}
                    editable={editable}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* All Documents List */}
        {documents.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No documents attached</p>
            {editable && (
              <p className="text-xs text-gray-400 mt-1">Click "Attach" to add documents</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(!showCompletionStatus ? documents : documents.filter(d => !d.requires_completion || d.completed)).map((doc, idx) => {
              const FileIcon = getFileIcon(doc.document_url);
              return (
                <DocumentRow
                  key={idx}
                  doc={doc}
                  FileIcon={FileIcon}
                  onRemove={() => handleRemoveDocument(idx)}
                  editable={editable}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentRow({ doc, FileIcon, onRemove, onComplete, showComplete, editable }) {
  const typeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
      <div className="p-2 bg-blue-50 rounded">
        <FileIcon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.document_name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
          {doc.uploaded_date && (
            <span>{format(new Date(doc.uploaded_date), 'MMM d, yyyy')}</span>
          )}
          {doc.completed && (
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {doc.document_url && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => window.open(doc.document_url, '_blank')}
            title="View/Download"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        {showComplete && doc.requires_completion && !doc.completed && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={onComplete}
            title="Mark Complete"
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
        )}
        {editable && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onRemove}
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}