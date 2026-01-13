import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, 
  Loader2, 
  FileText, 
  CheckCircle,
  Upload,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addMonths } from "date-fns";

export default function AICarePlanGenerator({ client, assessmentDocuments = [], onClose, onSuccess }) {
  const [selectedDocs, setSelectedDocs] = useState(assessmentDocuments.map(d => d.document_url));
  const [additionalContext, setAdditionalContext] = useState("");
  const [careSetting, setCareSetting] = useState("domiciliary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [step, setStep] = useState("select");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleDoc = (url) => {
    setSelectedDocs(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const generateCarePlan = async () => {
    if (selectedDocs.length === 0) {
      toast.error("No Documents", "Please select at least one assessment document");
      return;
    }

    setIsGenerating(true);
    setStep("generating");

    try {
      const systemInstruction = `You are an AI assistant generating draft UK-compliant, person-centred care plans.
You must:
- Use only the uploaded documents
- Avoid assumptions or diagnoses
- Highlight uncertainty clearly
- Use professional, neutral language
- Follow UK care standards and terminology
- Produce a DRAFT requiring human approval`;

      const prompt = `${systemInstruction}

Using the uploaded assessments and documents:

Client: ${client.full_name}
DOB: ${client.date_of_birth || 'Not provided'}
Current Address: ${client.address?.street || ''}, ${client.address?.postcode || ''}
Care Setting: ${careSetting.replace('_', ' ')}

Additional Context: ${additionalContext || 'None provided'}

Generate a structured draft care plan following UK care standards with:

1. PERSONAL DETAILS & ABOUT ME:
   - Preferred name, communication needs
   - Cultural/religious preferences
   - Likes, dislikes, routines

2. ASSESSED NEEDS:
   - Physical health, mental health, mobility
   - Nutrition, personal care, continence
   - Medication support, social needs

3. DESIRED OUTCOMES:
   - What the person wants to achieve
   - Short and long-term goals

4. SUPPORT INTERVENTIONS (Care Tasks):
   - What support is required
   - How it should be delivered
   - Frequency and who is responsible

5. RISK MANAGEMENT:
   - Identified risks with likelihood/impact
   - Mitigation strategies

6. MEDICATIONS (if mentioned):
   - Current medications with dose, frequency, route

Flag any:
- Missing information
- Conflicting data
- Safeguarding indicators
- Capacity concerns

Return valid JSON only.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: selectedDocs,
        response_json_schema: {
          type: "object",
          properties: {
            personal_details: {
              type: "object",
              properties: {
                preferred_name: { type: "string" },
                communication_needs: { type: "string" },
                cultural_preferences: { type: "string" },
                likes: { type: "array", items: { type: "string" } },
                dislikes: { type: "array", items: { type: "string" } }
              }
            },
            assessed_needs: {
              type: "object",
              properties: {
                physical_health: { type: "string" },
                mental_health: { type: "string" },
                mobility: { type: "string" },
                nutrition: { type: "string" },
                personal_care: { type: "string" },
                social_needs: { type: "string" }
              }
            },
            desired_outcomes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  outcome: { type: "string" },
                  timeframe: { type: "string" },
                  measures: { type: "string" }
                }
              }
            },
            support_interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  need_area: { type: "string" },
                  support_required: { type: "string" },
                  frequency: { type: "string" },
                  responsible: { type: "string" }
                }
              }
            },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  likelihood: { type: "string" },
                  impact: { type: "string" },
                  mitigation: { type: "string" }
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
                  purpose: { type: "string" }
                }
              }
            },
            flags: {
              type: "object",
              properties: {
                missing_information: { type: "array", items: { type: "string" } },
                safeguarding_indicators: { type: "array", items: { type: "string" } },
                capacity_concerns: { type: "string" }
              }
            }
          }
        }
      });

      setGeneratedPlan(result);
      setStep("review");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Generation Failed", "Unable to generate care plan. Please check documents and try again.");
      setStep("select");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me().catch(() => null);
      
      // Save as draft - NO actual tasks/medications created yet
      const draftData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: "initial",
        assessment_date: format(new Date(), "yyyy-MM-dd"),
        review_date: format(addMonths(new Date(), 3), "yyyy-MM-dd"),
        assessed_by: currentUser?.full_name || "System",
        status: "draft",
        version: 1,
        
        // Store AI-generated data as metadata for later processing
        personal_details: generatedPlan.personal_details || {},
        
        physical_health: {
          mobility: generatedPlan.assessed_needs?.mobility || '',
          nutrition: generatedPlan.assessed_needs?.nutrition || '',
          medical_conditions: []
        },
        
        mental_health: {
          cognitive_function: generatedPlan.assessed_needs?.mental_health || '',
          communication_needs: generatedPlan.personal_details?.communication_needs || ''
        },
        
        preferences: {
          likes: generatedPlan.personal_details?.likes || [],
          dislikes: generatedPlan.personal_details?.dislikes || []
        },
        
        // Store as JSON for approval workflow
        last_reviewed_by: JSON.stringify({
          ai_generated: true,
          generated_date: new Date().toISOString(),
          source_documents: selectedDocs.length,
          pending_approval: {
            outcomes: generatedPlan.desired_outcomes || [],
            interventions: generatedPlan.support_interventions || [],
            risks: generatedPlan.risks || [],
            medications: generatedPlan.medications || [],
            flags: generatedPlan.flags || {}
          }
        })
      };
      
      return await base44.entities.CarePlan.create(draftData);
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Draft Saved", "Review and approve the plan to create tasks and records.");
      onSuccess?.(newPlan);
      onClose();
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Save Failed", error?.message || "Unable to save draft");
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Care Plan Generator (UK Compliant)
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>AI Assistance:</strong> This tool drafts a UK-compliant, person-centred care plan from assessments.
                All outputs require human review and approval before use.
              </p>
            </div>

            <div>
              <Label className="mb-2 block font-medium">Care Setting</Label>
              <Select value={careSetting} onValueChange={setCareSetting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domiciliary">Domiciliary Care</SelectItem>
                  <SelectItem value="residential">Residential Care</SelectItem>
                  <SelectItem value="supported_living">Supported Living</SelectItem>
                  <SelectItem value="day_centre">Day Centre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block font-medium">
                Select Assessment Documents ({selectedDocs.length} selected)
              </Label>
              {assessmentDocuments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No assessment documents available</p>
                    <p className="text-sm mt-1">Upload documents to visits/shifts first</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {assessmentDocuments.map((doc, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedDocs.includes(doc.document_url) 
                          ? 'border-purple-300 bg-purple-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleDoc(doc.document_url)}
                    >
                      <Checkbox 
                        checked={selectedDocs.includes(doc.document_url)}
                        onCheckedChange={() => toggleDoc(doc.document_url)}
                      />
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{doc.document_name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.document_type} • {doc.source}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Additional Professional Context (Optional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Add any recent observations, family input, or professional notes not in the documents..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={generateCarePlan}
                disabled={selectedDocs.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Draft Care Plan
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "generating" && (
          <div className="py-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">AI Processing Documents...</h3>
            <p className="text-gray-600">Analyzing assessments and generating draft care plan</p>
            <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
          </div>
        )}

        {step === "review" && generatedPlan && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">⚠️ Draft Requires Human Approval</p>
                <p className="text-sm text-amber-700">
                  This care plan was drafted with AI assistance. It must be reviewed, edited, and approved by a qualified professional before use.
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Generated Content Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-2xl font-bold text-blue-700">
                        {generatedPlan.desired_outcomes?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Outcomes</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-2xl font-bold text-purple-700">
                        {generatedPlan.support_interventions?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Interventions</p>
                    </div>
                    <div className="p-3 bg-pink-50 rounded">
                      <p className="text-2xl font-bold text-pink-700">
                        {generatedPlan.medications?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Medications</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded">
                      <p className="text-2xl font-bold text-orange-700">
                        {generatedPlan.risks?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Risks</p>
                    </div>
                  </div>
                </div>

                {generatedPlan.flags?.safeguarding_indicators?.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-800 mb-1">🚨 Safeguarding Indicators:</p>
                    <ul className="text-sm text-red-700 list-disc list-inside">
                      {generatedPlan.flags.safeguarding_indicators.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedPlan.support_interventions?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Support Interventions (Preview):</p>
                    <div className="space-y-2">
                      {generatedPlan.support_interventions.slice(0, 3).map((intervention, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                          <p className="font-medium">{intervention.need_area}</p>
                          <p className="text-gray-600 text-xs">{intervention.support_required}</p>
                          <p className="text-gray-500 text-xs">Frequency: {intervention.frequency}</p>
                        </div>
                      ))}
                      {generatedPlan.support_interventions.length > 3 && (
                        <p className="text-xs text-gray-500">+{generatedPlan.support_interventions.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Next Steps:</strong> Save as draft → Review in Care Plan Manager → Edit if needed → Approve to create tasks and records
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
                ← Back
              </Button>
              <Button 
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveDraftMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Draft for Review
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