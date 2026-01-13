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
  Upload
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
      const prompt = `Analyze the assessment documents for ${client.full_name} and generate a comprehensive care plan.

Client Details:
- Name: ${client.full_name}
- DOB: ${client.date_of_birth || 'Not provided'}
- Address: ${client.address?.street || ''}, ${client.address?.postcode || ''}
- Care Needs: ${(client.care_needs || []).join(', ') || 'Not specified'}
- Mobility: ${client.mobility || 'Not specified'}

Care Setting: ${careSetting.replace('_', ' ')}
Additional Context: ${additionalContext || 'None'}

Generate a care plan with:
1. Physical & Mental Health Assessment
2. Care Objectives (3-5 SMART goals)
3. Care Tasks (daily activities needed)
4. Medications (if mentioned)
5. Risk Factors
6. Preferences & Routines
7. DoLS/DNACPR status (if mentioned)

Return valid JSON matching this structure.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: selectedDocs,
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
                  duration_minutes: { type: "number" }
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
                likes: { type: "array", items: { type: "string" } },
                dislikes: { type: "array", items: { type: "string" } },
                hobbies: { type: "array", items: { type: "string" } }
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
            dols: {
              type: "object",
              properties: {
                applicable: { type: "boolean" },
                status: { type: "string" },
                reason: { type: "string" }
              }
            },
            dnacpr: {
              type: "object",
              properties: {
                in_place: { type: "boolean" },
                decision_date: { type: "string" },
                decision_maker: { type: "string" }
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me().catch(() => null);
      
      // Build care tasks array with proper structure
      const careTasks = (generatedPlan.care_tasks || []).map((task, idx) => ({
        task_id: `task_${Date.now()}_${idx}`,
        task_name: task.task_name || 'Care Task',
        category: task.category || 'personal_care',
        description: task.description || '',
        frequency: task.frequency || 'daily',
        preferred_time: task.preferred_time || '',
        duration_minutes: task.duration_minutes || 30,
        special_instructions: task.special_instructions || '',
        requires_two_carers: false,
        is_active: true,
        linked_shift_types: []
      }));

      const carePlanData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: "initial",
        assessment_date: format(new Date(), "yyyy-MM-dd"),
        review_date: format(addMonths(new Date(), 3), "yyyy-MM-dd"),
        assessed_by: currentUser?.full_name || "AI Generated",
        status: "draft",
        version: 1,
        physical_health: generatedPlan.physical_health || {},
        mental_health: generatedPlan.mental_health || {},
        care_objectives: generatedPlan.care_objectives || [],
        care_tasks: careTasks,
        medication_management: {
          self_administers: false,
          administration_support: 'assistance',
          medications: generatedPlan.medications || [],
          pharmacy_details: '',
          gp_details: '',
          allergies_sensitivities: (generatedPlan.physical_health?.allergies || []).join(', ')
        },
        daily_routine: generatedPlan.daily_routine || {},
        preferences: generatedPlan.preferences || {},
        risk_factors: generatedPlan.risk_factors || [],
        emergency_info: {
          hospital_preference: '',
          dnacpr_in_place: Boolean(generatedPlan.dnacpr?.in_place),
          emergency_protocol: ''
        },
        consent: {
          capacity_to_consent: true,
          consent_given_by: '',
          relationship: '',
          restrictions: ''
        },
        last_reviewed_by: JSON.stringify({ 
          dols_pending: generatedPlan.dols, 
          dnacpr_pending: generatedPlan.dnacpr 
        })
      };
      
      return await base44.entities.CarePlan.create(carePlanData);
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Success!", "Care plan saved as draft. Review and approve to create tasks and workflows.");
      onSuccess?.(newPlan);
      onClose();
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Save Failed", error?.message || "Unable to save care plan");
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Care Plan Generator
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                Generate a care plan for <strong>{client.full_name}</strong> from assessment documents.
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
              <Label className="mb-2 block font-medium">Assessment Documents</Label>
              {assessmentDocuments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No assessment documents available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
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
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-gray-500">{doc.document_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Additional Context (Optional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any additional information not in documents..."
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
                Generate Care Plan
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "generating" && (
          <div className="py-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Documents...</h3>
            <p className="text-gray-600">Generating comprehensive care plan</p>
            <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
          </div>
        )}

        {step === "review" && generatedPlan && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Care Plan Generated</p>
                <p className="text-sm text-green-700">
                  Save as draft, then review and approve to create tasks and workflows.
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-2xl font-bold text-blue-700">
                      {generatedPlan.care_objectives?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Objectives</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <p className="text-2xl font-bold text-purple-700">
                      {generatedPlan.care_tasks?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Care Tasks</p>
                  </div>
                  <div className="p-3 bg-pink-50 rounded">
                    <p className="text-2xl font-bold text-pink-700">
                      {generatedPlan.medications?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Medications</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded">
                    <p className="text-2xl font-bold text-orange-700">
                      {generatedPlan.risk_factors?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Risks</p>
                  </div>
                </div>

                {generatedPlan.care_tasks?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Care Tasks:</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedPlan.care_tasks.slice(0, 6).map((task, idx) => (
                        <Badge key={idx} variant="outline">{task.task_name}</Badge>
                      ))}
                      {generatedPlan.care_tasks.length > 6 && (
                        <Badge variant="outline">+{generatedPlan.care_tasks.length - 6} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
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
                    Save as Draft
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