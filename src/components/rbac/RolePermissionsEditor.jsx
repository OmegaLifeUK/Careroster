import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const permissionModules = {
  clients: {
    label: "Clients",
    permissions: [
      { key: "view", label: "View Clients" },
      { key: "create", label: "Create Clients" },
      { key: "edit", label: "Edit Clients" },
      { key: "delete", label: "Delete Clients" },
      { key: "view_medical_records", label: "View Medical Records" },
      { key: "view_confidential_docs", label: "View Confidential Documents" }
    ]
  },
  staff: {
    label: "Staff",
    permissions: [
      { key: "view", label: "View Staff" },
      { key: "create", label: "Create Staff" },
      { key: "edit", label: "Edit Staff" },
      { key: "delete", label: "Delete Staff" },
      { key: "view_personal_info", label: "View Personal Information" }
    ]
  },
  schedule: {
    label: "Schedule",
    permissions: [
      { key: "view", label: "View Schedule" },
      { key: "create", label: "Create Shifts" },
      { key: "edit", label: "Edit Shifts" },
      { key: "delete", label: "Delete Shifts" },
      { key: "assign_staff", label: "Assign Staff to Shifts" }
    ]
  },
  training: {
    label: "Training",
    permissions: [
      { key: "view", label: "View Training" },
      { key: "create_modules", label: "Create Training Modules" },
      { key: "assign_training", label: "Assign Training" },
      { key: "view_all_records", label: "View All Training Records" },
      { key: "approve_completion", label: "Approve Training Completion" }
    ]
  },
  compliance: {
    label: "Compliance",
    permissions: [
      { key: "view_audits", label: "View Audits" },
      { key: "create_audits", label: "Create Audits" },
      { key: "view_notifications", label: "View Regulatory Notifications" },
      { key: "create_notifications", label: "Create Regulatory Notifications" },
      { key: "view_medical_errors", label: "View Medical Errors" },
      { key: "create_medical_errors", label: "Report Medical Errors" },
      { key: "view_action_plans", label: "View Action Plans" },
      { key: "create_action_plans", label: "Create Action Plans" },
      { key: "approve_action_plans", label: "Approve Action Plans" }
    ]
  },
  reports: {
    label: "Reports",
    permissions: [
      { key: "view_basic", label: "View Basic Reports" },
      { key: "view_financial", label: "View Financial Reports" },
      { key: "view_compliance", label: "View Compliance Reports" },
      { key: "export_data", label: "Export Data" }
    ]
  },
  incidents: {
    label: "Incidents",
    permissions: [
      { key: "view", label: "View Incidents" },
      { key: "create", label: "Create Incidents" },
      { key: "edit", label: "Edit Incidents" },
      { key: "delete", label: "Delete Incidents" },
      { key: "view_all", label: "View All Incidents" }
    ]
  },
  complaints: {
    label: "Complaints",
    permissions: [
      { key: "view", label: "View Complaints" },
      { key: "create", label: "Create Complaints" },
      { key: "respond", label: "Respond to Complaints" },
      { key: "resolve", label: "Resolve Complaints" }
    ]
  }
};

export default function RolePermissionsEditor({ permissions, onChange }) {
  const handleToggle = (module, permission) => {
    const newPermissions = { ...permissions };
    
    if (!newPermissions[module]) {
      newPermissions[module] = {};
    }
    
    newPermissions[module][permission] = !newPermissions[module]?.[permission];
    onChange(newPermissions);
  };

  const handleToggleModule = (module, value) => {
    const newPermissions = { ...permissions };
    const moduleConfig = permissionModules[module];
    
    newPermissions[module] = {};
    moduleConfig.permissions.forEach(perm => {
      newPermissions[module][perm.key] = value;
    });
    
    onChange(newPermissions);
  };

  const isModuleFullyEnabled = (module) => {
    if (!permissions[module]) return false;
    const moduleConfig = permissionModules[module];
    return moduleConfig.permissions.every(perm => permissions[module]?.[perm.key] === true);
  };

  return (
    <div className="space-y-4">
      {Object.entries(permissionModules).map(([moduleKey, moduleConfig]) => {
        const isFullyEnabled = isModuleFullyEnabled(moduleKey);
        
        return (
          <Card key={moduleKey}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{moduleConfig.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleModule(moduleKey, true)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() => handleToggleModule(moduleKey, false)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Disable All
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {moduleConfig.permissions.map(perm => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={permissions[moduleKey]?.[perm.key] === true}
                      onChange={() => handleToggle(moduleKey, perm.key)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}