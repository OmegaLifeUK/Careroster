import { base44 } from "@/api/base44Client";

/**
 * Central Data Synchronization Engine
 * Ensures data entered once propagates to all relevant areas
 * Based on CQC, Ofsted, CI (Wales/Scotland), and NICE guidelines
 */

// Workflow definitions based on regulatory requirements
const WORKFLOW_DEFINITIONS = {
  // Care Plan → Medication sync (CQC/NICE requirement)
  CARE_PLAN_MEDICATION_SYNC: {
    trigger: 'care_plan_created',
    actions: ['sync_medication_management', 'create_mar_sheet', 'update_daily_care_notes']
  },
  
  // Initial Assessment → Risk Assessment sync (CQC requirement)
  ASSESSMENT_RISK_SYNC: {
    trigger: 'initial_assessment_completed',
    actions: ['create_risk_assessment', 'update_care_plan_risks', 'create_alerts']
  },
  
  // Medication changes → eMar sync (NICE guideline)
  MEDICATION_EMAR_SYNC: {
    trigger: 'medication_updated',
    actions: ['update_mar_sheet', 'notify_staff', 'log_change']
  },
  
  // Client admission → Full setup (CQC/Ofsted requirement)
  CLIENT_ADMISSION_WORKFLOW: {
    trigger: 'client_created',
    actions: ['create_care_plan_template', 'setup_consent_forms', 'create_risk_assessments', 'setup_mar_sheet']
  },
  
  // Risk identified → Safety actions (CQC requirement)
  RISK_IDENTIFIED_WORKFLOW: {
    trigger: 'risk_identified',
    actions: ['update_care_plan', 'create_peep_if_needed', 'notify_manager', 'create_compliance_task']
  },
  
  // Incident → Multiple records (CQC/CI requirement)
  INCIDENT_WORKFLOW: {
    trigger: 'incident_reported',
    actions: ['update_risk_assessment', 'create_safeguarding_if_needed', 'notify_authorities', 'update_care_plan']
  },
  
  // Staff training → Compliance tracking (CQC requirement)
  TRAINING_COMPLIANCE_SYNC: {
    trigger: 'training_completed',
    actions: ['update_staff_record', 'update_compliance_matrix', 'assign_next_training']
  },
  
  // Daily notes → Progress tracking (CQC/Ofsted requirement)
  DAILY_NOTES_PROGRESS_SYNC: {
    trigger: 'daily_note_added',
    actions: ['update_care_plan_progress', 'check_goals_achievement', 'flag_concerns']
  }
};

/**
 * Sync care plan medications to medication management and eMar
 */
