import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Edit, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import AIAuditTemplateGenerator from "@/components/audit/AIAuditTemplateGenerator";

export default function AuditTemplates() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [] } = useQuery({
    queryKey: ['audit-templates'],
    queryFn: async () => {
      const data = await base44.entities.AuditTemplate.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingTemplate) {
        return base44.entities.AuditTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.AuditTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
      setShowDialog(false);
      setEditingTemplate(null);
      toast.success("Success", "Template saved successfully");
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Save Failed", error.message || "Failed to save template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AuditTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
      toast.success("Success", "Template deleted successfully");
    },
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Templates</h1>
            <p className="text-gray-500">Create and manage audit templates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAIGenerator(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Import with AI
            </Button>
            <Button onClick={() => { setEditingTemplate(null); setShowDialog(true); }} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="flex gap-2">
                    <Badge>{template.audit_type}</Badge>
                    {template.language === "welsh" && (
                      <Badge className="bg-red-100 text-red-800">Cymraeg</Badge>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{template.template_name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                <Badge variant="outline" className="mb-4">{template.category}</Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(template); setShowDialog(true); }} className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (confirm("Delete this template?")) deleteMutation.mutate(template.id);
                  }} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showDialog && (
          <TemplateDialog
            template={editingTemplate}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setShowDialog(false); setEditingTemplate(null); }}
            isSaving={saveMutation.isPending}
          />
        )}

        {showAIGenerator && (
          <AIAuditTemplateGenerator
            onTemplateGenerated={(template) => {
              setShowAIGenerator(false);
              setEditingTemplate(template);
              setShowDialog(true);
            }}
            onClose={() => setShowAIGenerator(false)}
          />
        )}
      </div>
    </div>
  );
}

function TemplateDialog({ template, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState(template || {
    template_name: "",
    description: "",
    audit_type: "monthly",
    category: "hygiene",
    language: "english",
    is_active: true,
    sections: []
  });

  const [newSection, setNewSection] = useState({ section_name: "", checklist_items: [] });
  const [newItem, setNewItem] = useState({ item: "", response_type: "yes_no", is_critical: false, guidance: "" });

  const addSection = () => {
    if (newSection.section_name) {
      setFormData({ ...formData, sections: [...formData.sections, { ...newSection }] });
      setNewSection({ section_name: "", checklist_items: [] });
    }
  };

  const addItemToLastSection = () => {
    if (newItem.item && formData.sections.length > 0) {
      const sections = [...formData.sections];
      sections[sections.length - 1].checklist_items.push({ ...newItem });
      setFormData({ ...formData, sections });
      setNewItem({ item: "", response_type: "yes_no", is_critical: false, guidance: "" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <CardTitle>{template ? 'Edit Template' : 'Create Audit Template'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Template Name *</label>
                <Input value={formData.template_name} onChange={(e) => setFormData({ ...formData, template_name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Audit Type</label>
                <Select value={formData.audit_type} onValueChange={(val) => setFormData({ ...formData, audit_type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["daily", "weekly", "monthly", "quarterly", "annual", "adhoc"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["medication", "hygiene", "safety", "care_plans", "documentation", "infection_control", "food_safety", "health_and_safety", "safeguarding", "dignity", "clinical", "finance", "staffing", "other"].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Language</label>
                <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="welsh">Welsh / Cymraeg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Sections & Checklist Items</h3>
              
              <div className="space-y-2 mb-4">
                <Input placeholder="Section name" value={newSection.section_name} onChange={(e) => setNewSection({ ...newSection, section_name: e.target.value })} />
                <Button onClick={addSection} size="sm">Add Section</Button>
              </div>

              {formData.sections.length > 0 && (
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium">Add item to "{formData.sections[formData.sections.length - 1].section_name}"</p>
                  <Input placeholder="Checklist item" value={newItem.item} onChange={(e) => setNewItem({ ...newItem, item: e.target.value })} />
                  <div className="flex gap-2">
                    <Select value={newItem.response_type} onValueChange={(val) => setNewItem({ ...newItem, response_type: val })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes_no">Yes/No</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="numeric">Numeric</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addItemToLastSection} size="sm">Add Item</Button>
                  </div>
                </div>
              )}

              {formData.sections.map((section, idx) => (
                <div key={idx} className="p-3 border rounded mb-2">
                  <h4 className="font-medium mb-2">{section.section_name}</h4>
                  <ul className="text-sm space-y-1">
                    {section.checklist_items.map((item, iidx) => (
                      <li key={iidx}>• {item.item} ({item.response_type})</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={() => onSave(formData)} disabled={isSaving || !formData.template_name}>
                {isSaving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}