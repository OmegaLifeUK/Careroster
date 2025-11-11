import React, { useState, useRef, useEffect } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const InlineEdit = ({ 
  value, 
  onSave, 
  type = "text",
  placeholder = "Click to edit",
  className = "",
  displayComponent: DisplayComponent
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`group cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors ${className}`}
      >
        <div className="flex items-center gap-2">
          {DisplayComponent ? (
            <DisplayComponent value={value} />
          ) : (
            <span className={value ? '' : 'text-gray-400'}>
              {value || placeholder}
            </span>
          )}
          <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {type === "textarea" ? (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 border rounded text-sm resize-none"
          rows={3}
          disabled={isSaving}
        />
      ) : (
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={isSaving}
        />
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={isSaving}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <Check className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCancel}
        disabled={isSaving}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const InlineEditText = (props) => <InlineEdit {...props} type="text" />;
export const InlineEditNumber = (props) => <InlineEdit {...props} type="number" />;
export const InlineEditDate = (props) => <InlineEdit {...props} type="date" />;
export const InlineEditTextarea = (props) => <InlineEdit {...props} type="textarea" />;