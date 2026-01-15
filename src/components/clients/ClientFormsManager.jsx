import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Plus, 
  Eye, 
  CheckCircle,
  Clock,
  X,
  User
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import FormPreview from "../formbuilder/FormPreview";

export default function ClientFormsManager({ client }) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch form submissions for this client
  const { data: submissions = [] } = useQuery({
    queryKey: ['client-form-submissions', client.id],
    queryFn: async () => {
      const data = await base44.entities.FormSubmission.filter({ client_id: client.id }, '-submitted_date');
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch form templates
  const { data: templates = [] } = useQuery({
    queryKey: ['form-templates-active'],
    queryFn: async () => {
      const data = await base44.entities.FormTemplate.filter({ is_active: true });
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch all staff for assignment
  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff-combined'],
    queryFn: async () => {
      const [staff, carers] = await Promise.all([
        base44.entities.Staff.list().catch(() => []),
        base44.entities.Carer.list().catch(() => [])
      ]);
      return [...(Array.isArray(staff) ? staff : []), ...(Array.isArray(carers) ? carers : [])];
    }
  });

  const getTemplateName = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    return template?.form_name || "Unknown Form";
  };

  const getStaffName = (staffId) => {
    if (!staffId) return "Not assigned";
    const staff = allStaff.find(s => s.id === staffId);
    return staff?.full_name || "Unknown";
  };

  const statusColors = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };

  if (viewingSubmission) {
    const template = templates.find(t => t.id === viewingSubmission.form_template_id);
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setViewingSubmission(null)}
          className="mb-4"
        >
          ← Back to Forms
        </Button>
        {template && (
          <FormPreview 
            template={template}
            clientId={client.id}
            prefillData={{
              client_name: client.full_name,
              full_name: client.full_name,
              date_of_birth: client.date_of_birth,
              address: client.address?.street
            }}
            onSubmitted={() => {
              setViewingSubmission(null);
              queryClient.invalidateQueries({ queryKey: ['client-form-submissions', client.id] });
            }}
          />
        )}
      </div>
    );
  }

  if (viewingTemplate) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setViewingTemplate(null)}
          className="mb-4"
        >
          ← Back to Forms
        </Button>
        <FormPreview 
          template={viewingTemplate}
          clientId={client.id}
          prefillData={{
            client_name: client.full_name,
            full_name: client.full_name,
            date_of_birth: client.date_of_birth,
            address: client.address?.street
          }}
          onSubmitted={() => {
            setViewingTemplate(null);
            queryClient.invalidateQueries({ queryKey: ['client-form-submissions', client.id] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Client Forms</h3>
          <p className="text-sm text-gray-600">Forms and assessments for {client.full_name}</p>
        </div>
        <Button onClick={() => setShowAssignDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Assign Form
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Forms</p>
            <p className="text-2xl font-bold">{submissions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {submissions.filter(s => s.status === 'draft' || s.status === 'submitted').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {submissions.filter(s => s.status === 'approved').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forms List */}
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-semibold mb-2">No Forms Assigned</h4>
              <p className="text-gray-600 mb-4">Assign forms from Form Builder to track assessments and documentation</p>
              <Button onClick={() => setShowAssignDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Assign First Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          submissions.map(submission => (
            <Card key={submission.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">{getTemplateName(submission.form_template_id)}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          {submission.staff_id && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {getStaffName(submission.staff_id)}
                            </span>
                          )}
                          {submission.submitted_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(submission.submitted_date), 'dd MMM yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[submission.status]}>
                        {submission.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {submission.status}
                      </Badge>
                      {submission.progress_percentage !== undefined && submission.status === 'draft' && (
                        <Badge variant="outline">
                          {submission.progress_percentage}% complete
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingSubmission(submission)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showAssignDialog && (
        <AssignFormDialog
          client={client}
          templates={templates}
          allStaff={allStaff}
          onClose={() => setShowAssignDialog(false)}
          onAssigned={(template) => {
            setShowAssignDialog(false);
            setViewingTemplate(template);
          }}
        />
      )}
    </div>
  );
}

function AssignFormDialog({ client, templates, allStaff, onClose, onAssigned }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assignToStaffId, setAssignToStaffId] = useState("");
  const [assignmentType, setAssignmentType] = useState("complete_now"); // complete_now, assign_to_staff
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.StaffTask.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      toast.success("Form Assigned", "Staff member can complete this form from Staff Tasks");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to assign form");
      console.error(error);
    }
  });

  const handleAssign = () => {
    if (!selectedTemplateId) {
      toast.error("Required", "Please select a form template");
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    
    if (assignmentType === "complete_now") {
      // Open form immediately
      onAssigned(template);
    } else {
      // Create staff task
      if (!assignToStaffId) {
        toast.error("Required", "Please select a staff member");
        return;
      }
      
      createTaskMutation.mutate({
        title: `Complete ${template.form_name} for ${client.full_name}`,
        description: `Complete the ${template.form_name} form for client ${client.full_name}`,
        task_type: template.category === 'assessment' ? 'assessment' : 'general',
        form_template_id: selectedTemplateId,
        assigned_to_staff_id: assignToStaffId,
        subject_client_id: client.id,
        priority: 'medium',
        status: 'pending'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Assign Form from Form Builder</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Select Form Template *</label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a form from Form Builder" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value={null} disabled>No templates available</SelectItem>
                ) : (
                  templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.form_name} - {t.category.replace(/_/g, ' ')}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">How would you like to assign this?</label>
            <Select value={assignmentType} onValueChange={setAssignmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete_now">Complete Now (I'll fill it out)</SelectItem>
                <SelectItem value="assign_to_staff">Assign to Staff Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "assign_to_staff" && (
            <div>
              <label className="text-sm font-medium">Assign To *</label>
              <Select value={assignToStaffId} onValueChange={setAssignToStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {allStaff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                The staff member will see this task in Staff Tasks and can complete it during their shift
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAssign} disabled={createTaskMutation.isPending}>
              {assignmentType === "complete_now" ? "Open Form" : "Assign to Staff"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}