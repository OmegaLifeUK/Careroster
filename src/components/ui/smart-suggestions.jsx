import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Clock, AlertCircle } from "lucide-react";

export const SmartSuggestion = ({ 
  type = "info", 
  title, 
  description, 
  action,
  actionLabel = "Apply",
  onDismiss 
}) => {
  const types = {
    info: {
      icon: Sparkles,
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
      badgeColor: "bg-blue-100 text-blue-800"
    },
    optimization: {
      icon: TrendingUp,
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600",
      badgeColor: "bg-green-100 text-green-800"
    },
    warning: {
      icon: AlertCircle,
      color: "bg-orange-50 border-orange-200",
      iconColor: "text-orange-600",
      badgeColor: "bg-orange-100 text-orange-800"
    },
    tip: {
      icon: Clock,
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
      badgeColor: "bg-purple-100 text-purple-800"
    }
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <Card className={`border-l-4 ${config.color}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white ${config.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{title}</h4>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              </div>
              <Badge className={config.badgeColor}>
                {type}
              </Badge>
            </div>
            <div className="flex gap-2 mt-3">
              {action && actionLabel && (
                <Button size="sm" onClick={action}>
                  {actionLabel}
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SuggestionsList = ({ suggestions, onDismiss }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-lg">Smart Suggestions</h3>
        <Badge variant="secondary">{suggestions.length}</Badge>
      </div>
      {suggestions.map((suggestion, index) => (
        <SmartSuggestion
          key={index}
          {...suggestion}
          onDismiss={() => onDismiss(index)}
        />
      ))}
    </div>
  );
};