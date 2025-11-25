import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save,
  Settings,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

import TableFieldEditor from "./TableFieldEditor";
import WorkflowActionEditor from "./WorkflowActionEditor";

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & Time" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio Buttons" },
  { value: "file", label: "File Upload" },
  { value: "signature", label: "Signature" },
  { value: "rating", label: "Rating" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "table", label: "Table" }
];

export default function FormTemplateEditor({ template, onClose }) {
  const [formData, setFormData] = useState(template || {
    form_name: "",
    description: "",
    category: "other",
    sections: [{
      section_id: `section_${Date.now()}`,
      section_title: "Section 1",
      section_order: 0,
      fields: []
    }],
    workflow_triggers: [],
    auto_routing: { enabled: false, routes: [] },
    is_active: true,
    requires_approval: false,
    version: 1
  });

  const [activeSection, setActiveSection] = useState(0);
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [showRouting, setShowRouting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.StaffRole.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template?.id) {
        return base44.entities.FormTemplate.update(template.id, data);
      }
      return base44.entities.FormTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success("Form Saved", "Form template saved successfully");
      onClose();
    },
  });

  const addSection = () => {
    const newSection = {
      section_id: `section_${Date.now()}`,
      section_title: `Section ${formData.sections.length + 1}`,
      section_order: formData.sections.length,
      fields: []
    };
    setFormData({
      ...formData,
      sections: [...formData.sections, newSection]
    });
    setActiveSection(formData.sections.length);
  };

  const deleteSection = (index) => {
    const newSections = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: newSections });
    if (activeSection >= newSections.length) {
      setActiveSection(Math.max(0, newSections.length - 1));
    }
  };

  const updateSection = (index, field, value) => {
    const newSections = [...formData.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setFormData({ ...formData, sections: newSections });
  };

  const addField = (fieldType = "text") => {
    const newField = {
      field_id: `field_${Date.now()}`,
      field_label: fieldType === "table" ? "New Table" : "New Field",
      field_type: fieldType,
      field_order: formData.sections[activeSection].fields.length,
      required: false,
      placeholder: "",
      options: [],
      table_columns: fieldType === "table" ? [{ name: "Column 1", type: "text", options: [] }] : [],
      validation: {},
      conditional_logic: {}
    };
    
    const newSections = [...formData.sections];
    newSections[activeSection].fields.push(newField);
    setFormData({ ...formData, sections: newSections });
  };

  const updateField = (fieldIndex, field, value) => {
    const newSections = [...formData.sections];
    newSections[activeSection].fields[fieldIndex] = {
      ...newSections[activeSection].fields[fieldIndex],
      [field]: value
    };
    setFormData({ ...formData, sections: newSections });
  };

  const deleteField = (fieldIndex) => {
    const newSections = [...formData.sections];
    newSections[activeSection].fields = newSections[activeSection].fields.filter((_, i) => i !== fieldIndex);
    setFormData({ ...formData, sections: newSections });
  };

  const addWorkflowTrigger = () => {
    const newTrigger = {
      trigger_name: "New Workflow",
      condition_field: "",
      condition_operator: "equals",
      condition_value: "",
      actions: []
    };
    setFormData({
      ...formData,
      workflow_triggers: [...(formData.workflow_triggers || []), newTrigger]
    });
  };

  const updateWorkflowTrigger = (index, field, value) => {
    const newTriggers = [...(formData.workflow_triggers || [])];
    newTriggers[index] = { ...newTriggers[index], [field]: value };
    setFormData({ ...formData, workflow_triggers: newTriggers });
  };

  const deleteWorkflowTrigger = (index) => {
    setFormData({
      ...formData,
      workflow_triggers: formData.workflow_triggers.filter((_, i) => i !== index)
    });
  };

  const addWorkflowAction = (triggerIndex) => {
    const newTriggers = [...formData.workflow_triggers];
    newTriggers[triggerIndex].actions.push({
      action_type: "create_task",
      action_config: {}
    });
    setFormData({ ...formData, workflow_triggers: newTriggers });
  };

  const updateWorkflowAction = (triggerIndex, actionIndex, updatedAction) => {
    const newTriggers = [...formData.workflow_triggers];
    newTriggers[triggerIndex].actions[actionIndex] = updatedAction;
    setFormData({ ...formData, workflow_triggers: newTriggers });
  };

  const deleteWorkflowAction = (triggerIndex, actionIndex) => {
    const newTriggers = [...formData.workflow_triggers];
    newTriggers[triggerIndex].actions = newTriggers[triggerIndex].actions.filter((_, i) => i !== actionIndex);
    setFormData({ ...formData, workflow_triggers: newTriggers });
  };

  // Get all fields for workflow condition selection
  const allFields = formData.sections.flatMap(s => s.fields);

  // Get field options for condition value when field is selected
  const getFieldOptions = (fieldId) => {
    const field = allFields.find(f => f.field_id === fieldId);
    if (!field) return null;
    if (field.field_type === 'checkbox') return ['true', 'false'];
    if (field.options?.length > 0) return field.options;
    return null;
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {template ? 'Edit Form Template' : 'Create Form Template'}
            </h1>
            <p className="text-gray-500">Design your form and configure workflows</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.form_name || formData.sections.length === 0}
              className="bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Form Settings */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Form Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Form Name *</label>
                  <Input
                    value={formData.form_name}
                    onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                    placeholder="e.g., Daily Care Assessment"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="care_plan">Care Plan</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="consent">Consent</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="daily_log">Daily Log</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label className="text-sm font-medium">Requires Approval</label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Workflows
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowWorkflows(!showWorkflows)}
                  >
                    {showWorkflows ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showWorkflows && (
                <CardContent className="space-y-3">
                  <Button size="sm" onClick={addWorkflowTrigger} className="w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Workflow
                  </Button>
                  <p className="text-xs text-gray-500">
                    Configure workflows to automatically create tasks, send notifications, or route forms based on responses
                  </p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Panel - Form Builder */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sections Tabs */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {formData.sections.map((section, idx) => (
                    <Button
                      key={section.section_id}
                      variant={activeSection === idx ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveSection(idx)}
                      className="flex-shrink-0"
                    >
                      {section.section_title}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={addSection}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Section */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <Input
                    value={formData.sections[activeSection]?.section_title || ""}
                    onChange={(e) => updateSection(activeSection, 'section_title', e.target.value)}
                    className="text-lg font-semibold border-none shadow-none p-0 h-auto"
                    placeholder="Section Title"
                  />
                  {formData.sections.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this section?')) {
                          deleteSection(activeSection);
                        }
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {formData.sections[activeSection]?.fields.map((field, fieldIdx) => (
                  <Card key={field.field_id} className="border-2">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <GripVertical className="w-5 h-5 text-gray-400 mt-2 flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              value={field.field_label}
                              onChange={(e) => updateField(fieldIdx, 'field_label', e.target.value)}
                              placeholder="Field Label"
                            />
                            <Select 
                              value={field.field_type} 
                              onValueChange={(val) => updateField(fieldIdx, 'field_type', val)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(fieldIdx, 'placeholder', e.target.value)}
                            placeholder="Placeholder text..."
                          />

                          {(field.field_type === 'select' || field.field_type === 'multiselect' || field.field_type === 'radio') && (
                            <Textarea
                              value={field.options?.join('\n') || ""}
                              onChange={(e) => updateField(fieldIdx, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                              placeholder="Enter options (one per line)"
                              rows={3}
                            />
                          )}

                          {field.field_type === 'table' && (
                            <TableFieldEditor
                              columns={field.table_columns || []}
                              onChange={(cols) => updateField(fieldIdx, 'table_columns', cols)}
                            />
                          )}

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(fieldIdx, 'required', e.target.checked)}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-sm">Required</span>
                            </label>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteField(fieldIdx)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2">
                  <Button onClick={() => addField("text")} variant="outline" className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                  <Button onClick={() => addField("table")} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Table
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Configuration */}
            {showWorkflows && formData.workflow_triggers?.length > 0 && (
              <Card className="border-purple-200">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Workflow Triggers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {formData.workflow_triggers.map((trigger, idx) => (
                    <Card key={idx} className="border-2 border-purple-100">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <Input
                            value={trigger.trigger_name}
                            onChange={(e) => updateWorkflowTrigger(idx, 'trigger_name', e.target.value)}
                            placeholder="Workflow Name (e.g., 'Escalate High Priority')"
                            className="flex-1 font-medium"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteWorkflowTrigger(idx)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 mb-2">WHEN</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Select
                              value={trigger.condition_field}
                              onValueChange={(val) => updateWorkflowTrigger(idx, 'condition_field', val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allFields.map(f => (
                                  <SelectItem key={f.field_id} value={f.field_id}>
                                    {f.field_label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={trigger.condition_operator}
                              onValueChange={(val) => updateWorkflowTrigger(idx, 'condition_operator', val)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="is_checked">Is Checked</SelectItem>
                                <SelectItem value="is_not_checked">Is Not Checked</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="is_empty">Is Empty</SelectItem>
                                <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                              </SelectContent>
                            </Select>

                            {!['is_checked', 'is_not_checked', 'is_empty', 'is_not_empty'].includes(trigger.condition_operator) && (
                              getFieldOptions(trigger.condition_field) ? (
                                <Select
                                  value={trigger.condition_value}
                                  onValueChange={(val) => updateWorkflowTrigger(idx, 'condition_value', val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select value..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getFieldOptions(trigger.condition_field).map((opt, i) => (
                                      <SelectItem key={i} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={trigger.condition_value}
                                  onChange={(e) => updateWorkflowTrigger(idx, 'condition_value', e.target.value)}
                                  placeholder="Value"
                                />
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">THEN DO</p>
                          <div className="space-y-2">
                            {trigger.actions?.map((action, actionIdx) => (
                              <WorkflowActionEditor
                                key={actionIdx}
                                action={action}
                                onChange={(updated) => updateWorkflowAction(idx, actionIdx, updated)}
                                onDelete={() => deleteWorkflowAction(idx, actionIdx)}
                                staff={staff}
                                roles={roles}
                              />
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addWorkflowAction(idx)}
                            className="w-full mt-2"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Action
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}