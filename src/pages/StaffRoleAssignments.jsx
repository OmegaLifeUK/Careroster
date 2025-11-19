import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, UserCheck, Shield } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function StaffRoleAssignments() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    user_email: "",
    role_id: "",
    expiry_date: ""
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: assignments = [] } = useQuery({
    queryKey: ['role-assignments'],
    queryFn: async () => {
      const data = await base44.entities.StaffRoleAssignment.list('-assignment_date');
      return Array.isArray(data) ? data.filter(a => a.is_active) : [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: async () => {
      const data = await base44.entities.StaffRole.list();
      return Array.isArray(data) ? data.filter(r => r.is_active) : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await base44.entities.User.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffRoleAssignment.create({
      ...data,
      assignment_date: new Date().toISOString(),
      assigned_by: 'admin'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      setShowDialog(false);
      resetForm();
      toast.success("Success", "Role assigned successfully");
    },
  });

  const revokeAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffRoleAssignment.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      toast.success("Success", "Role revoked successfully");
    },
  });

  const resetForm = () => {
    setFormData({
      staff_id: "",
      user_email: "",
      role_id: "",
      expiry_date: ""
    });
  };

  const handleSave = () => {
    if (!formData.staff_id || !formData.role_id || !formData.user_email) {
      toast.error("Error", "Please fill in all required fields");
      return;
    }

    createAssignmentMutation.mutate(formData);
  };

  const handleRevoke = (id) => {
    if (confirm("Are you sure you want to revoke this role assignment?")) {
      revokeAssignmentMutation.mutate(id);
    }
  };

  const getStaffWithoutRole = () => {
    const assignedStaffIds = new Set(assignments.map(a => a.staff_id));
    return staff.filter(s => !assignedStaffIds.has(s.id));
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Role Assignments</h1>
            <p className="text-gray-500">Assign roles to staff members</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Assign Role
          </Button>
        </div>

        <div className="grid gap-4">
          {assignments.map(assignment => {
            const staffMember = staff.find(s => s.id === assignment.staff_id);
            const role = roles.find(r => r.id === assignment.role_id);
            const isExpired = assignment.expiry_date && new Date(assignment.expiry_date) < new Date();
            
            return (
              <Card key={assignment.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {staffMember?.full_name || 'Unknown Staff'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">{assignment.user_email}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-indigo-100 text-indigo-800 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {role?.role_name || 'Unknown Role'}
                          </Badge>
                          {isExpired && (
                            <Badge className="bg-red-100 text-red-800">Expired</Badge>
                          )}
                          {assignment.expiry_date && !isExpired && (
                            <Badge variant="outline">
                              Expires: {new Date(assignment.expiry_date).toLocaleDateString()}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            Assigned: {new Date(assignment.assignment_date).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(assignment.id)}
                      className="text-red-600"
                    >
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="border-b">
                <CardTitle>Assign Role to Staff</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Staff Member *</label>
                    <Select 
                      value={formData.staff_id} 
                      onValueChange={(val) => {
                        const selectedStaff = staff.find(s => s.id === val);
                        setFormData({ 
                          ...formData, 
                          staff_id: val,
                          user_email: selectedStaff?.email || ''
                        });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                      <SelectContent>
                        {getStaffWithoutRole().map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name} ({s.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Role *</label>
                    <Select value={formData.role_id} onValueChange={(val) => setFormData({ ...formData, role_id: val })}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.role_name} {r.description && `- ${r.description}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Expiry Date (Optional)</label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for permanent assignment</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={createAssignmentMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {createAssignmentMutation.isPending ? "Assigning..." : "Assign Role"}
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