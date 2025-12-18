import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TaskCompletionWidget from "../caretasks/TaskCompletionWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Clock, MapPin, User, AlertCircle, FileText, Upload, Trash2, Search, Filter, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

// Helper to estimate distance based on postcode area
const getPostcodeDistance = (postcode1, postcode2) => {
  if (!postcode1 || !postcode2) return 999;
  
  const area1 = postcode1.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  const area2 = postcode2.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  
  if (area1 === area2) return 0;
  
  const proximityGroups = [
    ['M', 'SK', 'OL', 'BL', 'WN'],
    ['BN', 'RH', 'TN'],
    ['L', 'CH', 'WA'],
    ['B', 'WS', 'WV', 'DY'],
    ['LS', 'BD', 'HX', 'WF'],
    ['S', 'DN', 'HD'],
    ['NE', 'SR', 'DH'],
    ['GL', 'SN', 'BA'],
    ['NG', 'DE', 'LE'],
    ['CV', 'LE', 'NN'],
  ];
  
  for (const group of proximityGroups) {
    if (group.includes(area1) && group.includes(area2)) return 15;
  }
  
  return 100;
};

export default function VisitDialog({ visit, staff, clients, runs, onClose }) {
  // Check if this is an existing visit (has id) or new with pre-filled data
  const isExistingVisit = visit?.id;
  
  // Build default datetime from scheduled_date if provided
  const getDefaultStart = () => {
    if (visit?.scheduled_start) {
      return format(new Date(visit.scheduled_start), "yyyy-MM-dd'T'HH:mm");
    }
    if (visit?.scheduled_date) {
      return `${visit.scheduled_date}T09:00`;
    }
    return "";
  };
  
  const getDefaultEnd = () => {
    if (visit?.scheduled_end) {
      return format(new Date(visit.scheduled_end), "yyyy-MM-dd'T'HH:mm");
    }
    if (visit?.scheduled_date) {
      return `${visit.scheduled_date}T10:00`;
    }
    return "";
  };

  const [formData, setFormData] = useState({
    client_id: visit?.client_id || "",
    assigned_staff_id: visit?.assigned_staff_id || visit?.staff_id || "",
    run_id: visit?.run_id || "",
    scheduled_start: getDefaultStart(),
    scheduled_end: getDefaultEnd(),
    status: visit?.status || "draft",
    visit_type: visit?.visit_type || "regular",
    visit_notes: visit?.visit_notes || "",
    tasks: visit?.tasks || [],
    assessment_documents: visit?.assessment_documents || [],
  });

  const [taskInput, setTaskInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const createVisitMutation = useMutation({
    mutationFn: (data) => base44.entities.Visit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      onClose();
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Visit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Geographic validation if staff assigned
    if (formData.assigned_staff_id && formData.client_id) {
      const client = clients.find(c => c.id === formData.client_id);
      const staffMember = staff.find(s => s.id === formData.assigned_staff_id);
      const clientPostcode = client?.address?.postcode;
      const staffPostcode = staffMember?.address?.postcode;
      const distance = getPostcodeDistance(clientPostcode, staffPostcode);
      
      if (distance >= 100) {
        if (!confirm(
          `⚠️ GEOGRAPHIC MISMATCH WARNING!\n\n` +
          `Client: ${client?.full_name} (${clientPostcode || 'Unknown'})\n` +
          `Staff: ${staffMember?.full_name} (${staffPostcode || 'Unknown'})\n\n` +
          `These locations are in different regions and may be hours apart.\n` +
          `This assignment is not recommended for efficient rostering.\n\n` +
          `Do you still want to proceed?`
        )) {
          return;
        }
      }
    }
    
    const visitData = {
      client_id: formData.client_id,
      scheduled_start: new Date(formData.scheduled_start).toISOString(),
      scheduled_end: new Date(formData.scheduled_end).toISOString(),
      status: formData.assigned_staff_id ? "published" : "draft",
      visit_type: formData.visit_type,
      visit_notes: formData.visit_notes,
      tasks: formData.tasks,
      assessment_documents: formData.assessment_documents,
    };

    // Only include these fields if they have values
    if (formData.assigned_staff_id) {
      visitData.assigned_staff_id = formData.assigned_staff_id;
    }
    if (formData.run_id) {
      visitData.run_id = formData.run_id;
    }

    if (isExistingVisit) {
      updateVisitMutation.mutate({ id: visit.id, data: visitData });
    } else {
      createVisitMutation.mutate(visitData);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        document_name: file.name,
        document_type: "other",
        document_url: file_url,
        uploaded_date: new Date().toISOString(),
        uploaded_by: "Staff",
        notes: ""
      };
      setFormData({
        ...formData,
        assessment_documents: [...formData.assessment_documents, newDoc]
      });
      toast.success("Uploaded", "Document attached successfully");
    } catch (error) {
      toast.error("Upload Failed", "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (index) => {
    setFormData({
      ...formData,
      assessment_documents: formData.assessment_documents.filter((_, i) => i !== index)
    });
  };

  const updateDocType = (index, type) => {
    const updated = [...formData.assessment_documents];
    updated[index].document_type = type;
    setFormData({ ...formData, assessment_documents: updated });
  };

  const addTask = () => {
    if (taskInput.trim()) {
      setFormData({ ...formData, tasks: [...formData.tasks, taskInput.trim()] });
      setTaskInput("");
    }
  };

  const removeTask = (index) => {
    setFormData({ ...formData, tasks: formData.tasks.filter((_, i) => i !== index) });
  };

  const activeStaff = staff.filter(s => s.is_active && 
    (!staffSearch || s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()))
  ).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  
  const activeClients = clients.filter(c => 
    c.status === 'active' && 
    (!clientSearch || c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) || 
     c.address?.postcode?.toLowerCase().includes(clientSearch.toLowerCase()))
  ).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {isExistingVisit ? "Edit Visit" : "Create New Visit"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Create visit first, assign staff later</p>
                <p className="text-xs mt-1">You can leave the staff unassigned and allocate it from the schedule view using drag & drop</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="client_id" className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Client *
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search clients by name or postcode..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.length > 0 ? (
                    activeClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} - {client.address?.postcode}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500 text-center">No clients found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Visit Type</Label>
            <Select
              value={formData.visit_type}
              onValueChange={(value) => setFormData({ ...formData, visit_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular Visit</SelectItem>
                <SelectItem value="initial">Initial Visit</SelectItem>
                <SelectItem value="assessment">Assessment Visit</SelectItem>
                <SelectItem value="pre_admission">Pre-Admission Assessment</SelectItem>
                <SelectItem value="care_assessment">Care Assessment</SelectItem>
                <SelectItem value="review">Review Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_start" className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Start Time *
              </Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="scheduled_end" className="mb-2 block">
                End Time *
              </Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_end}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="visit_notes" className="mb-2 block">Visit Notes</Label>
            <Textarea
              value={formData.visit_notes}
              onChange={(e) => setFormData({ ...formData, visit_notes: e.target.value })}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">Tasks</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add a task..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
              />
              <Button type="button" onClick={addTask} variant="outline">Add</Button>
            </div>
            <div className="space-y-1">
              {formData.tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm">{task}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Documents - show for assessment visits */}
          {['assessment', 'pre_admission', 'care_assessment', 'initial'].includes(formData.visit_type) && (
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-purple-600" />
                Assessment Documents
              </Label>
              <p className="text-xs text-gray-500 mb-3">
                Attach assessment documents here. These can be used to AI-generate a care plan.
              </p>
              
              <div className="space-y-2 mb-3">
                {formData.assessment_documents.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="flex-1 text-sm truncate">{doc.document_name}</span>
                    <Select
                      value={doc.document_type}
                      onValueChange={(v) => updateDocType(index, v)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre_admission_assessment">Pre-Admission</SelectItem>
                        <SelectItem value="care_assessment">Care Assessment</SelectItem>
                        <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                        <SelectItem value="mental_capacity">Mental Capacity</SelectItem>
                        <SelectItem value="consent_form">Consent Form</SelectItem>
                        <SelectItem value="medical_history">Medical History</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                <Upload className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">
                  {isUploading ? "Uploading..." : "Upload Assessment Document"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Optional: Assign Now</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assigned_staff_id" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-green-600" />
                  Assigned Staff
                </Label>
                {formData.assigned_staff_id && formData.client_id && (() => {
                  const client = clients.find(c => c.id === formData.client_id);
                  const staffMember = staff.find(s => s.id === formData.assigned_staff_id);
                  const distance = getPostcodeDistance(client?.address?.postcode, staffMember?.address?.postcode);
                  
                  if (distance >= 100) {
                    return (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-800">
                          <p className="font-semibold">Geographic Mismatch Warning</p>
                          <p className="mt-1">Client: {client?.address?.postcode || 'Unknown'} • Staff: {staffMember?.address?.postcode || 'Unknown'}</p>
                          <p className="mt-1">These locations are very far apart. Consider assigning local staff.</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search staff..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={formData.assigned_staff_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, assigned_staff_id: value === "__unassigned__" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {activeStaff.length > 0 ? (
                        activeStaff.map(member => {
                          const client = clients.find(c => c.id === formData.client_id);
                          const distance = getPostcodeDistance(client?.address?.postcode, member?.address?.postcode);
                          const isFar = distance >= 100;
                          
                          return (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                {member.full_name}
                                {member.address?.postcode && (
                                  <span className="text-xs text-gray-500">({member.address.postcode})</span>
                                )}
                                {isFar && <span className="text-xs text-red-600 font-semibold">⚠️ Far</span>}
                              </div>
                            </SelectItem>
                          );
                        })
                      ) : staffSearch ? (
                        <div className="p-2 text-sm text-gray-500 text-center">No staff found</div>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="run_id" className="mb-2 block">Run (Optional)</Label>
                <Select
                  value={formData.run_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, run_id: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No run" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No run</SelectItem>
                    {runs.map(run => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.run_name} - {run.run_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Care Tasks Section - Show for in progress visits */}
          {isExistingVisit && formData.client_id && visit?.status === 'in_progress' && (
            <div className="border-t pt-6">
              <TaskCompletionWidget
                clientId={formData.client_id}
                carePlanId={visit?.linked_care_plan_id}
                visitId={visit?.id}
                onComplete={() => queryClient.invalidateQueries({ queryKey: ['visits'] })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createVisitMutation.isPending || updateVisitMutation.isPending}
            >
              {isExistingVisit ? "Update Visit" : "Create Visit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}