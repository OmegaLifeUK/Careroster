import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Star, 
  Plus, 
  X,
  Filter,
  Save,
  Trash2,
  Clock,
  TrendingUp,
  Zap
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
  filterKey = "filters",
  quickPresets = [] // Allow custom quick presets
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [recentFilters, setRecentFilters] = useState([]);

  // Track recently used filters
  useEffect(() => {
    if (hasActiveFilters) {
      const filterString = JSON.stringify(currentFilters);
      setRecentFilters(prev => {
        const filtered = prev.filter(f => JSON.stringify(f.filters) !== filterString);
        return [{ filters: currentFilters, timestamp: Date.now() }, ...filtered].slice(0, 3);
      });
    }
  }, [currentFilters]);

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

  // Default quick presets if none provided
  const defaultPresets = [
    {
      label: "All Active",
      icon: "🟢",
      filters: { status: 'active' }
    },
    {
      label: "Today",
      icon: "📅",
      filters: { date: new Date().toISOString().split('T')[0] }
    },
    {
      label: "This Week",
      icon: "📆",
      filters: { date_range: 'this_week' }
    },
  ];

  const presetsToUse = quickPresets.length > 0 ? quickPresets : defaultPresets;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Quick Preset Buttons */}
      {presetsToUse.map((preset, idx) => (
        <Button
          key={idx}
          variant={JSON.stringify(currentFilters) === JSON.stringify(preset.filters) ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(preset.filters)}
          className="text-xs"
        >
          <span className="mr-1">{preset.icon}</span>
          {preset.label}
        </Button>
      ))}

      {/* Saved Views Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Star className="w-4 h-4 mr-2 text-yellow-500" />
            Saved Views
            {savedViews.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {savedViews.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {savedViews.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p>No saved views yet</p>
              <p className="text-xs mt-1">Apply filters and save them for quick access</p>
            </div>
          ) : (
            <>
              {savedViews.map((view, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-2 py-2 hover:bg-gray-100 rounded mx-1"
                >
                  <button
                    onClick={() => onFilterChange(view.filters)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{view.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(view.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(index);
                    }}
                    className="p-1.5 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasActiveFilters}
            className="font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Recent Filters */}
      {recentFilters.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              Recent
              <Badge variant="secondary" className="ml-2">
                {recentFilters.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {recentFilters.map((recent, idx) => (
              <DropdownMenuItem
                key={idx}
                onClick={() => onFilterChange(recent.filters)}
              >
                <Zap className="w-4 h-4 mr-2 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">
                    {new Date(recent.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-xs font-mono truncate">
                    {Object.keys(recent.filters).length} filters applied
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({})}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4 mr-1" />
          Clear All
        </Button>
      )}

      {/* Active Filter Count */}
      {hasActiveFilters && (
        <Badge className="bg-blue-600 text-white">
          {Object.keys(currentFilters).filter(key => {
            const value = currentFilters[key];
            return value !== null && value !== undefined && value !== "" && value !== "all";
          }).length} active
        </Badge>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-600" />
              Save Filter View
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Give this filter configuration a name for quick access later
            </p>
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="e.g., Active Morning Shifts"
              className="mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveView()}
              autoFocus
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
              <Button 
                onClick={handleSaveView} 
                disabled={!newViewName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save View
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};