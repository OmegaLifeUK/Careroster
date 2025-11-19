import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Edit } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function RoleManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: roles = [] } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: async () => {
      const data = await base44.entities.StaffRole.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingRole) {
        return base44.entities.StaffRole.update(editingRole.id, data);
      }
      return base44.entities.StaffRole.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
      setShowDialog(false);
      setEditingRole(null);
      toast.success("Success", "Role saved successfully");
    },
  });

  const permissionGroups = {
    clients: { label: "Clients", actions: ["view", "create", "edit", "delete", "view_medical"] },
    staff: { label: "Staff", actions: ["view", "create", "edit", "delete"] },
    schedule: { label: "Schedule", actions: ["view", "create", "edit", "delete", "assign_shifts"] },
    compliance: { 
      label: "Compliance", 
      actions: [
        "view_audits", "create_audits", "view_notifications", "submit_notifications",
        "view_medical_errors", "report_medical_errors", "view_complaints", "manage_complaints",
        "view_action_plans", "create_action_plans", "manage_inspections"
      ]
    },
    training: { 
      label: "Training", 
      actions: ["view_own_training", "view_all_training", "assign_training", "create_modules", "send_training_offers"]
    },
    reports: { label: "Reports", actions: ["view", "export"] },
    incidents: { label: "Incidents", actions: ["view", "create", "edit", "delete"] }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Management</h1>
            <p className="text-gray-500">Configure staff roles and permissions</p>
          </div>
          <Button onClick={() => { setEditingRole(null); setShowDialog(true); }} className="bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role.id} className={!role.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{role.role_name}</h3>
                    <Badge variant="outline" className="mt-1">{role.role_type}</Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setEditingRole(role); setShowDialog(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                )}
                <div className="space-y-2">
                  {Object.entries(permissionGroups).map(([key, group]) => {
                    const permissions = role.permissions?.[key];
                    const enabledCount = permissions ? Object.values(permissions).filter(v => v === true).length : 0;
                    
                    return enabledCount > 0 ? (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{group.label}:</span> {enabledCount} permission{enabledCount > 1 ? 's' : ''}
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showDialog && (
          <RoleDialog
            role={editingRole}
            permissionGroups={permissionGroups}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setShowDialog(false); setEditingRole(null); }}
            isSaving={saveMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function RoleDialog({ role, permissionGroups, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState(role || {
    role_name: "",
    role_type: "carer",
    description: "",
    is_active: true,
    permissions: {}
  });

  const togglePermission = (module, action) => {
    const newPermissions = { ...formData.permissions };
    if (!newPermissions[module]) newPermissions[module] = {};
    newPermissions[module][action] = !newPermissions[module][action];
    setFormData({ ...formData, permissions: newPermissions });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <CardTitle>{role ? 'Edit Role' : 'Create Role'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role Name *</Label>
                <Input
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  placeholder="e.g., Senior Carer"
                />
              </div>
              <div>
                <Label>Role Type</Label>
                <Select value={formData.role_type} onValueChange={(val) => setFormData({ ...formData, role_type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["admin", "manager", "carer", "compliance_officer", "trainer", "nurse", "custom"].map(type => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-4">Permissions</h3>
              <div className="space-y-4">
                {Object.entries(permissionGroups).map(([module, { label, actions }]) => (
                  <div key={module} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{label}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {actions.map(action => (
                        <label key={action} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.[module]?.[action] || false}
                            onChange={() => togglePermission(module, action)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{action.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active">Role is active</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button 
                onClick={() => onSave(formData)} 
                disabled={isSaving || !formData.role_name}
              >
                {isSaving ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}