import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AICareplanGenerator({ client, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const { toast } = useToast();

  const generateCarePlan = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Generate a comprehensive care plan for the following client:

Name: ${client.full_name || 'Not provided'}
Date of Birth: ${client.date_of_birth || 'Not provided'}
Mobility: ${client.mobility || 'Not specified'}
Care Needs: ${client.care_needs?.join(', ') || 'Not specified'}
Medical Notes: ${client.medical_notes || 'None provided'}
Funding Type: ${client.funding_type || 'Not specified'}
Additional Context: ${additionalNotes || 'None'}

Please provide a detailed care plan with the following sections:
1. Assessment Summary
2. Care Goals (short-term and long-term)
3. Daily Care Routine
4. Risk Assessment
5. Support Requirements
6. Review Schedule

Format the response as JSON with these sections.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            assessment_summary: { type: "string" },
            care_goals: {
              type: "object",
              properties: {
                short_term: { type: "array", items: { type: "string" } },
                long_term: { type: "array", items: { type: "string" } }
              }
            },
            daily_routine: { type: "array", items: { type: "string" } },
            risk_assessment: { type: "array", items: { type: "string" } },
            support_requirements: { type: "array", items: { type: "string" } },
            review_schedule: { type: "string" }
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

  const saveToDocs = async () => {
    if (!generatedPlan) return;
    
    try {
      const shortTermGoals = generatedPlan.care_goals?.short_term || [];
      const longTermGoals = generatedPlan.care_goals?.long_term || [];
      const dailyRoutine = generatedPlan.daily_routine || [];
      const riskAssessment = generatedPlan.risk_assessment || [];
      const supportRequirements = generatedPlan.support_requirements || [];

      const planText = `
CARE PLAN FOR ${client.full_name}
Generated: ${new Date().toLocaleDateString()}

ASSESSMENT SUMMARY
${generatedPlan.assessment_summary || 'N/A'}

CARE GOALS
Short-term:
${shortTermGoals.map(g => `- ${g}`).join('\n')}

Long-term:
${longTermGoals.map(g => `- ${g}`).join('\n')}

DAILY CARE ROUTINE
${dailyRoutine.map(r => `- ${r}`).join('\n')}

RISK ASSESSMENT
${riskAssessment.map(r => `- ${r}`).join('\n')}

SUPPORT REQUIREMENTS
${supportRequirements.map(r => `- ${r}`).join('\n')}

REVIEW SCHEDULE
${generatedPlan.review_schedule || 'N/A'}
`;

      const blob = new Blob([planText], { type: 'text/plain' });
      const file = new File([blob], `care-plan-${client.full_name}-${Date.now()}.txt`);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.ClientDocument.create({
        client_id: client.id,
        document_type: 'care_plan',
        document_name: `AI Generated Care Plan - ${new Date().toLocaleDateString()}`,
        file_url: file_url,
        file_type: 'text/plain',
        file_size: blob.size,
        uploaded_by_staff_id: 'system',
        notes: 'AI generated care plan'
      });

      toast.success("Saved", "Care plan saved to client documents");
      onClose();
    } catch (error) {
      console.error("Error saving care plan:", error);
      toast.error("Error", "Failed to save care plan");
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
                <span className="text-green-900 font-medium">Care plan generated successfully!</span>
              </div>

              {generatedPlan.assessment_summary && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Assessment Summary</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {generatedPlan.assessment_summary}
                  </p>
                </div>
              )}

              {generatedPlan.care_goals && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Care Goals</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {generatedPlan.care_goals.short_term && generatedPlan.care_goals.short_term.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Short-term</h4>
                        <ul className="space-y-1">
                          {generatedPlan.care_goals.short_term.map((goal, idx) => (
                            <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {generatedPlan.care_goals.long_term && generatedPlan.care_goals.long_term.length > 0 && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">Long-term</h4>
                        <ul className="space-y-1">
                          {generatedPlan.care_goals.long_term.map((goal, idx) => (
                            <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                              <span className="text-purple-600 mt-0.5">•</span>
                              <span>{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {generatedPlan.daily_routine && generatedPlan.daily_routine.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Daily Care Routine</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="space-y-2">
                      {generatedPlan.daily_routine.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {generatedPlan.risk_assessment && generatedPlan.risk_assessment.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Risk Assessment</h3>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <ul className="space-y-2">
                      {generatedPlan.risk_assessment.map((risk, idx) => (
                        <li key={idx} className="text-sm text-orange-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {generatedPlan.support_requirements && generatedPlan.support_requirements.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Support Requirements</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="space-y-2">
                      {generatedPlan.support_requirements.map((req, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-600 mt-0.5">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {generatedPlan.review_schedule && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Review Schedule</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {generatedPlan.review_schedule}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={saveToDocs}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Save to Client Documents
                </Button>
                <Button
                  onClick={() => setGeneratedPlan(null)}
                  variant="outline"
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