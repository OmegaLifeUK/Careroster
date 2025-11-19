import { base44 } from "@/api/base44Client";

export async function triggerWorkflow(triggerType, entityId, entityType, entityData) {
  try {
    const actions = [];
    let actionPlanData = null;

    switch (triggerType) {
      case 'audit_failed':
      case 'audit_requires_improvement':
        // Check if there's an existing master audit action plan
        const existingPlans = await base44.entities.ActionPlan.filter({
          category: 'compliance',
          related_entity_type: 'audit',
          status: { $in: ['active', 'in_progress', 'draft'] }
        });
        
        const masterPlan = Array.isArray(existingPlans) && existingPlans.length > 0 
          ? existingPlans.find(p => p.title === 'Master Audit Action Plan')
          : null;

        const newActions = entityData.non_compliances?.map(nc => ({
          action: `[${entityData.area_audited} - ${entityData.audit_date}] ${nc.item}`,
          responsible_person: '',
          target_date: '',
          status: 'pending',
          notes: nc.description,
          audit_id: entityId
        })) || [];

        if (masterPlan) {
          // Add to existing master plan
          const updatedActions = [...(masterPlan.actions || []), ...newActions];
          await base44.entities.ActionPlan.update(masterPlan.id, {
            actions: updatedActions,
            description: `Consolidated audit action plan. Last updated from audit on ${entityData.audit_date}`
          });
          
          actions.push({
            action_type: 'update_action_plan',
            action_details: { action_plan_id: masterPlan.id, actions_added: newActions.length },
            completed: true,
            completed_at: new Date().toISOString()
          });
          
          await base44.entities.AuditRecord.update(entityId, { action_plan_id: masterPlan.id });
        } else {
          // Create new master plan
          actionPlanData = {
            title: 'Master Audit Action Plan',
            description: `Consolidated action plan for all audit findings. Created from audit on ${entityData.audit_date}`,
            category: 'compliance',
            priority: triggerType === 'audit_failed' ? 'high' : 'medium',
            status: 'active',
            target_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            related_entity_type: 'audit',
            related_entity_id: entityId,
            actions: newActions
          };
          
          const actionPlan = await base44.entities.ActionPlan.create(actionPlanData);
          actions.push({
            action_type: 'create_action_plan',
            action_details: { action_plan_id: actionPlan.id },
            completed: true,
            completed_at: new Date().toISOString()
          });
          
          await base44.entities.AuditRecord.update(entityId, { action_plan_id: actionPlan.id });
        }
        break;

      case 'notification_submitted':
        if (entityData.requires_regulatory_notification) {
          actions.push({
            action_type: 'send_notification',
            action_details: { notification_sent: true },
            completed: true,
            completed_at: new Date().toISOString()
          });
        }
        break;

      case 'medical_error_reported':
        if (entityData.severity === 'major' || entityData.severity === 'catastrophic') {
          actionPlanData = {
            title: `Medical Error Action Plan - ${entityData.error_type}`,
            description: `Automatically generated from medical error report`,
            category: 'clinical',
            priority: 'critical',
            status: 'active',
            target_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            related_entity_type: 'incident',
            related_entity_id: entityId,
            actions: [{
              action: 'Conduct root cause analysis',
              status: 'pending'
            }, {
              action: 'Implement corrective actions',
              status: 'pending'
            }]
          };
          
          const errorActionPlan = await base44.entities.ActionPlan.create(actionPlanData);
          actions.push({
            action_type: 'create_action_plan',
            action_details: { action_plan_id: errorActionPlan.id },
            completed: true,
            completed_at: new Date().toISOString()
          });
        }
        break;
    }

    const workflow = await base44.entities.AutomatedWorkflow.create({
      workflow_name: `Auto: ${triggerType.replace(/_/g, ' ')}`,
      trigger_type: triggerType,
      trigger_entity_id: entityId,
      trigger_entity_type: entityType,
      actions_taken: actions,
      status: actions.length > 0 ? 'completed' : 'pending',
      created_action_plan_id: actionPlanData ? actions[0]?.action_details?.action_plan_id : null
    });

    return workflow;
  } catch (error) {
    console.error('Workflow trigger error:', error);
    return null;
  }
}

export async function checkTrainingDeadlines() {
  try {
    const assignments = await base44.entities.TrainingAssignment.list();
    const today = new Date();
    
    for (const assignment of assignments) {
      if (assignment.completion_status !== 'completed' && assignment.due_date) {
        const dueDate = new Date(assignment.due_date);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        let reminderType = null;
        if (daysUntil < 0) {
          reminderType = 'overdue';
        } else if (daysUntil <= 7) {
          reminderType = 'deadline_approaching';
        }
        
        if (reminderType) {
          const existingReminder = await base44.entities.TrainingReminder.filter({
            staff_id: assignment.staff_id,
            training_assignment_id: assignment.id,
            reminder_type: reminderType,
            sent: false
          });
          
          if (!existingReminder || existingReminder.length === 0) {
            await base44.entities.TrainingReminder.create({
              staff_id: assignment.staff_id,
              training_assignment_id: assignment.id,
              training_module_id: assignment.training_module_id,
              reminder_type: reminderType,
              days_until_deadline: daysUntil,
              reminder_date: today.toISOString().split('T')[0],
              sent: false
            });
          }
        }
      }
      
      if (assignment.completion_status === 'completed' && assignment.expiry_date) {
        const expiryDate = new Date(assignment.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          const existingReminder = await base44.entities.TrainingReminder.filter({
            staff_id: assignment.staff_id,
            training_assignment_id: assignment.id,
            reminder_type: 'expiring_soon',
            sent: false
          });
          
          if (!existingReminder || existingReminder.length === 0) {
            await base44.entities.TrainingReminder.create({
              staff_id: assignment.staff_id,
              training_assignment_id: assignment.id,
              training_module_id: assignment.training_module_id,
              reminder_type: 'expiring_soon',
              days_until_deadline: daysUntilExpiry,
              reminder_date: today.toISOString().split('T')[0],
              sent: false
            });
          }
        } else if (daysUntilExpiry < 0) {
          await base44.entities.TrainingReminder.create({
            staff_id: assignment.staff_id,
            training_assignment_id: assignment.id,
            training_module_id: assignment.training_module_id,
            reminder_type: 'expired',
            days_until_deadline: daysUntilExpiry,
            reminder_date: today.toISOString().split('T')[0],
            sent: false
          });
        }
      }
    }
  } catch (error) {
    console.error('Training deadline check error:', error);
  }
}