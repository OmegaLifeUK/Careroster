import React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, bgColor, isLoading, alert, linkTo }) {
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardHeader>
      </Card>
    );
  }

  const CardWrapper = linkTo ? Link : 'div';
  const wrapperProps = linkTo ? { to: linkTo } : {};

  return (
    <CardWrapper {...wrapperProps} className={linkTo ? 'block' : ''}>
      <Card className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 ${linkTo ? 'cursor-pointer hover:scale-105' : ''}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgColor} opacity-10 rounded-full transform translate-x-12 -translate-y-12`} />
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
              <CardTitle className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                {value}
                {alert && <AlertCircle className="w-5 h-5 text-orange-500" />}
              </CardTitle>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${bgColor} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardHeader>
      </Card>
    </CardWrapper>
  );
}