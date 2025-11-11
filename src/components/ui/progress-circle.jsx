import React from "react";

export const ProgressCircle = ({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 8,
  color = "#3b82f6",
  showLabel = true,
  label,
  children
}) => {
  const percentage = (value / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return "#22c55e"; // green
    if (percentage >= 50) return "#f59e0b"; // orange
    return "#ef4444"; // red
  };

  const displayColor = color === "auto" ? getColor() : color;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={displayColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            <span className="text-2xl font-bold" style={{ color: displayColor }}>
              {Math.round(percentage)}%
            </span>
            {showLabel && label && (
              <span className="text-xs text-gray-600 mt-1">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const ProgressBar = ({ 
  value, 
  max = 100, 
  color = "#3b82f6",
  height = "8px",
  showLabel = true,
  label,
  animated = true
}) => {
  const percentage = (value / max) * 100;

  const getColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const barColor = color === "auto" ? getColor() : color;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-bold text-gray-900">{value}/{max}</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
        <div
          className={`h-full ${typeof barColor === 'string' && barColor.startsWith('bg-') ? barColor : ''} ${
            animated ? 'transition-all duration-500' : ''
          }`}
          style={{ 
            width: `${percentage}%`,
            backgroundColor: typeof barColor === 'string' && !barColor.startsWith('bg-') ? barColor : undefined
          }}
        />
      </div>
    </div>
  );
};