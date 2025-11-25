import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Sparkles, FileText, X, HelpCircle, Lightbulb } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIFormGenerator({ onFormGenerated, onClose }) {
  const [file, setFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formContext, setFormContext] = useState({
    purpose: "",
    industry: "healthcare",
    additionalInstructions: "",
    exampleFields: "",
    detectConditionalLogic: true,
    detectRepeatingSections: true
  });
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

    // Build context-aware prompt
    let contextInfo = "";
    if (formContext.purpose) {
      contextInfo += `\nForm Purpose: ${formContext.purpose}`;
    }
    if (formContext.industry) {
      contextInfo += `\nIndustry: ${formContext.industry}`;
    }
    if (formContext.additionalInstructions) {
      contextInfo += `\nAdditional Instructions: ${formContext.additionalInstructions}`;
    }
    if (formContext.exampleFields) {
      contextInfo += `\nExample fields to look for: ${formContext.exampleFields}`;
    }

    const conditionalLogicInstructions = formContext.detectConditionalLogic ? `
CONDITIONAL LOGIC DETECTION:
- Identify fields that should only appear based on other field values
- Look for patterns like "If yes, please specify...", "If applicable...", "When X is selected, show Y"
- For each conditional field, specify:
  - show_if_field: the field_id that triggers this field
  - show_if_operator: "equals", "not_equals", "contains", "greater_than", "less_than"
  - show_if_value: the value that triggers showing this field
` : "";

    const repeatingSectionInstructions = formContext.detectRepeatingSections ? `
REPEATING SECTIONS & NESTED STRUCTURES:
- Identify sections that can be repeated (e.g., "Add another medication", "Additional contact")
- For tables, detect nested data structures and hierarchical information
- Look for numbered lists or grids that represent repeatable data entry
- Mark repeating sections with "is_repeatable": true
` : "";

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a form structure extraction expert. Analyze this document carefully and extract its structure.
${contextInfo}

**MOST IMPORTANT RULE - READ THIS FIRST:**
If this document contains ANY of the following, you MUST use field_type="table":
- A weekly planner or schedule (days of the week with time slots)
- A grid or matrix layout with rows and columns
- A timetable, roster, or calendar view
- Any repeating row structure (like medication logs, activity logs)
- Cells arranged in a tabular format

**NEVER create separate textarea/text fields for each cell of a table!**
**ALWAYS create ONE table field with columns matching the table headers!**

FIELD TYPES:
- text, textarea, number, date, time, datetime
- select, multiselect, checkbox, radio (with options array)
- signature, rating, email, phone, file
- table (MUST include table_columns array)

**TABLE FIELD STRUCTURE:**
When you see a grid/schedule/planner, create:
{
  "field_type": "table",
  "field_label": "Name of the table",
  "table_columns": [
    {"name": "Column Header 1", "type": "text"},
    {"name": "Column Header 2", "type": "textarea"},
    ...
  ]
}

**SPECIFIC EXAMPLE - Weekly Activity Planner:**
If document has days (Mon-Sun) as rows/columns with Morning/Afternoon/Evening slots:
{
  "field_type": "table",
  "field_label": "Weekly Activity Schedule", 
  "table_columns": [
    {"name": "Day", "type": "select", "options": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]},
    {"name": "Appointments/Contacts", "type": "textarea"},
    {"name": "Morning", "type": "textarea"},
    {"name": "Afternoon", "type": "textarea"},
    {"name": "Evening", "type": "textarea"}
  ]
}

${conditionalLogicInstructions}
${repeatingSectionInstructions}

EXTRACTION RULES:
1. **Tables/grids = ONE table field with table_columns** (NEVER flatten!)
2. Group related non-table fields into sections
3. Mark required fields based on asterisks or bold text
4. Extract dropdown options from listed choices

