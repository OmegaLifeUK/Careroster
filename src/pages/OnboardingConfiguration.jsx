import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Users,
  UserCircle,
  Save,
  Copy
} from "lucide-react";

export default function OnboardingConfiguration() {
  const [selectedCareSetting, setSelectedCareSetting] = useState("all");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workflows = [] } = useQuery({
    queryKey: ['onboarding-workflows'],
    queryFn: async () => {
      const records = await base44.entities.OnboardingWorkflowConfig.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingWorkflowConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-workflows']);
      toast.success("Workflow created successfully");
    }
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingWorkflowConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-workflows']);
      toast.success("Workflow updated successfully");
    }
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingWorkflowConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-workflows']);
      setSelectedWorkflow(null);
      toast.success("Workflow deleted");
    }
  });

  const createDefaultStaffWorkflow = () => {
    const defaultWorkflow = {
      workflow_type: "staff",
      care_setting: "all",
      workflow_name: "Standard Staff Onboarding",
      is_active: true,
      auto_activate_on_completion: true,
      stages: [
        {
          stage_id: "pre_employment",
          stage_name: "Pre-Employment Checks",
          stage_description: "ID verification, right to work, application form",
          is_required: true,
          order: 1,
          completion_criteria: {
            entity_type: "PreEmploymentCompliance",
            status_field: "status",
            required_status: ["verified"]
          },
          auto_create_task: true
        },
        {
          stage_id: "dbs_references",
          stage_name: "DBS & References",
          stage_description: "DBS check and employment references",
          is_required: true,
          order: 2,
          completion_criteria: {
            entity_type: "DBSAndReferences",
            status_field: "dbs_status",
            required_status: ["clear"]
          },
          auto_create_task: true
        },
        {
          stage_id: "training",
          stage_name: "Mandatory Training",
          stage_description: "Complete all mandatory training modules",
          is_required: true,
          order: 3,
          completion_criteria: {
            entity_type: "TrainingAssignment",
            custom_check: "all_mandatory_complete"
          },
          auto_create_task: false
        },
        {
          stage_id: "induction",
          stage_name: "Induction",
          stage_description: "Shadow shifts and competency assessment",
          is_required: true,
          order: 4,
          completion_criteria: {
            entity_type: "InductionRecord",
            status_field: "status",
            required_status: ["completed"]
          },
          auto_create_task: true
        },
        {
          stage_id: "probation",
          stage_name: "Probation Review",
          stage_description: "Complete probation period successfully",
          is_required: false,
          order: 5,
          completion_criteria: {
            entity_type: "InductionRecord",
            status_field: "probation_outcome",
            required_status: ["passed"]
          },
          auto_create_task: true
        }
      ],
      notification_settings: {
        notify_on_start: true,
        notify_on_stage_complete: true,
        notify_on_completion: true,
        notify_roles: ["admin", "manager"]
      }
    };
    createWorkflowMutation.mutate(defaultWorkflow);
  };

  const createDefaultClientWorkflow = () => {
    const careSettingName = selectedCareSetting === 'all' ? 'All Settings' : 
      selectedCareSetting.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    const defaultWorkflow = {
      workflow_type: "client",
      care_setting: selectedCareSetting,
      workflow_name: `${careSettingName} Client Onboarding`,
      is_active: true,
      auto_activate_on_completion: true,
      stages: [
        {
          stage_id: "consent",
          stage_name: "Consent & Mental Capacity",
          stage_description: "Obtain consent and assess mental capacity",
          is_required: true,
          order: 1,
          completion_criteria: {
            entity_type: "ConsentAndCapacity",
            status_field: "status",
            required_status: ["obtained"]
          },
          auto_create_task: true
        },
        {
          stage_id: "assessment",
          stage_name: "Care Assessment",
          stage_description: "Complete comprehensive care needs assessment",
          is_required: true,
          order: 2,
          completion_criteria: {
            entity_type: "CareAssessment",
            status_field: "status",
            required_status: ["completed", "approved"]
          },
          auto_create_task: true
        },
        {
          stage_id: "care_plan",
          stage_name: "Care Plan",
          stage_description: "Create and approve care plan",
          is_required: true,
          order: 3,
          completion_criteria: {
            entity_type: "CarePlan",
            status_field: "status",
            required_status: ["active"]
          },
          auto_create_task: false
        },
        {
          stage_id: "risk_assessment",
          stage_name: "Risk Assessment",
          stage_description: "Complete environmental and care risk assessments",
          is_required: false,
          order: 4,
          completion_criteria: {
            entity_type: "RiskAssessment",
            status_field: "status",
            required_status: ["completed"]
          },
          auto_create_task: true
        }
      ],
      notification_settings: {
        notify_on_start: true,
        notify_on_stage_complete: false,
        notify_on_completion: true,
        notify_roles: ["admin", "care_coordinator"]
      }
    };
    createWorkflowMutation.mutate(defaultWorkflow);
  };

  const handleAddStage = () => {
    setEditingStage({
      stage_id: `stage_${Date.now()}`,
      stage_name: "",
      stage_description: "",
      is_required: true,
      order: (selectedWorkflow?.stages?.length || 0) + 1,
      completion_criteria: {
        entity_type: "",
        status_field: "",
        required_status: []
      },
      auto_create_task: false
    });
    setShowStageDialog(true);
  };

  const handleSaveStage = () => {
    const stages = [...(selectedWorkflow.stages || [])];
    const existingIndex = stages.findIndex(s => s.stage_id === editingStage.stage_id);
    
    if (existingIndex >= 0) {
      stages[existingIndex] = editingStage;
    } else {
      stages.push(editingStage);
    }

    updateWorkflowMutation.mutate({
      id: selectedWorkflow.id,
      data: { ...selectedWorkflow, stages }
    });
    
    setShowStageDialog(false);
    setEditingStage(null);
  };

  const handleDeleteStage = (stageId) => {
    const stages = selectedWorkflow.stages.filter(s => s.stage_id !== stageId);
    updateWorkflowMutation.mutate({
      id: selectedWorkflow.id,
      data: { ...selectedWorkflow, stages }
    });
  };

  const handleMoveStage = (index, direction) => {
    const stages = [...selectedWorkflow.stages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= stages.length) return;
    
    [stages[index], stages[newIndex]] = [stages[newIndex], stages[index]];
    stages.forEach((s, i) => s.order = i + 1);
    
    updateWorkflowMutation.mutate({
      id: selectedWorkflow.id,
      data: { ...selectedWorkflow, stages }
    });
  };

  const staffWorkflows = workflows.filter(w => w.workflow_type === 'staff');
  const clientWorkflows = workflows.filter(w => w.workflow_type === 'client');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Onboarding Configuration</h1>
        <p className="text-gray-600">Configure onboarding workflows for your organisation</p>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-2" />
            Staff Workflows
          </TabsTrigger>
          <TabsTrigger value="clients">
            <UserCircle className="w-4 h-4 mr-2" />
            Client Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{staffWorkflows.length} workflow(s) configured</p>
            <Button onClick={createDefaultStaffWorkflow}>
              <Plus className="w-4 h-4 mr-2" />
              Create Default Staff Workflow
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              {staffWorkflows.map(workflow => (
                <Card
                  key={workflow.id}
                  className={`cursor-pointer transition-all ${
                    selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{workflow.workflow_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {workflow.stages?.length || 0} stages
                        </p>
                      </div>
                      <Badge className={workflow.is_active ? 'bg-green-600' : 'bg-gray-400'}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="md:col-span-2">
              {selectedWorkflow ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedWorkflow.workflow_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateWorkflowMutation.mutate({
                              id: selectedWorkflow.id,
                              data: { ...selectedWorkflow, is_active: !selectedWorkflow.is_active }
                            });
                          }}
                        >
                          {selectedWorkflow.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteWorkflowMutation.mutate(selectedWorkflow.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Workflow Stages</h3>
                      <Button size="sm" onClick={handleAddStage}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {selectedWorkflow.stages?.sort((a, b) => a.order - b.order).map((stage, index) => (
                        <Card key={stage.stage_id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{stage.order}. {stage.stage_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {stage.is_required ? 'Required' : 'Optional'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{stage.stage_description}</p>
                                <div className="text-xs text-gray-500 mt-2">
                                  Entity: {stage.completion_criteria?.entity_type || 'N/A'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveStage(index, 'up')}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveStage(index, 'down')}
                                  disabled={index === selectedWorkflow.stages.length - 1}
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setShowStageDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteStage(stage.stage_id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Auto-activate on completion</Label>
                        <Switch
                          checked={selectedWorkflow.auto_activate_on_completion}
                          onCheckedChange={(checked) => {
                            updateWorkflowMutation.mutate({
                              id: selectedWorkflow.id,
                              data: { ...selectedWorkflow, auto_activate_on_completion: checked }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Select a workflow to configure</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Care Setting</Label>
              <Select
                value={selectedCareSetting}
                onValueChange={setSelectedCareSetting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Care Settings</SelectItem>
                  <SelectItem value="residential">Residential Care</SelectItem>
                  <SelectItem value="domiciliary">Domiciliary Care</SelectItem>
                  <SelectItem value="supported_living">Supported Living</SelectItem>
                  <SelectItem value="day_centre">Day Centre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {clientWorkflows.filter(w => w.care_setting === selectedCareSetting).length} workflow(s) for {selectedCareSetting === 'all' ? 'all settings' : selectedCareSetting.replace('_', ' ')}
              </p>
              <Button onClick={createDefaultClientWorkflow}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              {clientWorkflows.filter(w => w.care_setting === selectedCareSetting).map(workflow => (
                <Card
                  key={workflow.id}
                  className={`cursor-pointer transition-all ${
                    selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{workflow.workflow_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {workflow.stages?.length || 0} stages
                        </p>
                      </div>
                      <Badge className={workflow.is_active ? 'bg-green-600' : 'bg-gray-400'}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="md:col-span-2">
              {selectedWorkflow ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedWorkflow.workflow_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateWorkflowMutation.mutate({
                              id: selectedWorkflow.id,
                              data: { ...selectedWorkflow, is_active: !selectedWorkflow.is_active }
                            });
                          }}
                        >
                          {selectedWorkflow.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteWorkflowMutation.mutate(selectedWorkflow.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Workflow Stages</h3>
                      <Button size="sm" onClick={handleAddStage}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {selectedWorkflow.stages?.sort((a, b) => a.order - b.order).map((stage, index) => (
                        <Card key={stage.stage_id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{stage.order}. {stage.stage_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {stage.is_required ? 'Required' : 'Optional'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{stage.stage_description}</p>
                                <div className="text-xs text-gray-500 mt-2">
                                  Entity: {stage.completion_criteria?.entity_type || 'N/A'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveStage(index, 'up')}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveStage(index, 'down')}
                                  disabled={index === selectedWorkflow.stages.length - 1}
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setShowStageDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteStage(stage.stage_id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Auto-activate on completion</Label>
                        <Switch
                          checked={selectedWorkflow.auto_activate_on_completion}
                          onCheckedChange={(checked) => {
                            updateWorkflowMutation.mutate({
                              id: selectedWorkflow.id,
                              data: { ...selectedWorkflow, auto_activate_on_completion: checked }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Select a workflow to configure</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showStageDialog && editingStage && (
        <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingStage.stage_name ? 'Edit Stage' : 'Add New Stage'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Stage Name</Label>
                <Input
                  value={editingStage.stage_name}
                  onChange={(e) => setEditingStage({ ...editingStage, stage_name: e.target.value })}
                  placeholder="e.g., Pre-Employment Checks"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingStage.stage_description}
                  onChange={(e) => setEditingStage({ ...editingStage, stage_description: e.target.value })}
                  placeholder="Describe what needs to be completed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select
                    value={editingStage.completion_criteria?.entity_type || ''}
                    onValueChange={(value) => setEditingStage({
                      ...editingStage,
                      completion_criteria: { ...editingStage.completion_criteria, entity_type: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PreEmploymentCompliance">Pre-Employment</SelectItem>
                      <SelectItem value="DBSAndReferences">DBS & References</SelectItem>
                      <SelectItem value="InductionRecord">Induction</SelectItem>
                      <SelectItem value="TrainingAssignment">Training</SelectItem>
                      <SelectItem value="ConsentAndCapacity">Consent</SelectItem>
                      <SelectItem value="CareAssessment">Assessment</SelectItem>
                      <SelectItem value="CarePlan">Care Plan</SelectItem>
                      <SelectItem value="RiskAssessment">Risk Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status Field</Label>
                  <Input
                    value={editingStage.completion_criteria?.status_field || ''}
                    onChange={(e) => setEditingStage({
                      ...editingStage,
                      completion_criteria: { ...editingStage.completion_criteria, status_field: e.target.value }
                    })}
                    placeholder="e.g., status"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Required Stage</Label>
                <Switch
                  checked={editingStage.is_required}
                  onCheckedChange={(checked) => setEditingStage({ ...editingStage, is_required: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto-create Task</Label>
                <Switch
                  checked={editingStage.auto_create_task}
                  onCheckedChange={(checked) => setEditingStage({ ...editingStage, auto_create_task: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStage}>
                <Save className="w-4 h-4 mr-2" />
                Save Stage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}