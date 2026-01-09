import { base44 } from "@/api/base44Client";

/**
 * Checks if a staff member is compliant and fit to work
 * BLOCKING RULE: Staff must have onboarding_status = 'approved_fit_to_work'
 */
export async function checkStaffCompliance(staffId) {
  try {
    // Check Staff entity
    const staff = await base44.entities.Staff.filter({ id: staffId });
    if (staff && staff.length > 0) {
      const s = staff[0];
      if (s.onboarding_status === 'approved_fit_to_work' && s.is_active) {
        return { canWork: true, reason: null };
      }
      return { 
        canWork: false, 
        reason: `Staff onboarding not complete. Status: ${s.onboarding_status || 'unknown'}`
      };
    }

    // Check Carer entity
    const carers = await base44.entities.Carer.filter({ id: staffId });
    if (carers && carers.length > 0) {
      const c = carers[0];
      if (c.onboarding_status === 'approved_fit_to_work' && c.status === 'active') {
        return { canWork: true, reason: null };
      }
      return { 
        canWork: false, 
        reason: `Carer onboarding not complete. Status: ${c.onboarding_status || 'unknown'}`
      };
    }

    return { canWork: false, reason: 'Staff record not found' };
  } catch (error) {
    console.error("Compliance check error:", error);
    return { canWork: false, reason: 'Error checking compliance' };
  }
}

/**
 * Validates if staff can be assigned before shift/visit creation
 */
export async function validateStaffAssignment(staffId, staffName) {
  const check = await checkStaffCompliance(staffId);
  
  if (!check.canWork) {
    throw new Error(
      `Cannot assign ${staffName}: ${check.reason}\n\n` +
      `Staff must complete onboarding (Pre-employment, DBS, Training, Induction) ` +
      `before being assigned to clients.`
    );
  }
  
  return true;
}