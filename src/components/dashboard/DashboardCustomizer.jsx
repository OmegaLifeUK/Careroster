import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Save, Home, Users, GraduationCap, Shield, DollarSign, MessageSquare, Bell } from "lucide-react";

const WIDGET_OPTIONS = [
  { id: 'occupancy', label: 'Occupancy & Capacity', icon: Home, description: 'Bed occupancy and admission stats' },
  { id: 'staff', label: 'Staff & Shifts', icon: Users, description: 'Shift fill rates and staffing levels' },
  { id: 'training', label: 'Training Compliance', icon: GraduationCap, description: 'Training completion and expiring certificates' },
  { id: 'incidents', label: 'Incidents & Safety', icon: Shield, description: 'Incident trends and unresolved cases' },
  { id: 'finance', label: 'Financial Summary', icon: DollarSign, description: 'Revenue and payment status' },
  { id: 'communication', label: 'Communication Hub', icon: MessageSquare, description: 'Messages, feedback, and leave requests' },
  { id: 'alerts', label: 'System Alerts', icon: Bell, description: 'Automated alerts for missed tasks, meds, and visits' },
];

export default function DashboardCustomizer({ currentPreferences, onSave, onClose }) {
  const [preferences, setPreferences] = useState(currentPreferences || {});

  const toggleWidget = (widgetId) => {
    setPreferences(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const handleSave = () => {
    onSave(preferences);
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Customize Dashboard</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Choose which widgets to display on your dashboard
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>{enabledCount}</strong> of {WIDGET_OPTIONS.length} widgets enabled
            </p>
          </div>

          <div className="space-y-4">
            {WIDGET_OPTIONS.map((widget) => {
              const Icon = widget.icon;
              const isEnabled = preferences[widget.id];

              return (
                <div
                  key={widget.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isEnabled 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      isEnabled ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isEnabled ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor={`widget-${widget.id}`} className="text-base font-semibold cursor-pointer">
                          {widget.label}
                        </Label>
                        <Switch
                          id={`widget-${widget.id}`}
                          checked={isEnabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                      <p className="text-sm text-gray-600">{widget.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}