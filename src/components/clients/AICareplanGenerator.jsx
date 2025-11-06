import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  Edit2,
  Copy,
  Download,
  AlertCircle,
  Target,
  FileText,
  Lightbulb
} from "lucide-react";

export default function AICareplanGenerator({ client, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [carePlan, setCarePlan] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editedContent, setEditedContent] = useState("");

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts', client.id],
    queryFn: async () => {
      const alertsList = await base44.entities.ClientAlert.filter({ 
        client_id: client.id,
        status: 'active'
      });
      return alertsList;
    },
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medication-logs', client.id],
    queryFn: async () => {
      const logs = await base44.entities.MedicationLog.filter({ 
        client_id: client.id 
      }, '-administration_time');
      return logs.slice(0, 10); // Get recent medications
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback-recent', client.id],
    queryFn: async () => {
      const feedbackList = await base44.entities.ClientFeedback.filter({ 
        client_id: client.id 
      }, '-created_date');
      return feedbackList.slice(0, 5); // Get recent feedback
    },
  });

  const { data: consents = [] } = useQuery({
    queryKey: ['client-consents', client.id],
    queryFn: async () => {
      const consentsList = await base44.entities.ClientConsent.filter({ 
        client_id: client.id,
        status: 'granted'
      });
      return consentsList;
    },
  });

  const generateCarePlan = async () => {
    setGenerating(true);
    try {
      const activeMedications = [...new Set(medications.map(m => `${m.medication_name} (${m.dosage})`))];
      const activeAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical');
      const recentFeedback = feedback.filter(f => f.rating).map(f => ({
        type: f.feedback_type,
        rating: f.rating,
        comment: f.comments.substring(0, 100)
      }));

      const prompt = `You are an expert care planning specialist. Generate a comprehensive initial care plan for the following client.

**Client Profile:**
- Name: ${client.full_name}
- Age: ${client.date_of_birth ? new Date().getFullYear() - new Date(client.date_of_birth).getFullYear() : 'Unknown'}
- Funding: ${client.funding_type?.replace('_', ' ') || 'Not specified'}
- Mobility: ${client.mobility?.replace('_', ' ') || 'Not specified'}

**Care Needs:**
${client.care_needs?.map(need => `- ${need}`).join('\n') || 'Not specified'}

**Medical Information:**
${client.medical_notes || 'No medical notes recorded'}

**Current Medications:**
${activeMedications.length > 0 ? activeMedications.map(m => `- ${m}`).join('\n') : 'No medications recorded'}

**Active Alerts (Critical/High Priority):**
${activeAlerts.length > 0 ? activeAlerts.map(a => `- ${a.title}: ${a.description}`).join('\n') : 'No critical alerts'}

**Recent Feedback Summary:**
${recentFeedback.length > 0 ? recentFeedback.map(f => `- ${f.type} (${f.rating}/5): ${f.comment}`).join('\n') : 'No recent feedback'}

**Granted Consents:**
${consents.length > 0 ? consents.map(c => `- ${c.consent_title}`).join('\n') : 'No consents recorded'}

Generate a comprehensive care plan following best practices for person-centered care. Include:

1. **Client Overview**: Brief summary of the client's situation and needs
2. **Assessment Summary**: Key findings from the data provided
3. **Goals**: 4-6 SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
4. **Care Interventions**: Specific interventions for each care need identified
5. **Risk Management**: How to address identified risks and alerts
6. **Communication Preferences**: How best to communicate with the client
7. **Review Schedule**: Recommended review frequency
8. **Emergency Procedures**: Key emergency contacts and procedures
9. **Staff Guidance**: Important notes for care staff

Format each section clearly with headings. Be specific, professional, and person-centered. Base recommendations on evidence-based care practices.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            client_overview: { type: "string" },
            assessment_summary: { type: "string" },
            goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  timeframe: { type: "string" },
                  measurable_outcome: { type: "string" }
                }
              }
            },
            care_interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  care_need: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } },
                  frequency: { type: "string" }
                }
              }
            },
            risk_management: { type: "string" },
            communication_preferences: { type: "string" },
            review_schedule: { type: "string" },
            emergency_procedures: { type: "string" },
            staff_guidance: { type: "string" },
            additional_recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setCarePlan(response);
    } catch (error) {
      console.error("Error generating care plan:", error);
      alert("Failed to generate care plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditSection = (section, content) => {
    setEditingSection(section);
    setEditedContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  };

  const handleSaveEdit = () => {
    if (editingSection) {
      setCarePlan({
        ...carePlan,
        [editingSection]: editedContent
      });
      setEditingSection(null);
      setEditedContent("");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const exportCarePlan = () => {
    if (!carePlan) return;

    const content = `
CARE PLAN FOR ${client.full_name}
Generated: ${new Date().toLocaleDateString()}

CLIENT OVERVIEW
${carePlan.client_overview}

ASSESSMENT SUMMARY
${carePlan.assessment_summary}

GOALS
${carePlan.goals?.map((g, i) => `
${i + 1}. ${g.title}
   Description: ${g.description}
   Timeframe: ${g.timeframe}
   Measurable Outcome: ${g.measurable_outcome}
`).join('\n')}

CARE INTERVENTIONS
${carePlan.care_interventions?.map(ci => `
${ci.care_need}:
${ci.interventions.map(int => `  - ${int}`).join('\n')}
Frequency: ${ci.frequency}
`).join('\n')}

RISK MANAGEMENT
${carePlan.risk_management}

COMMUNICATION PREFERENCES
${carePlan.communication_preferences}

REVIEW SCHEDULE
${carePlan.review_schedule}

EMERGENCY PROCEDURES
${carePlan.emergency_procedures}

STAFF GUIDANCE
${carePlan.staff_guidance}

ADDITIONAL RECOMMENDATIONS
${carePlan.additional_recommendations?.map(r => `- ${r}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `care-plan-${client.full_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-5xl my-8">
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                AI Care Plan Generator
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Generate a comprehensive care plan for {client.full_name}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {!carePlan ? (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-4">
                  <Sparkles className="w-8 h-8 text-purple-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-2">
                      AI-Powered Care Planning
                    </h3>
                    <p className="text-sm text-purple-800 mb-3">
                      Our AI will analyze the client's complete profile including medical history, 
                      care needs, active alerts, medications, and feedback to generate a comprehensive, 
                      person-centered care plan following best practices.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Care Needs</p>
                        <p className="font-semibold">{client.care_needs?.length || 0}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Active Alerts</p>
                        <p className="font-semibold text-orange-600">{alerts.length}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Medications</p>
                        <p className="font-semibold">{[...new Set(medications.map(m => m.medication_name))].length}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Feedback</p>
                        <p className="font-semibold">{feedback.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>This is an AI-generated draft that requires professional review</li>
                      <li>All sections can be edited before finalizing</li>
                      <li>The care plan should be reviewed with the client and family</li>
                      <li>Regular reviews and updates are recommended</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={generateCarePlan}
                disabled={generating}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 py-6 text-lg"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Client Data & Generating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Care Plan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateCarePlan}
                  disabled={generating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCarePlan}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Client Overview */}
              <Card>
                <CardHeader className="border-b bg-blue-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Client Overview
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection('client_overview', carePlan.client_overview)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {editingSection === 'client_overview' ? (
                    <div>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={4}
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{carePlan.client_overview}</p>
                  )}
                </CardContent>
              </Card>

              {/* Assessment Summary */}
              <Card>
                <CardHeader className="border-b bg-purple-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-purple-600" />
                      Assessment Summary
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection('assessment_summary', carePlan.assessment_summary)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {editingSection === 'assessment_summary' ? (
                    <div>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={5}
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{carePlan.assessment_summary}</p>
                  )}
                </CardContent>
              </Card>

              {/* Goals */}
              <Card>
                <CardHeader className="border-b bg-green-50">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Care Goals ({carePlan.goals?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {carePlan.goals?.map((goal, index) => (
                      <Card key={index} className="border-l-4 border-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-lg">{index + 1}. {goal.title}</h4>
                            <Badge className="bg-green-100 text-green-800">{goal.timeframe}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{goal.description}</p>
                          <div className="p-2 bg-green-50 rounded text-sm">
                            <strong>Measurable Outcome:</strong> {goal.measurable_outcome}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Care Interventions */}
              <Card>
                <CardHeader className="border-b bg-orange-50">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-orange-600" />
                    Care Interventions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {carePlan.care_interventions?.map((intervention, index) => (
                      <Card key={index} className="border-l-4 border-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{intervention.care_need}</h4>
                            <Badge variant="outline">{intervention.frequency}</Badge>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {intervention.interventions.map((int, idx) => (
                              <li key={idx}>{int}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Management */}
              <Card>
                <CardHeader className="border-b bg-red-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Risk Management
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection('risk_management', carePlan.risk_management)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {editingSection === 'risk_management' ? (
                    <div>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={5}
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{carePlan.risk_management}</p>
                  )}
                </CardContent>
              </Card>

              {/* Additional Sections */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm">Communication Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{carePlan.communication_preferences}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm">Review Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{carePlan.review_schedule}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm">Emergency Procedures</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{carePlan.emergency_procedures}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm">Staff Guidance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{carePlan.staff_guidance}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Recommendations */}
              {carePlan.additional_recommendations && carePlan.additional_recommendations.length > 0 && (
                <Card>
                  <CardHeader className="border-b bg-blue-50">
                    <CardTitle className="text-sm">Additional Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {carePlan.additional_recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Success Message */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Care Plan Generated Successfully!</p>
                    <p>Review all sections carefully, make any necessary edits, and export for documentation. 
                    This plan should be discussed with the client, family members, and the care team before implementation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {carePlan && (
            <Button onClick={exportCarePlan} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export Care Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}