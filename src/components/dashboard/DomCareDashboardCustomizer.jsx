import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, RotateCcw } from "lucide-react";
import {
  Users,
  UserCircle,
  MapPin,
  Navigation,
  Activity
} from "lucide-react";

const DEFAULT_MODULES = {
  statsCards: true,
  todayRuns: true,
  todayStats: true,
  quickActions: true,
};

const MODULE_CONFIG = [
  {
    id: "statsCards",
    title: "Statistics Cards",
    description: "Active staff, clients, visits, and unfilled",
    icon: Users,
    color: "text-blue-600 bg-blue-100"
  },
  {
    id: "todayRuns",
    title: "Today's Runs",
    description: "Overview of today's scheduled runs",
    icon: Navigation,
    color: "text-purple-600 bg-purple-100"
  },
  {
    id: "todayStats",
    title: "Today's Statistics",
    description: "Detailed stats for today's operations",
    icon: Activity,
    color: "text-green-600 bg-green-100"
  },
  {
    id: "quickActions",
    title: "Quick Actions",
    description: "Shortcuts to common tasks",
    icon: MapPin,
    color: "text-orange-600 bg-orange-100"
  }
];

export default function DomCareDashboardCustomizer({ currentPreferences, onSave, onClose }) {
  const [preferences, setPreferences] = useState(currentPreferences || DEFAULT_MODULES);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (moduleId) => {
    setPreferences(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleReset = () => {
    setPreferences(DEFAULT_MODULES);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(preferences);
    setIsSaving(false);
  };

  const selectedCount = Object.values(preferences).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Customize Dom Care Dashboard</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Select the sections you want to see on your dashboard
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900">
                  {selectedCount} of {MODULE_CONFIG.length} sections selected
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Personalize your domiciliary care view
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULE_CONFIG.map((module) => {
              const Icon = module.icon;
              const isSelected = preferences[module.id];

              return (
                <Card
                  key={module.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-green-500 bg-green-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggle(module.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(module.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-2 rounded-lg ${module.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className="font-semibold text-gray-900">
                            {module.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedCount === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please select at least one section to display on your dashboard
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">💡 Tips:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Your preferences are saved to your user profile</li>
              <li>• You can change these settings anytime</li>
              <li>• Optimize your workflow with personalized views</li>
            </ul>
          </div>
        </CardContent>

        <div className="border-t p-6 bg-gray-50 sticky bottom-0 flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedCount === 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}