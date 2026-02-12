import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { 
  Users,
  UserPlus,
  Shield,
  Mail,
  Search,
  AlertCircle,
  Crown,
  User as UserIcon,
  Edit,
  RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [roleFilter, setRoleFilter] = useState("all"); // all, admin, user

  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        // Use the built-in User entity
        const users = await base44.entities.User.list();
        return users;
      } catch (error) {
        console.error("Error loading users:", error);
        return [];
      }
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      return base44.entities.User.update(userId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setEditingUser(null);
      setNewRole("");
      toast.success("Role updated successfully");
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      return await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      toast.success("User invited successfully", "They will receive an invitation email");
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("user");
      // Refresh the users list
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['all-users'] });
      }, 1000);
    },
    onError: (error) => {
      toast.error("Failed to invite user", error.message);
    },
  });

  const handleUpdateRole = (userId) => {
    if (!newRole) {
      toast.error("Please select a role");
      return;
    }
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      updateUserMutation.mutate({ userId, role: newRole });
    }
  };

  const handleInviteUser = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminUsers = allUsers.filter(u => u.role === 'admin');
  const regularUsers = allUsers.filter(u => u.role === 'user');

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
                    Only administrators can access user management. Please contact your system administrator.
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-500">Manage user roles and permissions</p>
              </div>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Invite User
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">{allUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Administrators</p>
                  <p className="text-2xl font-bold text-purple-600">{adminUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Regular Users</p>
                  <p className="text-2xl font-bold text-green-600">{regularUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>



        {/* Users List */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          u.role === 'admin' 
                            ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                            : 'bg-gradient-to-br from-blue-400 to-blue-600'
                        }`}>
                          <span className="text-white font-semibold text-lg">
                            {u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{u.full_name || 'No name'}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {u.role === 'admin' ? (
                          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Administrator
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">
                            User
                          </Badge>
                        )}

                        {editingUser === u.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="p-2 border rounded text-sm"
                            >
                              <option value="">Select role...</option>
                              <option value="admin">Administrator</option>
                              <option value="user">User</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateRole(u.id)}
                              disabled={updateUserMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(null);
                                setNewRole("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(u.id);
                              setNewRole(u.role);
                            }}
                            disabled={u.id === user.id}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Change Role
                          </Button>
                        )}
                      </div>
                    </div>

                    {u.id === user.id && (
                      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          This is your account
                        </p>
                      </div>
                    )}

                    {u.created_date && (
                      <div className="mt-3 text-xs text-gray-500">
                        Joined: {format(parseISO(u.created_date), 'PPP')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role *</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                The user will receive an invitation email with instructions to create their account.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteEmail("");
                  setInviteRole("user");
                }}
                disabled={inviteUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteUser}
                disabled={inviteUserMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {inviteUserMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}