import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  User, 
  Heart, 
  Pill, 
  ListChecks,
  Target,
  AlertTriangle,
  Clock,
  FileText
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addMonths } from "date-fns";

const TASK_CATEGORIES = [
  { value: "personal_care", label: "Personal Care" },
  { value: "nutrition", label: "Nutrition & Hydration" },
  { value: "medication", label: "Medication" },
  { value: "mobility", label: "Mobility" },
  { value: "social", label: "Social & Activities" },
  { value: "emotional", label: "Emotional Support" },
  { value: "healthcare", label: "Healthcare" },
  { value: "domestic", label: "Domestic Tasks" },
  { value: "other", label: "Other" }
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "Twice Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As Needed" },
  { value: "with_each_visit", label: "With Each Visit" },
  { value: "monthly", label: "Monthly" }
];

export default function CarePlanEditor({ carePlan, client, onClose }) {
  const isEditing = !!carePlan;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_id: client.id,
    care_setting: carePlan?.care_setting || "domiciliary",
    plan_type: carePlan?.plan_type || "initial",
    assessment_date: carePlan?.assessment_date || format(new Date(), "yyyy-MM-dd"),
    review_date: carePlan?.review_date || format(addMonths(new Date(), 3), "yyyy-MM-dd"),
    assessed_by: carePlan?.assessed_by || "",
    status: carePlan?.status || "draft",
    personal_details: carePlan?.personal_details || {
      preferred_name: client.full_name?.split(' ')[0] || "",
      language: "English",
      religion: "",
      cultural_needs: ""
    },
    physical_health: carePlan?.physical_health || {
      mobility: client.mobility || "independent",
      continence: "continent",
      nutrition: "",
      skin_integrity: "",
      pain_management: "",
      medical_conditions: [],
      allergies: []
    },
    mental_health: carePlan?.mental_health || {
      cognitive_function: "",
      mental_health_conditions: [],
      communication_needs: "",
      behaviour_support_needs: ""
    },
    care_objectives: carePlan?.care_objectives || [],
    care_tasks: carePlan?.care_tasks || [],
    medication_management: carePlan?.medication_management || {
      self_administers: false,
      administration_support: "prompting",
      medication_storage: "",
      pharmacy_details: "",
      gp_details: "",
      medications: [],
      allergies_sensitivities: "",
      notes: ""
    },
    daily_routine: carePlan?.daily_routine || {
      morning: "",
      afternoon: "",
      evening: "",
      night: ""
    },
    preferences: carePlan?.preferences || {
      likes: [],
      dislikes: [],
      hobbies: [],
      social_preferences: "",
      food_preferences: "",
      communication_preferences: "",
      personal_care_preferences: ""
    },
    risk_factors: carePlan?.risk_factors || [],
    emergency_info: carePlan?.emergency_info || {
      hospital_preference: "",
      dnacpr_in_place: false,
      advance_directive: "",
      emergency_protocol: ""
    }
  });

  const [activeTab, setActiveTab] = useState("overview");

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.CarePlan.update(carePlan.id, data);
      }
      return base44.entities.CarePlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Saved", isEditing ? "Care plan updated" : "Care plan created");
      onClose();
    },
    onError: () => {
      toast.error("Error", "Failed to save care plan");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.assessed_by) {
      toast.error("Required", "Please enter who assessed the client");
      return;
    }
    saveMutation.mutate(formData);
  };

  const addObjective = () => {
    setFormData({
      ...formData,
      care_objectives: [
        ...formData.care_objectives,
        { objective: "", outcome_measures: "", target_date: "", status: "not_started", review_notes: "" }
      ]
    });
  };

  const removeObjective = (index) => {
    const updated = [...formData.care_objectives];
    updated.splice(index, 1);
    setFormData({ ...formData, care_objectives: updated });
  };

  const addTask = () => {
    setFormData({
      ...formData,
      care_tasks: [
        ...formData.care_tasks,
        { 
          task_id: `task_${Date.now()}`,
          category: "personal_care", 
          task_name: "", 
          description: "",
          frequency: "daily",
          preferred_time: "",
          duration_minutes: 15,
          special_instructions: "",
          linked_shift_types: [],
          requires_two_carers: false,
          is_active: true
        }
      ]
    });
  };

  const removeTask = (index) => {
    const updated = [...formData.care_tasks];
    updated.splice(index, 1);
    setFormData({ ...formData, care_tasks: updated });
  };

  const addMedication = () => {
    const meds = formData.medication_management.medications || [];
    setFormData({
      ...formData,
      medication_management: {
        ...formData.medication_management,
        medications: [
          ...meds,
          { name: "", dose: "", frequency: "", route: "oral", time_of_day: [], purpose: "", special_instructions: "", is_prn: false }
        ]
      }
    });
  };

  const removeMedication = (index) => {
    const meds = [...formData.medication_management.medications];
    meds.splice(index, 1);
    setFormData({
      ...formData,
      medication_management: { ...formData.medication_management, medications: meds }
    });
  };

  const addRisk = () => {
    setFormData({
      ...formData,
      risk_factors: [
        ...formData.risk_factors,
        { risk: "", likelihood: "low", impact: "low", control_measures: "" }
      ]
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            {isEditing ? "Edit Care Plan" : "Create Care Plan"} - {client.full_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="overview" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="objectives" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Objectives
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                <ListChecks className="w-3 h-3 mr-1" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="medication" className="text-xs">
                <Pill className="w-3 h-3 mr-1" />
                Medication
              </TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="risks" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Risks
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Care Setting *</Label>
                  <Select
                    value={formData.care_setting}
                    onValueChange={(v) => setFormData({ ...formData, care_setting: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domiciliary">Domiciliary Care</SelectItem>
                      <SelectItem value="residential">Residential Care</SelectItem>
                      <SelectItem value="supported_living">Supported Living</SelectItem>
                      <SelectItem value="day_centre">Day Centre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plan Type</Label>
                  <Select
                    value={formData.plan_type}
                    onValueChange={(v) => setFormData({ ...formData, plan_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initial Assessment</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="interim">Interim</SelectItem>
                      <SelectItem value="discharge">Discharge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Assessment Date *</Label>
                  <Input
                    type="date"
                    value={formData.assessment_date}
                    onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Review Date</Label>
                  <Input
                    type="date"
                    value={formData.review_date}
                    onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Assessed By *</Label>
                  <Input
                    value={formData.assessed_by}
                    onChange={(e) => setFormData({ ...formData, assessed_by: e.target.value })}
                    placeholder="Staff member name"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Personal Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Name</Label>
                    <Input
                      value={formData.personal_details.preferred_name}
                      onChange={(e) => setFormData({
                        ...formData,
                        personal_details: { ...formData.personal_details, preferred_name: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Input
                      value={formData.personal_details.language}
                      onChange={(e) => setFormData({
                        ...formData,
                        personal_details: { ...formData.personal_details, language: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Religion</Label>
                    <Input
                      value={formData.personal_details.religion}
                      onChange={(e) => setFormData({
                        ...formData,
                        personal_details: { ...formData.personal_details, religion: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Cultural Needs</Label>
                    <Input
                      value={formData.personal_details.cultural_needs}
                      onChange={(e) => setFormData({
                        ...formData,
                        personal_details: { ...formData.personal_details, cultural_needs: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Daily Routine</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['morning', 'afternoon', 'evening', 'night'].map(time => (
                    <div key={time}>
                      <Label className="capitalize">{time}</Label>
                      <Textarea
                        value={formData.daily_routine[time]}
                        onChange={(e) => setFormData({
                          ...formData,
                          daily_routine: { ...formData.daily_routine, [time]: e.target.value }
                        })}
                        placeholder={`Describe ${time} routine...`}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Objectives Tab */}
            <TabsContent value="objectives" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Care Objectives</h3>
                <Button type="button" variant="outline" size="sm" onClick={addObjective}>
                  <Plus className="w-4 h-4 mr-1" /> Add Objective
                </Button>
              </div>

              {formData.care_objectives.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No objectives defined yet</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addObjective}>
                      Add First Objective
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.care_objectives.map((obj, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between">
                          <Badge variant="outline">Objective {idx + 1}</Badge>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeObjective(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div>
                          <Label>Objective</Label>
                          <Textarea
                            value={obj.objective}
                            onChange={(e) => {
                              const updated = [...formData.care_objectives];
                              updated[idx].objective = e.target.value;
                              setFormData({ ...formData, care_objectives: updated });
                            }}
                            placeholder="What is the care objective?"
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Target Date</Label>
                            <Input
                              type="date"
                              value={obj.target_date}
                              onChange={(e) => {
                                const updated = [...formData.care_objectives];
                                updated[idx].target_date = e.target.value;
                                setFormData({ ...formData, care_objectives: updated });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select
                              value={obj.status}
                              onValueChange={(v) => {
                                const updated = [...formData.care_objectives];
                                updated[idx].status = v;
                                setFormData({ ...formData, care_objectives: updated });
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="achieved">Achieved</SelectItem>
                                <SelectItem value="revised">Revised</SelectItem>
                                <SelectItem value="discontinued">Discontinued</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Outcome Measures</Label>
                            <Input
                              value={obj.outcome_measures}
                              onChange={(e) => {
                                const updated = [...formData.care_objectives];
                                updated[idx].outcome_measures = e.target.value;
                                setFormData({ ...formData, care_objectives: updated });
                              }}
                              placeholder="How will success be measured?"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Care Tasks & Interventions</h3>
                <Button type="button" variant="outline" size="sm" onClick={addTask}>
                  <Plus className="w-4 h-4 mr-1" /> Add Task
                </Button>
              </div>

              {formData.care_tasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <ListChecks className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No tasks defined yet</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addTask}>
                      Add First Task
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.care_tasks.map((task, idx) => (
                    <Card key={idx} className={!task.is_active ? "opacity-50" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700">
                              {TASK_CATEGORIES.find(c => c.value === task.category)?.label || task.category}
                            </Badge>
                            {task.requires_two_carers && (
                              <Badge variant="outline" className="text-orange-600">2 Carers</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-sm">
                              <Checkbox
                                checked={task.is_active}
                                onCheckedChange={(checked) => {
                                  const updated = [...formData.care_tasks];
                                  updated[idx].is_active = checked;
                                  setFormData({ ...formData, care_tasks: updated });
                                }}
                              />
                              Active
                            </label>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Task Name</Label>
                            <Input
                              value={task.task_name}
                              onChange={(e) => {
                                const updated = [...formData.care_tasks];
                                updated[idx].task_name = e.target.value;
                                setFormData({ ...formData, care_tasks: updated });
                              }}
                              placeholder="e.g., Morning personal care"
                            />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={task.category}
                              onValueChange={(v) => {
                                const updated = [...formData.care_tasks];
                                updated[idx].category = v;
                                setFormData({ ...formData, care_tasks: updated });
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TASK_CATEGORIES.map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={task.description}
                            onChange={(e) => {
                              const updated = [...formData.care_tasks];
                              updated[idx].description = e.target.value;
                              setFormData({ ...formData, care_tasks: updated });
                            }}
                            placeholder="Describe what needs to be done..."
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Frequency</Label>
                            <Select
                              value={task.frequency}
                              onValueChange={(v) => {
                                const updated = [...formData.care_tasks];
                                updated[idx].frequency = v;
                                setFormData({ ...formData, care_tasks: updated });
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FREQUENCY_OPTIONS.map(f => (
                                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Preferred Time</Label>
                            <Input
                              type="time"
                              value={task.preferred_time}
                              onChange={(e) => {
                                const updated = [...formData.care_tasks];
                                updated[idx].preferred_time = e.target.value;
                                setFormData({ ...formData, care_tasks: updated });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Duration (mins)</Label>
                            <Input
                              type="number"
                              value={task.duration_minutes}
                              onChange={(e) => {
                                const updated = [...formData.care_tasks];
                                updated[idx].duration_minutes = parseInt(e.target.value) || 0;
                                setFormData({ ...formData, care_tasks: updated });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Special Instructions</Label>
                          <Textarea
                            value={task.special_instructions}
                            onChange={(e) => {
                              const updated = [...formData.care_tasks];
                              updated[idx].special_instructions = e.target.value;
                              setFormData({ ...formData, care_tasks: updated });
                            }}
                            placeholder="Any special instructions for carers..."
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={task.requires_two_carers}
                            onCheckedChange={(checked) => {
                              const updated = [...formData.care_tasks];
                              updated[idx].requires_two_carers = checked;
                              setFormData({ ...formData, care_tasks: updated });
                            }}
                          />
                          <Label>Requires two carers</Label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Medication Tab */}
            <TabsContent value="medication" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.medication_management.self_administers}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      medication_management: { ...formData.medication_management, self_administers: checked }
                    })}
                  />
                  <Label>Client self-administers medication</Label>
                </div>
                <div>
                  <Label>Administration Support Level</Label>
                  <Select
                    value={formData.medication_management.administration_support}
                    onValueChange={(v) => setFormData({
                      ...formData,
                      medication_management: { ...formData.medication_management, administration_support: v }
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None Required</SelectItem>
                      <SelectItem value="prompting">Prompting Only</SelectItem>
                      <SelectItem value="assistance">Assistance Required</SelectItem>
                      <SelectItem value="full_administration">Full Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pharmacy Details</Label>
                  <Input
                    value={formData.medication_management.pharmacy_details}
                    onChange={(e) => setFormData({
                      ...formData,
                      medication_management: { ...formData.medication_management, pharmacy_details: e.target.value }
                    })}
                    placeholder="Pharmacy name & contact"
                  />
                </div>
                <div>
                  <Label>GP Details</Label>
                  <Input
                    value={formData.medication_management.gp_details}
                    onChange={(e) => setFormData({
                      ...formData,
                      medication_management: { ...formData.medication_management, gp_details: e.target.value }
                    })}
                    placeholder="GP surgery & contact"
                  />
                </div>
              </div>

              <div>
                <Label>Allergies & Sensitivities</Label>
                <Textarea
                  value={formData.medication_management.allergies_sensitivities}
                  onChange={(e) => setFormData({
                    ...formData,
                    medication_management: { ...formData.medication_management, allergies_sensitivities: e.target.value }
                  })}
                  placeholder="List any known allergies or sensitivities..."
                  rows={2}
                  className="border-red-200 bg-red-50"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Medications</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                    <Plus className="w-4 h-4 mr-1" /> Add Medication
                  </Button>
                </div>

                {(formData.medication_management.medications || []).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center text-gray-500">
                      <Pill className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No medications recorded</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {formData.medication_management.medications.map((med, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between">
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-blue-600" />
                              {med.is_prn && <Badge className="bg-orange-100 text-orange-700">PRN</Badge>}
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeMedication(idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Medication Name</Label>
                              <Input
                                value={med.name}
                                onChange={(e) => {
                                  const meds = [...formData.medication_management.medications];
                                  meds[idx].name = e.target.value;
                                  setFormData({
                                    ...formData,
                                    medication_management: { ...formData.medication_management, medications: meds }
                                  });
                                }}
                                placeholder="e.g., Paracetamol"
                              />
                            </div>
                            <div>
                              <Label>Dose</Label>
                              <Input
                                value={med.dose}
                                onChange={(e) => {
                                  const meds = [...formData.medication_management.medications];
                                  meds[idx].dose = e.target.value;
                                  setFormData({
                                    ...formData,
                                    medication_management: { ...formData.medication_management, medications: meds }
                                  });
                                }}
                                placeholder="e.g., 500mg"
                              />
                            </div>
                            <div>
                              <Label>Frequency</Label>
                              <Input
                                value={med.frequency}
                                onChange={(e) => {
                                  const meds = [...formData.medication_management.medications];
                                  meds[idx].frequency = e.target.value;
                                  setFormData({
                                    ...formData,
                                    medication_management: { ...formData.medication_management, medications: meds }
                                  });
                                }}
                                placeholder="e.g., Twice daily"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Purpose</Label>
                              <Input
                                value={med.purpose}
                                onChange={(e) => {
                                  const meds = [...formData.medication_management.medications];
                                  meds[idx].purpose = e.target.value;
                                  setFormData({
                                    ...formData,
                                    medication_management: { ...formData.medication_management, medications: meds }
                                  });
                                }}
                                placeholder="What is this medication for?"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                              <Checkbox
                                checked={med.is_prn}
                                onCheckedChange={(checked) => {
                                  const meds = [...formData.medication_management.medications];
                                  meds[idx].is_prn = checked;
                                  setFormData({
                                    ...formData,
                                    medication_management: { ...formData.medication_management, medications: meds }
                                  });
                                }}
                              />
                              <Label>PRN (as needed)</Label>
                            </div>
                          </div>
                          <div>
                            <Label>Special Instructions</Label>
                            <Input
                              value={med.special_instructions}
                              onChange={(e) => {
                                const meds = [...formData.medication_management.medications];
                                meds[idx].special_instructions = e.target.value;
                                setFormData({
                                  ...formData,
                                  medication_management: { ...formData.medication_management, medications: meds }
                                });
                              }}
                              placeholder="e.g., Take with food"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Likes</Label>
                  <Textarea
                    value={(formData.preferences.likes || []).join('\n')}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, likes: e.target.value.split('\n').filter(Boolean) }
                    })}
                    placeholder="Enter likes (one per line)"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Dislikes</Label>
                  <Textarea
                    value={(formData.preferences.dislikes || []).join('\n')}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, dislikes: e.target.value.split('\n').filter(Boolean) }
                    })}
                    placeholder="Enter dislikes (one per line)"
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label>Hobbies & Interests</Label>
                <Textarea
                  value={(formData.preferences.hobbies || []).join('\n')}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, hobbies: e.target.value.split('\n').filter(Boolean) }
                  })}
                  placeholder="Enter hobbies (one per line)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Food Preferences</Label>
                  <Textarea
                    value={formData.preferences.food_preferences}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, food_preferences: e.target.value }
                    })}
                    placeholder="Dietary requirements, favourite foods, etc."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Personal Care Preferences</Label>
                  <Textarea
                    value={formData.preferences.personal_care_preferences}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, personal_care_preferences: e.target.value }
                    })}
                    placeholder="How they like to be supported with personal care..."
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label>Communication Preferences</Label>
                <Textarea
                  value={formData.preferences.communication_preferences}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, communication_preferences: e.target.value }
                  })}
                  placeholder="How they prefer to communicate, any aids needed..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Social Preferences</Label>
                <Textarea
                  value={formData.preferences.social_preferences}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, social_preferences: e.target.value }
                  })}
                  placeholder="Social activities, visitors, alone time preferences..."
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Risks Tab */}
            <TabsContent value="risks" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Risk Factors</h3>
                <Button type="button" variant="outline" size="sm" onClick={addRisk}>
                  <Plus className="w-4 h-4 mr-1" /> Add Risk
                </Button>
              </div>

              {formData.risk_factors.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No risk factors identified</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {formData.risk_factors.map((risk, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between">
                          <Badge variant="outline">Risk {idx + 1}</Badge>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              const updated = [...formData.risk_factors];
                              updated.splice(idx, 1);
                              setFormData({ ...formData, risk_factors: updated });
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div>
                          <Label>Risk Description</Label>
                          <Input
                            value={risk.risk}
                            onChange={(e) => {
                              const updated = [...formData.risk_factors];
                              updated[idx].risk = e.target.value;
                              setFormData({ ...formData, risk_factors: updated });
                            }}
                            placeholder="Describe the risk..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Likelihood</Label>
                            <Select
                              value={risk.likelihood}
                              onValueChange={(v) => {
                                const updated = [...formData.risk_factors];
                                updated[idx].likelihood = v;
                                setFormData({ ...formData, risk_factors: updated });
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Impact</Label>
                            <Select
                              value={risk.impact}
                              onValueChange={(v) => {
                                const updated = [...formData.risk_factors];
                                updated[idx].impact = v;
                                setFormData({ ...formData, risk_factors: updated });
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Control Measures</Label>
                          <Textarea
                            value={risk.control_measures}
                            onChange={(e) => {
                              const updated = [...formData.risk_factors];
                              updated[idx].control_measures = e.target.value;
                              setFormData({ ...formData, risk_factors: updated });
                            }}
                            placeholder="How is this risk being managed?"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Emergency Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hospital Preference</Label>
                    <Input
                      value={formData.emergency_info.hospital_preference}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_info: { ...formData.emergency_info, hospital_preference: e.target.value }
                      })}
                      placeholder="Preferred hospital"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox
                      checked={formData.emergency_info.dnacpr_in_place}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        emergency_info: { ...formData.emergency_info, dnacpr_in_place: checked }
                      })}
                    />
                    <Label>DNACPR in place</Label>
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Emergency Protocol</Label>
                  <Textarea
                    value={formData.emergency_info.emergency_protocol}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_info: { ...formData.emergency_info, emergency_protocol: e.target.value }
                    })}
                    placeholder="What to do in an emergency..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? "Update Care Plan" : "Create Care Plan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}