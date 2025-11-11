import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Filter, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AdvancedFilter = ({ 
  filterConfig, 
  onFiltersChange,
  appliedFilters = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(appliedFilters);

  const addFilter = (field) => {
    const config = filterConfig.find(f => f.field === field);
    if (!config) return;

    const newFilter = {
      id: Date.now(),
      field,
      operator: config.operators[0],
      value: config.type === 'select' ? config.options[0] : '',
    };

    const updated = [...filters, newFilter];
    setFilters(updated);
    onFiltersChange(updated);
  };

  const updateFilter = (id, key, value) => {
    const updated = filters.map(f => 
      f.id === id ? { ...f, [key]: value } : f
    );
    setFilters(updated);
    onFiltersChange(updated);
  };

  const removeFilter = (id) => {
    const updated = filters.filter(f => f.id !== id);
    setFilters(updated);
    onFiltersChange(updated);
  };

  const clearAll = () => {
    setFilters([]);
    onFiltersChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {filters.length}
            </Badge>
          )}
        </Button>

        {filters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          {filters.map((filter) => {
            const config = filterConfig.find(f => f.field === filter.field);
            if (!config) return null;

            return (
              <div key={filter.id} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                  {config.label}
                </span>

                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  {config.operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>

                {config.type === 'select' ? (
                  <select
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  >
                    {config.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : config.type === 'date' ? (
                  <Input
                    type="date"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    type={config.type || 'text'}
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    placeholder={`Enter ${config.label.toLowerCase()}`}
                    className="flex-1"
                  />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(filter.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {filterConfig
                .filter(config => !filters.find(f => f.field === config.field))
                .map(config => (
                  <DropdownMenuItem
                    key={config.field}
                    onClick={() => addFilter(config.field)}
                  >
                    {config.label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {filters.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => {
            const config = filterConfig.find(f => f.field === filter.field);
            return (
              <Badge key={filter.id} variant="secondary" className="gap-1">
                {config?.label}: {filter.operator} {filter.value}
                <button onClick={() => removeFilter(filter.id)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};