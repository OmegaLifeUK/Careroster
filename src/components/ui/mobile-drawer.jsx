import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileDrawer({ 
  isOpen, 
  onClose, 
  children, 
  title,
  position = "bottom", // "bottom", "right", "left"
  size = "auto" // "auto", "full", "large", "medium", "small"
}) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    auto: position === "bottom" ? "max-h-[90vh]" : "max-w-md",
    full: position === "bottom" ? "h-screen" : "w-screen",
    large: position === "bottom" ? "h-[80vh]" : "w-[600px]",
    medium: position === "bottom" ? "h-[60vh]" : "w-[400px]",
    small: position === "bottom" ? "h-[40vh]" : "w-[300px]"
  };

  const positionClasses = {
    bottom: "bottom-0 left-0 right-0 rounded-t-2xl",
    right: "right-0 top-0 bottom-0 rounded-l-2xl",
    left: "left-0 top-0 bottom-0 rounded-r-2xl"
  };

  const animationClasses = {
    bottom: isOpen ? "translate-y-0" : "translate-y-full",
    right: isOpen ? "translate-x-0" : "translate-x-full",
    left: isOpen ? "translate-x-0" : "-translate-x-full"
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Drawer */}
      <div
        className={`fixed ${positionClasses[position]} ${sizeClasses[size]} bg-white shadow-2xl z-50 transition-transform duration-300 ease-out ${animationClasses[position]} flex flex-col`}
      >
        {/* Handle for bottom drawer */}
        {position === "bottom" && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}

export function MobileBottomSheet({ isOpen, onClose, children, title }) {
  return (
    <MobileDrawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      position="bottom"
      size="auto"
    >
      {children}
    </MobileDrawer>
  );
}