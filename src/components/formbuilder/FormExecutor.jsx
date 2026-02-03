import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

/**
 * FormExecutor - Renders and executes form templates with table support
 * CRITICAL: Properly renders table fields with all columns and structure
 */
export default function FormExecutor({ template, onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState(initialData);
  const [tableData, setTableData] = useState({});
  const [calculatedScore, setCalculatedScore] = useState(0);

  const updateField = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // Calculate score whenever formData changes
  React.useEffect(() => {
    const allFields = (template.sections || []).flatMap(s => s.fields || []);
    const scoreFields = allFields.filter(f => f.field_type === 'number' && f.include_in_score);
    
    if (scoreFields.length > 0) {
      let totalScore = 0;
      scoreFields.forEach(field => {
        const value = parseFloat(formData[field.field_id]) || 0;
        const weight = parseFloat(field.score_weight) || 1;
        totalScore += value * weight;
      });
      setCalculatedScore(totalScore);
    }
  }, [formData, template]);

  const updateTableData = (fieldId, rowIndex, columnName, value) => {
    setTableData(prev => {
      const tableRows = prev[fieldId] || [];
      const updatedRows = [...tableRows];
      if (!updatedRows[rowIndex]) {
        updatedRows[rowIndex] = {};
      }
      updatedRows[rowIndex][columnName] = value;
      return { ...prev, [fieldId]: updatedRows };
    });
  };

  const addTableRow = (fieldId) => {
    setTableData(prev => {
      const tableRows = prev[fieldId] || [];
      return { ...prev, [fieldId]: [...tableRows, {}] };
    });
  };

  const removeTableRow = (fieldId, rowIndex) => {
    setTableData(prev => {
      const tableRows = prev[fieldId] || [];
      return { ...prev, [fieldId]: tableRows.filter((_, idx) => idx !== rowIndex) };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      ...tableData,
      calculated_score: hasScoring ? calculatedScore : undefined
    };
    onSubmit(finalData);
  };

  const renderField = (field) => {
    const value = formData[field.field_id] || "";

    // Check conditional logic
    if (field.conditional_logic?.show_if_field) {
      const triggerValue = formData[field.conditional_logic.show_if_field];
      const shouldShow = triggerValue === field.conditional_logic.show_if_value;
      if (!shouldShow) return null;
    }

    switch (field.field_type) {
      case "table":
        return renderTableField(field);
      
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            value={value}
            onChange={(e) => updateField(field.field_id, e.target.value)}
            placeholder={field.placeholder}
            type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text"}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => updateField(field.field_id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateField(field.field_id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => updateField(field.field_id, date?.toISOString().split('T')[0])}
              />
            </PopoverContent>
          </Popover>
        );

      case "time":
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => updateField(field.field_id, e.target.value)}
            required={field.required}
          />
        );

      case "select":
        return (
          <Select value={value} onValueChange={(val) => updateField(field.field_id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => updateField(field.field_id, checked)}
            />
            <span className="text-sm">{field.placeholder || field.field_label}</span>
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {(field.options || []).map(option => (
              <div key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.field_id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => updateField(field.field_id, e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{option}</span>
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">Unsupported field type: {field.field_type}</p>;
    }
  };

  const renderTableField = (field) => {
    const rows = tableData[field.field_id] || [];
    const columns = field.table_columns || [];

    if (columns.length === 0) {
      return (
        <div className="p-4 border-2 border-dashed border-red-300 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">⚠ Table configuration error: No columns defined</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-100 border-b">
          <div className="grid gap-2 p-2" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) 40px` }}>
            {columns.map((col, idx) => (
              <div key={idx} className="font-medium text-sm text-gray-700">
                {col.name}
                {field.required && idx === 0 && <span className="text-red-500 ml-1">*</span>}
              </div>
            ))}
            <div /> {/* Spacer for delete button */}
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No rows added yet. Click "Add Row" to start.</p>
            </div>
          ) : (
            rows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid gap-2 p-2 hover:bg-gray-50" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) 40px` }}>
                {columns.map((col, colIdx) => (
                  <div key={colIdx}>
                    {renderTableCell(field.field_id, rowIdx, col, row[col.name] || "")}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTableRow(field.field_id, rowIdx)}
                  className="text-red-600 hover:text-red-700 h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add Row Button */}
        <div className="p-2 bg-gray-50 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTableRow(field.field_id)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>
        </div>
      </div>
    );
  };

  const renderTableCell = (fieldId, rowIndex, column, value) => {
    switch (column.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => updateTableData(fieldId, rowIndex, column.name, e.target.value)}
            placeholder={column.name}
            className="h-8 text-sm"
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => updateTableData(fieldId, rowIndex, column.name, e.target.value)}
            placeholder={column.name}
            rows={2}
            className="text-sm"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateTableData(fieldId, rowIndex, column.name, e.target.value)}
            className="h-8 text-sm"
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateTableData(fieldId, rowIndex, column.name, e.target.value)}
            className="h-8 text-sm"
          />
        );

      case "time":
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => updateTableData(fieldId, rowIndex, column.name, e.target.value)}
            className="h-8 text-sm"
          />
        );

      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => updateTableData(fieldId, rowIndex, column.name, val)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(column.options || []).map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center justify-center h-8">
            <Checkbox
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => updateTableData(fieldId, rowIndex, column.name, checked)}
            />
          </div>
        );

      default:
        return <Input value={value} onChange={(e) => updateTableData(fieldId, rowIndex, column.name, e.target.value)} className="h-8 text-sm" />;
    }
  };

  // Check if any field has scoring enabled
  const hasScoring = (template.sections || []).some(s => 
    s.fields?.some(f => f.field_type === 'number' && f.include_in_score)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Score Display */}
      {hasScoring && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Score</p>
                <p className="text-3xl font-bold text-blue-600">{calculatedScore.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Calculated from numerical fields</p>
                <p className="text-xs text-gray-500">
                  {(template.sections || []).flatMap(s => s.fields || []).filter(f => f.include_in_score).length} fields included
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(template.sections || []).map((section, sIdx) => (
        <Card key={sIdx}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{section.section_title}</span>
              {section.is_repeatable && (
                <Badge variant="outline" className="text-xs">Repeatable</Badge>
              )}
            </CardTitle>
            {section.section_description && (
              <p className="text-sm text-gray-600">{section.section_description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {(section.fields || []).map((field, fIdx) => (
              <div key={fIdx}>
                <Label className="mb-2 block">
                  {field.field_label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderField(field)}
                {field.helper_text && (
                  <p className="text-xs text-gray-500 mt-1">{field.helper_text}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-3">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          Submit Form
        </Button>
      </div>
    </form>
  );
}