export const syncCarePlanMedications = async (carePlan) => {
  try {
    if (!carePlan.medication_management?.medications || carePlan.medication_management.medications.length === 0) {
      return { success: true, message: 'No medications to sync' };
    }

    const clientId = carePlan.client_id;
    const medications = carePlan.medication_management.medications;

    // Create/update MAR sheet
    const existingMAR = await base44.entities.MARSheet.filter({ client_id: clientId });
    
    if (existingMAR.length > 0) {
      // Update existing MAR sheet
      await base44.entities.MARSheet.update(existingMAR[0].id, {
        medications: medications.map(med => ({
          medication_name: med.name,
          dose: med.dose,
          frequency: med.frequency,
          route: med.route,
          time_of_day: med.time_of_day,
          instructions: med.special_instructions,
          is_prn: med.is_prn || false,
          prn_instructions: med.prn_instructions
        })),
        updated_from_care_plan: true,
        last_sync_date: new Date().toISOString()
      });
    } else {
      // Create new MAR sheet
      await base44.entities.MARSheet.create({
        client_id: clientId,
        month: new Date().toISOString().substring(0, 7),
        medications: medications.map(med => ({
          medication_name: med.name,
          dose: med.dose,
          frequency: med.frequency,
          route: med.route,
          time_of_day: med.time_of_day,
          instructions: med.special_instructions,
          is_prn: med.is_prn || false,
          prn_instructions: med.prn_instructions
        })),
        created_from_care_plan: true
      });
    }

    // Create medication logs for tracking
    for (const med of medications) {
      await base44.entities.MedicationLog.create({
        client_id: clientId,
        medication_name: med.name,
        dose: med.dose,
        route: med.route,
        status: 'scheduled',
        notes: 'Auto-synced from care plan',
        source: 'care_plan'
      });
    }

    return { success: true, message: 'Medications synced to eMar successfully' };
  } catch (error) {
    console.error('Error syncing medications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sync initial assessment risks to risk assessment and care plan
 */
export const syncAssessmentRisks = async (assessment, clientId) => {
  try {
    const risks = extractRisksFromAssessment(assessment);
    
    if (risks.length === 0) {
      return { success: true, message: 'No risks to sync' };
    }

    // Create/update risk assessment
    const existingRiskAssessments = await base44.entities.RiskAssessment.filter({ client_id: clientId });
    
    for (const risk of risks) {
      const riskData = {
        client_id: clientId,
        risk_type: risk.type,
        risk_description: risk.description,
        likelihood: risk.likelihood || 'medium',
        impact: risk.impact || 'medium',
        control_measures: risk.controlMeasures || '',
        review_date: calculateReviewDate(risk.likelihood, risk.impact),
        status: 'active',
        identified_in: 'initial_assessment',
        assessment_date: new Date().toISOString()
      };

      // Check if risk already exists
      const existingRisk = existingRiskAssessments.find(r => 
        r.risk_type === risk.type && r.risk_description === risk.description
      );

      if (existingRisk) {
        await base44.entities.RiskAssessment.update(existingRisk.id, riskData);
      } else {
        await base44.entities.RiskAssessment.create(riskData);
      }
    }

    // Update care plan with risks
    const carePlans = await base44.entities.CarePlan.filter({ client_id: clientId, status: 'active' });
    
    if (carePlans.length > 0) {
      const carePlan = carePlans[0];
      const existingRisks = carePlan.risk_factors || [];
      const newRiskFactors = [...existingRisks];

      for (const risk of risks) {
        if (!existingRisks.some(r => r.risk === risk.description)) {
          newRiskFactors.push({
            risk: risk.description,
            likelihood: risk.likelihood || 'medium',
            impact: risk.impact || 'medium',
            control_measures: risk.controlMeasures || ''
          });
        }
      }

      await base44.entities.CarePlan.update(carePlan.id, {
        risk_factors: newRiskFactors
      });
    }

    // Create alerts for high-risk items
    for (const risk of risks) {
      if (risk.likelihood === 'high' || risk.impact === 'high') {
        await base44.entities.ClientAlert.create({
          client_id: clientId,
          alert_type: 'risk_identified',
          severity: 'high',
          message: `High risk identified: ${risk.description}`,
          requires_action: true,
          status: 'active'
        });
      }
    }

    return { success: true, message: 'Risks synced successfully' };
  } catch (error) {
    console.error('Error syncing risks:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bi-directional medication sync (eMar ↔ Care Plan)
 */
export const syncMedicationBidirectional = async (medicationData, sourceType, clientId) => {
  try {
    if (sourceType === 'mar_sheet') {
      // Update care plan from eMar changes
      const carePlans = await base44.entities.CarePlan.filter({ client_id: clientId, status: 'active' });
      
      if (carePlans.length > 0) {
        await base44.entities.CarePlan.update(carePlans[0].id, {
          medication_management: {
            ...carePlans[0].medication_management,
            medications: medicationData,
            last_updated: new Date().toISOString(),
            updated_from: 'mar_sheet'
          }
        });
      }
    } else if (sourceType === 'care_plan') {
      // Update eMar from care plan changes
      await syncCarePlanMedications({ client_id: clientId, medication_management: { medications: medicationData } });
    }

    // Log the change
    await base44.entities.MedicationLog.create({
      client_id: clientId,
      medication_name: 'System sync',
      status: 'synced',
      notes: `Bidirectional sync from ${sourceType}`,
      log_date: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error in bidirectional sync:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Client admission workflow - sets up all required records (CQC/Ofsted requirement)
 */
export const runClientAdmissionWorkflow = async (clientId, careSetting) => {
  try {
    const results = {
      carePlan: null,
      riskAssessments: [],
      consents: [],
      marSheet: null,
      peep: null,
      alerts: []
    };

    // 1. Create initial care plan template
    results.carePlan = await base44.entities.CarePlan.create({
      client_id: clientId,
      care_setting: careSetting,
      plan_type: 'initial',
      assessment_date: new Date().toISOString(),
      review_date: calculateReviewDate('medium', 'medium'),
      status: 'draft',
      assessed_by: 'System',
      care_objectives: [],
      risk_factors: []
    });

    // 2. Create baseline risk assessments (CQC requirement)
    const baselineRisks = [
      { type: 'falls', description: 'Falls risk assessment required' },
      { type: 'safeguarding', description: 'Safeguarding assessment required' },
      { type: 'health_safety', description: 'Health and safety assessment required' }
    ];

    for (const risk of baselineRisks) {
      const riskAssessment = await base44.entities.RiskAssessment.create({
        client_id: clientId,
        risk_type: risk.type,
        risk_description: risk.description,
        likelihood: 'medium',
        impact: 'medium',
        status: 'pending',
        assessment_date: new Date().toISOString(),
        review_date: calculateReviewDate('medium', 'medium')
      });
      results.riskAssessments.push(riskAssessment);
    }

    // 3. Setup consent forms (CQC requirement)
    const consentTypes = ['care_plan', 'medication', 'data_sharing', 'photography'];
    
    for (const type of consentTypes) {
      const consent = await base44.entities.ClientConsent.create({
        client_id: clientId,
        consent_type: type,
        status: 'pending',
        requested_date: new Date().toISOString()
      });
      results.consents.push(consent);
    }

    // 4. Create MAR sheet template
    results.marSheet = await base44.entities.MARSheet.create({
      client_id: clientId,
      month: new Date().toISOString().substring(0, 7),
      medications: [],
      status: 'active'
    });

    // 5. Create PEEP (Personal Emergency Evacuation Plan) if needed
    results.peep = await base44.entities.PEEP.create({
      client_id: clientId,
      mobility_level: 'to_be_assessed',
      assistance_required: 'to_be_assessed',
      status: 'draft',
      created_date: new Date().toISOString()
    });

    // 6. Create welcome/admission alert
    results.alerts.push(await base44.entities.ClientAlert.create({
      client_id: clientId,
      alert_type: 'new_admission',
      severity: 'info',
      message: 'New client admission - complete all assessments within 7 days',
      requires_action: true,
      status: 'active'
    }));

    return { success: true, results };
  } catch (error) {
    console.error('Error in admission workflow:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Incident reporting workflow - propagates to all required areas (CQC/CI requirement)
 */
export const runIncidentWorkflow = async (incident) => {
  try {
    const clientId = incident.client_id;
    const results = {
      riskAssessment: null,
      safeguarding: null,
      carePlanUpdate: null,
      notifications: [],
      complianceTasks: []
    };

    // 1. Update or create risk assessment
    const risks = await base44.entities.RiskAssessment.filter({ client_id: clientId });
    const relatedRisk = risks.find(r => r.risk_type === incident.incident_type);

    if (relatedRisk) {
      results.riskAssessment = await base44.entities.RiskAssessment.update(relatedRisk.id, {
        likelihood: escalateLikelihood(relatedRisk.likelihood),
        last_incident_date: incident.incident_date,
        control_measures: `${relatedRisk.control_measures}\n\nUpdated after incident on ${incident.incident_date}: ${incident.description}`
      });
    } else {
      results.riskAssessment = await base44.entities.RiskAssessment.create({
        client_id: clientId,
        risk_type: incident.incident_type,
        risk_description: `Risk identified from incident: ${incident.description}`,
        likelihood: 'high',
        impact: determineSeverity(incident.severity),
        status: 'active',
        assessment_date: new Date().toISOString()
      });
    }

    // 2. Create safeguarding referral if needed (CQC requirement)
    if (requiresSafeguarding(incident)) {
      results.safeguarding = await base44.entities.SafeguardingReferral.create({
        client_id: clientId,
        concern_type: incident.incident_type,
        description: incident.description,
        severity: incident.severity,
        status: 'pending_review',
        reported_date: new Date().toISOString(),
        requires_external_referral: incident.severity === 'major'
      });
    }

    // 3. Update care plan with incident information
    const carePlans = await base44.entities.CarePlan.filter({ client_id: clientId, status: 'active' });
    
    if (carePlans.length > 0) {
      const carePlan = carePlans[0];
      const updatedRiskFactors = carePlan.risk_factors || [];
      
      updatedRiskFactors.push({
        risk: `Incident-related: ${incident.incident_type}`,
        likelihood: 'high',
        impact: determineSeverity(incident.severity),
        control_measures: incident.immediate_action || 'To be determined'
      });

      results.carePlanUpdate = await base44.entities.CarePlan.update(carePlan.id, {
        risk_factors: updatedRiskFactors,
        last_reviewed_date: new Date().toISOString(),
        last_reviewed_by: 'System (Incident workflow)'
      });
    }

    // 4. Create compliance tasks
    results.complianceTasks.push(await base44.entities.ComplianceTask.create({
      task_title: 'Review incident and update risk assessment',
      task_type: 'incident_review',
      priority: incident.severity === 'major' ? 'urgent' : 'high',
      due_date: calculateDueDate(1), // 1 day for review
      related_entity_type: 'Incident',
      related_entity_id: incident.id,
      status: 'pending'
    }));

    // 5. Notify relevant authorities if required (CQC/CI requirement)
    if (requiresAuthorityNotification(incident)) {
      results.notifications.push(await base44.entities.RegulatoryNotification.create({
        notification_type: 'incident',
        severity: incident.severity,
        description: incident.description,
        client_id: clientId,
        status: 'pending',
        must_notify_within_hours: 24,
        created_date: new Date().toISOString()
      }));
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error in incident workflow:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Daily care notes workflow - updates progress tracking (CQC/Ofsted requirement)
 */
export const runDailyNotesWorkflow = async (dailyNote) => {
  try {
    const clientId = dailyNote.client_id;
    
    // 1. Check if note contains goal progress
    const carePlans = await base44.entities.CarePlan.filter({ client_id: clientId, status: 'active' });
    
    if (carePlans.length > 0 && carePlans[0].care_objectives) {
      const objectives = carePlans[0].care_objectives;
      const updatedObjectives = objectives.map(obj => {
        // Check if daily note mentions this objective
        if (dailyNote.notes?.toLowerCase().includes(obj.objective?.toLowerCase().substring(0, 20))) {
          return {
            ...obj,
            review_notes: `${obj.review_notes || ''}\n${new Date().toISOString().split('T')[0]}: Progress noted in daily log`,
            status: determineObjectiveProgress(dailyNote.notes, obj.objective)
          };
        }
        return obj;
      });

      await base44.entities.CarePlan.update(carePlans[0].id, {
        care_objectives: updatedObjectives
      });
    }

    // 2. Flag concerns if present
    if (containsConcerns(dailyNote.notes)) {
      await base44.entities.ClientAlert.create({
        client_id: clientId,
        alert_type: 'concern_noted',
        severity: 'medium',
        message: `Concern noted in daily care notes: ${extractConcern(dailyNote.notes)}`,
        requires_action: true,
        status: 'active'
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in daily notes workflow:', error);
    return { success: false, error: error.message };
  }
};

// Helper functions
function extractRisksFromAssessment(assessment) {
  const risks = [];
  
  if (assessment.physical_health?.medical_conditions) {
    assessment.physical_health.medical_conditions.forEach(condition => {
      risks.push({
        type: 'health',
        description: `Medical condition: ${condition}`,
        likelihood: 'medium',
        impact: 'medium'
      });
    });
  }

  if (assessment.physical_health?.mobility === 'bed_bound' || assessment.physical_health?.mobility === 'wheelchair_user') {
    risks.push({
      type: 'falls',
      description: 'Mobility-related falls risk',
      likelihood: 'high',
      impact: 'high'
    });
  }

  if (assessment.mental_health?.behaviour_support_needs) {
    risks.push({
      type: 'behaviour',
      description: assessment.mental_health.behaviour_support_needs,
      likelihood: 'medium',
      impact: 'medium'
    });
  }

  return risks;
}

function calculateReviewDate(likelihood, impact) {
  const daysToAdd = (likelihood === 'high' || impact === 'high') ? 30 : 90;
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysToAdd);
  return reviewDate.toISOString().split('T')[0];
}

function calculateDueDate(days) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString().split('T')[0];
}

function escalateLikelihood(currentLikelihood) {
  const levels = ['low', 'medium', 'high'];
  const currentIndex = levels.indexOf(currentLikelihood);
  return levels[Math.min(currentIndex + 1, levels.length - 1)];
}

function determineSeverity(incidentSeverity) {
  const mapping = { 'minor': 'low', 'moderate': 'medium', 'major': 'high', 'critical': 'high' };
  return mapping[incidentSeverity] || 'medium';
}

function requiresSafeguarding(incident) {
  const safeguardingTypes = ['abuse', 'neglect', 'exploitation', 'safeguarding'];
  return safeguardingTypes.some(type => incident.incident_type?.includes(type)) || incident.severity === 'major';
}

function requiresAuthorityNotification(incident) {
  return incident.severity === 'major' || incident.severity === 'critical' || 
         incident.incident_type?.includes('death') || incident.incident_type?.includes('serious_injury');
}

function containsConcerns(notes) {
  const concernKeywords = ['concern', 'worried', 'deteriorat', 'issue', 'problem', 'refused', 'declined'];
  return concernKeywords.some(keyword => notes?.toLowerCase().includes(keyword));
}

function extractConcern(notes) {
  const sentences = notes?.split('.') || [];
  for (const sentence of sentences) {
    if (containsConcerns(sentence)) {
      return sentence.trim().substring(0, 100);
    }
  }
  return notes?.substring(0, 100) || '';
}

function determineObjectiveProgress(notes, objective) {
  if (notes?.toLowerCase().includes('achieved') || notes?.toLowerCase().includes('completed')) {
    return 'achieved';
  }
  if (notes?.toLowerCase().includes('progress') || notes?.toLowerCase().includes('improving')) {
    return 'in_progress';
  }
  return 'not_started';
}

export const DataSyncEngine = {
  syncCarePlanMedications,
  syncAssessmentRisks,
  syncMedicationBidirectional,
  runClientAdmissionWorkflow,
  runIncidentWorkflow,
  runDailyNotesWorkflow
};