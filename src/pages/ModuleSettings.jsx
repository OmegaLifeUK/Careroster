import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Home, 
  MapPin, 
  Building2, 
  Activity,
  Settings,
  Check,
  X,
  AlertCircle,
  Save
} from "lucide-react";

const MODULES = [
  {
    id: "residential_care",
    name: "Residential Care",
    description: "Care home management with shifts, clients, and carers",
    icon: Home,
    color: "blue",
    features: [
      "Client management",
      "Carer scheduling",
      "Shift management",
      "Leave requests",
      "Incident reporting",
      "Medication tracking",
    ]
  },
  {
    id: "domiciliary_care",
    name: "Domiciliary Care",
    description: "Home care with visits, runs, and route optimization",
    icon: MapPin,
    color: "green",
    features: [
      "Visit scheduling",
      "Run management",
      "Route optimization",
      "Staff tracking",
      "Client communications",
      "Training management",
    ]
  },
  {
    id: "supported_living",
    name: "Supported Living",
    description: "Independent living support with properties and tenancies",
    icon: Building2,
    color: "indigo",
    features: [
      "Property management",
      "Tenancy tracking",
      "Support sessions",
      "Life skills goals",
      "Key worker assignments",
      "Different support models",
    ]
  },
  {
    id: "day_centre",
    name: "Day Centre",
    description: "Day services with activities, sessions, and attendance",
    icon: Activity,
    color: "amber",
    features: [
      "Activity library",
      "Session scheduling",
      "Attendance register",
      "Transport coordination",
      "Mood tracking",
      "Progress reporting",
    ]
  },
];

export default function ModuleSettings() {
  const [user, setUser] = useState(null);
  const [selectedModules, setSelectedModules] = useState({
    residential_care: true,
    domiciliary_care: true,
    supported_living: true,
    day_centre: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.AppSettings.list();
      return allSettings;
    },
  });

  useEffect(() => {
    const moduleSettings = settings.find(s => s.setting_key === 'enabled_modules');
    if (moduleSettings?.setting_value) {
      setSelectedModules(moduleSettings.setting_value);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (modules) => {
      const existingSetting = settings.find(s => s.setting_key === 'enabled_modules');
      
      if (existingSetting) {
        return base44.entities.AppSettings.update(existingSetting.id, {
          setting_value: modules,
          last_updated_by: user?.email,
        });
      } else {
        return base44.entities.AppSettings.create({
          setting_key: 'enabled_modules',
          setting_value: modules,
          description: 'Controls which care service modules are enabled in the application',
          last_updated_by: user?.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setHasChanges(false);
      alert('Module settings saved successfully! Please refresh the page to see the changes.');
    },
  });

  const handleToggle = (moduleId) => {
    const newModules = {
      ...selectedModules,
      [moduleId]: !selectedModules[moduleId],
    };
    setSelectedModules(newModules);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (Object.values(selectedModules).every(v => !v)) {
      alert('You must enable at least one module!');
      return;
    }
    saveMutation.mutate(selectedModules);
  };

  const handleReset = () => {
    const moduleSettings = settings.find(s => s.setting_key === 'enabled_modules');
    if (moduleSettings?.setting_value) {
      setSelectedModules(moduleSettings.setting_value);
    }
    setHasChanges(false);
  };

  const enabledCount = Object.values(selectedModules).filter(v => v).length;

  if (user?.role !== 'admin') {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Access Denied</h3>
                  <p className="text-sm text-red-800">
                    Only administrators can access module settings. Please contact your system administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Module Settings</h1>
              <p className="text-gray-500">Configure which care service modules are enabled</p>
            </div>
          </div>
        </div>

        {hasChanges && (
          <Card className="mb-6 border-2 border-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">You have unsaved changes</p>
                    <p className="text-sm text-orange-700">Save your changes to update the module configuration</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Active Modules</h3>
                <p className="text-sm text-gray-600">
                  {enabledCount} of {MODULES.length} modules enabled
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{enabledCount}</p>
                <p className="text-sm text-gray-500">modules active</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                style={{ width: `${(enabledCount / MODULES.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULES.map((module) => {
            const Icon = module.icon;
            const isEnabled = selectedModules[module.id];
            const colorClasses = {
              blue: {
                bg: "from-blue-50 to-cyan-50",
                icon: "from-blue-500 to-blue-600",
                border: "border-blue-200",
                checkbox: "text-blue-600",
              },
              green: {
                bg: "from-green-50 to-emerald-50",
                icon: "from-green-500 to-green-600",
                border: "border-green-200",
                checkbox: "text-green-600",
              },
              indigo: {
                bg: "from-indigo-50 to-purple-50",
                icon: "from-indigo-500 to-purple-600",
                border: "border-indigo-200",
                checkbox: "text-indigo-600",
              },
              amber: {
                bg: "from-amber-50 to-yellow-50",
                icon: "from-amber-500 to-orange-600",
                border: "border-amber-200",
                checkbox: "text-amber-600",
              },
            };
            const colors = colorClasses[module.color];

            return (
              <Card 
                key={module.id} 
                className={`hover:shadow-lg transition-all ${
                  isEnabled ? `border-2 ${colors.border}` : 'opacity-60'
                }`}
              >
                <CardHeader className={`border-b bg-gradient-to-r ${colors.bg}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 bg-gradient-to-br ${colors.icon} rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{module.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={() => handleToggle(module.id)}
                        className={`w-6 h-6 ${colors.checkbox}`}
                      />
                      {isEnabled ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          <X className="w-3 h-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Key Features:</h4>
                  <ul className="space-y-2">
                    {module.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Disabled modules will be hidden from all navigation menus</li>
                  <li>• Existing data for disabled modules will be preserved but not accessible</li>
                  <li>• Re-enabling a module will restore access to all previous data</li>
                  <li>• Changes take effect immediately after saving (page refresh recommended)</li>
                  <li>• At least one module must remain enabled</li>
                  <li>• Only administrators can modify these settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasChanges && (
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleReset}
              disabled={saveMutation.isPending}
            >
              Cancel Changes
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Save className="w-5 h-5 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Module Configuration'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}