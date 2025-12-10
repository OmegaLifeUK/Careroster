import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  TrendingUp,
  X,
  ChevronRight,
  Sparkles
} from "lucide-react";

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    accentColor: "bg-green-600"
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    iconColor: "text-orange-600",
    accentColor: "bg-orange-600"
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    accentColor: "bg-blue-600"
  },
  tip: {
    icon: Lightbulb,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    accentColor: "bg-purple-600"
  },
  insight: {
    icon: TrendingUp,
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    iconColor: "text-indigo-600",
    accentColor: "bg-indigo-600"
  },
  ai: {
    icon: Sparkles,
    bgColor: "bg-gradient-to-r from-purple-50 to-blue-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    accentColor: "bg-gradient-to-r from-purple-600 to-blue-600"
  }
};

export function SmartSuggestion({ 
  type = "info",
  title, 
  description, 
  action,
  actionLabel = "Take Action",
  secondaryAction,
  secondaryActionLabel,
  onDismiss,
  priority = "normal", // "low", "normal", "high"
  metric,
  metricLabel,
  compact = false
}) {
  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg border ${config.bgColor} ${config.borderColor} transition-all hover:shadow-md`}
      >
        <div className={`w-7 h-7 rounded-full ${config.accentColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{title}</p>
          {description && (
            <p className="text-xs text-gray-600 truncate">{description}</p>
          )}
        </div>
        {action && (
          <Button size="sm" onClick={action} variant="ghost" className="flex-shrink-0 h-7 w-7 p-0">
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss} className="flex-shrink-0 h-7 w-7 p-0">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-l-4 ${config.borderColor} overflow-hidden transition-all hover:shadow-lg`}>
      <CardContent className={`p-2.5 ${config.bgColor}`}>
        <div className="flex items-start gap-2.5">
          <div className={`w-9 h-9 rounded-lg ${config.accentColor} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
              {priority === "high" && (
                <Badge className="bg-red-100 text-red-800 text-xs px-1 py-0">Urgent</Badge>
              )}
            </div>

            <p className="text-xs text-gray-700 leading-tight">{description}</p>

            {metric && (
              <div className="mt-1 mb-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-900">{metric}</span> {metricLabel}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {action && (
                <Button 
                  size="sm" 
                  onClick={action}
                  className={`${config.accentColor} h-7 text-xs px-2.5`}
                >
                  {actionLabel}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
              {secondaryAction && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={secondaryAction}
                  className="h-7 text-xs px-2.5"
                >
                  {secondaryActionLabel}
                </Button>
              )}
            </div>
          </div>

          {onDismiss && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onDismiss}
              className="flex-shrink-0 hover:bg-white/50 h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SuggestionsPanel({ suggestions, title = "Smart Suggestions", onDismissAll }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <Badge className="text-xs px-1.5 py-0">{suggestions.length}</Badge>
        </div>
        {onDismissAll && (
          <Button variant="ghost" size="sm" onClick={onDismissAll} className="h-7 text-xs">
            Dismiss All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <SmartSuggestion key={idx} {...suggestion} />
        ))}
      </div>
    </div>
  );
}

export function InlineSuggestion({ icon: Icon, text, action, actionLabel }) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-blue-50 rounded-lg border border-blue-200">
      {Icon && <Icon className="w-3 h-3 text-blue-600 flex-shrink-0" />}
      <span className="text-xs text-gray-700 flex-1">{text}</span>
      {action && (
        <Button size="sm" variant="link" onClick={action} className="text-blue-600 flex-shrink-0 h-6 text-xs px-1">
          {actionLabel || "Learn More"}
        </Button>
      )}
    </div>
  );
}