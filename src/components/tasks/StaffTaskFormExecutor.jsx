import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  CheckCircle, 
  Loader2, 
  User, 
  Calendar, 
  FileText,
  Save,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import FormPreview from "@/components/formbuilder/FormPreview";
import AuditExecutor from "@/components/audit/AuditExecutor";

export default function StaffTaskFormExecutor({ task, onClose, onComplete, allStaff }) {
  const [completionNotes, setCompletionNotes] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch the form template if one is linked
  const { data: formTemplate, isLoading: loadingTemplate } = useQuery({
    queryKey: ['form-template', task.form_template_id],
    queryFn: async () => {
      const templates = await base44.entities.FormTemplate.filter({ id: task.form_template_id });
      return templates?.[0] || null;
    },
    enabled: !!task.form_template_id
  });

  // Fetch the audit template if one is linked
  const { data: auditTemplate, isLoading: loadingAuditTemplate } = useQuery({
    queryKey: ['audit-template', task.audit_template_id],
    queryFn: async () => {
      const templates = await base44.entities.AuditTemplate.filter({ id: task.audit_template_id });
      return templates?.[0] || null;
    },
    enabled: !!task.audit_template_id
  });

  // Fetch client details if subject_client_id exists
  const { data: subjectClient } = useQuery({
    queryKey: ['subject-client', task.subject_client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: task.subject_client_id });
      return clients?.[0] || null;
    },
    enabled: !!task.subject_client_id
  });

  // Fetch staff details if subject_staff_id exists
  const { data: subjectStaff } = useQuery({
    queryKey: ['subject-staff', task.subject_staff_id],
    queryFn: async () => {
      // Try both Staff and Carer entities
      const staff = await base44.entities.Staff.filter({ id: task.subject_staff_id });
      if (staff?.[0]) return staff[0];
      const carers = await base44.entities.Carer.filter({ id: task.subject_staff_id });
      return carers?.[0] || null;
    },
    enabled: !!task.subject_staff_id
  });

  // Build prefill data from client/staff details
  const buildPrefillData = () => {
    const data = {
      date: task.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
      supervisor_name: task.assigned_to_staff_id ? getStaffName(task.assigned_to_staff_id) : ""
    };
    
    if (subjectClient) {
      data.full_name = subjectClient.full_name;
      data.client_name = subjectClient.full_name;
      data.date_of_birth = subjectClient.date_of_birth;
      data.phone = subjectClient.phone;
      data.email = subjectClient.email;
      data.address = subjectClient.address ? 
        `${subjectClient.address.street || ''}, ${subjectClient.address.city || ''}, ${subjectClient.address.postcode || ''}`.replace(/^, |, $/g, '') : '';
      data.nhs_number = subjectClient.nhs_number;
    }
    
    if (subjectStaff) {
      data.staff_name = subjectStaff.full_name;
      data.full_name = subjectStaff.full_name;
      data.email = subjectStaff.email;
      data.phone = subjectStaff.phone;
    }
    
    return data;
  };

  // Update task status to in_progress when starting
  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffTask.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
    }
  });

  // Mark as in progress on mount
  React.useEffect(() => {
    if (task.status === 'pending') {
      updateTaskMutation.mutate({ status: 'in_progress' });
    }
  }, []);

  const handleFormSubmitted = (submission) => {
    setFormSubmitted(true);
    setSubmissionId(submission?.id);
    toast.success("Form Saved", "The form has been submitted successfully");
  };

  const handleCompleteTask = async () => {
    try {
      // Update the task as completed
      await base44.entities.StaffTask.update(task.id, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        completion_notes: completionNotes,
        form_submission_id: submissionId || task.form_submission_id
      });

      // Create related records based on task type
      const documentRecord = submissionId ? {
        document_name: formTemplate?.form_name || task.title,
        document_type: task.task_type === 'assessment' ? 'assessment' : 
                       task.task_type === 'supervision' ? 'supervision_form' : 
                       task.task_type === 'audit' ? 'audit' : 'other',
        form_submission_id: submissionId,
        uploaded_date: new Date().toISOString(),
        uploaded_by: getStaffName(task.assigned_to_staff_id),
        completed: true,
        completed_date: new Date().toISOString()
      } : null;

      // If this is a supervision task, create a supervision record
      if (task.task_type === 'supervision' && task.subject_staff_id) {
        await base44.entities.StaffSupervision.create({
          staff_id: task.subject_staff_id,
          supervisor_id: task.assigned_to_staff_id,
          supervision_date: task.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
          supervision_type: 'formal_one_to_one',
          frequency_due: 'monthly',
          supervisor_comments: completionNotes,
          linked_shift_id: task.linked_shift_id,
          form_submission_id: submissionId,
          attached_documents: documentRecord ? [documentRecord] : []
        });
      }

      // If this is an audit task, create audit record and action plan if needed
      if (task.task_type === 'audit' && submissionId) {
        try {
          // Get the form submission data
          const submissions = await base44.entities.FormSubmission.filter({ id: submissionId });
          const submission = submissions?.[0];
          
          if (submission?.submission_data) {
            // Analyze submission for non-compliances
            const nonCompliances = [];
            const responses = [];
            
            Object.entries(submission.submission_data).forEach(([key, value]) => {
              // Check for failed/non-compliant responses
              if (value === 'no' || value === 'fail' || value === 'non_compliant') {
                nonCompliances.push({
                  item: key,
                  severity: 'medium',
                  description: `Non-compliance identified: ${key}`
                });
              }
              responses.push({
                section: 'Main',
                item: key,
                response: value,
                is_compliant: value === 'yes' || value === 'pass' || value === 'compliant'
              });
            });

            // Create audit record
            const auditRecord = await base44.entities.AuditRecord.create({
              template_id: task.form_template_id,
              audit_date: task.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
              auditor_staff_id: task.assigned_to_staff_id,
              area_audited: submission.submission_data.area_audited || 'Not specified',
              responses,
              overall_score: responses.filter(r => r.is_compliant).length,
              percentage_score: responses.length > 0 ? (responses.filter(r => r.is_compliant).length / responses.length) * 100 : 0,
              outcome: nonCompliances.length === 0 ? 'pass' : nonCompliances.length > 3 ? 'fail' : 'requires_improvement',
              findings: completionNotes,
              non_compliances: nonCompliances,
              status: 'submitted'
            });

            // Create action plan if there are non-compliances
            if (nonCompliances.length > 0) {
              const actionPlan = await base44.entities.ActionPlan.create({
                title: `Action Plan - ${formTemplate?.form_name || 'Audit'} (${submission.submission_data.area_audited || 'Area'})`,
                description: `Action plan from audit on ${format(new Date(), 'dd/MM/yyyy')}. ${nonCompliances.length} issue(s) identified.`,
                category: 'compliance',
                priority: 'high',
                status: 'active',
                assigned_to_staff_ids: [task.assigned_to_staff_id],
                target_completion_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                related_entity_type: 'audit',
                related_entity_id: auditRecord.id,
                actions: nonCompliances.map(nc => ({
                  action: `Address: ${nc.item}`,
                  responsible_person: task.assigned_to_staff_id,
                  target_date: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                  status: 'pending',
                  notes: nc.description
                })),
                progress_percentage: 0
              });

              // Link action plan to audit
              await base44.entities.AuditRecord.update(auditRecord.id, {
                action_plan_id: actionPlan.id,
                status: 'action_required'
              });

              toast.success("Audit Complete", `Action plan created with ${nonCompliances.length} action(s)`);
            }
          }
        } catch (error) {
          console.log("Could not create audit record:", error);
        }
      }

      // If this is an assessment/audit task for a client, attach to client documents
      if (task.subject_client_id && submissionId) {
        try {
          // Create a client document record
          await base44.entities.ClientDocument.create({
            client_id: task.subject_client_id,
            document_name: formTemplate?.form_name || task.title,
            document_type: task.task_type === 'assessment' ? 'assessment_form' : 
                           task.task_type === 'audit' ? 'audit_report' : 'other',
            category: formTemplate?.category || 'other',
            form_submission_id: submissionId,
            uploaded_date: new Date().toISOString(),
            uploaded_by: getStaffName(task.assigned_to_staff_id),
            status: 'approved',
            notes: completionNotes
          });
        } catch (e) {
          console.log("Could not create client document:", e);
        }
      }

      // If this is a task for a staff member (not supervision), attach to staff file
      if (task.subject_staff_id && submissionId && task.task_type !== 'supervision') {
        try {
          // Try to update carer record with document
          const carers = await base44.entities.Carer.filter({ id: task.subject_staff_id });
          if (carers?.[0]) {
            const existingDocs = carers[0].attached_documents || [];
            await base44.entities.Carer.update(task.subject_staff_id, {
              attached_documents: [...existingDocs, documentRecord]
            });
          }
        } catch (e) {
          console.log("Could not attach to staff file:", e);
        }
      }

      toast.success("Task Completed", "The task has been marked as complete");
      onComplete();
    } catch (error) {
      toast.error("Error", "Failed to complete task");
      console.error(error);
    }
  };

  const getStaffName = (id) => {
    const person = allStaff?.find(s => s.id === id);
    return person?.full_name || "Unknown";
  };

  // Audit tasks now use form templates with built-in logic/triggers
  // No need for separate audit executor

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{task.title}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  {task.subject_staff_id && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {getStaffName(task.subject_staff_id)}
                    </span>
                  )}
                  {task.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {(() => {
                        try {
                          return format(new Date(task.scheduled_date), 'dd MMM yyyy');
                        } catch {
                          return task.scheduled_date;
                        }
                      })()}
                      {task.scheduled_time && ` at ${task.scheduled_time}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>
                {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Client/Staff Details Card */}
      {(subjectClient || subjectStaff) && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">
                {subjectClient ? 'Client Details' : 'Staff Member Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {subjectClient && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <p className="text-gray-900">{subjectClient.full_name}</p>
                    </div>
                    {subjectClient.date_of_birth && (
                      <div>
                        <span className="font-medium text-gray-700">Date of Birth:</span>
                        <p className="text-gray-900">{(() => {
                          try {
                            return format(new Date(subjectClient.date_of_birth), 'dd/MM/yyyy');
                          } catch {
                            return subjectClient.date_of_birth;
                          }
                        })()}</p>
                      </div>
                    )}
                    {subjectClient.phone && (
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <p className="text-gray-900">{subjectClient.phone}</p>
                      </div>
                    )}
                    {subjectClient.address && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Address:</span>
                        <p className="text-gray-900">
                          {subjectClient.address.street && `${subjectClient.address.street}, `}
                          {subjectClient.address.city && `${subjectClient.address.city}, `}
                          {subjectClient.address.postcode}
                        </p>
                      </div>
                    )}
                    {subjectClient.nhs_number && (
                      <div>
                        <span className="font-medium text-gray-700">NHS Number:</span>
                        <p className="text-gray-900">{subjectClient.nhs_number}</p>
                      </div>
                    )}
                  </>
                )}
                {subjectStaff && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <p className="text-gray-900">{subjectStaff.full_name}</p>
                    </div>
                    {subjectStaff.email && (
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{subjectStaff.email}</p>
                      </div>
                    )}
                    {subjectStaff.phone && (
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <p className="text-gray-900">{subjectStaff.phone}</p>
                      </div>
                    )}
                    {subjectStaff.employment_type && (
                      <div>
                        <span className="font-medium text-gray-700">Employment Type:</span>
                        <p className="text-gray-900">{subjectStaff.employment_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Task Info */}
        {task.description && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-gray-700">{task.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Form Section */}
        {task.form_template_id ? (
          <div className="mb-6">
            {loadingTemplate ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading form...</p>
                </CardContent>
              </Card>
            ) : formTemplate ? (
              <div>
                {formSubmitted ? (
                  <Card className="mb-6 border-green-200 bg-green-50">
                    <CardContent className="p-6 text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h3 className="font-semibold text-green-800 text-lg">Form Submitted Successfully</h3>
                      <p className="text-green-700 mt-1">The form data has been saved</p>
                    </CardContent>
                  </Card>
                ) : (
                  <FormPreview 
                    template={formTemplate} 
                    onSubmitted={handleFormSubmitted}
                    prefillData={buildPrefillData()}
                    contextData={{
                      staff_task_id: task.id,
                      subject_staff_id: task.subject_staff_id,
                      subject_client_id: task.subject_client_id,
                      assigned_to_staff_id: task.assigned_to_staff_id
                    }}
                  />
                )}
              </div>
            ) : (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-orange-800">Form Template Not Found</h3>
                  <p className="text-orange-700 mt-1">The linked form template could not be loaded</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                No Form Attached
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                This task doesn't have a form attached. You can add notes below and mark it as complete.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completion Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complete Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Completion Notes</label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about this task..."
                rows={4}
              />
            </div>

            {task.form_template_id && !formSubmitted && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Please complete and submit the form above before marking this task as complete.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Save & Exit
              </Button>
              <Button 
                onClick={handleCompleteTask}
                disabled={task.form_template_id && !formSubmitted}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}