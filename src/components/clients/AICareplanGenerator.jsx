import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Loader2, CheckCircle, AlertCircle, Target, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addMonths, addWeeks } from "date-fns";

export default function AICareplanGenerator({ client, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateCarePlan = async () => {
    setIsGenerating(true);
    try {
      const careSettingContext = client.property_id ? 'Supported Living' :
                                 client.attendance_days ? 'Day Centre' :
                                 'Domiciliary Care';

      const prompt = `You are an expert care planning AI assistant for ${careSettingContext}. Generate a comprehensive, person-centered care plan following CQC, Ofsted, and CI regulatory guidelines, incorporating best practices from systems like OneTouch, Access Group, Birdie, PASS, Nourish, and PCS.

CLIENT PROFILE:
Name: ${client.full_name || 'Not provided'}
Date of Birth: ${client.date_of_birth || 'Not provided'}
Mobility: ${client.mobility || 'Not specified'}
Care Needs: ${client.care_needs?.join(', ') || 'Not specified'}
Support Needs: ${client.support_needs?.join(', ') || 'Not specified'}
Medical Notes: ${client.medical_notes || 'None provided'}
Funding Type: ${client.funding_type || 'Not specified'}
Care Setting: ${careSettingContext}
Additional Context: ${additionalNotes || 'None'}

REQUIREMENTS:
Generate a care plan that creates ACTIONABLE, MEASURABLE workflows. Each component must be tangible and trackable.

1. CARE OBJECTIVES - SMART Goals (Specific, Measurable, Achievable, Relevant, Time-bound)
   - Create 3-5 short-term objectives (1-3 months)
   - Create 2-3 long-term objectives (6-12 months)
   - Each objective must have: goal description, outcome measures, target date, assigned category (physical_health, mental_wellbeing, social_engagement, independence, safety)

2. CARE TASKS - Daily/Regular Activities
   - Break down care into discrete, trackable tasks
   - Each task must have: task name, category (personal_care, medication, nutrition, mobility, social, emotional, healthcare, domestic), frequency (daily, twice_daily, weekly, as_needed), preferred_time, duration_minutes, special_instructions, requires_two_carers (boolean), is_critical (boolean)
   - Tasks should align with regulatory requirements (dignity, choice, independence, safety)

3. RISK FACTORS - Person-Centered Risk Management
   - Identify risks with: risk description, likelihood (low/medium/high), impact (low/medium/high), control_measures (specific actions)
   - Include dignity risks, safeguarding considerations, health risks

4. REVIEW & MONITORING PLAN
   - Specify review_frequency, key_performance_indicators (measurable metrics), escalation_triggers (when to alert management)

5. REGULATORY COMPLIANCE CHECKS
   - CQC domains: safe, effective, caring, responsive, well_led
   - Specific compliance_requirements for this care setting

Ensure the plan promotes independence, dignity, choice, and person-centered care.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            assessment_summary: { type: "string" },
            care_objectives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  objective: { type: "string" },
                  outcome_measures: { type: "string" },
                  target_date: { type: "string" },
                  category: { type: "string" },
                  timeframe: { type: "string" }
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
                  frequency: { type: "string" },
                  preferred_time: { type: "string" },
                  duration_minutes: { type: "number" },
                  special_instructions: { type: "string" },
                  requires_two_carers: { type: "boolean" },
                  is_critical: { type: "boolean" }
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
            review_plan: {
              type: "object",
              properties: {
                review_frequency: { type: "string" },
                key_performance_indicators: { type: "array", items: { type: "string" } },
                escalation_triggers: { type: "array", items: { type: "string" } }
              }
            },
            compliance_checklist: {
              type: "object",
              properties: {
                safe: { type: "array", items: { type: "string" } },
                effective: { type: "array", items: { type: "string" } },
                caring: { type: "array", items: { type: "string" } },
                responsive: { type: "array", items: { type: "string" } },
                well_led: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setGeneratedPlan(response);
      toast.success("Success", "Care plan generated successfully!");
    } catch (error) {
      console.error("Error generating care plan:", error);
      toast.error("Error", "Failed to generate care plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDatabase = async () => {
    if (!generatedPlan) return;
    
    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Determine care setting
      const careSettings = {
        property_id: 'supported_living',
        attendance_days: 'day_centre',
        standard_visit_duration: 'domiciliary'
      };
      
      let careSetting = 'residential_care';
      for (const [key, value] of Object.entries(careSettings)) {
        if (client[key]) {
          careSetting = value;
          break;
        }
      }

      // 1. CREATE CARE PLAN RECORD
      const carePlanData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: 'initial',
        assessment_date: today,
        review_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
        assessed_by: user.full_name || user.email,
        status: 'active',
        
        // Store care objectives
        care_objectives: (generatedPlan.care_objectives || []).map(obj => ({
          objective: obj.objective,
          outcome_measures: obj.outcome_measures,
          target_date: obj.target_date,
          status: 'not_started'
        })),
        
        // Store care tasks
        care_tasks: (generatedPlan.care_tasks || []).map((task, idx) => ({
          task_id: `task_${idx + 1}`,
          task_name: task.task_name,
          category: task.category,
          frequency: task.frequency,
          preferred_time: task.preferred_time,
          duration_minutes: task.duration_minutes || 30,
          special_instructions: task.special_instructions || '',
          requires_two_carers: task.requires_two_carers || false,
          is_active: true
        })),
        
        // Store risk factors
        risk_factors: generatedPlan.risk_factors || []
      };

      const createdCarePlan = await base44.entities.CarePlan.create(carePlanData);

      // 2. CREATE ACTIONABLE CARE TASKS (for daily tracking)
      const careTasksToCreate = (generatedPlan.care_tasks || [])
        .filter(task => task.is_critical || task.frequency === 'daily' || task.frequency === 'twice_daily')
        .map(task => ({
          client_id: client.id,
          task_name: task.task_name,
          category: task.category === 'healthcare' ? 'medical' : task.category,
          frequency: task.frequency === 'twice_daily' ? 'daily' : task.frequency,
          priority: task.is_critical ? 'critical' : 'medium',
          estimated_duration_minutes: task.duration_minutes || 30,
          instructions: task.special_instructions || '',
          requires_two_staff: task.requires_two_carers || false,
          alerts_if_missed: task.is_critical || false,
          is_active: true,
          start_date: today,
          related_care_plan_id: createdCarePlan.id,
          source: 'ai_generated'
        }));

      if (careTasksToCreate.length > 0) {
        await base44.entities.CareTask.bulkCreate(careTasksToCreate);
      }

      // 3. CREATE COMPLIANCE TASKS (regulatory requirements)
      const complianceTasksToCreate = [];
      
      // Review task - assign to admin or current user
      complianceTasksToCreate.push({
        title: `Care Plan Review - ${client.full_name}`,
        description: 'Scheduled care plan review as per regulatory requirements',
        source_type: 'manual',
        assigned_to_staff_id: user.email,
        priority: 'medium',
        status: 'pending',
        due_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd')
      });

      if (generatedPlan.risk_factors && generatedPlan.risk_factors.length > 0) {
        complianceTasksToCreate.push({
          title: `Risk Assessment Review - ${client.full_name}`,
          description: 'Review and update risk assessments',
          source_type: 'manual',
          assigned_to_staff_id: user.email,
          priority: 'high',
          status: 'pending',
          due_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd')
        });
      }

      await base44.entities.ComplianceTask.bulkCreate(complianceTasksToCreate);

      // 4. CREATE INITIAL PROGRESS RECORD (for tracking objectives)
      const progressRecordData = {
        client_id: client.id,
        record_date: today,
        record_type: 'quarterly',
        recorded_by: user.full_name || user.email,
        
        // Initialize care plan goals tracking from AI objectives
        care_plan_goals: (generatedPlan.care_objectives || []).map(obj => ({
          goal: obj.objective,
          progress: 'not_started',
          notes: `Target: ${obj.target_date}. Measures: ${obj.outcome_measures}`
        })),
        
        // Set initial overall assessment
        overall_progress: 'stable',
        overall_rating: 5,
        
        // Initialize key tracking areas based on care plan
        health_wellbeing: {
          overall_rating: 5,
          trend: 'stable',
          physical_health: 'good',
          mental_health: 'good',
          notes: 'Baseline assessment at care plan creation'
        },
        
        independence_skills: {
          overall_rating: 5,
          trend: 'stable',
          notes: 'Baseline assessment at care plan creation',
          goals_achieved: []
        },
        
        activities_engagement: {
          overall_rating: 5,
          trend: 'stable',
          activities_participated: [],
          notes: 'Baseline assessment at care plan creation'
        },
        
        key_achievements: ['Care plan created with clear objectives'],
        concerns: [],
        recommendations: ['Track progress against care objectives weekly', 'Review and update progress record monthly'],
        next_review_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd')
      };

      await base44.entities.ClientProgressRecord.create(progressRecordData);

      // 5. SAVE DOCUMENT VERSION
      const planText = `PERSON-CENTERED CARE PLAN
Client: ${client.full_name}
Generated: ${format(new Date(), 'PPP')}
Care Setting: ${careSetting}

${generatedPlan.assessment_summary || ''}

CARE OBJECTIVES (${generatedPlan.care_objectives?.length || 0}):
${(generatedPlan.care_objectives || []).map((obj, idx) => 
  `${idx + 1}. ${obj.objective}
   Outcome Measures: ${obj.outcome_measures}
   Target: ${obj.target_date}
   Category: ${obj.category}`
).join('\n\n')}

CARE TASKS (${generatedPlan.care_tasks?.length || 0}):
${(generatedPlan.care_tasks || []).map((task, idx) =>
  `${idx + 1}. ${task.task_name} (${task.category})
   Frequency: ${task.frequency}
   Duration: ${task.duration_minutes}min
   ${task.is_critical ? '⚠️ CRITICAL TASK' : ''}
   Instructions: ${task.special_instructions || 'None'}`
).join('\n\n')}

RISK MANAGEMENT (${generatedPlan.risk_factors?.length || 0} risks):
${(generatedPlan.risk_factors || []).map((risk, idx) =>
  `${idx + 1}. ${risk.risk}
   Likelihood: ${risk.likelihood} | Impact: ${risk.impact}
   Controls: ${risk.control_measures}`
).join('\n\n')}

REVIEW & MONITORING:
Frequency: ${generatedPlan.review_plan?.review_frequency || 'Quarterly'}
KPIs: ${(generatedPlan.review_plan?.key_performance_indicators || []).join(', ')}

REGULATORY COMPLIANCE:
CQC Safe: ${(generatedPlan.compliance_checklist?.safe || []).join(', ')}
CQC Effective: ${(generatedPlan.compliance_checklist?.effective || []).join(', ')}
CQC Caring: ${(generatedPlan.compliance_checklist?.caring || []).join(', ')}
CQC Responsive: ${(generatedPlan.compliance_checklist?.responsive || []).join(', ')}
CQC Well-Led: ${(generatedPlan.compliance_checklist?.well_led || []).join(', ')}`;

      const blob = new Blob([planText], { type: 'text/plain' });
      const file = new File([blob], `care-plan-${client.full_name}-${Date.now()}.txt`);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.ClientDocument.create({
        client_id: client.id,
        document_type: 'care_plan',
        document_name: `AI Care Plan - ${format(new Date(), 'dd/MM/yyyy')}`,
        file_url: file_url,
        file_type: 'text/plain',
        file_size: blob.size,
        uploaded_by_staff_id: user.email,
        notes: 'AI-generated person-centered care plan with actionable tasks and objectives'
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client-progress'] });

      toast.success("Success", "Care plan, progress tracking, and compliance tasks created!");
      onClose();
    } catch (error) {
      console.error("Error saving care plan:", error);
      toast.error("Error", error.message || "Failed to save care plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Care Plan Generator
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Client Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Name:</span>
                  <span className="ml-2 font-medium">{client.full_name}</span>
                </div>
                <div>
                  <span className="text-blue-700">Mobility:</span>
                  <span className="ml-2 font-medium">{client.mobility || 'Not specified'}</span>
                </div>
                {client.care_needs && client.care_needs.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-blue-700">Care Needs:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {client.care_needs.map((need, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {need}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!generatedPlan && !isGenerating && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Additional Notes (Optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any specific requirements, preferences, or considerations..."
                className="w-full p-3 border rounded-lg text-sm"
                rows="4"
              />
              <Button
                onClick={generateCarePlan}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Care Plan with AI
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Generating Care Plan...</p>
              <p className="text-sm text-gray-500">This may take 10-20 seconds</p>
            </div>
          )}

          {generatedPlan && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-900 font-medium">Care plan generated with actionable workflows!</span>
              </div>

              {generatedPlan.assessment_summary && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Assessment Summary</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {generatedPlan.assessment_summary}
                  </p>
                </div>
              )}

              {/* SMART Care Objectives */}
              {generatedPlan.care_objectives && generatedPlan.care_objectives.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    SMART Care Objectives ({generatedPlan.care_objectives.length})
                  </h3>
                  <div className="space-y-3">
                    {generatedPlan.care_objectives.map((obj, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-purple-900">{obj.objective}</h4>
                          <Badge className="bg-purple-600 text-white">{obj.timeframe}</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-800">
                              <strong>Outcome Measures:</strong> {obj.outcome_measures}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-800">
                              <strong>Target:</strong> {obj.target_date}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-white">{obj.category}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Care Tasks */}
              {generatedPlan.care_tasks && generatedPlan.care_tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Actionable Care Tasks ({generatedPlan.care_tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {generatedPlan.care_tasks.map((task, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border ${
                          task.is_critical 
                            ? 'bg-red-50 border-red-300' 
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{task.task_name}</span>
                            {task.is_critical && (
                              <Badge className="bg-red-500 text-white text-xs">CRITICAL</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Category: {task.category} | Duration: {task.duration_minutes}min</div>
                          {task.preferred_time && <div>Preferred time: {task.preferred_time}</div>}
                          {task.special_instructions && (
                            <div className="text-gray-700 mt-1">{task.special_instructions}</div>
                          )}
                          {task.requires_two_carers && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Requires 2 carers</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Management */}
              {generatedPlan.risk_factors && generatedPlan.risk_factors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Risk Management Plan</h3>
                  <div className="space-y-2">
                    {generatedPlan.risk_factors.map((risk, idx) => (
                      <div key={idx} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-orange-900">{risk.risk}</span>
                          <div className="flex gap-2">
                            <Badge className={
                              risk.likelihood === 'high' ? 'bg-red-500 text-white' :
                              risk.likelihood === 'medium' ? 'bg-amber-500 text-white' :
                              'bg-green-500 text-white'
                            }>
                              L: {risk.likelihood}
                            </Badge>
                            <Badge className={
                              risk.impact === 'high' ? 'bg-red-500 text-white' :
                              risk.impact === 'medium' ? 'bg-amber-500 text-white' :
                              'bg-green-500 text-white'
                            }>
                              I: {risk.impact}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-orange-800">
                          <strong>Controls:</strong> {risk.control_measures}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review & Monitoring */}
              {generatedPlan.review_plan && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Review & Monitoring Plan</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="mb-3">
                      <span className="text-sm text-blue-700 font-medium">Review Frequency:</span>
                      <span className="ml-2 text-blue-900">{generatedPlan.review_plan.review_frequency}</span>
                    </div>
                    {generatedPlan.review_plan.key_performance_indicators && (
                      <div className="mb-3">
                        <p className="text-sm text-blue-700 font-medium mb-1">KPIs to Track:</p>
                        <div className="flex flex-wrap gap-1">
                          {generatedPlan.review_plan.key_performance_indicators.map((kpi, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white text-xs">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {generatedPlan.review_plan.escalation_triggers && (
                      <div>
                        <p className="text-sm text-blue-700 font-medium mb-1">Escalation Triggers:</p>
                        <ul className="space-y-1">
                          {generatedPlan.review_plan.escalation_triggers.map((trigger, idx) => (
                            <li key={idx} className="text-sm text-blue-800">• {trigger}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CQC Compliance */}
              {generatedPlan.compliance_checklist && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">CQC Compliance Checklist</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(generatedPlan.compliance_checklist).map(([domain, items]) => (
                      items && items.length > 0 && (
                        <div key={domain} className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                          <h4 className="font-medium text-teal-900 mb-2 capitalize">{domain}</h4>
                          <ul className="space-y-1">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-xs text-teal-800 flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-teal-600 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-2">What happens when you save:</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>✓ Care Plan record created in database</li>
                  <li>✓ {(generatedPlan.care_tasks || []).filter(t => t.is_critical || t.frequency === 'daily').length} Daily tasks created for tracking</li>
                  <li>✓ {(generatedPlan.care_objectives || []).length} SMART objectives tracked for progress reporting</li>
                  <li>✓ Initial Progress Record created with baseline goals tracking</li>
                  <li>✓ Automated review tasks scheduled (3-month review, monthly audits)</li>
                  <li>✓ Document saved to client file</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={saveToDatabase}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Workflows...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Activate Care Plan & Workflows
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setGeneratedPlan(null)}
                  variant="outline"
                  disabled={isSaving}
                >
                  Generate New
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}