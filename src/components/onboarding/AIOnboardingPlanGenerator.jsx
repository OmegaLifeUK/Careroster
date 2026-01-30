import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIOnboardingPlanGenerator({ staffMember, onPlanGenerated }) {
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const { toast } = useToast();

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a detailed personalized onboarding plan for a new employee with the following details:

Name: ${staffMember.full_name}
Role: ${staffMember.care_setting || 'Care Worker'}
Employment Type: ${staffMember.employment_type || 'Full-time'}
Qualifications: ${staffMember.qualifications?.join(', ') || 'None listed'}

Create a comprehensive 30-60-90 day onboarding plan that includes:
1. Week-by-week breakdown of activities and milestones
2. Key learning objectives for each phase
3. Important meetings and training sessions to schedule
4. Equipment and system access requirements
5. Performance checkpoints and review dates
6. Buddy/mentor assignment recommendations
7. Department-specific integration activities

Format the response as a structured plan that is practical and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            plan_summary: { type: "string" },
            week_1_4: {
              type: "object",
              properties: {
                focus: { type: "string" },
                activities: { type: "array", items: { type: "string" } },
                milestones: { type: "array", items: { type: "string" } }
              }
            },
            week_5_8: {
              type: "object",
              properties: {
                focus: { type: "string" },
                activities: { type: "array", items: { type: "string" } },
                milestones: { type: "array", items: { type: "string" } }
              }
            },
            week_9_12: {
              type: "object",
              properties: {
                focus: { type: "string" },
                activities: { type: "array", items: { type: "string" } },
                milestones: { type: "array", items: { type: "string" } }
              }
            },
            key_objectives: { type: "array", items: { type: "string" } },
            recommended_buddy: { type: "string" },
            equipment_needed: { type: "array", items: { type: "string" } },
            system_access: { type: "array", items: { type: "string" } }
          }
        }
      });

      return result;
    },
    onSuccess: (plan) => {
      setGeneratedPlan(plan);
      toast.success("Plan Generated", "Personalized onboarding plan created successfully");
      onPlanGenerated?.(plan);
    },
    onError: (error) => {
      toast.error("Generation Failed", error.message);
    }
  });

  const downloadPlan = () => {
    const planText = `
PERSONALIZED ONBOARDING PLAN
Employee: ${staffMember.full_name}
Generated: ${new Date().toLocaleDateString()}

${generatedPlan.plan_summary}

=== WEEKS 1-4: ${generatedPlan.week_1_4.focus} ===
Activities:
${generatedPlan.week_1_4.activities.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Milestones:
${generatedPlan.week_1_4.milestones.map((m, i) => `✓ ${m}`).join('\n')}

=== WEEKS 5-8: ${generatedPlan.week_5_8.focus} ===
Activities:
${generatedPlan.week_5_8.activities.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Milestones:
${generatedPlan.week_5_8.milestones.map((m, i) => `✓ ${m}`).join('\n')}

=== WEEKS 9-12: ${generatedPlan.week_9_12.focus} ===
Activities:
${generatedPlan.week_9_12.activities.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Milestones:
${generatedPlan.week_9_12.milestones.map((m, i) => `✓ ${m}`).join('\n')}

=== KEY OBJECTIVES ===
${generatedPlan.key_objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

=== RECOMMENDATIONS ===
Buddy/Mentor: ${generatedPlan.recommended_buddy}

Equipment Needed:
${generatedPlan.equipment_needed.map(e => `- ${e}`).join('\n')}

System Access:
${generatedPlan.system_access.map(s => `- ${s}`).join('\n')}
    `;

    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-plan-${staffMember.full_name.replace(/\s+/g, '-')}.txt`;
    a.click();
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Sparkles className="w-5 h-5" />
          AI Personalized Onboarding Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!generatedPlan ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Generate a customized 30-60-90 day onboarding plan tailored to {staffMember.full_name}'s role and background.
            </p>
            <Button
              onClick={() => generatePlanMutation.mutate()}
              disabled={generatePlanMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Personalized Plan
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle className="w-5 h-5" />
              Plan Generated Successfully
            </div>

            <div className="bg-purple-50 p-4 rounded-lg space-y-4 max-h-96 overflow-y-auto">
              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Summary</h4>
                <p className="text-sm text-gray-700">{generatedPlan.plan_summary}</p>
              </div>

              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Weeks 1-4: {generatedPlan.week_1_4.focus}</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-700">Activities:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {generatedPlan.week_1_4.activities.map((activity, i) => (
                      <li key={i}>{activity}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Weeks 5-8: {generatedPlan.week_5_8.focus}</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-700">Activities:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {generatedPlan.week_5_8.activities.map((activity, i) => (
                      <li key={i}>{activity}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Weeks 9-12: {generatedPlan.week_9_12.focus}</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-700">Activities:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {generatedPlan.week_9_12.activities.map((activity, i) => (
                      <li key={i}>{activity}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Key Objectives</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {generatedPlan.key_objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Recommendations</h4>
                <p className="text-sm text-gray-700"><strong>Buddy/Mentor:</strong> {generatedPlan.recommended_buddy}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={downloadPlan}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Plan
              </Button>
              <Button
                onClick={() => {
                  setGeneratedPlan(null);
                  generatePlanMutation.reset();
                }}
                variant="outline"
                className="flex-1"
              >
                Generate New Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}