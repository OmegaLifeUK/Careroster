import React from "react";
import { Button } from "@/components/ui/button";

const illustrations = {
  noData: (
    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" fill="#F3F4F6" />
      <path d="M70 90h60M70 110h40M70 130h50" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="160" cy="60" r="20" fill="#E5E7EB" />
      <path d="M150 60l10 10M170 60l-10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  noResults: (
    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none">
      <circle cx="80" cy="80" r="40" stroke="#9CA3AF" strokeWidth="4" fill="none" />
      <path d="M110 110l30 30" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="160" cy="40" r="15" fill="#E5E7EB" />
      <path d="M155 40h10M160 35v10" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  empty: (
    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none">
      <rect x="40" y="60" width="120" height="100" rx="8" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="3" />
      <circle cx="100" cy="110" r="20" fill="#E5E7EB" />
      <path d="M90 110h20M100 100v20" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  error: (
    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="60" fill="#FEE2E2" />
      <circle cx="100" cy="100" r="40" fill="#FECACA" />
      <path d="M85 85l30 30M115 85l-30 30" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="60" fill="#D1FAE5" />
      <path d="M70 100l20 20 40-40" stroke="#10B981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export const EnhancedEmptyState = ({ 
  type = "noData",
  title, 
  description, 
  action,
  actionLabel,
  secondaryAction,
  secondaryActionLabel,
  illustration,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {illustration || illustrations[type]}
      
      <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-500 max-w-md mb-8">
          {description}
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        {action && actionLabel && (
          <Button onClick={action} size="lg">
            {actionLabel}
          </Button>
        )}
        {secondaryAction && secondaryActionLabel && (
          <Button onClick={secondaryAction} variant="outline" size="lg">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};