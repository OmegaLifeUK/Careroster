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
        className={`flex items-center gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor} transition-all hover:shadow-md`}
      >
        <div className={`w-8 h-8 rounded-full ${config.accentColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          {description && (
            <p className="text-xs text-gray-600 truncate">{description}</p>
          )}
        </div>
        {action && (
          <Button size="sm" onClick={action} variant="ghost" className="flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss} className="flex-shrink-0">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-l-4 ${config.borderColor} overflow-hidden transition-all hover:shadow-lg`}>
      <CardContent className={`p-4 ${config.bgColor}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${config.accentColor} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              {priority === "high" && (
                <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>
              )}
            </div>

            <p className="text-sm text-gray-700 mb-3">{description}</p>

            {metric && (
              <div className="mb-3 p-3 bg-white/50 rounded-lg inline-flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{metric}</span>
                {metricLabel && (
                  <span className="text-sm text-gray-600">{metricLabel}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {action && (
                <Button 
                  size="sm" 
                  onClick={action}
                  className={config.accentColor}
                >
                  {actionLabel}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {secondaryAction && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={secondaryAction}
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
              className="flex-shrink-0 hover:bg-white/50"
            >
              <X className="w-4 h-4" />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Badge>{suggestions.length}</Badge>
        </div>
        {onDismissAll && (
          <Button variant="ghost" size="sm" onClick={onDismissAll}>
            Dismiss All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <SmartSuggestion key={idx} {...suggestion} />
        ))}
      </div>
    </div>
  );
}

export function InlineSuggestion({ icon: Icon, text, action, actionLabel }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
      {Icon && <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />}
      <span className="text-sm text-gray-700 flex-1">{text}</span>
      {action && (
        <Button size="sm" variant="link" onClick={action} className="text-blue-600 flex-shrink-0">
          {actionLabel || "Learn More"}
        </Button>
      )}
    </div>
  );
}