import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Users, 
  Edit, 
  Eye,
  Trash2,
  Plus,
  Lock,
  Unlock,
  CheckCircle,
  X
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const DEFAULT_ROLES = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    color: 'bg-red-100 text-red-800',
    isSystem: true,
    permissions: {
      clients: { view: true, create: true, edit: true, delete: true },
      carers: { view: true, create: true, edit: true, delete: true },
      shifts: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true },
      incidents: { view: true, create: true, edit: true, delete: true },
      training: { view: true, create: true, edit: true, delete: true },
      finance: { view: true, create: true, edit: true, delete: true },
    }
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Operational management access',
    color: 'bg-blue-100 text-blue-800',
    isSystem: false,
    permissions: {
      clients: { view: true, create: true, edit: true, delete: false },
      carers: { view: true, create: true, edit: true, delete: false },
      shifts: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: false, delete: false },
      settings: { view: true, create: false, edit: false, delete: false },
      incidents: { view: true, create: true, edit: true, delete: false },
      training: { view: true, create: true, edit: true, delete: false },
      finance: { view: true, create: false, edit: false, delete: false },
    }
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Daily operations oversight',
    color: 'bg-green-100 text-green-800',
    isSystem: false,
    permissions: {
      clients: { view: true, create: false, edit: true, delete: false },
      carers: { view: true, create: false, edit: false, delete: false },
      shifts: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      incidents: { view: true, create: true, edit: true, delete: false },
      training: { view: true, create: false, edit: false, delete: false },
      finance: { view: false, create: false, edit: false, delete: false },
    }
  },
  {
    id: 'carer',
    name: 'Carer',
    description: 'Basic access for care staff',
    color: 'bg-purple-100 text-purple-800',
    isSystem: false,
    permissions: {
      clients: { view: true, create: false, edit: false, delete: false },
      carers: { view: false, create: false, edit: false, delete: false },
      shifts: { view: true, create: false, edit: false, delete: false },
      reports: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      incidents: { view: false, create: true, edit: false, delete: false },
      training: { view: true, create: false, edit: false, delete: false },
      finance: { view: false, create: false, edit: false, delete: false },
    }
  },
];

const PERMISSION_CATEGORIES = [
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'carers', label: 'Carers', icon: Users },
  { key: 'shifts', label: 'Shifts', icon: Calendar },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'incidents', label: 'Incidents', icon: Shield },
  { key: 'training', label: 'Training', icon: GraduationCap },
  { key: 'finance', label: 'Finance', icon: DollarSign },
];

export default function RoleManager() {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [editingRole, setEditingRole] = useState(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const { toast } = useToast();

  const updatePermission = (roleId, category, action, value) => {
    const updated = roles.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [category]: {
              ...role.permissions[category],
              [action]: value
            }
          }
        };
      }
      return role;
    });
    setRoles(updated);
    toast.success("Permission Updated", "Role permissions have been updated");
  };

  const deleteRole = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (role.isSystem) {
      toast.error("Cannot Delete", "System roles cannot be deleted");
      return;
    }
    
    if (confirm(`Delete role "${role.name}"?`)) {
      setRoles(roles.filter(r => r.id !== roleId));
      toast.success("Role Deleted", `${role.name} has been removed`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Role & Permission Management
          </h2>
          <p className="text-gray-600 mt-1">Configure access levels for different user types</p>
        </div>
        <Button
          onClick={() => setShowCreateRole(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{role.name}</CardTitle>
                      <Badge className={role.color}>{role.id}</Badge>
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingRole(editingRole === role.id ? null : role.id)}
                  >
                    {editingRole === role.id ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRole(role.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {editingRole === role.id && (
              <CardContent className="p-6 bg-gray-50">
                <div className="space-y-4">
                  {PERMISSION_CATEGORIES.map((category) => {
                    const CategoryIcon = category.icon;
                    const perms = role.permissions[category.key] || {};

                    return (
                      <div key={category.key} className="p-4 bg-white rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                          <CategoryIcon className="w-4 h-4 text-gray-600" />
                          <h4 className="font-semibold text-gray-900">{category.label}</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {['view', 'create', 'edit', 'delete'].map((action) => (
                            <div key={action} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-700 capitalize">{action}</span>
                              <Switch
                                checked={perms[action] || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(role.id, category.key, action, checked)
                                }
                                disabled={role.isSystem}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}