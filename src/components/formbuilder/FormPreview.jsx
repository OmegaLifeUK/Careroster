import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function FormPreview({ template }) {
  const [formValues, setFormValues] = useState({});
  const [activeSection, setActiveSection] = useState(0);

  const updateValue = (fieldId, value) => {
    setFormValues({ ...formValues, [fieldId]: value });
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

      default:
        return <Input {...commonProps} />;
    }
  };

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
          <Button
            variant="outline"
            onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
            disabled={activeSection === 0}
          >
            Previous
          </Button>
          {activeSection < template.sections.length - 1 ? (
            <Button onClick={() => setActiveSection(activeSection + 1)}>
              Next Section
            </Button>
          ) : (
            <Button className="bg-blue-600">
              Submit Form
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}