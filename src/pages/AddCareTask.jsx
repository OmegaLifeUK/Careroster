import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/toast";

export default function AddCareTask() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    task_title: "",
    task_type: "",
    task_category: "",
    priority_level: "medium",
    task_description: "",
    client_id: "",
    care_plan_id: "",
    assigned_carer_id: "",
    shift_id: "",
    visit_id: "",
    frequency: "once",
    scheduled_date: "",
    scheduled_time: "",
    duration_estimate_minutes: 30,
    location: "home",
    // Risk fields
    risk_level: "low",
    safeguarding_risk: false,
    requires_two_person: false,
    ppe_required: false,
    risk_mitigation_notes: "",
    // Medication fields (conditional)
    medication_name: "",
    dosage: "",
    route: "",
    time_administered: "",
    mar_reference: ""
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return Array.isArray(allClients) ? allClients : [];
    },
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return [];
      const allPlans = await base44.entities.CarePlan.list();
      return Array.isArray(allPlans) 
        ? allPlans.filter(p => p.client_id === formData.client_id && p.status === 'approved')
        : [];
    },
    enabled: !!formData.client_id,
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['approved-carers'],
    queryFn: async () => {
      const allCarers = await base44.entities.Carer.list();
      return Array.isArray(allCarers) 
        ? allCarers.filter(c => c.status === 'active')
        : [];
    },
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits', formData.client_id, formData.scheduled_date],
    queryFn: async () => {
      if (!formData.client_id || !formData.scheduled_date) return [];
      const allVisits = await base44.entities.Visit.list();
      return Array.isArray(allVisits) 
        ? allVisits.filter(v => 
            v.client_id === formData.client_id && 
            v.scheduled_start?.startsWith(formData.scheduled_date) &&
            v.status !== 'cancelled'
          )
        : [];
    },
    enabled: !!formData.client_id && !!formData.scheduled_date,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', formData.client_id, formData.scheduled_date],
    queryFn: async () => {
      if (!formData.client_id || !formData.scheduled_date) return [];
      const allShifts = await base44.entities.Shift.list();
      return Array.isArray(allShifts) 
        ? allShifts.filter(s => 
            s.client_id === formData.client_id && 
            s.scheduled_date === formData.scheduled_date &&
            s.status !== 'cancelled'
          )
        : [];
    },
    enabled: !!formData.client_id && !!formData.scheduled_date,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      // Validation: Check care plan is approved
      if (taskData.care_plan_id) {
        const carePlan = carePlans.find(p => p.id === taskData.care_plan_id);
        if (!carePlan || carePlan.status !== 'approved') {
          throw new Error("Cannot create task: Care plan must be approved");
        }
      }

      // Validation: Check carer is fit to work
      if (taskData.assigned_carer_id) {
        const carer = carers.find(c => c.id === taskData.assigned_carer_id);
        if (!carer || carer.status !== 'active') {
          throw new Error("Cannot assign task: Carer must be active and fit to work");
        }
      }

      // Create the care task
      const careTask = await base44.entities.CareTask.create({
        task_title: taskData.task_title,
        task_type: taskData.task_type,
        task_description: taskData.task_description,
        client_id: taskData.client_id,
        care_plan_id: taskData.care_plan_id,
        assigned_carer_id: taskData.assigned_carer_id,
        shift_id: taskData.shift_id,
        visit_id: taskData.visit_id,
        task_category: taskData.task_category,
        priority_level: taskData.priority_level,
        frequency: taskData.frequency,
        scheduled_date: taskData.scheduled_date,
        scheduled_time: taskData.scheduled_time,
        duration_estimate_minutes: taskData.duration_estimate_minutes,
        location: taskData.location,
        task_status: 'scheduled'
      });

      // Create risk check
      await base44.entities.TaskRiskCheck.create({
        care_task_id: careTask.id,
        risk_level: taskData.risk_level,
        safeguarding_risk: taskData.safeguarding_risk,
        requires_two_person: taskData.requires_two_person,
        ppe_required: taskData.ppe_required,
        risk_mitigation_notes: taskData.risk_mitigation_notes
      });

      // If medication task, create medication details
      if (taskData.task_type === 'medication' && taskData.medication_name) {
        await base44.entities.MedicationTaskDetails.create({
          care_task_id: careTask.id,
          medication_name: taskData.medication_name,
          dosage: taskData.dosage,
          route: taskData.route,
          time_administered: taskData.time_administered || taskData.scheduled_time,
          mar_reference: taskData.mar_reference,
          medication_administered: false,
          medication_refused: false
        });
      }

      // If safeguarding risk, notify manager
      if (taskData.safeguarding_risk) {
        await base44.entities.Notification.create({
          notification_type: 'safeguarding_alert',
          message: `High Priority: Safeguarding risk identified for task "${taskData.task_title}" - Client: ${clients.find(c => c.id === taskData.client_id)?.full_name}`,
          priority: 'urgent',
          is_read: false
        });
      }

      return careTask;
    },
    onSuccess: () => {
      toast.success("Care task created successfully");
      queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
      navigate(createPageUrl("StaffTasks"));
    },
    onError: (error) => {
      toast.error("Failed to create task", error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.task_title || !formData.task_type || !formData.client_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.care_plan_id) {
      toast.error("Please select an approved care plan");
      return;
    }

    createTaskMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isMedicationTask = formData.task_type === 'medication';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("StaffTasks"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Add Care Task</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Task Basics */}
          <Card>
            <CardHeader>
              <CardTitle>Task Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="task_title">Task Title *</Label>
                <Input
                  id="task_title"
                  value={formData.task_title}
                  onChange={(e) => handleChange('task_title', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task_type">Task Type *</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(value) => handleChange('task_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal_care">Personal Care</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="nutrition_meals">Nutrition / Meals</SelectItem>
                      <SelectItem value="mobility_support">Mobility Support</SelectItem>
                      <SelectItem value="clinical_support">Clinical Support</SelectItem>
                      <SelectItem value="emotional_support">Emotional Support</SelectItem>
                      <SelectItem value="domestic_support">Domestic Support</SelectItem>
                      <SelectItem value="child_supervision">Child Supervision</SelectItem>
                      <SelectItem value="education_development">Education / Development Support</SelectItem>
                      <SelectItem value="community_access">Community Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="task_category">Task Category *</Label>
                  <Select
                    value={formData.task_category}
                    onValueChange={(value) => handleChange('task_category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal_care">Personal Care</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="mobility">Mobility</SelectItem>
                      <SelectItem value="nutrition">Nutrition</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="activities">Activities</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="priority_level">Priority Level *</Label>
                <Select
                  value={formData.priority_level}
                  onValueChange={(value) => handleChange('priority_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Client & Care Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Client & Care Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleChange('client_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="care_plan_id">Care Plan (Approved Only) *</Label>
                <Select
                  value={formData.care_plan_id}
                  onValueChange={(value) => handleChange('care_plan_id', value)}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.client_id ? "Select care plan" : "Select client first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {carePlans.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No approved care plans available</div>
                    ) : (
                      carePlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.care_plan_name || `Care Plan - ${new Date(plan.created_date).toLocaleDateString()}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.client_id && carePlans.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ No approved care plans found for this client
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => handleChange('frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => handleChange('location', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="facility">Facility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scheduled_date">Scheduled Date *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleChange('scheduled_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="scheduled_time">Scheduled Time</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => handleChange('scheduled_time', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="duration_estimate_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_estimate_minutes"
                    type="number"
                    value={formData.duration_estimate_minutes}
                    onChange={(e) => handleChange('duration_estimate_minutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assigned_carer_id">Assigned Carer</Label>
                <Select
                  value={formData.assigned_carer_id}
                  onValueChange={(value) => handleChange('assigned_carer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select carer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {carers.map(carer => (
                      <SelectItem key={carer.id} value={carer.id}>
                        {carer.full_name} - {carer.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Only active carers are shown</p>
              </div>

              <div>
                <Label htmlFor="visit_id">Link to Visit (Time-Specific)</Label>
                <Select
                  value={formData.visit_id}
                  onValueChange={(value) => handleChange('visit_id', value)}
                  disabled={!formData.client_id || !formData.scheduled_date}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.client_id && formData.scheduled_date ? "Select visit" : "Select client and date first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {visits.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No visits found for this date</div>
                    ) : (
                      visits.map(visit => (
                        <SelectItem key={visit.id} value={visit.id}>
                          {new Date(visit.scheduled_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {new Date(visit.scheduled_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Task will appear for carer during this visit</p>
              </div>

              <div>
                <Label htmlFor="shift_id">Link to Shift</Label>
                <Select
                  value={formData.shift_id}
                  onValueChange={(value) => handleChange('shift_id', value)}
                  disabled={!formData.client_id || !formData.scheduled_date}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.client_id && formData.scheduled_date ? "Select shift" : "Select client and date first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No shifts found for this date</div>
                    ) : (
                      shifts.map(shift => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.shift_type} - {shift.scheduled_date}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Task will appear for carer during this shift</p>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Risk & Safeguarding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Risk & Safeguarding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="risk_level">Risk Level</Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => handleChange('risk_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="safeguarding_risk"
                    checked={formData.safeguarding_risk}
                    onCheckedChange={(checked) => handleChange('safeguarding_risk', checked)}
                  />
                  <Label htmlFor="safeguarding_risk" className="font-normal">
                    Safeguarding Risk (Will notify Registered Manager)
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="requires_two_person"
                    checked={formData.requires_two_person}
                    onCheckedChange={(checked) => handleChange('requires_two_person', checked)}
                  />
                  <Label htmlFor="requires_two_person" className="font-normal">
                    Requires Two Person Support
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ppe_required"
                    checked={formData.ppe_required}
                    onCheckedChange={(checked) => handleChange('ppe_required', checked)}
                  />
                  <Label htmlFor="ppe_required" className="font-normal">
                    PPE Required
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="risk_mitigation_notes">Risk Mitigation Notes</Label>
                <Textarea
                  id="risk_mitigation_notes"
                  value={formData.risk_mitigation_notes}
                  onChange={(e) => handleChange('risk_mitigation_notes', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="task_description">Task Description</Label>
                <Textarea
                  id="task_description"
                  value={formData.task_description}
                  onChange={(e) => handleChange('task_description', e.target.value)}
                  rows={4}
                  placeholder="Provide detailed instructions for completing this task..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Medication (Conditional) */}
          {isMedicationTask && (
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-900">Medication Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medication_name">Medication Name *</Label>
                    <Input
                      id="medication_name"
                      value={formData.medication_name}
                      onChange={(e) => handleChange('medication_name', e.target.value)}
                      required={isMedicationTask}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dosage">Dosage *</Label>
                    <Input
                      id="dosage"
                      value={formData.dosage}
                      onChange={(e) => handleChange('dosage', e.target.value)}
                      placeholder="e.g., 50mg"
                      required={isMedicationTask}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="route">Route *</Label>
                    <Select
                      value={formData.route}
                      onValueChange={(value) => handleChange('route', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="sublingual">Sublingual</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="inhaled">Inhaled</SelectItem>
                        <SelectItem value="injection">Injection</SelectItem>
                        <SelectItem value="intravenous">Intravenous</SelectItem>
                        <SelectItem value="rectal">Rectal</SelectItem>
                        <SelectItem value="transdermal">Transdermal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time_administered">Time to Administer</Label>
                    <Input
                      id="time_administered"
                      type="time"
                      value={formData.time_administered}
                      onChange={(e) => handleChange('time_administered', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mar_reference">MAR Reference</Label>
                    <Input
                      id="mar_reference"
                      value={formData.mar_reference}
                      onChange={(e) => handleChange('mar_reference', e.target.value)}
                      placeholder="MAR sheet ref"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("StaffTasks"))}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}