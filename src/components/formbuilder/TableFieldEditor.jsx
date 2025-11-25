import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

const COLUMN_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export default function TableFieldEditor({ columns = [], onChange }) {
  const addColumn = () => {
    const newColumn = {
      name: `Column ${columns.length + 1}`,
      type: "text",
      options: [],
    };
    onChange([...columns, newColumn]);
  };

  const updateColumn = (index, field, value) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    onChange(newColumns);
  };

  const deleteColumn = (index) => {
    onChange(columns.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Table Columns</p>
        <Button size="sm" variant="outline" onClick={addColumn}>
          <Plus className="w-3 h-3 mr-1" />
          Add Column
        </Button>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No columns defined. Add columns to create a table structure.
        </p>
      ) : (
        <div className="space-y-2">
          {columns.map((column, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded border">
              <GripVertical className="w-4 h-4 text-gray-400 mt-2 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={column.name}
                    onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                    placeholder="Column Name"
                    className="flex-1"
                  />
                  <Select
                    value={column.type}
                    onValueChange={(val) => updateColumn(idx, 'type', val)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteColumn(idx)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {column.type === 'select' && (
                  <Input
                    value={column.options?.join(', ') || ''}
                    onChange={(e) => updateColumn(idx, 'options', e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                    placeholder="Options (comma-separated)"
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}