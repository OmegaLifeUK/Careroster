import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Users, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import RolePermissionsEditor from "@/components/rbac/RolePermissionsEditor";

export default function RoleManagement() {
  const [view, setView] = useState("roles"); // "roles" or "assignments"
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    role_name: "",
    description: "",
    priority: 50,
    permissions: {}
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: roles = [] } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: async () => {
      const data = await base44.entities.StaffRole.list();
      return Array.isArray(data) ? data.sort((a, b) => (b.priority || 0) - (a.priority || 0)) : [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['role-assignments'],
    queryFn: async () => {
      const data = await base44.entities.StaffRoleAssignment.list();
      return Array.isArray(data) ? data.filter(a => a.is_active) : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
      setShowRoleDialog(false);
      resetForm();
      toast.success("Success", "Role created successfully");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffRole.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
      setShowRoleDialog(false);
      setEditingRole(null);
      resetForm();
      toast.success("Success", "Role updated successfully");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
      toast.success("Success", "Role deleted successfully");
    },
  });

  const resetForm = () => {
    setRoleFormData({
      role_name: "",
      description: "",
      priority: 50,
      permissions: {}
    });
  };

  const handleSaveRole = () => {
    if (!roleFormData.role_name) {
      toast.error("Error", "Please enter a role name");
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: roleFormData });
    } else {
      createRoleMutation.mutate(roleFormData);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      role_name: role.role_name,
      description: role.description || "",
      priority: role.priority || 50,
      permissions: role.permissions || {}
    });
    setShowRoleDialog(true);
  };

  const handleDeleteRole = (id) => {
    if (confirm("Are you sure you want to delete this role? This will affect all staff assigned to it.")) {
      deleteRoleMutation.mutate(id);
    }
  };

  const getStaffCountForRole = (roleId) => {
    return assignments.filter(a => a.role_id === roleId).length;
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Management</h1>
            <p className="text-gray-500">Manage staff roles and permissions</p>
          </div>
          {view === "roles" && (
            <Button onClick={() => setShowRoleDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            variant={view === "roles" ? "default" : "outline"}
            onClick={() => setView("roles")}
          >
            <Shield className="w-4 h-4 mr-2" />
            Roles ({roles.length})
          </Button>
          <Button
            variant={view === "assignments" ? "default" : "outline"}
            onClick={() => setView("assignments")}
          >
            <Users className="w-4 h-4 mr-2" />
            Assignments ({assignments.length})
          </Button>
        </div>

        {view === "roles" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-semibold text-lg">{role.role_name}</h3>
                    </div>
                    <Badge variant="outline">Priority: {role.priority || 50}</Badge>
                  </div>
                  
                  {role.description && (
                    <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-4 text-sm">
                    <span className="text-gray-600">Assigned Staff:</span>
                    <Badge>{getStaffCountForRole(role.id)}</Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditRole(role)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Staff Role Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignments.map(assignment => {
                  const staffMember = staff.find(s => s.id === assignment.staff_id);
                  const role = roles.find(r => r.id === assignment.role_id);
                  
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{staffMember?.full_name || 'Unknown Staff'}</p>
                        <p className="text-sm text-gray-600">{assignment.user_email}</p>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-800">
                        {role?.role_name || 'Unknown Role'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {showRoleDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Role Name *</label>
                      <Input
                        value={roleFormData.role_name}
                        onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                        placeholder="e.g., Compliance Officer"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority Level</label>
                      <Input
                        type="number"
                        value={roleFormData.priority}
                        onChange={(e) => setRoleFormData({ ...roleFormData, priority: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={roleFormData.description}
                      onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                      placeholder="Describe the responsibilities of this role"
                      rows={2}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Permissions</h3>
                    <RolePermissionsEditor
                      permissions={roleFormData.permissions}
                      onChange={(permissions) => setRoleFormData({ ...roleFormData, permissions })}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowRoleDialog(false);
                        setEditingRole(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveRole}
                      disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {editingRole ? 'Update Role' : 'Create Role'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}