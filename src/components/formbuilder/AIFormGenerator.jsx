import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Sparkles, FileText, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIFormGenerator({ onFormGenerated, onClose }) {
  const [file, setFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Invalid File", "Please upload a Word document, PDF, or image file");
      return;
    }

    setFile(selectedFile);

    // Upload file first
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setUploadedUrl(file_url);
    } catch (error) {
      toast.error("Upload Failed", "Could not upload file");
      setFile(null);
    }
  };

  const generateForm = async () => {
    if (!uploadedUrl) return;

    setIsGenerating(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this document and extract the form structure. The document appears to be a care/health-related form.

Create a form template with sections and fields. For each field, determine the best field type from:
- text (short text input)
- textarea (long text)
- number (numeric input)
- date (date picker)
- time (time picker)
- select (dropdown - provide options)
- multiselect (multiple selection - provide options)
- checkbox (yes/no)
- radio (single choice - provide options)
- signature (digital signature)
- rating (1-5 stars)
- email (email address)
- phone (phone number)
- table (tabular data - define columns with name and type)

For tables, identify repeating row structures and define columns.

IMPORTANT: You MUST return a valid form structure with at least one section containing at least one field.`,
        file_urls: [uploadedUrl],
        response_json_schema: {
          type: "object",
          properties: {
            form_name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_title: { type: "string" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_label: { type: "string" },
                        field_type: { type: "string" },
                        required: { type: "boolean" },
                        placeholder: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        table_columns: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              type: { type: "string" },
                              options: { type: "array", items: { type: "string" } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ["form_name", "sections"]
        }
      });

      console.log("AI Result:", result);

      // Validate the result
      if (!result || !result.sections || !Array.isArray(result.sections) || result.sections.length === 0) {
        toast.error("Generation Failed", "AI could not extract form structure from this document. Try a clearer document or image.");
        setIsGenerating(false);
        return;
      }

      // Transform to proper form template structure with safe defaults
      const formTemplate = {
        form_name: result.form_name || "Imported Form",
        description: result.description || "",
        category: result.category || "other",
        sections: result.sections.map((section, sIdx) => ({
          section_id: `section_${Date.now()}_${sIdx}`,
          section_title: section?.section_title || `Section ${sIdx + 1}`,
          section_order: sIdx,
          fields: Array.isArray(section?.fields) ? section.fields.map((field, fIdx) => ({
            field_id: `field_${Date.now()}_${sIdx}_${fIdx}`,
            field_label: field?.field_label || `Field ${fIdx + 1}`,
            field_type: field?.field_type || "text",
            field_order: fIdx,
            required: field?.required || false,
            placeholder: field?.placeholder || "",
            options: Array.isArray(field?.options) ? field.options : [],
            table_columns: Array.isArray(field?.table_columns) ? field.table_columns : [],
            validation: {},
            conditional_logic: {}
          })) : []
        })),
        workflow_triggers: [],
        auto_routing: { enabled: false, routes: [] },
        is_active: true,
        requires_approval: false,
        version: 1
      };

      // Ensure at least one section has fields
      if (formTemplate.sections.every(s => s.fields.length === 0)) {
        toast.error("Generation Failed", "AI could not identify any form fields in this document. Try a different document.");
        setIsGenerating(false);
        return;
      }

      toast.success("Form Generated", "AI has created a form template from your document");
      onFormGenerated(formTemplate);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Generation Failed", error.message || "Could not generate form from document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Form Generator
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <p className="text-gray-600">
            Upload a Word document, PDF, or image of a paper form. Our AI will analyze it and create a digital form template automatically.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {file ? (
              <div className="space-y-2">
                <FileText className="w-12 h-12 mx-auto text-blue-600" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setUploadedUrl(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="font-medium mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">
                  Word (.doc, .docx), PDF, or Image (PNG, JPG)
                </p>
                <Input
                  type="file"
                  accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <Button
            onClick={generateForm}
            disabled={!uploadedUrl || isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Form
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            AI will extract form fields, sections, and suggest appropriate field types including tables
          </p>
        </CardContent>
      </Card>
    </div>
  );
}