Analyze the document and return the JSON structure.`,
        file_urls: [uploadedUrl],
        response_json_schema: {
          type: "object",
          properties: {
            form_name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            contains_table_or_grid: { 
              type: "boolean",
              description: "Set to true if the document contains any table, grid, schedule, or weekly planner layout"
            },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_title: { type: "string" },
                  section_description: { type: "string" },
                  is_repeatable: { type: "boolean" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_label: { type: "string" },
                        field_type: { 
                          type: "string",
                          enum: ["text", "textarea", "number", "date", "time", "datetime", "select", "multiselect", "checkbox", "radio", "signature", "rating", "email", "phone", "file", "table"],
                          description: "Use 'table' for any grid, schedule, planner, or tabular data"
                        },
                        required: { type: "boolean" },
                        placeholder: { type: "string" },
                        helper_text: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        table_columns: {
                          type: "array",
                          description: "Required when field_type is 'table'. Define each column of the table.",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Column header name" },
                              type: { type: "string", enum: ["text", "textarea", "number", "date", "time", "select", "checkbox"] },
                              options: { type: "array", items: { type: "string" } }
                            },
                            required: ["name", "type"]
                          }
                        },
                        conditional_logic: {
                          type: "object",
                          properties: {
                            show_if_field: { type: "string" },
                            show_if_operator: { type: "string" },
                            show_if_value: { type: "string" }
                          }
                        }
                      },
                      required: ["field_label", "field_type"]
                    }
                  }
                }
              }
            }
          },
          required: ["form_name", "sections", "contains_table_or_grid"]
        }
      });

      console.log("AI Raw Result:", JSON.stringify(result, null, 2));
      
      // If AI detected tables but didn't create table fields, warn user
      if (result.contains_table_or_grid) {
        const hasTableFields = (result.sections || []).some(s => 
          (s.fields || []).some(f => f.field_type === 'table')
        );
        if (!hasTableFields) {
          console.warn("AI detected grid/table but didn't create table fields - this may need manual adjustment");
        }
      }

      // Post-process: If document has grid structure but AI didn't create table, try to detect and fix
      let processedResult = { ...result };
      
      // Check if we have many similar fields that should be a table (e.g., "Monday - Morning", "Tuesday - Morning")
      const allFields = (result.sections || []).flatMap(s => s.fields || []);
      const dayPatterns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const timePatterns = ['morning', 'afternoon', 'evening', 'appointments', 'contacts'];
      
      const hasDayTimePattern = allFields.some(f => {
        const label = (f.field_label || '').toLowerCase();
        return dayPatterns.some(d => label.includes(d)) && timePatterns.some(t => label.includes(t));
      });
      
      if (hasDayTimePattern && !allFields.some(f => f.field_type === 'table')) {
        console.log("Detected day/time pattern - converting to table structure");
        
        // Create a proper table structure
        const tableField = {
          field_label: "Weekly Activity Schedule",
          field_type: "table",
          required: false,
          table_columns: [
            { name: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
            { name: "Appointments/Contacts", type: "textarea", options: [] },
            { name: "Morning", type: "textarea", options: [] },
            { name: "Afternoon", type: "textarea", options: [] },
            { name: "Evening", type: "textarea", options: [] }
          ]
        };
        
        // Find non-day-related fields to keep
        const otherFields = allFields.filter(f => {
          const label = (f.field_label || '').toLowerCase();
          const isDayField = dayPatterns.some(d => label.includes(d));
          return !isDayField;
        });
        
        // Rebuild sections with table
        processedResult = {
          ...result,
          sections: [
            {
              section_title: result.sections?.[0]?.section_title || "Weekly Schedule",
              section_description: "",
              is_repeatable: false,
              fields: [...otherFields, tableField]
            }
          ]
        };
        
        toast.info("Table Detected", "Converted weekly schedule pattern to table format");
      }

      // Build field ID map for conditional logic references
      const fieldIdMap = {};
      let fieldCounter = 0;
      (result.sections || []).forEach((section, sIdx) => {
        (section?.fields || []).forEach((field, fIdx) => {
          const fieldId = `field_${Date.now()}_${sIdx}_${fIdx}_${fieldCounter++}`;
          fieldIdMap[field?.field_label?.toLowerCase().replace(/\s+/g, '_')] = fieldId;
          fieldIdMap[`field_${sIdx}_${fIdx}`] = fieldId;
        });
      });

      // Transform to proper form template structure
      const formTemplate = {
        form_name: result.form_name || "Imported Form",
        description: result.description || "",
        category: result.category || "other",
        sections: (result.sections || []).map((section, sIdx) => ({
          section_id: `section_${Date.now()}_${sIdx}`,
          section_title: section?.section_title || `Section ${sIdx + 1}`,
          section_description: section?.section_description || "",
          section_order: sIdx,
          is_repeatable: section?.is_repeatable || false,
          fields: (section?.fields || []).map((field, fIdx) => {
            // Ensure table_columns is properly structured
            let tableColumns = [];
            if (field?.field_type === 'table' && Array.isArray(field?.table_columns)) {
              tableColumns = field.table_columns.map(col => ({
                name: col?.name || 'Column',
                type: col?.type || 'text',
                options: Array.isArray(col?.options) ? col.options : []
              }));
            }

            // Process conditional logic
            let conditionalLogic = {};
            if (field?.conditional_logic?.show_if_field) {
              const triggerFieldKey = field.conditional_logic.show_if_field.toLowerCase().replace(/\s+/g, '_');
              conditionalLogic = {
                show_if_field: fieldIdMap[triggerFieldKey] || field.conditional_logic.show_if_field,
                show_if_operator: field.conditional_logic.show_if_operator || 'equals',
                show_if_value: field.conditional_logic.show_if_value || ''
              };
            }
            
            return {
              field_id: fieldIdMap[`field_${sIdx}_${fIdx}`] || `field_${Date.now()}_${sIdx}_${fIdx}`,
              field_label: field?.field_label || `Field ${fIdx + 1}`,
              field_type: field?.field_type || 'text',
              field_order: fIdx,
              required: field?.required || false,
              placeholder: field?.placeholder || "",
              helper_text: field?.helper_text || "",
              options: Array.isArray(field?.options) ? field.options : [],
              table_columns: tableColumns,
              validation: {},
              conditional_logic: conditionalLogic
            };
          })
        })),
        workflow_triggers: [],
        auto_routing: { enabled: false, routes: [] },
        is_active: true,
        requires_approval: false,
        version: 1,
        detected_relationships: result.detected_relationships || []
      };

      console.log("Generated Template:", JSON.stringify(formTemplate, null, 2));

      // Show summary of what was detected
      const tableCount = formTemplate.sections.flatMap(s => s.fields).filter(f => f.field_type === 'table').length;
      const conditionalCount = formTemplate.sections.flatMap(s => s.fields).filter(f => f.conditional_logic?.show_if_field).length;
      const repeatableCount = formTemplate.sections.filter(s => s.is_repeatable).length;
      
      let summaryMsg = `Created ${formTemplate.sections.length} sections with ${formTemplate.sections.flatMap(s => s.fields).length} fields`;
      if (tableCount > 0) summaryMsg += `, ${tableCount} tables`;
      if (conditionalCount > 0) summaryMsg += `, ${conditionalCount} conditional fields`;
      if (repeatableCount > 0) summaryMsg += `, ${repeatableCount} repeatable sections`;

      toast.success("Form Generated", summaryMsg);
      onFormGenerated(formTemplate);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Generation Failed", "Could not generate form from document");
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
            Upload a PDF or image of a paper form. Our AI will analyze it and create a digital form template automatically.
          </p>

          {/* Advanced Options Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-1 block">Form Purpose</label>
                <Input
                  value={formContext.purpose}
                  onChange={(e) => setFormContext({ ...formContext, purpose: e.target.value })}
                  placeholder="e.g., Daily health assessment for care home residents"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Industry</label>
                <Select 
                  value={formContext.industry} 
                  onValueChange={(val) => setFormContext({ ...formContext, industry: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare">Healthcare / Care Homes</SelectItem>
                    <SelectItem value="domiciliary">Domiciliary Care</SelectItem>
                    <SelectItem value="supported_living">Supported Living</SelectItem>
                    <SelectItem value="day_centre">Day Centre</SelectItem>
                    <SelectItem value="medical">Medical / Clinical</SelectItem>
                    <SelectItem value="hr">HR / Employment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Example Fields to Look For</label>
                <Textarea
                  value={formContext.exampleFields}
                  onChange={(e) => setFormContext({ ...formContext, exampleFields: e.target.value })}
                  placeholder="e.g., Client name, Date of assessment, Mobility score, Medication list table..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Additional Instructions</label>
                <Textarea
                  value={formContext.additionalInstructions}
                  onChange={(e) => setFormContext({ ...formContext, additionalInstructions: e.target.value })}
                  placeholder="e.g., The medication section should be a table with columns for drug name, dosage, and frequency..."
                  rows={2}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formContext.detectConditionalLogic}
                    onChange={(e) => setFormContext({ ...formContext, detectConditionalLogic: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Detect conditional logic (show/hide fields)</span>
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formContext.detectRepeatingSections}
                    onChange={(e) => setFormContext({ ...formContext, detectRepeatingSections: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Detect repeating sections & nested tables</span>
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                </label>
              </div>
            </div>
          )}

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
            AI will extract fields, tables, conditional logic, and repeating sections from your document
          </p>
        </CardContent>
      </Card>
    </div>
  );
}