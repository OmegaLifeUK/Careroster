import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";

export default function FormPreview({ template, clientId, onSubmitSuccess, onSubmitted, prefillData = {}, contextData = {} }) {
  const [formValues, setFormValues] = useState({});
  const [activeSection, setActiveSection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(0);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load existing draft if task has a submission
  React.useEffect(() => {
    const loadDraft = async () => {
      if (contextData?.staff_task_id && !initialized) {
        try {
          const submissions = await base44.entities.FormSubmission.filter({
            staff_task_id: contextData.staff_task_id,
            status: 'draft'
          });
          if (submissions && submissions.length > 0) {
            const draft = submissions[0];
            setFormValues(draft.form_data || {});
            setExistingSubmissionId(draft.id);
            toast.info("Draft Loaded", "Continuing from where you left off");
            setInitialized(true);
            return;
          }
        } catch (error) {
          console.log("No draft found");
        }
      }
      
      // Pre-fill form values if no draft
      if (template && !initialized) {
        const initialValues = {};
        
        template.sections?.forEach(section => {
          section.fields?.forEach(field => {
            const fieldId = field.field_id;
            const fieldLabel = field.field_label?.toLowerCase() || '';
            
            // Client/Service User name matching
            if (prefillData.full_name && (
              fieldLabel.includes('name') || 
              fieldLabel.includes('client') || 
              fieldLabel.includes('service user') ||
              fieldLabel.includes('resident')
            ) && !fieldLabel.includes('supervisor') && !fieldLabel.includes('staff')) {
              initialValues[fieldId] = prefillData.full_name;
            }
            
            // Staff name matching
            if (prefillData.staff_name && (fieldLabel.includes('staff') || fieldLabel.includes('employee')) && fieldLabel.includes('name')) {
              initialValues[fieldId] = prefillData.staff_name;
            }
            
            // Supervisor name
            if (prefillData.supervisor_name && (fieldLabel.includes('supervisor') || fieldLabel.includes('manager'))) {
              initialValues[fieldId] = prefillData.supervisor_name;
            }
            
            // Client name specific
            if (prefillData.client_name && (fieldLabel.includes('client') || fieldLabel.includes('service user') || fieldLabel.includes('resident'))) {
              initialValues[fieldId] = prefillData.client_name;
            }
            
            // Date of birth
            if (prefillData.date_of_birth && (fieldLabel.includes('dob') || fieldLabel.includes('date of birth') || fieldLabel.includes('birth'))) {
              initialValues[fieldId] = prefillData.date_of_birth;
            }
            
            // Generic date
            if (prefillData.date && fieldLabel.includes('date') && !fieldLabel.includes('birth')) {
              initialValues[fieldId] = prefillData.date;
            }
            
            // Email
            if (prefillData.email && fieldLabel.includes('email')) {
              initialValues[fieldId] = prefillData.email;
            }
            
            // Phone
            if (prefillData.phone && (fieldLabel.includes('phone') || fieldLabel.includes('telephone') || fieldLabel.includes('contact'))) {
              initialValues[fieldId] = prefillData.phone;
            }
            
            // Address
            if (prefillData.address && fieldLabel.includes('address')) {
              initialValues[fieldId] = prefillData.address;
            }
            
            // NHS Number
            if (prefillData.nhs_number && (fieldLabel.includes('nhs') || fieldLabel.includes('national health'))) {
              initialValues[fieldId] = prefillData.nhs_number;
            }
            
            // Direct field ID match (highest priority)
            if (prefillData[fieldId]) {
              initialValues[fieldId] = prefillData[fieldId];
            }
          });
        });
        
        setFormValues(initialValues);
        setInitialized(true);
      }
    };
    
    loadDraft();
  }, [template, prefillData, initialized, contextData]);

  const [existingSubmissionId, setExistingSubmissionId] = React.useState(null);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSubmissionId) {
        return base44.entities.FormSubmission.update(existingSubmissionId, data);
      }
      return base44.entities.FormSubmission.create(data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
      toast.success("Form Submitted", "Your response has been saved successfully");
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
      if (onSubmitted) onSubmitted(result);
    },
    onError: (error) => {
      console.error("Submission error:", error);
      toast.error("Submission Failed", "Could not save form response");
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSubmissionId) {
        return base44.entities.FormSubmission.update(existingSubmissionId, data);
      }
      return base44.entities.FormSubmission.create(data);
    },
    onSuccess: (result) => {
      setExistingSubmissionId(result.id);
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
      toast.success("Draft Saved", "Your progress has been saved");
    },
    onError: (error) => {
      console.error("Draft save error:", error);
      toast.error("Save Failed", "Could not save draft");
    }
  });

  const calculateProgress = () => {
    if (!template?.sections || template.sections.length === 0) return 0;
    const allFields = template.sections.flatMap(s => s.fields || []);
    const filledFields = allFields.filter(f => 
      formValues[f.field_id] !== undefined && 
      formValues[f.field_id] !== "" && 
      formValues[f.field_id] !== null
    );
    return allFields.length > 0 ? Math.round((filledFields.length / allFields.length) * 100) : 0;
  };

  const handleSaveDraft = () => {
    const submission = {
      form_template_id: template.id,
      form_name: template.form_name,
      submitted_date: new Date().toISOString(),
      client_id: clientId || contextData?.subject_client_id || null,
      staff_id: contextData?.subject_staff_id || null,
      staff_task_id: contextData?.staff_task_id || null,
      form_data: formValues,
      status: "draft",
      progress_percentage: calculateProgress()
    };

    saveDraftMutation.mutate(submission);
  };

  const handleSubmit = async () => {
    if (!template?.sections || template.sections.length === 0) {
      toast.error("Invalid Form", "This form has no sections or fields");
      return;
    }
    
    const allFields = template.sections.flatMap(s => s.fields || []);
    const missingRequired = allFields.filter(f => 
      f.required && !formValues[f.field_id] && formValues[f.field_id] !== false
    );

    if (missingRequired.length > 0) {
      toast.error("Required Fields", `Please fill in: ${missingRequired.map(f => f.field_label).join(', ')}`);
      return;
    }

    // Check if scoring is enabled
    const hasScoring = allFields.some(f => (f.field_type === 'number' || f.field_type === 'radio') && f.include_in_score);

    const submission = {
      form_template_id: template.id,
      form_name: template.form_name,
      submitted_date: new Date().toISOString(),
      client_id: clientId || contextData?.subject_client_id || null,
      staff_id: contextData?.subject_staff_id || null,
      staff_task_id: contextData?.staff_task_id || null,
      form_data: formValues,
      calculated_score: hasScoring ? calculatedScore : undefined,
      status: template.requires_approval ? "submitted" : "approved",
      progress_percentage: 100
    };

    submitMutation.mutate(submission);
  };

  const updateValue = (fieldId, value) => {
    setFormValues({ ...formValues, [fieldId]: value });
  };

  // Calculate score whenever formValues changes
  React.useEffect(() => {
    const allFields = (template?.sections || []).flatMap(s => s.fields || []);
    const scoreFields = allFields.filter(f => 
      (f.field_type === 'number' || f.field_type === 'radio') && f.include_in_score
    );
    
    if (scoreFields.length > 0) {
      let totalScore = 0;
      scoreFields.forEach(field => {
        let numericValue = 0;
        const rawValue = formValues[field.field_id];
        
        if (field.field_type === 'radio') {
          // Extract number from radio option (e.g., "2 - Poor" -> 2)
          const match = String(rawValue).match(/^(\d+)/);
          numericValue = match ? parseFloat(match[1]) : 0;
        } else {
          numericValue = parseFloat(rawValue) || 0;
        }
        
        const weight = parseFloat(field.score_weight) || 1;
        totalScore += numericValue * weight;
      });
      setCalculatedScore(totalScore);
    }
  }, [formValues, template]);

  const addTableRow = (fieldId, columns) => {
    const currentRows = formValues[fieldId] || [];
    const newRow = {};
    // Handle both array and object forms
    const colArray = Array.isArray(columns) ? columns : Object.values(columns || {});
    colArray.forEach(col => {
      newRow[col.name] = col.type === 'checkbox' ? false : '';
    });
    updateValue(fieldId, [...currentRows, newRow]);
  };

  const updateTableCell = (fieldId, rowIndex, columnName, value) => {
    const currentRows = [...(formValues[fieldId] || [])];
    currentRows[rowIndex] = { ...currentRows[rowIndex], [columnName]: value };
    updateValue(fieldId, currentRows);
  };

  const deleteTableRow = (fieldId, rowIndex) => {
    const currentRows = formValues[fieldId] || [];
    updateValue(fieldId, currentRows.filter((_, i) => i !== rowIndex));
  };

  const renderTableField = (field) => {
    // Debug: log the field to see what we're getting
    console.log("Rendering table field:", field.field_label, "table_columns:", field.table_columns);
    
    // Handle both array and object forms of table_columns
    let columns = [];
    if (Array.isArray(field.table_columns)) {
      columns = field.table_columns;
    } else if (field.table_columns && typeof field.table_columns === 'object') {
      // If it's an object with numeric keys, convert to array
      columns = Object.values(field.table_columns);
    }
    
    const rows = formValues[field.field_id] || [];

    // Handle case where table has no columns defined
    if (columns.length === 0) {
      console.log("No columns found for table:", field);
      return (
        <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-500">
          <p>Table has no columns defined</p>
          <p className="text-xs mt-2">Debug: table_columns = {JSON.stringify(field.table_columns)}</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-3 py-2 text-left text-sm font-medium text-gray-700 border-b">
                  {col?.name || `Column ${idx + 1}`}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-sm font-medium text-gray-700 border-b w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-b-0">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-3 py-2">
                    {col.type === 'select' ? (
                      <Select
                        value={row[col.name] || ''}
                        onValueChange={(val) => updateTableCell(field.field_id, rowIdx, col.name, val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {col.options?.map((opt, i) => (
                            <SelectItem key={i} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : col.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={row[col.name] || false}
                        onChange={(e) => updateTableCell(field.field_id, rowIdx, col.name, e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                    ) : col.type === 'number' ? (
                      <Input
                        type="number"
                        value={row[col.name] || ''}
                        onChange={(e) => updateTableCell(field.field_id, rowIdx, col.name, e.target.value)}
                        className="h-8"
                      />
                    ) : col.type === 'date' ? (
                      <Input
                        type="date"
                        value={row[col.name] || ''}
                        onChange={(e) => updateTableCell(field.field_id, rowIdx, col.name, e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={row[col.name] || ''}
                        onChange={(e) => updateTableCell(field.field_id, rowIdx, col.name, e.target.value)}
                        className="h-8"
                      />
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTableRow(field.field_id, rowIdx)}
                    className="h-8 w-8 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2 bg-gray-50 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => addTableRow(field.field_id, columns)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </Button>
        </div>
      </div>
    );
  };

  const shouldShowField = (field) => {
    if (!field.conditional_logic?.show_if_field) return true;
    
    const dependentValue = formValues[field.conditional_logic.show_if_field];
    const targetValue = field.conditional_logic.show_if_value;
    const operator = field.conditional_logic.show_if_operator;

    switch (operator) {
      case 'equals':
        return dependentValue === targetValue;
      case 'not_equals':
        return dependentValue !== targetValue;
      case 'contains':
        return dependentValue?.includes(targetValue);
      default:
        return true;
    }
  };

  const renderField = (field) => {
    if (!shouldShowField(field)) return null;

    const commonProps = {
      value: formValues[field.field_id] || "",
      onChange: (e) => updateValue(field.field_id, e.target.value),
      placeholder: field.placeholder,
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return <Input {...commonProps} type={field.field_type} />;

      case 'number':
        return <Input {...commonProps} type="number" />;

      case 'date':
      case 'time':
      case 'datetime':
        return <Input {...commonProps} type={field.field_type === 'datetime' ? 'datetime-local' : field.field_type} />;

      case 'textarea':
        return <Textarea {...commonProps} rows={4} />;

      case 'select':
        return (
          <Select value={formValues[field.field_id]} onValueChange={(val) => updateValue(field.field_id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt, idx) => (
                <SelectItem key={idx} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formValues[field.field_id] || false}
              onChange={(e) => updateValue(field.field_id, e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{field.placeholder}</span>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.field_id}
                  value={opt}
                  checked={formValues[field.field_id] === opt}
                  onChange={(e) => updateValue(field.field_id, e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt}</span>
              </div>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => updateValue(field.field_id, rating)}
                className={`w-8 h-8 rounded ${
                  formValues[field.field_id] >= rating 
                    ? 'bg-yellow-400 text-white' 
                    : 'bg-gray-200'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        );

      case 'table':
        return renderTableField(field);

      case 'calculated_score':
        return (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Calculated Score</p>
                <p className="text-4xl font-bold text-blue-600">{calculatedScore.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Auto-calculated</p>
                <p className="text-xs text-gray-500">from numerical fields</p>
              </div>
            </div>
          </div>
        );

      default:
        return <Input {...commonProps} />;
    }
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No template data available</p>
        </CardContent>
      </Card>
    );
  }

  if (!template.sections || template.sections.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="text-2xl">{template.form_name}</CardTitle>
          {template.description && (
            <p className="text-gray-600 mt-2">{template.description}</p>
          )}
        </CardHeader>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500 mb-2">This form template has no sections or fields defined yet.</p>
          <p className="text-sm text-gray-400">Please edit the template to add sections and fields.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="text-2xl">{template.form_name}</CardTitle>
        {template.description && (
          <p className="text-gray-600 mt-2">{template.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <Badge>{template.category.replace(/_/g, ' ')}</Badge>
          {template.requires_approval && (
            <Badge variant="outline">Requires Approval</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Section Tabs */}
        {template.sections.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {template.sections.map((section, idx) => (
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
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Form Progress</span>
            <span className="text-sm font-bold text-blue-900">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
          <p className="text-xs text-blue-700 mt-2">
            {template.sections.flatMap(s => s.fields).filter(f => 
              formValues[f.field_id] !== undefined && formValues[f.field_id] !== "" && formValues[f.field_id] !== null
            ).length} of {template.sections.flatMap(s => s.fields).length} questions answered
          </p>
        </div>

        {/* Active Section Fields */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold mb-4">
            {template.sections[activeSection]?.section_title}
          </h3>
          
          {template.sections[activeSection]?.fields.map((field) => {
            if (!shouldShowField(field)) return null;
            
            return (
              <div key={field.field_id} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  {field.field_label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                {renderField(field)}
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
              disabled={activeSection === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending || submitted}
            >
              {saveDraftMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
          </div>
          {activeSection < template.sections.length - 1 ? (
            <Button onClick={() => setActiveSection(activeSection + 1)}>
              Next Section
            </Button>
          ) : (
            <Button 
              className="bg-blue-600" 
              onClick={handleSubmit}
              disabled={submitMutation.isPending || submitted}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : submitted ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submitted
                </>
              ) : (
                "Submit Form"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}