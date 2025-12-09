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
        prompt: `You are a form structure extraction expert. Analyze this document carefully and extract EVERY SINGLE question, field, checkbox, and input area.

${contextInfo}

**CRITICAL EXTRACTION RULES:**
1. Extract EVERY question/field - don't just create section headers
2. Look for ALL questions, prompts, checkboxes, text areas, rating scales, and input fields
3. If a section has a header AND questions underneath, extract BOTH the header and the questions
4. Extract embedded questions like "Please provide details:", "Comments:", "Notes:", etc.
5. Look for numbered lists, bullet points, and sub-questions
6. Extract signature lines, date fields, and name fields

**TABLE DETECTION - MOST IMPORTANT:**
If this document contains ANY of the following, you MUST use field_type="table":
- A weekly planner or schedule (days of the week with time slots)
- A grid or matrix layout with rows and columns
- A timetable, roster, or calendar view
- Any repeating row structure (like medication logs, activity logs)
- Cells arranged in a tabular format
- Questions arranged in rows with multiple columns for answers

**NEVER create separate textarea/text fields for each cell of a table!**
**ALWAYS create ONE table field with columns matching the table headers!**

FIELD TYPES:
- text, textarea, number, date, time, datetime
- select, multiselect, checkbox, radio (with options array)
- signature, rating, email, phone, file
- table (MUST include table_columns array)

**TABLE FIELD STRUCTURE (CRITICAL):**
When you see ANY grid/schedule/planner/matrix/repeating structure, ALWAYS create:
{
  "field_type": "table",
  "field_label": "Name of the table",
  "table_columns": [
    {"name": "Column Header 1", "type": "text", "options": []},
    {"name": "Column Header 2", "type": "textarea", "options": []},
    {"name": "Column Header 3", "type": "select", "options": ["Option1", "Option2"]}
  ]
}

**IMPORTANT:** Preserve ALL table structure - columns must match the original document exactly!

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
1. **Extract EVERY field, question, and input area** - Don't skip embedded questions!
2. **Tables/grids = ONE table field with table_columns** (NEVER flatten!)
3. Group related non-table fields into sections
4. Mark required fields based on asterisks or bold text
5. Extract dropdown options from listed choices
6. Look inside each section for nested questions, sub-fields, and text areas
7. Extract rating scales, yes/no questions, and checkbox groups
8. Pay attention to indentation - indented text often indicates sub-questions

**COMMON AUDIT FORM PATTERNS:**
- "Evidence:" → textarea field
- "Yes/No/N/A" → radio field with options ["Yes", "No", "N/A"]
- "Rating 1-5" → rating field
- "Comments/Notes/Details" → textarea field
- Lists of checkboxes → checkbox or multiselect field
- Signature + Date → signature field + date field

**DO NOT just create section headers without extracting the questions inside!**
Every section should have multiple fields representing the actual questions/inputs in that section.

Analyze the document and return the JSON structure with ALL fields extracted.`,
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

      console.log("✓ AI Generation Complete - Raw Result:", JSON.stringify(result, null, 2));
      
      // Validate table structure
      if (result.contains_table_or_grid) {
        const tableFields = (result.sections || []).flatMap(s => s.fields || []).filter(f => f.field_type === 'table');
        if (tableFields.length === 0) {
          console.error("❌ AI DETECTED TABLE BUT DIDN'T CREATE TABLE FIELDS - Auto-converting...");
        } else {
          console.log("✓ Found", tableFields.length, "table field(s)");
          // Validate each table has columns
          tableFields.forEach(tf => {
            if (!tf.table_columns || tf.table_columns.length === 0) {
              console.error("❌ Table field", tf.field_label, "missing table_columns!");
            } else {
              console.log("✓ Table", tf.field_label, "has", tf.table_columns.length, "columns:", 
                tf.table_columns.map(c => c.name).join(', '));
            }
          });
        }
      }

      // Post-process: If document has grid structure but AI didn't create table, try to detect and fix
      let processedResult = { ...result };
      
      // Check if we have many similar fields that should be a table
      const allFields = (result.sections || []).flatMap(s => s.fields || []);
      const hasTableField = allFields.some(f => f.field_type === 'table');
      
      // Patterns that indicate a weekly schedule/planner
      const dayPatterns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const timePatterns = ['morning', 'afternoon', 'evening', 'night', 'am', 'pm', 'appointments', 'contacts', 'activity', 'activities'];
      
      // Count how many fields match day or time patterns
      const dayFieldCount = allFields.filter(f => {
        const label = (f.field_label || '').toLowerCase();
        return dayPatterns.some(d => label.includes(d));
      }).length;
      
      const timeFieldCount = allFields.filter(f => {
        const label = (f.field_label || '').toLowerCase();
        return timePatterns.some(t => label.includes(t));
      }).length;
      
      // If we have multiple day-related fields OR the AI said it contains a table but didn't create one
      const shouldConvertToTable = !hasTableField && (
        (dayFieldCount >= 3) || // Multiple day fields
        (result.contains_table_or_grid === true) || // AI detected table
        (allFields.length > 15 && (dayFieldCount > 0 || timeFieldCount > 0)) // Many fields with day/time hints
      );
      
      if (shouldConvertToTable) {
        console.log("Converting to table structure - dayFields:", dayFieldCount, "timeFields:", timeFieldCount, "contains_table:", result.contains_table_or_grid);
        
        // Try to extract column names from field labels
        const extractedTimeSlots = new Set();
        const extractedDays = new Set();
        
        allFields.forEach(f => {
          const label = (f.field_label || '').toLowerCase();
          timePatterns.forEach(t => {
            if (label.includes(t)) {
              // Capitalize first letter
              extractedTimeSlots.add(t.charAt(0).toUpperCase() + t.slice(1));
            }
          });
          dayPatterns.forEach(d => {
            if (label.includes(d)) {
              const fullDay = {
                'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 
                'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
                'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
                'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday'
              }[d] || d.charAt(0).toUpperCase() + d.slice(1);
              extractedDays.add(fullDay);
            }
          });
        });
        
        // Build table columns based on what we found
        const tableColumns = [
          { name: "Day", type: "select", options: extractedDays.size > 0 ? Array.from(extractedDays) : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }
        ];
        
        // Add time-based columns
        if (extractedTimeSlots.size > 0) {
          Array.from(extractedTimeSlots).forEach(slot => {
            tableColumns.push({ name: slot, type: "textarea", options: [] });
          });
        } else {
          // Default time slots
          tableColumns.push({ name: "Morning", type: "textarea", options: [] });
          tableColumns.push({ name: "Afternoon", type: "textarea", options: [] });
          tableColumns.push({ name: "Evening", type: "textarea", options: [] });
        }
        
        // Find non-schedule-related fields to keep
        const otherFields = allFields.filter(f => {
          const label = (f.field_label || '').toLowerCase();
          const isDayField = dayPatterns.some(d => label.includes(d));
          const isTimeField = timePatterns.some(t => label.includes(t));
          return !isDayField && !isTimeField;
        });
        
        // Rebuild sections with table - insert the full table object directly
        processedResult = {
          ...result,
          sections: [
            {
              section_id: `section_${Date.now()}`,
              section_title: result.sections?.[0]?.section_title || "Schedule",
              section_description: "",
              section_order: 0,
              is_repeatable: false,
              fields: [
                ...otherFields.map((f, idx) => ({
                  ...f,
                  field_id: f.field_id || `field_${Date.now()}_${idx}`,
                  field_order: idx
                })),
                {
                  field_id: `table_${Date.now()}`,
                  field_label: result.form_name || "Weekly Activity Schedule",
                  field_type: "table",
                  field_order: otherFields.length,
                  required: false,
                  placeholder: "",
                  options: [],
                  table_columns: tableColumns.map(col => ({
                    name: col.name,
                    type: col.type,
                    options: col.options || []
                  })),
                  validation: {},
                  conditional_logic: {}
                }
              ]
            }
          ]
        };
        
        const createdTable = processedResult.sections[0].fields.find(f => f.field_type === 'table');
        console.log("✓ Auto-generated table structure:", JSON.stringify(createdTable, null, 2));
        
        toast.info("Table Auto-Created", `Converted ${allFields.length} fields into table format with ${createdTable.table_columns?.length || 0} columns`);
      }

      // Build field ID map for conditional logic references
      const fieldIdMap = {};
      let fieldCounter = 0;
      (processedResult.sections || []).forEach((section, sIdx) => {
        (section?.fields || []).forEach((field, fIdx) => {
          const fieldId = `field_${Date.now()}_${sIdx}_${fIdx}_${fieldCounter++}`;
          fieldIdMap[field?.field_label?.toLowerCase().replace(/\s+/g, '_')] = fieldId;
          fieldIdMap[`field_${sIdx}_${fIdx}`] = fieldId;
        });
      });

      // Transform to proper form template structure
      const formTemplate = {
        form_name: processedResult.form_name || "Imported Form",
        description: processedResult.description || "",
        category: processedResult.category || "other",
        sections: (processedResult.sections || []).map((section, sIdx) => ({
          section_id: section.section_id || `section_${Date.now()}_${sIdx}`,
          section_title: section?.section_title || `Section ${sIdx + 1}`,
          section_description: section?.section_description || "",
          section_order: sIdx,
          is_repeatable: section?.is_repeatable || false,
          fields: (section?.fields || []).map((field, fIdx) => {
            // For table fields, preserve the table_columns exactly as they are
            let tableColumns = [];
            if (field?.field_type === 'table') {
              if (Array.isArray(field?.table_columns) && field.table_columns.length > 0) {
                // CRITICAL: Preserve exact structure from AI including all options
                tableColumns = field.table_columns.map(col => ({
                  name: String(col?.name || 'Column'),
                  type: String(col?.type || 'text'),
                  options: Array.isArray(col?.options) ? col.options.filter(Boolean) : []
                }));
                console.log("✓ Preserved", tableColumns.length, "table columns for", field.field_label);
              } else {
                // Default columns if none provided
                tableColumns = [
                  { name: "Column 1", type: "text", options: [] },
                  { name: "Column 2", type: "text", options: [] },
                  { name: "Column 3", type: "text", options: [] }
                ];
                console.warn("⚠ Using default columns - AI didn't provide table_columns");
              }
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
            
            const finalField = {
              field_id: field.field_id || fieldIdMap[`field_${sIdx}_${fIdx}`] || `field_${Date.now()}_${sIdx}_${fIdx}`,
              field_label: field?.field_label || `Field ${fIdx + 1}`,
              field_type: field?.field_type || 'text',
              field_order: field.field_order ?? fIdx,
              required: field?.required || false,
              placeholder: field?.placeholder || "",
              helper_text: field?.helper_text || "",
              options: Array.isArray(field?.options) ? field.options : [],
              table_columns: tableColumns,
              validation: field?.validation || {},
              conditional_logic: conditionalLogic
            };
            
            return finalField;
          })
        })),
        workflow_triggers: [],
        auto_routing: { enabled: false, routes: [] },
        is_active: true,
        requires_approval: false,
        version: 1,
        detected_relationships: processedResult.detected_relationships || []
      };

      // Final validation log
      const finalTableFields = formTemplate.sections.flatMap(s => s.fields).filter(f => f.field_type === 'table');
      console.log("✓ FINAL FORM TEMPLATE:");
      console.log("  - Sections:", formTemplate.sections.length);
      console.log("  - Total Fields:", formTemplate.sections.flatMap(s => s.fields).length);
      console.log("  - Table Fields:", finalTableFields.length);
      finalTableFields.forEach((tf, idx) => {
        console.log(`  - Table ${idx + 1}: "${tf.field_label}" with ${tf.table_columns?.length || 0} columns`);
      });

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