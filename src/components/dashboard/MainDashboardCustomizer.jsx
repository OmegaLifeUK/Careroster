import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, BarChart3, Calendar, Zap, Activity, Sparkles, Check } from "lucide-react";

const moduleConfig = [
  {
    id: "statsCards",
    title: "Statistics Cards",
    description: "Quick overview cards showing key metrics",
    icon: BarChart3,
    color: "from-blue-500 to-blue-600",
    recommended: true,
  },
  {
    id: "smartSuggestions",
    title: "Smart Suggestions",
    description: "AI-powered recommendations and insights",
    icon: Sparkles,
    color: "from-purple-500 to-pink-600",
    recommended: true,
    new: true,
  },
  {
    id: "todayShifts",
    title: "Today's Shifts",
    description: "Overview of shifts scheduled for today",
    icon: Calendar,
    color: "from-green-500 to-green-600",
    recommended: true,
  },
  {
    id: "quickActions",
    title: "Quick Actions",
    description: "Fast access to common tasks and actions",
    icon: Zap,
    color: "from-orange-500 to-orange-600",
    recommended: true,
  },
  {
    id: "recentActivity",
    title: "Recent Activity",
    description: "Latest updates and changes in the system",
    icon: Activity,
    color: "from-indigo-500 to-indigo-600",
    recommended: false,
  },
];

export default function MainDashboardCustomizer({ currentPreferences, onSave, onClose }) {
  const [preferences, setPreferences] = useState(currentPreferences || {});

  const toggleModule = (moduleId) => {
    setPreferences({
      ...preferences,
      [moduleId]: !preferences[moduleId],
    });
  };

  const selectAll = () => {
    const allEnabled = {};
    moduleConfig.forEach((module) => {
      allEnabled[module.id] = true;
    });
    setPreferences(allEnabled);
  };

  const selectRecommended = () => {
    const recommended = {};
    moduleConfig.forEach((module) => {
      recommended[module.id] = module.recommended;
    });
    setPreferences(recommended);
  };

  const handleSave = () => {
    onSave(preferences);
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-1">Customize Your Dashboard</CardTitle>
              <p className="text-sm text-white/80">
                Choose which modules to display on your dashboard
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-600">
                {enabledCount} of {moduleConfig.length} modules enabled
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectRecommended}>
                Recommended
              </Button>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {moduleConfig.map((module) => {
              const Icon = module.icon;
              const isEnabled = preferences[module.id];

              return (
                <div
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isEnabled
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{module.title}</h3>
                        {module.new && (
                          <Badge className="bg-green-100 text-green-800 text-xs">New</Badge>
                        )}
                        {module.recommended && (
                          <Badge variant="outline" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isEnabled
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {isEnabled && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        <div className="border-t p-4 flex justify-end gap-3 flex-shrink-0 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}