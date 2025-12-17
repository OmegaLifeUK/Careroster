import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  Download,
  Copy
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function AIClientAnalyzer({ client }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisType, setAnalysisType] = useState(null);
  const { toast } = useToast();

  const { data: carePlan } = useQuery({
    queryKey: ["care-plan", client.id],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.filter({
        client_id: client.id,
        status: "active"
      });
      return Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
    },
    enabled: !!client.id,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["daily-logs", client.id],
    queryFn: async () => {
      const logs = await base44.entities.DailyCareNote.filter({ client_id: client.id });
      return Array.isArray(logs) ? logs.slice(0, 30) : [];
    },
    enabled: !!client.id,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["client-alerts", client.id],
    queryFn: async () => {
      const data = await base44.entities.ClientAlert.filter({ client_id: client.id });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!client.id,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["medications", client.id],
    queryFn: async () => {
      const data = await base44.entities.MedicationLog.filter({ client_id: client.id });
      return Array.isArray(data) ? data.slice(0, 50) : [];
    },
    enabled: !!client.id,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents", client.id],
    queryFn: async () => {
      const data = await base44.entities.Incident.filter({ client_id: client.id });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!client.id,
  });

  const analyzeClient = async (type) => {
    setAnalyzing(true);
    setAnalysisType(type);

    try {
      const activeAlerts = alerts.filter(a => a.status === "active");
      const recentLogs = dailyLogs.slice(0, 10);
      const recentMeds = medications.slice(0, 20);
      const recentIncidents = incidents.slice(0, 10);

      let prompt = "";
      let schema = {};

      if (type === "proactive") {
        prompt = `You are an expert care analyst. Analyze this client's data to identify potential risks, proactive care suggestions, and early warning signs.

CLIENT: ${client.full_name}

CARE PLAN SUMMARY:
${carePlan ? `
- Medical Conditions: ${carePlan.physical_health?.medical_conditions?.join(", ") || "None listed"}
- Mobility: ${carePlan.physical_health?.mobility || "Not specified"}
- Cognitive Function: ${carePlan.mental_health?.cognitive_function || "Not specified"}
- Key Care Objectives: ${carePlan.care_objectives?.map(o => o.objective).join(", ") || "None"}
` : "No active care plan"}

ACTIVE ALERTS (${activeAlerts.length}):
${activeAlerts.map(a => `- [${a.severity}] ${a.title}: ${a.description}`).join("\n")}

RECENT DAILY LOGS (Last 10 entries):
${recentLogs.map(l => `- ${l.log_date}: ${l.notes || l.observation}`).join("\n")}

MEDICATION COMPLIANCE:
${recentMeds.map(m => `- ${m.medication_name}: ${m.status} (${m.administration_time})`).join("\n")}

RECENT INCIDENTS (${recentIncidents.length}):
${recentIncidents.map(i => `- [${i.severity}] ${i.incident_type}: ${i.description?.substring(0, 100)}`).join("\n")}

Provide a comprehensive analysis focusing on:
1. Identified risks and early warning signs
2. Proactive care suggestions to prevent deterioration
3. Pattern recognition from logs and incidents
4. Recommendations for care plan adjustments`;

        schema = {
          type: "object",
          properties: {
            risk_assessment: {
              type: "object",
              properties: {
                overall_risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                identified_risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      risk: { type: "string" },
                      severity: { type: "string" },
                      indicators: { type: "array", items: { type: "string" } },
                      recommended_actions: { type: "array", items: { type: "string" } }
                    }
                  }
                }
              }
            },
            proactive_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  suggestion: { type: "string" },
                  priority: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            patterns_identified: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  frequency: { type: "string" },
                  significance: { type: "string" }
                }
              }
            },
            care_plan_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  recommendation: { type: "string" },
                  urgency: { type: "string" }
                }
              }
            }
          }
        };
      } else if (type === "handover") {
        prompt = `Create a comprehensive but concise handover summary for ${client.full_name}.

CURRENT STATUS:
- Active Alerts: ${activeAlerts.length}
- Recent Incidents: ${recentIncidents.length}
- Medication Compliance: ${medications.filter(m => m.status === "administered").length}/${medications.length} recent administrations

CARE PLAN HIGHLIGHTS:
${carePlan ? `
- Mobility: ${carePlan.physical_health?.mobility}
- Key Conditions: ${carePlan.physical_health?.medical_conditions?.join(", ")}
- Mental Health: ${carePlan.mental_health?.cognitive_function}
` : "No active care plan"}

RECENT EVENTS (Last 7 days):
${recentLogs.slice(0, 7).map(l => `- ${l.log_date}: ${l.notes || l.observation}`).join("\n")}

ACTIVE ALERTS:
${activeAlerts.map(a => `- [${a.severity}] ${a.title}`).join("\n")}

Create a handover summary suitable for incoming shift staff.`;

        schema = {
          type: "object",
          properties: {
            overall_status: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            immediate_attention_needed: { type: "array", items: { type: "string" } },
            ongoing_concerns: { type: "array", items: { type: "string" } },
            positive_developments: { type: "array", items: { type: "string" } },
            medication_notes: { type: "string" },
            behavioral_observations: { type: "string" },
            family_contact_updates: { type: "string" },
            recommendations_for_shift: { type: "array", items: { type: "string" } }
          }
        };
      } else if (type === "care-plan") {
        prompt = `As an expert care planner, analyze this client's recent data and recommend specific care plan updates.

CLIENT: ${client.full_name}

CURRENT CARE PLAN:
${JSON.stringify(carePlan, null, 2)}

RECENT ACTIVITY (30 days):
- Daily Logs: ${dailyLogs.length}
- Active Alerts: ${activeAlerts.length}
- Incidents: ${recentIncidents.length}
- Medications: ${medications.length}

PATTERNS FROM LOGS:
${recentLogs.map(l => `${l.log_date}: ${l.notes || l.observation}`).join("\n")}

Based on this data, recommend specific care plan adjustments including new objectives, modified tasks, or updated risk assessments.`;

        schema = {
          type: "object",
          properties: {
            recommended_objectives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  objective: { type: "string" },
                  rationale: { type: "string" },
                  target_date: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            recommended_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_name: { type: "string" },
                  category: { type: "string" },
                  frequency: { type: "string" },
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
                  likelihood: { type: "string" },
                  impact: { type: "string" },
                  control_measures: { type: "string" }
                }
              }
            },
            overall_assessment: { type: "string" }
          }
        };
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
      });

      setAnalysis(result);
      toast.success("Analysis Complete", "AI analysis generated successfully");
    } catch (error) {
      console.error("Error analyzing client:", error);
      toast.error("Analysis Failed", "Failed to generate AI analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const exportAnalysis = () => {
    const content = `AI Client Analysis - ${client.full_name}
Generated: ${format(new Date(), "PPpp")}
Analysis Type: ${analysisType}

${JSON.stringify(analysis, null, 2)}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${client.full_name}-ai-analysis-${format(new Date(), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
    toast.success("Copied", "Analysis copied to clipboard");
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Care Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!analysis ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Use AI to analyze {client.full_name}'s data and generate insights
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => analyzeClient("proactive")}
                disabled={analyzing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {analyzing && analysisType === "proactive" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Proactive Analysis
              </Button>
              <Button
                onClick={() => analyzeClient("handover")}
                disabled={analyzing}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {analyzing && analysisType === "handover" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Handover Summary
              </Button>
              <Button
                onClick={() => analyzeClient("care-plan")}
                disabled={analyzing}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              >
                {analyzing && analysisType === "care-plan" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                Care Plan Review
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-purple-600">
                {analysisType === "proactive" && "Proactive Analysis"}
                {analysisType === "handover" && "Handover Summary"}
                {analysisType === "care-plan" && "Care Plan Review"}
              </Badge>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={exportAnalysis}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAnalysis(null)}>
                  New Analysis
                </Button>
              </div>
            </div>

            {analysisType === "proactive" && (
              <div className="space-y-4">
                <Card className={`border-2 ${
                  analysis.risk_assessment?.overall_risk_level === "critical" ? "border-red-500 bg-red-50" :
                  analysis.risk_assessment?.overall_risk_level === "high" ? "border-orange-500 bg-orange-50" :
                  analysis.risk_assessment?.overall_risk_level === "medium" ? "border-yellow-500 bg-yellow-50" :
                  "border-green-500 bg-green-50"
                }`}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Risk Assessment: {analysis.risk_assessment?.overall_risk_level?.toUpperCase()}
                    </h3>
                    <div className="space-y-3 mt-3">
                      {analysis.risk_assessment?.identified_risks?.map((risk, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border">
                          <p className="font-semibold text-sm">{risk.risk}</p>
                          <Badge className="mt-1 mb-2">{risk.severity}</Badge>
                          {risk.indicators?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Indicators:</p>
                              <ul className="text-xs space-y-1">
                                {risk.indicators.map((ind, i) => (
                                  <li key={i}>• {ind}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {risk.recommended_actions?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Actions:</p>
                              <ul className="text-xs space-y-1">
                                {risk.recommended_actions.map((action, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-600" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {analysis.proactive_suggestions?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Proactive Suggestions
                      </h3>
                      <div className="space-y-2">
                        {analysis.proactive_suggestions.map((sug, idx) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-medium text-sm">{sug.suggestion}</p>
                              <Badge variant="outline" className="text-xs">
                                {sug.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{sug.rationale}</p>
                            <Badge className="mt-2 bg-blue-600 text-xs">{sug.category}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analysis.patterns_identified?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Patterns Identified</h3>
                      <div className="space-y-2">
                        {analysis.patterns_identified.map((pattern, idx) => (
                          <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <p className="font-medium text-sm">{pattern.pattern}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                Frequency: {pattern.frequency}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pattern.significance}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analysis.care_plan_recommendations?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Care Plan Recommendations</h3>
                      <div className="space-y-2">
                        {analysis.care_plan_recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <Badge className="mb-2 bg-green-600 text-xs">{rec.area}</Badge>
                                <p className="text-sm">{rec.recommendation}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {rec.urgency}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {analysisType === "handover" && (
              <div className="space-y-4">
                <Card className="bg-blue-50 border-blue-300">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Overall Status</h3>
                    <p className="text-sm">{analysis.overall_status}</p>
                  </CardContent>
                </Card>

                {analysis.immediate_attention_needed?.length > 0 && (
                  <Card className="border-red-300 bg-red-50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-900">
                        <AlertTriangle className="w-4 h-4" />
                        Immediate Attention Needed
                      </h3>
                      <ul className="space-y-1">
                        {analysis.immediate_attention_needed.map((item, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {analysis.key_points?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Key Points</h3>
                      <ul className="space-y-1">
                        {analysis.key_points.map((point, idx) => (
                          <li key={idx} className="text-sm">• {point}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {analysis.ongoing_concerns?.length > 0 && (
                  <Card className="bg-yellow-50 border-yellow-300">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Ongoing Concerns</h3>
                      <ul className="space-y-1">
                        {analysis.ongoing_concerns.map((concern, idx) => (
                          <li key={idx} className="text-sm">• {concern}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {analysis.positive_developments?.length > 0 && (
                  <Card className="bg-green-50 border-green-300">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-900">
                        <CheckCircle className="w-4 h-4" />
                        Positive Developments
                      </h3>
                      <ul className="space-y-1">
                        {analysis.positive_developments.map((dev, idx) => (
                          <li key={idx} className="text-sm">• {dev}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.medication_notes && (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 text-sm">Medication Notes</h3>
                        <p className="text-sm text-gray-700">{analysis.medication_notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  {analysis.behavioral_observations && (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 text-sm">Behavioral Observations</h3>
                        <p className="text-sm text-gray-700">{analysis.behavioral_observations}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {analysis.recommendations_for_shift?.length > 0 && (
                  <Card className="bg-purple-50 border-purple-300">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Recommendations for Shift</h3>
                      <ul className="space-y-1">
                        {analysis.recommendations_for_shift.map((rec, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {analysisType === "care-plan" && (
              <div className="space-y-4">
                {analysis.overall_assessment && (
                  <Card className="bg-blue-50 border-blue-300">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Overall Assessment</h3>
                      <p className="text-sm">{analysis.overall_assessment}</p>
                    </CardContent>
                  </Card>
                )}

                {analysis.recommended_objectives?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Recommended Objectives</h3>
                      <div className="space-y-3">
                        {analysis.recommended_objectives.map((obj, idx) => (
                          <div key={idx} className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-medium text-sm">{obj.objective}</p>
                              <Badge variant="outline" className="text-xs">
                                {obj.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{obj.rationale}</p>
                            {obj.target_date && (
                              <p className="text-xs text-gray-500">Target: {obj.target_date}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analysis.recommended_tasks?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Recommended Tasks</h3>
                      <div className="space-y-2">
                        {analysis.recommended_tasks.map((task, idx) => (
                          <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-medium text-sm">{task.task_name}</p>
                              <Badge className="bg-purple-600 text-xs">{task.category}</Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{task.rationale}</p>
                            <p className="text-xs font-medium text-purple-900">
                              Frequency: {task.frequency}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analysis.risk_updates?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Risk Assessment Updates</h3>
                      <div className="space-y-3">
                        {analysis.risk_updates.map((risk, idx) => (
                          <div key={idx} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <p className="font-medium text-sm mb-2">{risk.risk}</p>
                            <div className="flex gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                Likelihood: {risk.likelihood}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Impact: {risk.impact}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-700">
                              <span className="font-medium">Control Measures:</span> {risk.control_measures}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}