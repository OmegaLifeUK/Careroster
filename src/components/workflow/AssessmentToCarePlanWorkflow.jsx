import { base44 } from "@/api/base44Client";

/**
 * Automated workflow: Initial Assessment → AI Care Plan → Related Records
 * Based on CQC/Ofsted/CI requirements for care planning
 */

/**
 * Monitors for completed assessments and triggers care plan generation
 */
export const checkForNewAssessments = async () => {
  try {
    // Check visits with completed assessment documents
    const visits = await base44.entities.Visit.filter({ 
      visit_type: 'assessment',
      status: 'completed'
    });
    
    const shifts = await base44.entities.Shift.list();
    const assessmentShifts = shifts.filter(s => 
      s.shift_type === 'assessment' && s.status === 'completed'
    );

    const allAssessments = [];

    // Process visits
    for (const visit of visits) {
      if (visit.assessment_documents?.length > 0 && !visit.linked_care_plan_id) {
        allAssessments.push({
          type: 'visit',
          id: visit.id,
          client_id: visit.client_id,
          documents: visit.assessment_documents,
          date: visit.actual_end || visit.scheduled_start
        });
      }
    }

    // Process shifts
    for (const shift of assessmentShifts) {
      if (shift.assessment_documents?.length > 0 && !shift.linked_care_plan_id) {
        allAssessments.push({
          type: 'shift',
          id: shift.id,
          client_id: shift.client_id,
          documents: shift.assessment_documents,
          date: shift.actual_end_time || shift.date
        });
      }
    }

    return allAssessments;
  } catch (error) {
    console.error("Error checking for assessments:", error);
    return [];
  }
};

/**
 * Generate care plan from assessment using AI
 */
