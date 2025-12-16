import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  ClipboardList, 
  Calendar, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Play,
  FileText,
  Users
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import StaffTaskFormExecutor from "./StaffTaskFormExecutor";
import TaskProgressBar from "./TaskProgressBar";

const TASK_TYPE_CONFIG = {
  supervision: { label: "Supervision", icon: Users, color: "bg-blue-100 text-blue-700" },
  assessment: { label: "Assessment", icon: ClipboardList, color: "bg-green-100 text-green-700" },
  audit: { label: "Audit", icon: FileText, color: "bg-purple-100 text-purple-700" },
  training: { label: "Training", icon: ClipboardList, color: "bg-orange-100 text-orange-700" },
  spot_check: { label: "Spot Check", icon: CheckCircle, color: "bg-yellow-100 text-yellow-700" },
  review: { label: "Review", icon: FileText, color: "bg-indigo-100 text-indigo-700" },
  general: { label: "General", icon: ClipboardList, color: "bg-gray-100 text-gray-700" }
};

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

export default function StaffTaskManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [executingTask, setExecutingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pending");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['staff-tasks', filterStatus],
    queryFn: async () => {
      const filter = filterStatus === "all" ? {} : { status: filterStatus };
      const data = await base44.entities.StaffTask.filter(filter, '-due_date');
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['all-staff'],
    queryFn: () => base44.entities.Staff.list()
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['all-carers'],
    queryFn: () => base44.entities.Carer.list()
  });

  const { data: formTemplates = [] } = useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const data = await base44.entities.FormTemplate.filter({ is_active: true });
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: auditTemplates = [] } = useQuery({
    queryKey: ['audit-templates'],
    queryFn: async () => {
      const data = await base44.entities.AuditTemplate.filter({ is_active: true });
      return Array.isArray(data) ? data : [];
    }
  });

  const allStaff = [...staff, ...carers];

  const getStaffName = (id) => {
    const person = allStaff.find(s => s.id === id);
    return person?.full_name || "Unknown";
  };

  const handleStartTask = (task) => {
    setExecutingTask(task);
  };

  const handleTaskCompleted = () => {
    setExecutingTask(null);
    queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
  };

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()).length
  };

  if (executingTask) {
    return (
      <StaffTaskFormExecutor 
        task={executingTask} 
        onClose={() => setExecutingTask(null)}
        onComplete={handleTaskCompleted}
        allStaff={allStaff}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Staff Tasks</h2>
          <p className="text-gray-600">Supervisions, assessments, and other tasks</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card 
          className="bg-yellow-50 border-yellow-200 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("pending")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                <p className="text-sm text-yellow-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-blue-50 border-blue-200 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("in_progress")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Play className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                <p className="text-sm text-blue-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-red-50 border-red-200 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("pending")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
                <p className="text-sm text-red-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["pending", "in_progress", "completed", "all"].map(status => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === "all" ? "All" : status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map(task => {
            const typeConfig = TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.general;
            const TypeIcon = typeConfig.icon;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status === 'pending';

            return (
              <Card key={task.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          {task.form_template_id && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              Form Required
                            </Badge>
                          )}
                          {task.audit_template_id && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              <FileText className="w-3 h-3 mr-1" />
                              Audit Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Assigned to: {getStaffName(task.assigned_to_staff_id)}
                          </span>
                          {task.subject_staff_id && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              About: {getStaffName(task.subject_staff_id)}
                            </span>
                          )}
                          {task.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(task.due_date), 'dd MMM yyyy')}
                            </span>
                          )}
                        </div>
                        {task.form_submission_id && task.status === 'in_progress' && (
                          <div className="mt-2">
                            <TaskProgressBar taskId={task.id} />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                          <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
                          {isOverdue && <Badge className="bg-red-600 text-white">Overdue</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === 'pending' && (
                        <Button
                          onClick={() => handleStartTask(task)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Task
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          onClick={() => handleStartTask(task)}
                          variant="outline"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Continue
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showCreateDialog && (
        <CreateStaffTaskDialog
          onClose={() => setShowCreateDialog(false)}
          allStaff={allStaff}
          formTemplates={formTemplates}
          auditTemplates={auditTemplates}
        />
      )}
    </div>
  );
}

function CreateStaffTaskDialog({ onClose, allStaff, formTemplates, auditTemplates }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "supervision",
    form_template_id: "",
    audit_template_id: "",
    assigned_to_staff_id: "",
    subject_staff_id: "",
    priority: "medium",
    due_date: "",
    scheduled_date: "",
    scheduled_time: ""
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      toast.success("Task Created", "Staff task has been created");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create task");
      console.error(error);
    }
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.assigned_to_staff_id) {
      toast.error("Required Fields", "Please fill in title and assignee");
      return;
    }
    createMutation.mutate(formData);
  };

  // Auto-set title based on task type and subject
  const handleTaskTypeChange = (type) => {
    let title = formData.title;
    if (!title || title.includes("Supervision") || title.includes("Assessment")) {
      const subjectName = formData.subject_staff_id 
        ? allStaff.find(s => s.id === formData.subject_staff_id)?.full_name 
        : "";
      
      if (type === "supervision") {
        title = subjectName ? `Supervision - ${subjectName}` : "Staff Supervision";
      } else if (type === "assessment") {
        title = "Staff Assessment";
      } else if (type === "spot_check") {
        title = subjectName ? `Spot Check - ${subjectName}` : "Spot Check";
      }
    }
    setFormData({ ...formData, task_type: type, title });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Create Staff Task</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Task Type *</label>
            <Select value={formData.task_type} onValueChange={handleTaskTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supervision">Supervision</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="spot_check">Spot Check</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Monthly Supervision - John Smith"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Assigned To (who will perform this task) *</label>
            <Select 
              value={formData.assigned_to_staff_id} 
              onValueChange={(v) => setFormData({ ...formData, assigned_to_staff_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager/supervisor" />
              </SelectTrigger>
              <SelectContent>
                {allStaff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.task_type === "supervision" || formData.task_type === "spot_check" || formData.task_type === "assessment") && (
            <div>
              <label className="text-sm font-medium">About (staff member being supervised/assessed)</label>
              <Select 
                value={formData.subject_staff_id} 
                onValueChange={(v) => {
                  const name = allStaff.find(s => s.id === v)?.full_name || "";
                  let title = formData.title;
                  if (formData.task_type === "supervision") title = `Supervision - ${name}`;
                  if (formData.task_type === "spot_check") title = `Spot Check - ${name}`;
                  setFormData({ ...formData, subject_staff_id: v, title });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {allStaff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.task_type === "audit" ? (
            <div>
              <label className="text-sm font-medium">Audit Form/Template *</label>
              <Select 
                value={formData.form_template_id || formData.audit_template_id} 
                onValueChange={(v) => {
                  // Check if it's a form template or audit template
                  const isFormTemplate = formTemplates.some(t => t.id === v);
                  if (isFormTemplate) {
                    setFormData({ ...formData, form_template_id: v, audit_template_id: "" });
                  } else {
                    setFormData({ ...formData, audit_template_id: v, form_template_id: "" });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audit form or template" />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates.filter(t => t.category === 'audit' || t.form_name?.toLowerCase().includes('audit')).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Form Builder Audits (Recommended)</div>
                      {formTemplates.filter(t => t.category === 'audit' || t.form_name?.toLowerCase().includes('audit')).map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.form_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {auditTemplates.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 mt-2">Legacy Audit Templates</div>
                      {auditTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.template_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {formTemplates.filter(t => t.category === 'audit' || t.form_name?.toLowerCase().includes('audit')).length === 0 && auditTemplates.length === 0 && (
                    <SelectItem value={null} disabled>No audit forms available - create one in Form Builder</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formTemplates.filter(t => t.category === 'audit').length > 0 
                  ? "Create audit forms in Form Builder (category: audit) for advanced logic and triggers"
                  : "Create audit forms in Form Builder with category 'audit' to enable logic and triggers"}
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Form Template (optional)</label>
              <Select 
                value={formData.form_template_id} 
                onValueChange={(v) => setFormData({ ...formData, form_template_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select form to complete" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No form required</SelectItem>
                  {formTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.form_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                The form will open when the task is started
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Scheduled Date</label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}