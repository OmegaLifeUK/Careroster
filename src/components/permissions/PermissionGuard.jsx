import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield } from "lucide-react";

export default function PermissionGuard({ children, module, action, fallback = null }) {
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: async () => {
      const data = await base44.entities.StaffRole.list();
      return Array.isArray(data) ? data : [];
    },
  });

  if (currentUser?.role === 'admin') {
    return <>{children}</>;
  }

  const staffMember = staff.find(s => s.email === currentUser?.email);
  if (!staffMember || !staffMember.role_id) {
    if (fallback) return fallback;
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">Access Denied</p>
        <p className="text-sm text-gray-400 mt-1">You don't have permission to view this content</p>
      </div>
    );
  }

  const role = roles.find(r => r.id === staffMember.role_id);
  if (!role || !role.is_active) {
    if (fallback) return fallback;
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">Access Denied</p>
      </div>
    );
  }

  const hasPermission = role.permissions?.[module]?.[action] === true;

  if (!hasPermission) {
    if (fallback) return fallback;
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">Access Denied</p>
        <p className="text-sm text-gray-400 mt-1">Your role doesn't have permission for this action</p>
      </div>
    );
  }

  return <>{children}</>;
}