export const generateCarePlanFromAssessment = async (assessment, clientId) => {
  try {
    const client = await base44.entities.Client.get(clientId);
    
    // Collect all assessment document URLs
    const documentUrls = assessment.documents
      .filter(doc => doc.document_url)
      .map(doc => doc.document_url);

    if (documentUrls.length === 0) {
      return { success: false, error: "No documents to analyze" };
    }

    // Use AI to extract structured care plan data from documents
    const prompt = `You are a care planning expert. Analyze the provided assessment documents and generate a comprehensive care plan.

Client: ${client.full_name}

Extract and structure the following information:

1. PHYSICAL HEALTH:
- Mobility level
- Continence status
- Nutrition needs
- Medical conditions
- Allergies

2. MENTAL HEALTH:
- Cognitive function
- Communication needs
- Behavioral support needs

3. CARE OBJECTIVES (at least 3-5):
For each objective include:
- Clear, measurable objective
- Outcome measures
- Target date (3-6 months from now)

4. CARE TASKS (at least 5-10):
For each task include:
- Task name
- Category (personal_care, nutrition, medication, mobility, social, etc.)
- Description
- Frequency (daily, twice_daily, weekly, etc.)
- Preferred time
- Duration in minutes
- Special instructions

5. MEDICATIONS:
For each medication include:
- Name
- Dose
- Frequency
- Route (oral, topical, etc.)
- Time of day (array)
- Purpose
- Special instructions
- Whether it's PRN (as needed)

6. RISK FACTORS:
For each risk include:
- Risk description
- Likelihood (low, medium, high)
- Impact (low, medium, high)
- Control measures

7. DAILY ROUTINE:
- Morning routine
- Afternoon routine
- Evening routine
- Night routine

8. PREFERENCES:
- Likes (array)
- Dislikes (array)
- Hobbies (array)
- Food preferences
- Communication preferences
- Personal care preferences

9. DOLS (Deprivation of Liberty Safeguards):
- Is DoLS applicable? (yes/no)
- Current status (if mentioned)
- Restrictions in place
- Authorisation dates
- Supervisory body
- Case reference

10. DNACPR (Do Not Attempt CPR):
- Is DNACPR in place? (yes/no)
- Decision date
- Decision maker and their role
- Clinical reasons
- Patient involvement/mental capacity
- Family involvement

Return ONLY valid JSON matching this structure.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: documentUrls,
      response_json_schema: {
        type: "object",
        properties: {
          physical_health: {
            type: "object",
            properties: {
              mobility: { type: "string" },
              continence: { type: "string" },
              nutrition: { type: "string" },
              medical_conditions: { type: "array", items: { type: "string" } },
              allergies: { type: "array", items: { type: "string" } }
            }
          },
          mental_health: {
            type: "object",
            properties: {
              cognitive_function: { type: "string" },
              communication_needs: { type: "string" },
              behaviour_support_needs: { type: "string" }
            }
          },
          care_objectives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                objective: { type: "string" },
                outcome_measures: { type: "string" },
                target_date: { type: "string" },
                status: { type: "string" }
              }
            }
          },
          care_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_name: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                frequency: { type: "string" },
                preferred_time: { type: "string" },
                duration_minutes: { type: "number" },
                special_instructions: { type: "string" }
              }
            }
          },
          medications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                dose: { type: "string" },
                frequency: { type: "string" },
                route: { type: "string" },
                time_of_day: { type: "array", items: { type: "string" } },
                purpose: { type: "string" },
                special_instructions: { type: "string" },
                is_prn: { type: "boolean" }
              }
            }
          },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                likelihood: { type: "string" },
                impact: { type: "string" },
                control_measures: { type: "string" }
              }
            }
          },
          daily_routine: {
            type: "object",
            properties: {
              morning: { type: "string" },
              afternoon: { type: "string" },
              evening: { type: "string" },
              night: { type: "string" }
            }
          },
          preferences: {
            type: "object",
            properties: {
              likes: { type: "array", items: { type: "string" } },
              dislikes: { type: "array", items: { type: "string" } },
              hobbies: { type: "array", items: { type: "string" } },
              food_preferences: { type: "string" },
              communication_preferences: { type: "string" },
              personal_care_preferences: { type: "string" }
            }
          },
          dols: {
            type: "object",
            properties: {
              applicable: { type: "boolean" },
              status: { type: "string" },
              restrictions: { type: "array", items: { type: "string" } },
              authorisation_start: { type: "string" },
              authorisation_end: { type: "string" },
              supervisory_body: { type: "string" },
              case_reference: { type: "string" },
              reason: { type: "string" }
            }
          },
          dnacpr: {
            type: "object",
            properties: {
              in_place: { type: "boolean" },
              decision_date: { type: "string" },
              decision_maker: { type: "string" },
              decision_maker_role: { type: "string" },
              clinical_reasons: { type: "string" },
              mental_capacity: { type: "string" },
              patient_involvement: { type: "string" },
              family_involved: { type: "boolean" }
            }
          }
        }
      }
    });

    return { success: true, carePlanData: aiResponse };
  } catch (error) {
    console.error("Error generating care plan:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create draft care plan from AI-generated data
 */
export const createDraftCarePlan = async (carePlanData, clientId, assessmentSource) => {
  try {
    const currentUser = await base44.auth.me();
    
    // Add task IDs and default values
    const enrichedTasks = (carePlanData.care_tasks || []).map((task, idx) => ({
      task_id: `task_${Date.now()}_${idx}`,
      task_name: task.task_name,
      category: task.category || 'other',
      description: task.description || '',
      frequency: task.frequency || 'daily',
      preferred_time: task.preferred_time || '',
      duration_minutes: task.duration_minutes || 30,
      special_instructions: task.special_instructions || '',
      requires_two_carers: false,
      is_active: true,
      linked_shift_types: []
    }));

    const carePlan = await base44.entities.CarePlan.create({
      client_id: clientId,
      care_setting: assessmentSource.type === 'visit' ? 'domiciliary' : 'residential',
      plan_type: 'initial',
      assessment_date: new Date().toISOString().split('T')[0],
      review_date: calculateReviewDate(90), // 3 months
      assessed_by: currentUser?.full_name || 'System',
      status: 'draft', // Draft for review/editing
      physical_health: carePlanData.physical_health || {},
      mental_health: carePlanData.mental_health || {},
      care_objectives: carePlanData.care_objectives || [],
      care_tasks: enrichedTasks,
      medication_management: {
        medications: carePlanData.medications || [],
        self_administers: false,
        administration_support: 'assistance',
        pharmacy_details: '',
        gp_details: '',
        allergies_sensitivities: carePlanData.physical_health?.allergies?.join(', ') || ''
      },
      daily_routine: carePlanData.daily_routine || {},
      preferences: carePlanData.preferences || {},
      risk_factors: carePlanData.risk_factors || [],
      emergency_info: {},
      version: 1,
      generated_from_assessment: true,
      approval_completed: false,
      source_assessment_type: assessmentSource.type,
      source_assessment_id: assessmentSource.id,
      dols_info: carePlanData.dols || null,
      dnacpr_info: carePlanData.dnacpr || null
    });

    // Link back to source assessment
    if (assessmentSource.type === 'visit') {
      await base44.entities.Visit.update(assessmentSource.id, {
        linked_care_plan_id: carePlan.id
      });
    } else if (assessmentSource.type === 'shift') {
      await base44.entities.Shift.update(assessmentSource.id, {
        linked_care_plan_id: carePlan.id
      });
    } else if (assessmentSource.type === 'uploaded_documents') {
      // Tag documents as processed
      for (const doc of assessmentSource.documents) {
        const clientDocs = await base44.entities.ClientDocument.filter({ 
          client_id: clientId,
          file_url: doc.document_url 
        });
        if (clientDocs.length > 0) {
          await base44.entities.ClientDocument.update(clientDocs[0].id, {
            tags: [...(clientDocs[0].tags || []), 'processed_for_care_plan'],
            notes: `${clientDocs[0].notes || ''}\n\nUsed to generate care plan ${carePlan.id} on ${new Date().toLocaleDateString()}`
          });
        }
      }
    }

    // Create notification for staff to review
    await base44.entities.Notification.create({
      user_email: currentUser?.email || 'admin',
      title: 'New Care Plan Ready for Review',
      message: `AI-generated care plan created from assessment. Please review and approve.`,
      type: 'care_plan',
      priority: 'high',
      action_url: `/clients?client=${clientId}&tab=care_plan`,
      is_read: false
    });

    return { success: true, carePlan };
  } catch (error) {
    console.error("Error creating draft care plan:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Approve and finalize care plan - this creates all related records
 */
export const approveCarePlan = async (carePlanId) => {
  try {
    const carePlan = await base44.entities.CarePlan.get(carePlanId);
    
    const results = {
      tasks: [],
      medications: [],
      risks: [],
      dols: null,
      dnacpr: null
    };

    // Parse stored DoLS/DNACPR data if present
    let dolsData = null;
    let dnacprData = null;
    try {
      if (carePlan.last_reviewed_by) {
        const stored = JSON.parse(carePlan.last_reviewed_by);
        dolsData = stored.dols_pending;
        dnacprData = stored.dnacpr_pending;
      }
    } catch (e) {
      console.log('No pending DoLS/DNACPR data');
    }

    // 1. Create care tasks
    for (const task of carePlan.care_tasks || []) {
      if (!task || typeof task !== 'object') continue;
      
      const taskTitle = String(task.task_name || task.task_title || task.description || 'Care Task').trim();
      const taskCategory = String(task.category || 'personal_care').trim();
      const taskType = mapTaskTypeToEnum(taskCategory);
      const taskFrequency = mapFrequencyToEnum(String(task.frequency || 'daily').trim());
      
      if (!taskTitle || !taskType || !taskCategory || !taskFrequency) {
        console.warn('Skipping invalid task:', task);
        continue;
      }
      
      const created = await base44.entities.CareTask.create({
        client_id: carePlan.client_id,
        care_plan_id: carePlanId,
        task_title: taskTitle,
        task_description: String(task.description || task.task_name || '').trim(),
        task_type: taskType,
        task_category: taskCategory,
        priority_level: 'medium',
        frequency: taskFrequency,
        scheduled_date: new Date().toISOString().split('T')[0]
      });
      results.tasks.push(created);
    }

    // 2. Create MAR sheets
    for (const med of carePlan.medication_management?.medications || []) {
      const created = await base44.entities.MARSheet.create({
        client_id: carePlan.client_id,
        medication_name: med.name,
        dose: med.dose,
        frequency: med.frequency,
        route: med.route || 'oral',
        time_of_day: med.time_of_day || [],
        reason_for_medication: med.purpose,
        special_instructions: med.special_instructions,
        as_required: med.is_prn || false,
        prn_protocol: med.prn_instructions || '',
        month_year: new Date().toISOString().substring(0, 7),
        status: 'active'
      });
      results.medications.push(created);
    }

    // 3. Create risk assessments
    const currentUser = await base44.auth.me().catch(() => null);
    for (const risk of carePlan.risk_factors || []) {
      const riskLevel = calculateRiskLevel(risk.likelihood, risk.impact);
      const created = await base44.entities.RiskAssessment.create({
        client_id: carePlan.client_id,
        assessment_type: categorizeRisk(risk.risk),
        assessment_date: new Date().toISOString().split('T')[0],
        assessed_by: currentUser?.full_name || carePlan.assessed_by || 'System',
        risk_level: riskLevel
      });
      results.risks.push(created);
    }

    // 4. Create DoLS record if applicable
    if (dolsData?.applicable) {
      try {
        const dolsRecord = await base44.entities.DoLS.create({
          client_id: carePlan.client_id,
          dols_status: mapDoLSStatus(dolsData.status),
          authorisation_type: 'standard',
          authorisation_start_date: dolsData.authorisation_start || null,
          authorisation_end_date: dolsData.authorisation_end || null,
          supervisory_body: dolsData.supervisory_body || '',
          case_reference: dolsData.case_reference || '',
          reason_for_dols: dolsData.reason || '',
          restrictions_in_place: dolsData.restrictions || [],
          care_plan_updated: true,
          capacity_assessment_completed: true
        });
        results.dols = dolsRecord;
      } catch (e) {
        console.error('DoLS creation error:', e);
      }
    }

    // 5. Create DNACPR record if in place
    if (dnacprData?.in_place) {
      try {
        const dnacprRecord = await base44.entities.DNACPR.create({
          client_id: carePlan.client_id,
          status: 'active',
          decision_date: dnacprData.decision_date || new Date().toISOString().split('T')[0],
          review_date: calculateReviewDate(365),
          decision_made_by: dnacprData.decision_maker || '',
          decision_maker_role: dnacprData.decision_maker_role || '',
          clinical_reasons: dnacprData.clinical_reasons || '',
          mental_capacity: dnacprData.mental_capacity || 'has_capacity',
          patient_involvement: dnacprData.patient_involvement || 'patient_has_capacity_and_agrees',
          family_involved: dnacprData.family_involved || false,
          care_plan_updated: true
        });
        results.dnacpr = dnacprRecord;
      } catch (e) {
        console.error('DNACPR creation error:', e);
      }
    }

    // Update status to active after all workflows complete
    await base44.entities.CarePlan.update(carePlanId, { 
      status: 'active',
      last_reviewed_date: new Date().toISOString().split('T')[0],
      last_reviewed_by: ''
    });

    return { success: true, results };
  } catch (error) {
    console.error("Error approving care plan:", error);
    return { success: false, error: error.message };
  }
};

// Helper functions
function calculateReviewDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function mapTaskTypeToEnum(category) {
  const mapping = {
    'personal_care': 'personal_care',
    'medication': 'medication',
    'nutrition': 'nutrition_meals',
    'mobility': 'mobility_support',
    'social': 'emotional_support',
    'emotional': 'emotional_support',
    'healthcare': 'clinical_support',
    'domestic': 'domestic_support',
    'other': 'personal_care'
  };
  return mapping[category] || 'personal_care';
}

function mapFrequencyToEnum(frequency) {
  const mapping = {
    'daily': 'daily',
    'twice_daily': 'daily',
    'weekly': 'weekly',
    'as_needed': 'custom',
    'with_each_visit': 'daily',
    'monthly': 'custom'
  };
  return mapping[frequency] || 'daily';
}

function categorizeRisk(riskDescription) {
  const lower = riskDescription.toLowerCase();
  if (lower.includes('fall')) return 'falls';
  if (lower.includes('chok')) return 'choking';
  if (lower.includes('pressure') || lower.includes('skin') || lower.includes('ulcer')) return 'pressure_ulcer';
  if (lower.includes('safeguard') || lower.includes('abuse')) return 'safeguarding';
  if (lower.includes('fire')) return 'fire';
  if (lower.includes('medication') || lower.includes('medicine')) return 'medication';
  if (lower.includes('mental') || lower.includes('capacity')) return 'mental_capacity';
  if (lower.includes('behav')) return 'behaviour';
  if (lower.includes('environment') || lower.includes('home')) return 'environmental';
  return 'general';
}

function calculateRiskLevel(likelihood, impact) {
  const likelihoodScore = { low: 1, medium: 2, high: 3 };
  const impactScore = { low: 1, medium: 2, high: 3 };
  const total = (likelihoodScore[likelihood] || 1) * (impactScore[impact] || 1);
  
  if (total >= 6) return 'critical';
  if (total >= 4) return 'high';
  if (total >= 2) return 'medium';
  return 'low';
}

function mapLikelihood(likelihood) {
  const mapping = {
    low: 'unlikely',
    medium: 'possible',
    high: 'likely'
  };
  return mapping[likelihood] || 'possible';
}

function mapSeverity(impact) {
  const mapping = {
    low: 'minor',
    medium: 'moderate',
    high: 'major'
  };
  return mapping[impact] || 'moderate';
}

function mapDoLSStatus(status) {
  if (!status) return 'screening_required';
  const lower = status.toLowerCase();
  if (lower.includes('granted') || lower.includes('authorised') || lower.includes('active')) return 'standard_authorisation_granted';
  if (lower.includes('urgent')) return 'urgent_authorisation_granted';
  if (lower.includes('submitted') || lower.includes('pending')) return 'application_submitted';
  if (lower.includes('expired')) return 'expired';
  if (lower.includes('review')) return 'under_review';
  if (lower.includes('not authorised') || lower.includes('rejected')) return 'not_authorised';
  return 'screening_required';
}

export const AssessmentToCarePlanWorkflow = {
  checkForNewAssessments,
  generateCarePlanFromAssessment,
  createDraftCarePlan,
  approveCarePlan
};