import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  Plus, 
  X,
  Filter,
  Save
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export const QuickFilters = ({ 
  currentFilters, 
  onFilterChange, 
  savedViews = [],
  onSaveView,
  onDeleteView,
  filterKey = "filters" 
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    
    onSaveView({
      name: newViewName,
      filters: currentFilters,
      timestamp: Date.now(),
    });
    
    setNewViewName("");
    setShowSaveDialog(false);
  };

  const hasActiveFilters = currentFilters && Object.keys(currentFilters).some(key => {
    const value = currentFilters[key];
    return value !== null && value !== undefined && value !== "" && value !== "all";
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Saved Views
            {savedViews.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {savedViews.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {savedViews.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              No saved views yet
            </div>
          ) : (
            savedViews.map((view, index) => (
              <DropdownMenuItem
                key={index}
                className="flex items-center justify-between"
                onClick={() => onFilterChange(view.filters)}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{view.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteView(index);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({})}
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="w-4 h-4 mr-1" />
          Clear Filters
        </Button>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Filter View</h3>
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Enter view name..."
              className="mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveView()}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewViewName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveView} disabled={!newViewName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};