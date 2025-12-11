import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Save, Trash2, FileText, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function VisitTemplateManager({ onSelectTemplate, onClose }) {
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('visit_templates');
    return saved ? JSON.parse(saved) : [
      {
        id: "morning-care",
        name: "Morning Care Routine",
        visit_type: "regular",
        duration_minutes: 45,
        tasks: ["Personal hygiene assistance", "Medication administration", "Breakfast preparation", "Mobility support"],
        notes: "Standard morning care visit"
      },
      {
        id: "medication-only",
        name: "Medication Support",
        visit_type: "regular",
        duration_minutes: 15,
        tasks: ["Medication administration", "Medication check"],
        notes: "Quick medication visit"
      },
      {
        id: "evening-care",
        name: "Evening Care Routine",
        visit_type: "regular",
        duration_minutes: 60,
        tasks: ["Personal hygiene assistance", "Evening meal preparation", "Medication administration", "Settling for night"],
        notes: "Standard evening care visit"
      }
    ];
  });

  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    visit_type: "regular",
    duration_minutes: 30,
    tasks: [],
    notes: ""
  });

  const [taskInput, setTaskInput] = useState("");

  const saveTemplates = (newTemplates) => {
    localStorage.setItem('visit_templates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
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

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Validation Error", "Template name is required");
      return;
    }

    const template = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      ...formData
    };

    let newTemplates;
    if (editingTemplate) {
      newTemplates = templates.map(t => t.id === template.id ? template : t);
      toast.success("Updated", "Template updated successfully");
    } else {
      newTemplates = [...templates, template];
      toast.success("Saved", "Template saved successfully");
    }

    saveTemplates(newTemplates);
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({ name: "", visit_type: "regular", duration_minutes: 30, tasks: [], notes: "" });
  };

  const handleDelete = (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      const newTemplates = templates.filter(t => t.id !== templateId);
      saveTemplates(newTemplates);
      toast.success("Deleted", "Template deleted successfully");
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      visit_type: template.visit_type,
      duration_minutes: template.duration_minutes,
      tasks: [...template.tasks],
      notes: template.notes
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({ name: "", visit_type: "regular", duration_minutes: 30, tasks: [], notes: "" });
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Visit Templates
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!showForm ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Create and manage reusable visit templates</p>
                <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{template.visit_type}</Badge>
                            <Badge className="bg-purple-100 text-purple-700">{template.duration_minutes} mins</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(template)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.tasks.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Tasks:</p>
                          <div className="space-y-1">
                            {template.tasks.slice(0, 3).map((task, idx) => (
                              <p key={idx} className="text-xs text-gray-700">• {task}</p>
                            ))}
                            {template.tasks.length > 3 && (
                              <p className="text-xs text-gray-500">+{template.tasks.length - 3} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      {template.notes && (
                        <p className="text-xs text-gray-600 mb-3">{template.notes}</p>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onSelectTemplate(template)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-2 block">Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Care Routine"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="review">Review Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration_minutes" className="mb-2 block">Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min="15"
                    step="15"
                  />
                </div>
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

              <div>
                <Label htmlFor="notes" className="mb-2 block">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Template description or instructions..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}