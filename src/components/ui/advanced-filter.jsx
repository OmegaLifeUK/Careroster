import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, Plus, Filter, ChevronDown, ChevronUp, Save, Star, Trash2, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const AdvancedFilter = ({ 
  filterConfig, 
  onFiltersChange,
  appliedFilters = [],
  allowSave = true,
  placeholder = "Search all fields..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(appliedFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedFilters, setSavedFilters] = useState(() => {
    const saved = localStorage.getItem('advanced_filters');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");

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
    setSearchQuery("");
    onFiltersChange([]);
  };

  const saveCurrentFilters = () => {
    if (!filterName.trim() || filters.length === 0) return;

    const newSavedFilter = {
      id: Date.now(),
      name: filterName,
      filters: filters,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newSavedFilter];
    setSavedFilters(updated);
    localStorage.setItem('advanced_filters', JSON.stringify(updated));
    
    setShowSaveDialog(false);
    setFilterName("");
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    onFiltersChange(savedFilter.filters);
  };

  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('advanced_filters', JSON.stringify(updated));
  };

  // Quick presets based on common use cases
  const quickPresets = [
    {
      label: "Active Only",
      icon: "🟢",
      filters: [{ id: Date.now(), field: 'status', operator: 'is', value: 'active' }]
    },
    {
      label: "This Week",
      icon: "📅",
      filters: [{ id: Date.now(), field: 'date', operator: 'greater than', value: new Date().toISOString().split('T')[0] }]
    },
    {
      label: "High Priority",
      icon: "⚠️",
      filters: [{ id: Date.now(), field: 'priority', operator: 'is', value: 'high' }]
    },
  ];

  const applyPreset = (preset) => {
    setFilters(preset.filters);
    onFiltersChange(preset.filters);
  };

  // Filter available fields based on search
  const filteredConfig = filterConfig.filter(config =>
    config.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.field.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={isOpen ? "bg-blue-50 border-blue-300" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
              {filters.length}
            </Badge>
          )}
          {isOpen ? <ChevronUp className="w-3 h-3 ml-2" /> : <ChevronDown className="w-3 h-3 ml-2" />}
        </Button>

        {savedFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-2 text-yellow-500" />
                Saved Filters ({savedFilters.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {savedFilters.map((saved) => (
                <div key={saved.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-100 rounded">
                  <button
                    onClick={() => loadSavedFilter(saved)}
                    className="flex-1 text-left text-sm py-1 px-1"
                  >
                    <div className="font-medium">{saved.name}</div>
                    <div className="text-xs text-gray-500">{saved.filters.length} filters</div>
                  </button>
                  <button
                    onClick={() => deleteSavedFilter(saved.id)}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {filters.length > 0 && (
          <>
            {allowSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </>
        )}
      </div>

      {isOpen && (
        <Card className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200 shadow-lg">
          {/* Quick Presets */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPresets.map((preset, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="text-xs hover:bg-blue-100 hover:border-blue-300"
                >
                  <span className="mr-1">{preset.icon}</span>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Filters */}
          <div className="space-y-2 mb-4">
            {filters.map((filter) => {
              const config = filterConfig.find(f => f.field === filter.field);
              if (!config) return null;

              return (
                <div key={filter.id} className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Badge variant="outline" className="font-medium">
                      {config.label}
                    </Badge>

                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50 transition-colors"
                    >
                      {config.operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>

                    {config.type === 'select' ? (
                      <select
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        className="flex-1 min-w-[150px] px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50 transition-colors"
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
                        className="flex-1 min-w-[150px]"
                      />
                    ) : (
                      <Input
                        type={config.type || 'text'}
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        placeholder={`Enter ${config.label.toLowerCase()}`}
                        className="flex-1 min-w-[150px]"
                      />
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(filter.id)}
                    className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Add Filter Section */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Add Filter Field
            </p>
            
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {filteredConfig
                .filter(config => !filters.find(f => f.field === config.field))
                .map(config => (
                  <Button
                    key={config.field}
                    variant="outline"
                    size="sm"
                    onClick={() => addFilter(config.field)}
                    className="justify-start hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    {config.label}
                  </Button>
                ))}
            </div>

            {filteredConfig.filter(config => !filters.find(f => f.field === config.field)).length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                {searchQuery ? "No matching fields found" : "All fields are in use"}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Compact Filter Display */}
      {filters.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => {
            const config = filterConfig.find(f => f.field === filter.field);
            return (
              <Badge key={filter.id} className="gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200 pr-1">
                <span className="font-medium">{config?.label}:</span> 
                <span className="text-xs">{filter.operator} "{filter.value}"</span>
                <button 
                  onClick={() => removeFilter(filter.id)}
                  className="hover:bg-blue-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-600" />
              Save Filter Configuration
            </h3>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Enter a name for this filter..."
              className="mb-4"
              onKeyPress={(e) => e.key === 'Enter' && saveCurrentFilters()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveCurrentFilters} 
                disabled={!filterName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};