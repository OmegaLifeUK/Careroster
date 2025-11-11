import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit, 
  Download,
  X,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const BulkActions = ({ 
  selectedItems = [], 
  onSelectAll, 
  onDeselectAll, 
  totalItems,
  actions = []
}) => {
  const allSelected = selectedItems.length === totalItems && totalItems > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalItems;

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <button
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="p-1 hover:bg-blue-100 rounded transition-colors"
      >
        {allSelected ? (
          <CheckSquare className="w-5 h-5 text-blue-600" />
        ) : someSelected ? (
          <div className="w-5 h-5 border-2 border-blue-600 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-sm" />
          </div>
        ) : (
          <Square className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {selectedItems.length > 0 ? (
        <>
          <Badge variant="secondary" className="bg-blue-100 text-blue-900">
            {selectedItems.length} selected
          </Badge>

          <div className="flex-1" />

          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => action.onClick(selectedItems)}
              className="bg-white"
            >
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          ))}

          <button
            onClick={onDeselectAll}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </>
      ) : (
        <span className="text-sm text-blue-700">
          Select items to perform bulk actions
        </span>
      )}
    </div>
  );
};

export const SelectableRow = ({ isSelected, onToggle, children }) => {
  return (
    <div className={`relative ${isSelected ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-gray-100 rounded transition-colors"
      >
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-blue-600" />
        ) : (
          <Square className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <div className="pl-10">
        {children}
      </div>
    </div>
  );
};