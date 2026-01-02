import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Brain, TrendingUp, AlertCircle, Target, X, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, subMonths } from "date-fns";

export default function AICarePlanAssistant({ client, existingCarePlan, onClose, onSuccess }) {
  const [mode, setMode] = useState(existingCarePlan ? 'adjust' : 'create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [adjustmentSuggestions, setAdjustmentSuggestions] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all relevant data for AI analysis
  const { data: progressRecords = [] } = useQuery({
    queryKey: ['progress-records', client.id],
    queryFn: async () => {
      const records = await base44.entities.ClientProgressRecord.filter({ client_id: client.id });
      return Array.isArray(records) ? records.sort((a, b) => new Date(b.record_date) - new Date(a.record_date)) : [];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['client-incidents', client.id],
    queryFn: async () => {
      const data = await base44.entities.Incident.filter({ client_id: client.id });
      return Array.isArray(data) ? data.filter(i => 
        new Date(i.incident_date) > subMonths(new Date(), 6)
      ) : [];
    },
  });

  const { data: assessmentDocs = [] } = useQuery({
    queryKey: ['client-assessments', client.id],
    queryFn: async () => {
      const docs = [];
      try {
        const visits = await base44.entities.Visit.filter({ client_id: client.id });
        (visits || []).forEach(v => {
          if (v.assessment_documents?.length) {
            docs.push(...v.assessment_documents.map(d => ({ ...d, source: 'visit', date: v.scheduled_start })));
          }
        });
      } catch (e) {}
      
      try {
        const shifts = await base44.entities.Shift.filter({ client_id: client.id });
        (shifts || []).forEach(s => {
          if (s.assessment_documents?.length) {
            docs.push(...s.assessment_documents.map(d => ({ ...d, source: 'shift', date: s.date })));
          }
        });
      } catch (e) {}
      
      return docs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['risk-assessments', client.id],
    queryFn: async () => {
      const data = await base44.entities.RiskAssessment.filter({ client_id: client.id });
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: medicationLogs = [] } = useQuery({
    queryKey: ['medication-logs', client.id],
    queryFn: async () => {
      const data = await base44.entities.MedicationLog.filter({ client_id: client.id });
      return Array.isArray(data) ? data.slice(0, 50) : [];
    },
  });

  const { data: behaviorCharts = [] } = useQuery({
    queryKey: ['behavior-charts', client.id],
    queryFn: async () => {
      const data = await base44.entities.BehaviorChart.filter({ client_id: client.id });
      return Array.isArray(data) ? data : [];
    },
  });

  const generateInitialCarePlan = async () => {
    setIsGenerating(true);
    try {
      const careSettingContext = client.property_id ? 'Supported Living' :
                                 client.attendance_days ? 'Day Centre' :
                                 client.standard_visit_duration ? 'Domiciliary Care' :
                                 'Residential Care';

      // Build comprehensive context
      const recentProgress = progressRecords.slice(0, 3);
      const recentIncidents = incidents.slice(0, 5);
      const latestRisks = riskAssessments.slice(0, 3);
      const recentBehavior = behaviorCharts.slice(0, 3);

      const prompt = `You are an expert care planning AI assistant. Generate a comprehensive, person-centered INITIAL care plan for this client.

CLIENT PROFILE:
Name: ${client.full_name}
DOB: ${client.date_of_birth || 'Not provided'}
Care Setting: ${careSettingContext}
Mobility: ${client.mobility || 'Not specified'}
Medical Notes: ${client.medical_notes || 'None'}
Care Needs: ${client.care_needs?.join(', ') || 'Not specified'}
Support Needs: ${client.support_needs?.join(', ') || 'Not specified'}
Funding Type: ${client.funding_type || 'Not specified'}

ASSESSMENT DATA:
${assessmentDocs.length > 0 ? `Available Assessments: ${assessmentDocs.length} documents from recent visits/shifts` : 'No formal assessments available'}

MEDICAL & MEDICATION HISTORY:
${medicationLogs.length > 0 ? `Recent Medications: ${medicationLogs.length} administration records` : 'No medication records'}

IDENTIFIED RISKS:
${latestRisks.length > 0 ? latestRisks.map(r => `- ${r.risk_category}: ${r.risk_level} level`).join('\n') : 'No risk assessments on file'}

BEHAVIORAL PATTERNS:
${recentBehavior.length > 0 ? recentBehavior.map(b => `- ${b.behavior_monitored} on ${b.chart_date}`).join('\n') : 'No behavior monitoring data'}

RECENT PROGRESS (if any):
${recentProgress.length > 0 ? recentProgress.map(p => 
  `- ${p.record_date}: Overall rating ${p.overall_rating}/10, Status: ${p.overall_progress}`
).join('\n') : 'No previous progress records'}

RECENT INCIDENTS (if any):
${recentIncidents.length > 0 ? recentIncidents.map(i => 
  `- ${i.incident_type} (${i.severity}) on ${i.incident_date}`
).join('\n') : 'No recent incidents'}

GENERATE A COMPREHENSIVE CARE PLAN WITH:

1. CARE OBJECTIVES (SMART goals):
   - 3-5 short-term objectives (1-3 months)
   - 2-3 long-term objectives (6-12 months)
   - Each with specific outcome measures and target dates

2. CARE TASKS (Daily/Regular Activities):
   - Break down into specific, trackable tasks
   - Include frequency, duration, special instructions
   - Mark critical tasks (medication, safety)
   - Consider two-carer requirements for manual handling

3. MEDICATION MANAGEMENT:
   - Based on medical notes and medication history
   - Include administration requirements
   - Highlight allergies and contraindications

4. RISK MANAGEMENT PLAN:
   - Identify all potential risks (falls, choking, behavior, safeguarding)
   - Assess likelihood and impact
   - Define specific control measures

5. PREFERENCES & PERSON-CENTERED APPROACH:
   - Communication style and preferences
   - Daily routine preferences
   - Social and activity interests
   - Cultural and religious considerations

6. REVIEW SCHEDULE:
   - Key performance indicators to track
   - Review frequency
   - Escalation triggers for concerns

Ensure all recommendations are evidence-based, regulatory-compliant (CQC), and truly person-centered.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
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
                  task_id: { type: "string" },
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
            medication_management: {
              type: "object",
              properties: {
                self_administers: { type: "boolean" },
                administration_support: { type: "string" },
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
                allergies_sensitivities: { type: "string" }
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
            preferences: {
              type: "object",
              properties: {
                communication_preferences: { type: "string" },
                daily_routine: { type: "string" },
                likes: { type: "array", items: { type: "string" } },
                dislikes: { type: "array", items: { type: "string" } },
                hobbies: { type: "array", items: { type: "string" } },
                cultural_needs: { type: "string" }
              }
            },
            review_plan: {
              type: "object",
              properties: {
                review_frequency: { type: "string" },
                key_performance_indicators: { type: "array", items: { type: "string" } },
                escalation_triggers: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setGeneratedPlan(response);
      toast.success("Success", "Care plan generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Error", "Failed to generate care plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAdjustments = async () => {
    setIsGenerating(true);
    try {
      const recentProgress = progressRecords.slice(0, 5);
      const recentIncidents = incidents.slice(0, 10);

      const prompt = `You are an expert care planning AI assistant. Analyze the existing care plan and recent client data to suggest ADJUSTMENTS and improvements.

CURRENT CARE PLAN:
Assessment Date: ${existingCarePlan.assessment_date}
Current Status: ${existingCarePlan.status}
Current Objectives: ${existingCarePlan.care_objectives?.length || 0}
Current Tasks: ${existingCarePlan.care_tasks?.length || 0}
Last Reviewed: ${existingCarePlan.last_reviewed_date || 'Never'}

RECENT PROGRESS TRENDS:
${recentProgress.length > 0 ? recentProgress.map(p => 
  `- ${p.record_date}: Overall ${p.overall_rating}/10, ${p.overall_progress}
   Behavior: ${p.behaviour?.overall_rating || 'N/A'}/10 (${p.behaviour?.trend || 'N/A'})
   Health: ${p.health_wellbeing?.overall_rating || 'N/A'}/10 (${p.health_wellbeing?.trend || 'N/A'})
   Independence: ${p.independence_skills?.overall_rating || 'N/A'}/10 (${p.independence_skills?.trend || 'N/A'})
   Key Achievements: ${p.key_achievements?.join(', ') || 'None'}
   Concerns: ${p.concerns?.join(', ') || 'None'}`
).join('\n\n') : 'No recent progress data'}

RECENT INCIDENTS (Past 6 Months):
${recentIncidents.length > 0 ? recentIncidents.map(i => 
  `- ${i.incident_date}: ${i.incident_type} (${i.severity})
   Description: ${i.description?.substring(0, 100)}...
   Actions Taken: ${i.immediate_action_taken?.substring(0, 100) || 'None'}`
).join('\n\n') : 'No recent incidents'}

CURRENT CARE OBJECTIVES:
${existingCarePlan.care_objectives?.map((obj, idx) => 
  `${idx + 1}. ${obj.objective} (Status: ${obj.status || 'not_started'})`
).join('\n') || 'No objectives defined'}

ANALYZE AND PROVIDE:

1. OBJECTIVE ADJUSTMENTS:
   - Which objectives are achieved and should be updated/replaced?
   - Which objectives need modification based on progress?
   - What new objectives should be added based on emerging needs?

2. TASK MODIFICATIONS:
   - Tasks to add based on progress trends and incidents
   - Tasks to modify (frequency, instructions)
   - Tasks to discontinue (no longer relevant)

3. RISK UPDATES:
   - New risks identified from incidents
   - Risk level changes based on recent data
   - Additional control measures needed

4. CARE PLAN PRIORITIES:
   - What should be the focus for the next review period?
   - What interventions would have the most impact?

5. SPECIFIC RECOMMENDATIONS:
   - Evidence from progress data supporting each change
   - Expected outcomes from implementing suggestions
   - Timeline for implementation

Be specific and evidence-based. Reference the actual data points that justify each suggestion.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            progress_summary: {
              type: "object",
              properties: {
                positive_trends: { type: "array", items: { type: "string" } },
                areas_of_concern: { type: "array", items: { type: "string" } },
                notable_achievements: { type: "array", items: { type: "string" } }
              }
            },
            objective_adjustments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  objective: { type: "string" },
                  rationale: { type: "string" },
                  evidence: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            task_modifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  modification_type: { type: "string" },
                  task_name: { type: "string" },
                  current_state: { type: "string" },
                  recommended_change: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            risk_updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  change_type: { type: "string" },
                  current_level: { type: "string" },
                  recommended_level: { type: "string" },
                  additional_controls: { type: "string" },
                  evidence: { type: "string" }
                }
              }
            },
            priority_focus_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  intervention: { type: "string" },
                  expected_outcome: { type: "string" },
                  timeframe: { type: "string" }
                }
              }
            },
            implementation_plan: {
              type: "object",
              properties: {
                immediate_actions: { type: "array", items: { type: "string" } },
                short_term_changes: { type: "array", items: { type: "string" } },
                long_term_adjustments: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setAdjustmentSuggestions(response);
      toast.success("Success", "Adjustment suggestions generated!");
    } catch (error) {
      console.error("Adjustment generation error:", error);
      toast.error("Error", "Failed to generate adjustments");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCarePlan = async () => {
    try {
      const user = await base44.auth.me();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const careSetting = client.property_id ? 'supported_living' :
                         client.attendance_days ? 'day_centre' :
                         client.standard_visit_duration ? 'domiciliary' :
                         'residential_care';

      const carePlanData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: 'initial',
        assessment_date: today,
        review_date: format(new Date().setMonth(new Date().getMonth() + 3), 'yyyy-MM-dd'),
        assessed_by: user.full_name || user.email,
        status: 'draft',
        
        care_objectives: (generatedPlan.care_objectives || []).map(obj => ({
          objective: obj.objective,
          outcome_measures: obj.outcome_measures,
          target_date: obj.target_date,
          status: 'not_started'
        })),
        
        care_tasks: (generatedPlan.care_tasks || []).map(task => ({
          task_id: task.task_id,
          task_name: task.task_name,
          category: task.category,
          frequency: task.frequency,
          preferred_time: task.preferred_time,
          duration_minutes: task.duration_minutes || 30,
          special_instructions: task.special_instructions || '',
          requires_two_carers: task.requires_two_carers || false,
          is_active: true
        })),
        
        medication_management: generatedPlan.medication_management,
        risk_factors: generatedPlan.risk_factors || [],
        preferences: generatedPlan.preferences || {},
        
        generated_from_ai: true,
        ai_generation_date: new Date().toISOString()
      };

      await base44.entities.CarePlan.create(carePlanData);
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Success", "Care plan created!");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error", "Failed to save care plan");
    }
  };

  const applyAdjustments = async () => {
    try {
      const updatedObjectives = [...(existingCarePlan.care_objectives || [])];
      
      // Apply objective adjustments
      adjustmentSuggestions.objective_adjustments?.forEach(adj => {
        if (adj.action === 'add') {
          updatedObjectives.push({
            objective: adj.objective,
            outcome_measures: adj.rationale,
            status: 'not_started'
          });
        } else if (adj.action === 'modify') {
          const idx = updatedObjectives.findIndex(o => 
            o.objective.toLowerCase().includes(adj.objective.toLowerCase().substring(0, 20))
          );
          if (idx >= 0) {
            updatedObjectives[idx].outcome_measures = adj.rationale;
          }
        } else if (adj.action === 'complete') {
          const idx = updatedObjectives.findIndex(o => 
            o.objective.toLowerCase().includes(adj.objective.toLowerCase().substring(0, 20))
          );
          if (idx >= 0) {
            updatedObjectives[idx].status = 'achieved';
          }
        }
      });

      const updatedRisks = [...(existingCarePlan.risk_factors || [])];
      
      // Apply risk updates
      adjustmentSuggestions.risk_updates?.forEach(risk => {
        if (risk.change_type === 'add') {
          updatedRisks.push({
            risk: risk.risk,
            likelihood: risk.recommended_level || 'medium',
            impact: risk.recommended_level || 'medium',
            control_measures: risk.additional_controls
          });
        } else if (risk.change_type === 'modify') {
          const idx = updatedRisks.findIndex(r => 
            r.risk.toLowerCase().includes(risk.risk.toLowerCase().substring(0, 15))
          );
          if (idx >= 0) {
            updatedRisks[idx].likelihood = risk.recommended_level || updatedRisks[idx].likelihood;
            updatedRisks[idx].control_measures = risk.additional_controls || updatedRisks[idx].control_measures;
          }
        }
      });

      await base44.entities.CarePlan.update(existingCarePlan.id, {
        care_objectives: updatedObjectives,
        risk_factors: updatedRisks,
        last_reviewed_date: format(new Date(), 'yyyy-MM-dd'),
        last_reviewed_by: (await base44.auth.me()).full_name,
        review_notes: `AI-suggested adjustments applied based on progress data and incident analysis`
      });

      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Success", "Adjustments applied to care plan!");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Apply error:", error);
      toast.error("Error", "Failed to apply adjustments");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Care Plan Assistant
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" disabled={!existingCarePlan}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New Plan
              </TabsTrigger>
              <TabsTrigger value="adjust" disabled={!existingCarePlan}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Suggest Adjustments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Data Sources for AI Analysis:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Client Profile & Medical History</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {assessmentDocs.length > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                    <span>{assessmentDocs.length} Assessment Documents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {progressRecords.length > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                    <span>{progressRecords.length} Progress Records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {incidents.length > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                    <span>{incidents.length} Recent Incidents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {riskAssessments.length > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                    <span>{riskAssessments.length} Risk Assessments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {behaviorCharts.length > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                    <span>{behaviorCharts.length} Behavior Charts</span>
                  </div>
                </div>
              </div>

              {!generatedPlan ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 mx-auto text-purple-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    AI will analyze all available client data to generate a comprehensive care plan
                  </p>
                  <Button onClick={generateInitialCarePlan} disabled={isGenerating} className="bg-purple-600">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Care Plan
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ... rest of existing generated plan display ... */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={saveCarePlan} className="flex-1 bg-green-600">
                      Save Care Plan
                    </Button>
                    <Button onClick={() => setGeneratedPlan(null)} variant="outline">
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="adjust" className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Analysis Context:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Progress Records: {progressRecords.length}</div>
                  <div>Recent Incidents: {incidents.length}</div>
                  <div>Current Objectives: {existingCarePlan?.care_objectives?.length || 0}</div>
                  <div>Current Tasks: {existingCarePlan?.care_tasks?.length || 0}</div>
                </div>
              </div>

              {!adjustmentSuggestions ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto text-blue-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    AI will analyze progress trends and incidents to suggest care plan improvements
                  </p>
                  <Button onClick={generateAdjustments} disabled={isGenerating} className="bg-blue-600">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing trends...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Adjustment Suggestions
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Overall Assessment</h3>
                    <p className="text-sm text-gray-700">{adjustmentSuggestions.overall_assessment}</p>
                  </div>

                  {adjustmentSuggestions.progress_summary && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded border border-green-200">
                        <h4 className="font-medium text-green-900 mb-2">Positive Trends</h4>
                        <ul className="text-sm space-y-1">
                          {adjustmentSuggestions.progress_summary.positive_trends?.map((trend, idx) => (
                            <li key={idx} className="text-green-800">✓ {trend}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-orange-50 rounded border border-orange-200">
                        <h4 className="font-medium text-orange-900 mb-2">Areas of Concern</h4>
                        <ul className="text-sm space-y-1">
                          {adjustmentSuggestions.progress_summary.areas_of_concern?.map((concern, idx) => (
                            <li key={idx} className="text-orange-800">⚠ {concern}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {adjustmentSuggestions.objective_adjustments?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        Objective Adjustments ({adjustmentSuggestions.objective_adjustments.length})
                      </h3>
                      <div className="space-y-2">
                        {adjustmentSuggestions.objective_adjustments.map((adj, idx) => (
                          <Card key={idx} className="p-3 bg-purple-50 border-purple-200">
                            <div className="flex items-start justify-between mb-2">
                              <Badge className={
                                adj.action === 'add' ? 'bg-green-600' :
                                adj.action === 'modify' ? 'bg-blue-600' :
                                'bg-gray-600'
                              }>
                                {adj.action}
                              </Badge>
                              <Badge variant="outline">{adj.priority}</Badge>
                            </div>
                            <p className="font-medium text-sm mb-1">{adj.objective}</p>
                            <p className="text-xs text-gray-700 mb-1"><strong>Rationale:</strong> {adj.rationale}</p>
                            <p className="text-xs text-gray-600"><strong>Evidence:</strong> {adj.evidence}</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={applyAdjustments} className="flex-1 bg-blue-600">
                      Apply Adjustments to Care Plan
                    </Button>
                    <Button onClick={() => setAdjustmentSuggestions(null)} variant="outline">
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}