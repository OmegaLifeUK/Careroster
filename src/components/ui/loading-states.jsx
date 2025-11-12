import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PageLoader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );
}

export function InlineLoader({ size = "sm", message }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className="flex items-center gap-2">
      <Loader2 className={`${sizes[size]} animate-spin text-blue-600`} />
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }) {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className={`w-full`} style={{ height: `${height}px` }} />
      </CardContent>
    </Card>
  );
}