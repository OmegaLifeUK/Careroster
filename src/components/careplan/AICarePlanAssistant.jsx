import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Loader2, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Shield,
  Heart,
  Activity,
  Lightbulb,
  Target,
  ListChecks,
  Pill,
  Plus,
  Edit
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addMonths, parseISO } from "date-fns";

export default function AICarePlanAssistant({ client, existingCarePlan = null, onClose, onSuccess }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [step, setStep] = useState("configure");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all relevant client data
  const { data: progressRecords = [] } = useQuery({
    queryKey: ['progress-records', client.id],
    queryFn: async () => {
      const records = await base44.entities.ClientProgressRecord.filter({ client_id: client.id });
      return Array.isArray(records) ? records.sort((a, b) => 
        new Date(b.record_date) - new Date(a.record_date)
      ) : [];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents-for-careplan', client.id],
    queryFn: async () => {
      const allIncidents = await base44.entities.Incident.list('-incident_date');
      return allIncidents.filter(i => i.client_id === client.id);
    },
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['risk-assessments-careplan', client.id],
    queryFn: async () => {
      const assessments = await base44.entities.RiskAssessment.filter({ client_id: client.id });
      return Array.isArray(assessments) ? assessments : [];
    },
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['daily-logs-recent', client.id],
    queryFn: async () => {
      const logs = await base44.entities.DailyLog.filter({ client_id: client.id });
      return Array.isArray(logs) ? logs.slice(0, 10) : [];
    },
  });

  const { data: behaviorCharts = [] } = useQuery({
    queryKey: ['behavior-charts-careplan', client.id],
    queryFn: async () => {
      const charts = await base44.entities.BehaviorChart.filter({ client_id: client.id });
      return Array.isArray(charts) ? charts : [];
    },
  });

  const { data: clientDocuments = [] } = useQuery({
    queryKey: ['client-docs-medical', client.id],
    queryFn: async () => {
      const docs = await base44.entities.ClientDocument.filter({ client_id: client.id });
      return Array.isArray(docs) ? docs.filter(d => 
        d.document_type === 'medical_history' || d.document_type === 'assessment'
      ) : [];
    },
  });

  const analyzeAndGenerate = async () => {
    setIsAnalyzing(true);
    setStep("analyzing");

    try {
      const isNewPlan = !existingCarePlan;
      const mode = isNewPlan ? "CREATE" : "ADJUST";

      // Build comprehensive context
      const progressSummary = progressRecords.slice(0, 3).map(r => ({
        date: r.record_date,
        overall_rating: r.overall_rating,
        overall_progress: r.overall_progress,
        key_achievements: r.key_achievements || [],
        concerns: r.concerns || [],
        recommendations: r.recommendations || [],
        behavior_rating: r.behavior?.overall_rating,
        health_rating: r.health_wellbeing?.overall_rating,
        independence_rating: r.independence_skills?.overall_rating
      }));

      const incidentSummary = incidents.slice(0, 5).map(i => ({
        date: i.incident_date,
        type: i.incident_type,
        severity: i.severity,
        description: i.description?.substring(0, 200),
        is_safeguarding: i.is_safeguarding_concern
      }));

      const riskSummary = riskAssessments.map(r => ({
        type: r.assessment_type,
        risk_level: r.risk_level,
        identified_risks: r.identified_risks,
        control_measures: r.control_measures
      }));

      const behaviorSummary = behaviorCharts.slice(0, 3).map(b => ({
        date: b.chart_date,
        behavior_being_monitored: b.behavior_being_monitored,
        incidents_count: b.incidents?.length || 0
      }));

      const prompt = `You are an expert care planning AI assistant. ${mode === "CREATE" ? "Generate a comprehensive initial care plan" : "Analyze the existing care plan and suggest evidence-based adjustments"}.

CLIENT INFORMATION:
Name: ${client.full_name}
Date of Birth: ${client.date_of_birth || 'Not provided'}
Mobility: ${client.mobility || 'Not specified'}
Existing Care Needs: ${(client.care_needs || []).join(', ') || 'Not specified'}
Medical Notes: ${client.medical_notes || 'None'}
Support Needs: ${(client.support_needs || []).join(', ') || 'Not specified'}

${existingCarePlan ? `
EXISTING CARE PLAN SUMMARY:
- Status: ${existingCarePlan.status}
- Assessment Date: ${existingCarePlan.assessment_date}
- Care Setting: ${existingCarePlan.care_setting}
- Current Objectives: ${existingCarePlan.care_objectives?.length || 0}
- Current Tasks: ${existingCarePlan.care_tasks?.length || 0}
- Known Risk Factors: ${existingCarePlan.risk_factors?.length || 0}

CARE OBJECTIVES (Current):
${(existingCarePlan.care_objectives || []).map(o => 
  `- ${o.objective} (Status: ${o.status || 'not_started'}, Target: ${o.target_date})`
).join('\n')}

CARE TASKS (Current):
${(existingCarePlan.care_tasks || []).slice(0, 10).map(t => 
  `- ${t.task_name} (${t.category}, ${t.frequency})`
).join('\n')}
` : ''}

RECENT PROGRESS DATA (Last 3 Records):
${JSON.stringify(progressSummary, null, 2)}

INCIDENT HISTORY (Last 5 Incidents):
${JSON.stringify(incidentSummary, null, 2)}

RISK ASSESSMENTS:
${JSON.stringify(riskSummary, null, 2)}

BEHAVIOR MONITORING (Recent):
${JSON.stringify(behaviorSummary, null, 2)}

DAILY LOG PATTERNS:
${dailyLogs.slice(0, 5).map(l => 
  `${l.log_date}: ${l.summary?.substring(0, 100) || 'No summary'}`
).join('\n')}

ADDITIONAL STAFF NOTES:
${additionalNotes || 'None provided'}

${mode === "CREATE" ? `
TASK: Generate a comprehensive initial care plan with:
1. Personal details (preferences, cultural needs, communication style)
2. Physical health assessment (mobility, continence, nutrition, skin, pain, conditions, allergies)
3. Mental health assessment (cognitive function, mental health conditions, communication needs, behavior support)
4. 5-7 SMART care objectives (specific, measurable, achievable, relevant, time-bound)
5. 15-25 care tasks across all categories (personal_care, nutrition, medication, mobility, social, emotional, healthcare, domestic)
6. Medication management plan (based on medical notes if available)
7. Daily routine (morning, afternoon, evening, night)
8. Preferences (likes, dislikes, hobbies, food, personal care, communication)
9. Risk factors identified from assessment data
10. Emergency information

CRITICAL: Base all recommendations on the evidence provided above. Reference specific incidents, progress trends, or risk assessments.
` : `
TASK: Analyze the existing care plan and suggest adjustments based on:
1. Progress trends - Are objectives being met? Should they be revised?
2. Incident patterns - Do new risks need to be addressed?
3. Behavior changes - Are behavior support needs changing?
4. Health status - Are there new health concerns?
5. Task effectiveness - Should tasks be modified, added, or removed?

Provide specific, evidence-based recommendations with:
- What to change and why (with supporting evidence from the data)
- New objectives to add (if progress suggests new goals)
- Tasks to modify/add/remove (based on effectiveness and changing needs)
- Risk factors to add/update (based on recent incidents)
- Medication or routine adjustments (if health status has changed)

CRITICAL: Every recommendation must cite specific evidence (e.g., "Based on the 3 falls incidents in the last month..." or "Progress records show declining mobility scores...")
`}`;

      const responseSchema = mode === "CREATE" ? {
        type: "object",
        properties: {
          personal_details: { type: "object" },
          physical_health: { type: "object" },
          mental_health: { type: "object" },
          care_objectives: { 
            type: "array",
            items: { type: "object" }
          },
          care_tasks: { 
            type: "array",
            items: { type: "object" }
          },
          medication_management: { type: "object" },
          daily_routine: { type: "object" },
          preferences: { type: "object" },
          risk_factors: { 
            type: "array",
            items: { type: "object" }
          },
          emergency_info: { type: "object" },
          evidence_summary: { 
            type: "string",
            description: "Summary of key evidence used to inform this care plan"
          }
        }
      } : {
        type: "object",
        properties: {
          overall_assessment: {
            type: "string",
            description: "Overall assessment of current care plan effectiveness"
          },
          objectives_to_revise: {
            type: "array",
            items: {
              type: "object",
              properties: {
                current_objective: { type: "string" },
                suggested_revision: { type: "string" },
                reason: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          objectives_to_add: {
            type: "array",
            items: {
              type: "object",
              properties: {
                objective: { type: "string" },
                outcome_measures: { type: "string" },
                target_date: { type: "string" },
                reason: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          tasks_to_add: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                task_name: { type: "string" },
                description: { type: "string" },
                frequency: { type: "string" },
                reason: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          tasks_to_modify: {
            type: "array",
            items: {
              type: "object",
              properties: {
                current_task: { type: "string" },
                suggested_change: { type: "string" },
                reason: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          tasks_to_remove: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_name: { type: "string" },
                reason: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          risks_to_add: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                likelihood: { type: "string" },
                impact: { type: "string" },
                control_measures: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          medication_adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                adjustment: { type: "string" },
                reason: { type: "string" },
                supporting_evidence: { type: "string" }
              }
            }
          },
          routine_adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time_of_day: { type: "string" },
                adjustment: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          priority_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                urgency: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: responseSchema
      });

      setAnalysis({ ...result, mode });
      setStep("review");
    } catch (error) {
      console.error("Analysis error:", error);
      let errorMessage = "Failed to analyze client data. ";
      if (error?.message) {
        if (error.message.includes('timeout')) {
          errorMessage += "Request took too long. Try again with less data.";
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage += "AI service limit reached. Please try again later.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Please try again.";
      }
      toast.error("Analysis Failed", errorMessage);
      setStep("configure");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (analysis.mode === "CREATE") {
        // Create new care plan
        const carePlanData = {
          client_id: client.id,
          care_setting: existingCarePlan?.care_setting || "domiciliary",
          plan_type: "initial",
          assessment_date: format(new Date(), "yyyy-MM-dd"),
          review_date: format(addMonths(new Date(), 3), "yyyy-MM-dd"),
          assessed_by: "AI Generated (Requires Review)",
          status: "draft",
          ...analysis,
          care_tasks: (analysis.care_tasks || []).map((task, idx) => ({
            ...task,
            task_id: `task_${Date.now()}_${idx}`,
            is_active: true
          })),
          care_objectives: (analysis.care_objectives || []).map(obj => ({
            ...obj,
            status: obj.status || "not_started"
          })),
          generated_from_assessment: true,
          ai_analysis_metadata: {
            generated_at: new Date().toISOString(),
            based_on_progress_records: progressRecords.length,
            based_on_incidents: incidents.length,
            based_on_risk_assessments: riskAssessments.length,
            evidence_summary: analysis.evidence_summary
          }
        };

        return base44.entities.CarePlan.create(carePlanData);
      } else {
        // Update existing care plan with adjustments
        const updatedPlan = { ...existingCarePlan };
        
        // Add new objectives
        if (analysis.objectives_to_add?.length > 0) {
          updatedPlan.care_objectives = [
            ...(updatedPlan.care_objectives || []),
            ...analysis.objectives_to_add.map(obj => ({
              ...obj,
              status: "not_started",
              added_by_ai: true,
              added_date: format(new Date(), "yyyy-MM-dd")
            }))
          ];
        }

        // Add new tasks
        if (analysis.tasks_to_add?.length > 0) {
          updatedPlan.care_tasks = [
            ...(updatedPlan.care_tasks || []),
            ...analysis.tasks_to_add.map((task, idx) => ({
              ...task,
              task_id: `task_${Date.now()}_${idx}`,
              is_active: true,
              added_by_ai: true,
              added_date: format(new Date(), "yyyy-MM-dd")
            }))
          ];
        }

        // Add new risks
        if (analysis.risks_to_add?.length > 0) {
          updatedPlan.risk_factors = [
            ...(updatedPlan.risk_factors || []),
            ...analysis.risks_to_add
          ];
        }

        updatedPlan.status = "under_review";
        updatedPlan.last_reviewed_date = format(new Date(), "yyyy-MM-dd");
        updatedPlan.last_reviewed_by = "AI Analysis";
        updatedPlan.ai_adjustment_metadata = {
          adjusted_at: new Date().toISOString(),
          based_on_progress_records: progressRecords.length,
          based_on_incidents: incidents.length,
          changes_summary: {
            objectives_added: analysis.objectives_to_add?.length || 0,
            tasks_added: analysis.tasks_to_add?.length || 0,
            risks_added: analysis.risks_to_add?.length || 0
          }
        };

        return base44.entities.CarePlan.update(existingCarePlan.id, updatedPlan);
      }
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      if (analysis.mode === "CREATE") {
        toast.success("Care Plan Created", "AI-generated care plan saved as draft");
      } else {
        toast.success("Adjustments Applied", "Care plan updated with AI recommendations");
      }
      onSuccess?.(plan);
      onClose();
    },
    onError: () => {
      toast.error("Error", "Failed to save care plan");
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {existingCarePlan ? "AI Care Plan Adjustment Assistant" : "AI Care Plan Generator"}
          </DialogTitle>
        </DialogHeader>

        {step === "configure" && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                {existingCarePlan 
                  ? `Analyzing ${client.full_name}'s progress, incidents, and care data to suggest evidence-based adjustments.`
                  : `Generating a comprehensive care plan for ${client.full_name} based on all available assessment data.`
                }
              </p>
              <p className="text-xs text-blue-600">
                AI will analyze: {progressRecords.length} progress records, {incidents.length} incidents, 
                {riskAssessments.length} risk assessments, {dailyLogs.length} daily logs
              </p>
            </div>

            {/* Data Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold">{progressRecords.length}</p>
                  <p className="text-xs text-gray-600">Progress Records</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Shield className="w-6 h-6 mx-auto mb-1 text-red-600" />
                  <p className="text-2xl font-bold">{incidents.length}</p>
                  <p className="text-xs text-gray-600">Incidents</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                  <p className="text-2xl font-bold">{riskAssessments.length}</p>
                  <p className="text-xs text-gray-600">Risk Assessments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                  <p className="text-2xl font-bold">{behaviorCharts.length}</p>
                  <p className="text-xs text-gray-600">Behavior Charts</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <Label className="mb-2 block">Additional Context (Optional)</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any additional information or specific concerns to guide the AI analysis..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={analyzeAndGenerate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {existingCarePlan ? "Analyze & Suggest Adjustments" : "Generate Care Plan"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Client Data...</h3>
            <p className="text-gray-600 mb-2">
              AI is reviewing progress records, incidents, risk assessments, and care data
            </p>
            <p className="text-sm text-gray-500">This may take 30-60 seconds</p>
          </div>
        )}

        {step === "review" && analysis && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Analysis Complete</p>
                <p className="text-sm text-green-700">
                  {analysis.mode === "CREATE" 
                    ? "Comprehensive care plan generated from client data"
                    : "Evidence-based adjustments ready for review"
                  }
                </p>
              </div>
            </div>

            {analysis.mode === "CREATE" ? (
              // New Care Plan Summary
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-blue-600" />
                    Generated Care Plan Summary
                  </h4>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-2xl font-bold text-blue-700">
                        {analysis.care_objectives?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Objectives</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-2xl font-bold text-purple-700">
                        {analysis.care_tasks?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Care Tasks</p>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded">
                      <p className="text-2xl font-bold text-pink-700">
                        {analysis.medication_management?.medications?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Medications</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <p className="text-2xl font-bold text-orange-700">
                        {analysis.risk_factors?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Risks</p>
                    </div>
                  </div>

                  {analysis.evidence_summary && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs font-medium text-blue-900 mb-1">Evidence Summary:</p>
                      <p className="text-sm text-blue-800">{analysis.evidence_summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Adjustments Summary
              <Tabs defaultValue="overview">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="objectives">Objectives</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {analysis.overall_assessment && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                          Overall Assessment
                        </h4>
                        <p className="text-sm text-gray-700">{analysis.overall_assessment}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <Target className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                        <p className="text-2xl font-bold">
                          {(analysis.objectives_to_add?.length || 0) + (analysis.objectives_to_revise?.length || 0)}
                        </p>
                        <p className="text-xs text-gray-600">Objective Changes</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <ListChecks className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                        <p className="text-2xl font-bold">
                          {(analysis.tasks_to_add?.length || 0) + (analysis.tasks_to_modify?.length || 0) + (analysis.tasks_to_remove?.length || 0)}
                        </p>
                        <p className="text-xs text-gray-600">Task Changes</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                        <p className="text-2xl font-bold">{analysis.risks_to_add?.length || 0}</p>
                        <p className="text-xs text-gray-600">New Risks</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <Shield className="w-6 h-6 mx-auto mb-1 text-red-600" />
                        <p className="text-2xl font-bold">{analysis.priority_actions?.length || 0}</p>
                        <p className="text-xs text-gray-600">Priority Actions</p>
                      </CardContent>
                    </Card>
                  </div>

                  {analysis.priority_actions?.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2 text-red-900 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Priority Actions Required
                        </h4>
                        <div className="space-y-2">
                          {analysis.priority_actions.map((action, idx) => (
                            <div key={idx} className="p-3 bg-white rounded border border-red-200">
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-medium text-sm">{action.action}</p>
                                <Badge className={
                                  action.urgency === 'urgent' ? 'bg-red-600' :
                                  action.urgency === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                                }>
                                  {action.urgency}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">{action.reason}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="objectives" className="space-y-3">
                  {analysis.objectives_to_add?.length > 0 && (
                    <Card className="border-green-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-green-900">
                          <Plus className="w-4 h-4" />
                          New Objectives to Add ({analysis.objectives_to_add.length})
                        </h4>
                        {analysis.objectives_to_add.map((obj, idx) => (
                          <div key={idx} className="mb-3 p-3 bg-green-50 rounded border border-green-200">
                            <p className="font-medium text-sm mb-1">{obj.objective}</p>
                            <p className="text-xs text-gray-600 mb-2">Target: {obj.target_date}</p>
                            <div className="text-xs">
                              <p className="text-gray-700 mb-1"><strong>Reason:</strong> {obj.reason}</p>
                              <p className="text-blue-700"><strong>Evidence:</strong> {obj.supporting_evidence}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {analysis.objectives_to_revise?.length > 0 && (
                    <Card className="border-amber-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-amber-900">
                          <Edit className="w-4 h-4" />
                          Objectives to Revise ({analysis.objectives_to_revise.length})
                        </h4>
                        {analysis.objectives_to_revise.map((obj, idx) => (
                          <div key={idx} className="mb-3 p-3 bg-amber-50 rounded border border-amber-200">
                            <p className="text-xs text-gray-500 mb-1">Current: {obj.current_objective}</p>
                            <p className="font-medium text-sm mb-2">→ Suggested: {obj.suggested_revision}</p>
                            <div className="text-xs">
                              <p className="text-gray-700 mb-1"><strong>Reason:</strong> {obj.reason}</p>
                              <p className="text-blue-700"><strong>Evidence:</strong> {obj.supporting_evidence}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="tasks" className="space-y-3">
                  {analysis.tasks_to_add?.length > 0 && (
                    <Card className="border-green-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-green-900">
                          <Plus className="w-4 h-4" />
                          Tasks to Add ({analysis.tasks_to_add.length})
                        </h4>
                        {analysis.tasks_to_add.map((task, idx) => (
                          <div key={idx} className="mb-3 p-3 bg-green-50 rounded border border-green-200">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-sm">{task.task_name}</p>
                              <Badge variant="outline">{task.frequency}</Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                            <div className="text-xs">
                              <p className="text-gray-700 mb-1"><strong>Reason:</strong> {task.reason}</p>
                              <p className="text-blue-700"><strong>Evidence:</strong> {task.supporting_evidence}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {analysis.tasks_to_modify?.length > 0 && (
                    <Card className="border-amber-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-amber-900">
                          <Edit className="w-4 h-4" />
                          Tasks to Modify ({analysis.tasks_to_modify.length})
                        </h4>
                        {analysis.tasks_to_modify.map((task, idx) => (
                          <div key={idx} className="mb-3 p-3 bg-amber-50 rounded border border-amber-200">
                            <p className="text-xs text-gray-500 mb-1">Current: {task.current_task}</p>
                            <p className="font-medium text-sm mb-2">→ Change: {task.suggested_change}</p>
                            <div className="text-xs">
                              <p className="text-gray-700 mb-1"><strong>Reason:</strong> {task.reason}</p>
                              <p className="text-blue-700"><strong>Evidence:</strong> {task.supporting_evidence}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {analysis.tasks_to_remove?.length > 0 && (
                    <Card className="border-red-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-red-900">
                          <AlertTriangle className="w-4 h-4" />
                          Tasks to Remove ({analysis.tasks_to_remove.length})
                        </h4>
                        {analysis.tasks_to_remove.map((task, idx) => (
                          <div key={idx} className="mb-3 p-3 bg-red-50 rounded border border-red-200">
                            <p className="font-medium text-sm mb-2">{task.task_name}</p>
                            <div className="text-xs">
                              <p className="text-gray-700 mb-1"><strong>Reason:</strong> {task.reason}</p>
                              <p className="text-blue-700"><strong>Evidence:</strong> {task.supporting_evidence}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="risks" className="space-y-3">
                  {analysis.risks_to_add?.length > 0 && (
                    <Card className="border-orange-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-orange-900">
                          <AlertTriangle className="w-4 h-4" />
                          New Risks Identified ({analysis.risks_to_add.length})
                        </h4>
                        {analysis.risks_to_add.map((risk, idx) => (
                          <div key={idx} className="mb-3 p-3 bg-orange-50 rounded border border-orange-200">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-sm">{risk.risk}</p>
                              <div className="flex gap-1">
                                <Badge className={
                                  risk.likelihood === 'high' ? 'bg-red-600' :
                                  risk.likelihood === 'medium' ? 'bg-amber-600' : 'bg-green-600'
                                }>
                                  L: {risk.likelihood}
                                </Badge>
                                <Badge className={
                                  risk.impact === 'high' ? 'bg-red-600' :
                                  risk.impact === 'medium' ? 'bg-amber-600' : 'bg-green-600'
                                }>
                                  I: {risk.impact}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              <strong>Controls:</strong> {risk.control_measures}
                            </p>
                            <p className="text-xs text-blue-700">
                              <strong>Evidence:</strong> {risk.supporting_evidence}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="other" className="space-y-3">
                  {analysis.medication_adjustments?.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Pill className="w-4 h-4 text-pink-600" />
                          Medication Management Suggestions
                        </h4>
                        {analysis.medication_adjustments.map((adj, idx) => (
                          <div key={idx} className="mb-2 p-3 bg-pink-50 rounded border border-pink-200">
                            <p className="text-sm font-medium mb-1">{adj.adjustment}</p>
                            <p className="text-xs text-gray-600 mb-1">{adj.reason}</p>
                            <p className="text-xs text-blue-700">Evidence: {adj.supporting_evidence}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {analysis.routine_adjustments?.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Daily Routine Adjustments
                        </h4>
                        {analysis.routine_adjustments.map((adj, idx) => (
                          <div key={idx} className="mb-2 p-3 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm font-medium mb-1">{adj.time_of_day}: {adj.adjustment}</p>
                            <p className="text-xs text-gray-600">{adj.reason}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("configure")}>
                ← Back
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {analysis.mode === "CREATE" ? "Save Care Plan" : "Apply Adjustments"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}