import { base44 } from "@/api/base44Client";

/**
 * Automated Workflow Engine
 * Handles background automation and data synchronization across modules
 */

/**
 * Auto-sync client data when care plan is updated
 */
export async function syncClientFromCarePlan(carePlanId, clientId) {
  try {
    const carePlan = await base44.entities.CarePlan.filter({ id: carePlanId });
    if (!carePlan || carePlan.length === 0) return;
    
    const plan = carePlan[0];
    const updates = {};
    
    // Sync mobility
    if (plan.physical_health?.mobility) {
      updates.mobility = plan.physical_health.mobility;
    }
    
    // Sync care needs
    if (plan.care_tasks?.length > 0) {
      const careNeeds = plan.care_tasks
        .filter(t => t.is_active)
        .map(t => t.category)
        .filter((v, i, a) => a.indexOf(v) === i); // unique
      updates.care_needs = careNeeds;
    }
    
    // Sync medical notes with latest objectives
    if (plan.care_objectives?.length > 0) {
      const activeObjectives = plan.care_objectives
        .filter(o => o.status !== 'discontinued')
        .map(o => o.objective);
      updates.medical_notes = `Current care objectives:\n${activeObjectives.join('\n')}`;
    }
    
    if (Object.keys(updates).length > 0) {
      await base44.entities.Client.update(clientId, updates);
    }
  } catch (err) {
    console.error("Failed to sync client from care plan:", err);
  }
}

/**
 * Auto-generate shifts from care plan tasks
 */
export async function generateShiftsFromCarePlan(carePlanId, clientId, startDate, endDate) {
  try {
    const carePlans = await base44.entities.CarePlan.filter({ id: carePlanId });
    if (!carePlans || carePlans.length === 0) return { created: 0 };
    
    const plan = carePlans[0];
    const client = await base44.entities.Client.filter({ id: clientId });
    if (!client || client.length === 0) return { created: 0 };
    
    const clientData = client[0];
    const dailyTasks = (plan.care_tasks || []).filter(t => 
      t.is_active && (t.frequency === 'daily' || t.frequency === 'with_each_visit')
    );
    
    if (dailyTasks.length === 0) return { created: 0 };
    
    // Group tasks by time of day
    const tasksByTime = {
      morning: dailyTasks.filter(t => {
        const time = t.preferred_time || '';
        const hour = time ? parseInt(time.split(':')[0]) : 9;
        return hour >= 6 && hour < 12;
      }),
      afternoon: dailyTasks.filter(t => {
        const time = t.preferred_time || '';
        const hour = time ? parseInt(time.split(':')[0]) : 14;
        return hour >= 12 && hour < 18;
      }),
      evening: dailyTasks.filter(t => {
        const time = t.preferred_time || '';
        const hour = time ? parseInt(time.split(':')[0]) : 19;
        return hour >= 18;
      })
    };
    
    let created = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate daily shifts for the period
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // Morning shift if morning tasks exist
      if (tasksByTime.morning.length > 0) {
        await base44.entities.Shift.create({
          client_id: clientId,
          date: dateStr,
          start_time: "08:00",
          end_time: "10:00",
          duration_hours: 2,
          shift_type: "morning",
          status: "unfilled",
          care_type: plan.care_setting || "domiciliary",
          assignment_type: "client",
          tasks: tasksByTime.morning.map(t => t.task_name),
          notes: `Auto-generated from care plan: ${tasksByTime.morning.map(t => t.task_name).join(', ')}`
        });
        created++;
      }
      
      // Afternoon shift if afternoon tasks exist
      if (tasksByTime.afternoon.length > 0) {
        await base44.entities.Shift.create({
          client_id: clientId,
          date: dateStr,
          start_time: "14:00",
          end_time: "16:00",
          duration_hours: 2,
          shift_type: "afternoon",
          status: "unfilled",
          care_type: plan.care_setting || "domiciliary",
          assignment_type: "client",
          tasks: tasksByTime.afternoon.map(t => t.task_name),
          notes: `Auto-generated from care plan: ${tasksByTime.afternoon.map(t => t.task_name).join(', ')}`
        });
        created++;
      }
      
      // Evening shift if evening tasks exist
      if (tasksByTime.evening.length > 0) {
        await base44.entities.Shift.create({
          client_id: clientId,
          date: dateStr,
          start_time: "19:00",
          end_time: "21:00",
          duration_hours: 2,
          shift_type: "evening",
          status: "unfilled",
          care_type: plan.care_setting || "domiciliary",
          assignment_type: "client",
          tasks: tasksByTime.evening.map(t => t.task_name),
          notes: `Auto-generated from care plan: ${tasksByTime.evening.map(t => t.task_name).join(', ')}`
        });
        created++;
      }
    }
    
    return { created };
  } catch (err) {
    console.error("Failed to generate shifts:", err);
    return { created: 0, error: err.message };
  }
}

/**
 * Auto-update carer status based on leave requests
 */
export async function syncCarerStatusFromLeave(carerId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check for active leave
    const activeLeave = await base44.entities.LeaveRequest.filter({
      carer_id: carerId,
      status: "approved"
    });
    
    const onLeaveNow = activeLeave.some(leave => 
      leave.start_date <= today && leave.end_date >= today
    );
    
    // Update carer status
    await base44.entities.Carer.update(carerId, {
      status: onLeaveNow ? "on_leave" : "active"
    });
    
    return { updated: true, onLeaveNow };
  } catch (err) {
    console.error("Failed to sync carer status:", err);
    return { updated: false };
  }
}

/**
 * Geocode address and update coordinates
 */
export async function geocodeAndUpdateAddress(entityType, entityId, address) {
  if (!address?.postcode && !address?.city) return;
  
  try {
    const addressString = `${address.street || ''}, ${address.city || ''}, ${address.postcode || ''}, UK`;
    
    // Use LLM with internet context to get coordinates
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Get the latitude and longitude coordinates for this UK address: ${addressString}. Return only the coordinates.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" }
        }
      }
    });
    
    if (result.latitude && result.longitude) {
      const updatedAddress = {
        ...address,
        latitude: result.latitude,
        longitude: result.longitude
      };
      
      // Update the entity
      if (entityType === 'Carer') {
        await base44.entities.Carer.update(entityId, { address: updatedAddress });
      } else if (entityType === 'Client') {
        await base44.entities.Client.update(entityId, { address: updatedAddress });
      }
      
      return { success: true, coordinates: result };
    }
  } catch (err) {
    console.error("Geocoding failed:", err);
    return { success: false };
  }
}

/**
 * Auto-assign mandatory training when carer is created
 */
export async function assignMandatoryTraining(carerId) {
  try {
    // Get all mandatory training modules
    const allModules = await base44.entities.TrainingModule.list();
    const mandatoryModules = allModules.filter(m => m.is_mandatory);
    
    if (mandatoryModules.length === 0) return { assigned: 0 };
    
    let assigned = 0;
    for (const module of mandatoryModules) {
      try {
        await base44.entities.TrainingAssignment.create({
          staff_id: carerId,
          module_id: module.id,
          module_name: module.module_name,
          assigned_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
          status: "assigned",
          is_mandatory: true
        });
        assigned++;
      } catch (err) {
        console.error("Failed to assign training:", err);
      }
    }
    
    return { assigned };
  } catch (err) {
    console.error("Failed to assign mandatory training:", err);
    return { assigned: 0 };
  }
}