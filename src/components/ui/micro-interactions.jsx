import React, { useState } from "react";
import { CheckCircle, X } from "lucide-react";

export function AnimatedCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-blue-600 border-blue-600 scale-110'
            : 'border-gray-300 group-hover:border-blue-400'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <CheckCircle className="w-4 h-4 text-white animate-in zoom-in-50 duration-200" />
        )}
      </div>
      {label && (
        <span className={`text-sm ${checked ? 'text-gray-700' : 'text-gray-600'} group-hover:text-gray-900`}>
          {label}
        </span>
      )}
    </label>
  );
}

export function PulseNotification({ count, onClick }) {
  if (count === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center w-6 h-6"
    >
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs font-semibold items-center justify-center">
        {count}
      </span>
    </button>
  );
}

export function RippleButton({ children, onClick, className = "" }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = { x, y, id: Date.now() };
    
    setRipples(prev => [...prev, ripple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 600);
    
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white opacity-30 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
        />
      ))}
    </button>
  );
}

export function ProgressRing({ progress, size = 48, strokeWidth = 4, className = "" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-600 transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-semibold">{progress}%</span>
    </div>
  );
}

export function FloatingActionButton({ icon: Icon, onClick, label, className = "" }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-8 right-8 z-40 flex items-center gap-2 bg-blue-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all ${className}`}
    >
      <div className="w-14 h-14 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      {isHovered && label && (
        <span className="pr-4 font-medium animate-in slide-in-from-left duration-200">
          {label}
        </span>
      )}
    </button>
  );
}

export function SkeletonPulse({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer ${className}`} />
  );
}