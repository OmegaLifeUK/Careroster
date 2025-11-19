import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: roleAssignment } = useQuery({
    queryKey: ['user-role-assignment', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const assignments = await base44.entities.StaffRoleAssignment.filter({ 
        user_email: currentUser.email,
        is_active: true 
      });
      return Array.isArray(assignments) && assignments.length > 0 ? assignments[0] : null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: role } = useQuery({
    queryKey: ['staff-role', roleAssignment?.role_id],
    queryFn: async () => {
      if (!roleAssignment?.role_id) return null;
      const roles = await base44.entities.StaffRole.filter({ id: roleAssignment.role_id });
      return Array.isArray(roles) && roles.length > 0 ? roles[0] : null;
    },
    enabled: !!roleAssignment?.role_id,
  });

  // Admin users have all permissions
  if (currentUser?.role === 'admin') {
    return {
      hasPermission: () => true,
      hasAnyPermission: () => true,
      permissions: null,
      role: { role_name: 'Admin' },
      isAdmin: true,
      isLoading: false
    };
  }

  const hasPermission = (module, action) => {
    if (!role?.permissions) return false;
    
    // Check custom permissions first
    if (roleAssignment?.custom_permissions?.[module]?.[action] !== undefined) {
      return roleAssignment.custom_permissions[module][action];
    }
    
    // Check role permissions
    return role.permissions?.[module]?.[action] === true;
  };

  const hasAnyPermission = (checks) => {
    return checks.some(({ module, action }) => hasPermission(module, action));
  };

  return {
    hasPermission,
    hasAnyPermission,
    permissions: role?.permissions || {},
    role,
    isAdmin: false,
    isLoading: !currentUser || (currentUser.email && !role && roleAssignment !== null)
  };
}

export function ProtectedComponent({ children, module, action, fallback = null }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(module, action)) {
    return fallback;
  }

  return children;
}

export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return fallback;
  }

  return children;
}