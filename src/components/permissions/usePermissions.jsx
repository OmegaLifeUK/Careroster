import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
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

  const checkPermission = (module, action) => {
    if (currentUser?.role === 'admin') return true;

    const staffMember = staff.find(s => s.email === currentUser?.email);
    if (!staffMember || !staffMember.role_id) return false;

    const role = roles.find(r => r.id === staffMember.role_id);
    if (!role || !role.is_active) return false;

    return role.permissions?.[module]?.[action] === true;
  };

  const getRole = () => {
    if (currentUser?.role === 'admin') return { role_name: 'Administrator', role_type: 'admin' };

    const staffMember = staff.find(s => s.email === currentUser?.email);
    if (!staffMember || !staffMember.role_id) return null;

    return roles.find(r => r.id === staffMember.role_id);
  };

  return {
    checkPermission,
    getRole,
    isAdmin: currentUser?.role === 'admin',
  };
}