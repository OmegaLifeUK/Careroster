import React from "react";

export const Skeleton = ({ className = "", width, height, circle = false }) => {
  const style = {
    width: width || '100%',
    height: height || '1rem',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${
        circle ? 'rounded-full' : 'rounded'
      } ${className}`}
      style={style}
    />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="p-6 border rounded-lg bg-white">
      <div className="flex items-start gap-4">
        <Skeleton circle width="48px" height="48px" />
        <div className="flex-1 space-y-3">
          <Skeleton height="20px" width="60%" />
          <Skeleton height="16px" width="40%" />
          <div className="flex gap-2">
            <Skeleton height="24px" width="80px" />
            <Skeleton height="24px" width="80px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} height="40px" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonList = ({ items = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
          <Skeleton circle width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton height="16px" width="70%" />
            <Skeleton height="14px" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
};