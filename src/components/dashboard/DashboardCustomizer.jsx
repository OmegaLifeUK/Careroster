import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, RotateCcw } from "lucide-react";
import {
  Home,
  Users,
  GraduationCap,
  Shield,
  DollarSign,
  MessageSquare
} from "lucide-react";

const DEFAULT_MODULES = {
  occupancy: true,
  staff: true,
  training: true,
  incidents: true,
  finance: true,
  communication: true,
};

const MODULE_CONFIG = [
  {
    id: "occupancy",
    title: "Occupancy & Compliance",
    description: "Bed occupancy, medication alerts, and audits",
    icon: Home,
    color: "text-blue-600 bg-blue-100"
  },
  {
    id: "staff",
    title: "Staff Management",
    description: "Roster, attendance, and performance reviews",
    icon: Users,
    color: "text-green-600 bg-green-100"
  },
  {
    id: "training",
    title: "Training & Certification",
    description: "Training modules, certifications, and compliance",
    icon: GraduationCap,
    color: "text-purple-600 bg-purple-100"
  },
  {
    id: "incidents",
    title: "Incident Reporting",
    description: "Incident tracking, trends, and resolution",
    icon: Shield,
    color: "text-red-600 bg-red-100"
  },
  {
    id: "finance",
    title: "Finance & Billing",
    description: "Billing status, revenue, and financial overview",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-100"
  },
  {
    id: "communication",
    title: "Communication",
    description: "Staff announcements, family updates, and alerts",
    icon: MessageSquare,
    color: "text-indigo-600 bg-indigo-100"
  }
];

export default function DashboardCustomizer({ currentPreferences, onSave, onClose }) {
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
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Customize Your Dashboard</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Select the modules you want to see on your dashboard
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  {selectedCount} of {MODULE_CONFIG.length} modules selected
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Choose the modules most relevant to your role
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
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
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
                ⚠️ Please select at least one module to display on your dashboard
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">💡 Tips:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Your preferences are saved to your user profile</li>
              <li>• You can change these settings anytime</li>
              <li>• Different roles can have different dashboard views</li>
              <li>• Critical alerts will always be displayed regardless of settings</li>
            </ul>
          </div>
        </CardContent>

        <div className="border-t p-6 bg-gray-50 sticky bottom-0 flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedCount === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
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