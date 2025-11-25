import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Sparkles, FileText, X, Lightbulb } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIAuditTemplateGenerator({ onTemplateGenerated, onClose }) {
  const [file, setFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [context, setContext] = useState({
    auditType: "monthly",
    category: "hygiene",
    additionalInstructions: ""
  });
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Invalid File", "Please upload a PDF or image file");
      return;
    }

    setFile(selectedFile);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setUploadedUrl(file_url);
      toast.success("File Uploaded", "Ready for AI analysis");
    } catch (error) {
      toast.error("Upload Failed", error.message);
      setFile(null);
    }
  };

  const generateTemplate = async () => {
    if (!uploadedUrl) return;

    setIsGenerating(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this audit checklist document and extract the structure to create an audit template.

Context:
- Audit Type: ${context.auditType}
- Category: ${context.category}
${context.additionalInstructions ? `- Additional Instructions: ${context.additionalInstructions}` : ''}

Extract the following:
1. Template name and description
2. Sections with their titles
3. Checklist items within each section
4. For each item, determine:
   - The item text/question
   - Response type: "yes_no" (for compliance checks), "rating" (for scored items), "text" (for open responses), "numeric" (for counts/measurements)
   - Whether it's a critical/essential item
   - Any guidance notes

Return a JSON object with this structure:
{
  "template_name": "Name of the audit template",
  "description": "Brief description",
  "audit_type": "${context.auditType}",
  "category": "${context.category}",
  "sections": [
    {
      "section_name": "Section Title",
      "checklist_items": [
        {
          "item": "The checklist question or item",
          "response_type": "yes_no|rating|text|numeric",
          "is_critical": true/false,
          "guidance": "Optional guidance notes"
        }
      ]
    }
  ]
}`,
        file_urls: [uploadedUrl],
        response_json_schema: {
          type: "object",
          properties: {
            template_name: { type: "string" },
            description: { type: "string" },
            audit_type: { type: "string" },
            category: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  checklist_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        response_type: { type: "string" },
                        is_critical: { type: "boolean" },
                        guidance: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const template = {
        template_name: result.template_name || "Imported Audit Template",
        description: result.description || "",
        audit_type: result.audit_type || context.auditType,
        category: result.category || context.category,
        language: "english",
        is_active: true,
        sections: (result.sections || []).map(section => ({
          section_name: section?.section_name || "Section",
          checklist_items: (section?.checklist_items || []).map(item => ({
            item: item?.item || "",
            response_type: item?.response_type || "yes_no",
            is_critical: item?.is_critical || false,
            guidance: item?.guidance || ""
          }))
        }))
      };

      const totalItems = template.sections.reduce((acc, s) => acc + s.checklist_items.length, 0);
      const criticalItems = template.sections.reduce((acc, s) => acc + s.checklist_items.filter(i => i.is_critical).length, 0);

      toast.success("Template Generated", `Created ${template.sections.length} sections with ${totalItems} items (${criticalItems} critical)`);
      onTemplateGenerated(template);

    } catch (error) {
      console.error("AI Generation Error:", error);
      toast.error("Generation Failed", error.message || "Could not generate template");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Audit Template Generator
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-600">
            Upload a PDF or image of an existing audit checklist. AI will analyze it and create a digital template.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Options
          </Button>

          {showAdvanced && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Audit Type</label>
                  <Select value={context.auditType} onValueChange={(val) => setContext({ ...context, auditType: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["daily", "weekly", "monthly", "quarterly", "annual", "adhoc"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select value={context.category} onValueChange={(val) => setContext({ ...context, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["medication", "hygiene", "safety", "care_plans", "documentation", "infection_control", "food_safety", "health_and_safety", "safeguarding", "dignity", "clinical", "finance", "staffing", "other"].map(c => (
                        <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Additional Instructions</label>
                <Textarea
                  value={context.additionalInstructions}
                  onChange={(e) => setContext({ ...context, additionalInstructions: e.target.value })}
                  placeholder="e.g., Mark items with 'MUST' as critical..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setUploadedUrl(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload PDF or image</p>
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <Button
            onClick={generateTemplate}
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
                Generate Audit Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}