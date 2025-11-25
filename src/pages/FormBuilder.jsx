import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  Settings,
  Sparkles,
  Upload
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import FormTemplateEditor from "../components/formbuilder/FormTemplateEditor";
import FormPreview from "../components/formbuilder/FormPreview";
import AIFormGenerator from "../components/formbuilder/AIFormGenerator";

export default function FormBuilder() {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const data = await base44.entities.FormTemplate.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['form-submissions'],
    queryFn: async () => {
      const data = await base44.entities.FormSubmission.list('-submitted_date', 100);
      return Array.isArray(data) ? data : [];
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.FormTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success("Template Deleted", "Form template removed successfully");
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = {
        ...template,
        form_name: `${template.form_name} (Copy)`,
        version: 1
      };
      delete newTemplate.id;
      delete newTemplate.created_date;
      delete newTemplate.updated_date;
      delete newTemplate.created_by;
      return base44.entities.FormTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success("Template Duplicated", "Form template copied successfully");
    },
  });

  const filteredTemplates = templates.filter(t => 
    filterCategory === "all" || t.category === filterCategory
  );

  const getSubmissionCount = (templateId) => {
    return submissions.filter(s => s.form_template_id === templateId).length;
  };

  const categoryColors = {
    care_plan: "bg-blue-100 text-blue-800",
    assessment: "bg-green-100 text-green-800",
    incident: "bg-red-100 text-red-800",
    consent: "bg-purple-100 text-purple-800",
    medication: "bg-orange-100 text-orange-800",
    daily_log: "bg-yellow-100 text-yellow-800",
    audit: "bg-indigo-100 text-indigo-800",
    training: "bg-pink-100 text-pink-800",
    other: "bg-gray-100 text-gray-800"
  };

  if (showEditor) {
    return (
      <FormTemplateEditor
        template={editingTemplate}
        onClose={() => {
          setShowEditor(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  if (previewTemplate) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setPreviewTemplate(null)}
            className="mb-6"
          >
            ← Back to Templates
          </Button>
          <FormPreview template={previewTemplate} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Form Builder
            </h1>
            <p className="text-gray-500">Create dynamic forms to digitize paper documents and automate workflows</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAIGenerator(true)}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import from Document
            </Button>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setShowEditor(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Templates</p>
              <p className="text-2xl font-bold">{templates.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active Forms</p>
              <p className="text-2xl font-bold text-green-600">
                {templates.filter(t => t.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
              <p className="text-2xl font-bold text-blue-600">
                {submissions.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">With Workflows</p>
              <p className="text-2xl font-bold text-purple-600">
                {templates.filter(t => t.workflow_triggers?.length > 0).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("all")}
              >
                All
              </Button>
              {Object.keys(categoryColors).map(cat => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterCategory(cat)}
                  className="capitalize"
                >
                  {cat.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-all">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{template.form_name}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={categoryColors[template.category]}>
                        {template.category.replace(/_/g, ' ')}
                      </Badge>
                      {!template.is_active && (
                        <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                      )}
                      {template.workflow_triggers?.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {template.workflow_triggers.length} workflows
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {template.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sections:</span>
                    <span className="font-medium">{template.sections?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Fields:</span>
                    <span className="font-medium">
                      {template.sections?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Submissions:</span>
                    <span className="font-medium text-blue-600">
                      {getSubmissionCount(template.id)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowEditor(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateTemplateMutation.mutate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Delete this form template?')) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">No Form Templates</h3>
              <p className="text-gray-600 mb-4">
                Create your first form template to digitize paper documents
              </p>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowEditor(true);
                }}
                className="bg-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            </CardContent>
          </Card>
        )}

        {showAIGenerator && (
          <AIFormGenerator
            onFormGenerated={(template) => {
              setEditingTemplate(template);
              setShowEditor(true);
              setShowAIGenerator(false);
            }}
            onClose={() => setShowAIGenerator(false)}
          />
        )}
      </div>
    </div>
  );
}