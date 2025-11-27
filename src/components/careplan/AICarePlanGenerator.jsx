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
  AlertTriangle, 
  CheckCircle,
  Heart,
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
      const prompt = `You are a care plan specialist. Based on the following assessment documents for ${client.full_name}, generate a comprehensive care plan.

Client Details:
- Name: ${client.full_name}
- Date of Birth: ${client.date_of_birth || 'Not provided'}
- Address: ${client.address?.street || ''}, ${client.address?.city || ''}, ${client.address?.postcode || ''}
- Emergency Contact: ${client.emergency_contact?.name || 'Not provided'} (${client.emergency_contact?.relationship || ''})
- Existing Care Needs: ${(client.care_needs || []).join(', ') || 'Not specified'}
- Mobility: ${client.mobility || 'Not specified'}
- Medical Notes: ${client.medical_notes || 'None provided'}

Care Setting: ${careSetting.replace('_', ' ')}

Additional Context from Staff:
${additionalContext || 'None provided'}

Please generate a detailed care plan in JSON format with the following structure:
{
  "personal_details": {
    "preferred_name": "string",
    "language": "string", 
    "religion": "string",
    "cultural_needs": "string"
  },
  "physical_health": {
    "mobility": "independent|requires_assistance|wheelchair_user|bed_bound",
    "continence": "continent|occasional_incontinence|incontinent|catheter",
    "nutrition": "string describing dietary needs",
    "skin_integrity": "string",
    "pain_management": "string",
    "medical_conditions": ["array of conditions"],
    "allergies": ["array of allergies"]
  },
  "mental_health": {
    "cognitive_function": "string",
    "mental_health_conditions": ["array"],
    "communication_needs": "string",
    "behaviour_support_needs": "string"
  },
  "care_objectives": [
    {
      "objective": "string - clear measurable goal",
      "outcome_measures": "how success will be measured",
      "target_date": "YYYY-MM-DD format, typically 3-6 months ahead",
      "status": "not_started"
    }
  ],
  "care_tasks": [
    {
      "category": "personal_care|nutrition|medication|mobility|social|emotional|healthcare|domestic|other",
      "task_name": "short name",
      "description": "detailed description",
      "frequency": "daily|twice_daily|weekly|as_needed|with_each_visit|monthly",
      "preferred_time": "HH:MM format or empty",
      "duration_minutes": number,
      "special_instructions": "string",
      "requires_two_carers": boolean
    }
  ],
  "medication_management": {
    "self_administers": boolean,
    "administration_support": "none|prompting|assistance|full_administration",
    "pharmacy_details": "string",
    "gp_details": "string",
    "medications": [
      {
        "name": "medication name",
        "dose": "dosage",
        "frequency": "how often",
        "purpose": "what it's for",
        "special_instructions": "any notes",
        "is_prn": boolean
      }
    ],
    "allergies_sensitivities": "string"
  },
  "daily_routine": {
    "morning": "description of morning routine",
    "afternoon": "description",
    "evening": "description",
    "night": "description"
  },
  "preferences": {
    "likes": ["array of things they like"],
    "dislikes": ["array of things they dislike"],
    "hobbies": ["array of hobbies/interests"],
    "food_preferences": "string",
    "personal_care_preferences": "string",
    "communication_preferences": "string"
  },
  "risk_factors": [
    {
      "risk": "description of risk",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high",
      "control_measures": "how to manage this risk"
    }
  ],
  "emergency_info": {
    "hospital_preference": "string",
    "dnacpr_in_place": boolean,
    "emergency_protocol": "what to do in emergency"
  }
}

Be thorough but realistic. Include specific, actionable care tasks based on the assessment findings. Identify risks from the assessments. Set achievable objectives.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: selectedDocs,
        response_json_schema: {
          type: "object",
          properties: {
            personal_details: { type: "object" },
            physical_health: { type: "object" },
            mental_health: { type: "object" },
            care_objectives: { type: "array" },
            care_tasks: { type: "array" },
            medication_management: { type: "object" },
            daily_routine: { type: "object" },
            preferences: { type: "object" },
            risk_factors: { type: "array" },
            emergency_info: { type: "object" }
          }
        }
      });

      setGeneratedPlan(result);
      setStep("review");
    } catch (error) {
      console.error("Error generating care plan:", error);
      toast.error("Generation Failed", "Failed to generate care plan. Please try again.");
      setStep("select");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const carePlanData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: "initial",
        assessment_date: format(new Date(), "yyyy-MM-dd"),
        review_date: format(addMonths(new Date(), 3), "yyyy-MM-dd"),
        assessed_by: "AI Generated (Requires Review)",
        status: "draft",
        ...generatedPlan,
        care_tasks: (generatedPlan.care_tasks || []).map((task, idx) => ({
          ...task,
          task_id: `task_${Date.now()}_${idx}`,
          is_active: true
        })),
        care_objectives: (generatedPlan.care_objectives || []).map(obj => ({
          ...obj,
          status: obj.status || "not_started"
        }))
      };

      return base44.entities.CarePlan.create(carePlanData);
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Care Plan Created", "AI-generated care plan saved as draft. Please review and update.");
      onSuccess?.(newPlan);
      onClose();
    },
    onError: () => {
      toast.error("Error", "Failed to save care plan");
    }
  });

  const getDocTypeLabel = (type) => {
    const labels = {
      pre_admission_assessment: "Pre-Admission Assessment",
      care_assessment: "Care Assessment",
      risk_assessment: "Risk Assessment",
      mental_capacity: "Mental Capacity Assessment",
      consent_form: "Consent Form",
      medical_history: "Medical History",
      other: "Other Document"
    };
    return labels[type] || type;
  };

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
                Select assessment documents to analyze. The AI will extract information from these documents 
                to generate a comprehensive care plan for <strong>{client.full_name}</strong>.
              </p>
            </div>

            <div>
              <Label className="mb-3 block font-medium">Care Setting</Label>
              <Select value={careSetting} onValueChange={setCareSetting}>
                <SelectTrigger className="w-64">
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
              <Label className="mb-3 block font-medium">
                Assessment Documents ({selectedDocs.length} selected)
              </Label>
              
              {assessmentDocuments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No assessment documents attached to visits</p>
                    <p className="text-sm mt-1">Attach documents to assessment visits first</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
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
                        <p className="text-sm text-gray-500">
                          {getDocTypeLabel(doc.document_type)}
                          {doc.uploaded_date && ` • ${format(new Date(doc.uploaded_date), 'MMM d, yyyy')}`}
                        </p>
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
                placeholder="Add any additional information not in the documents, such as recent observations, family preferences, or specific concerns..."
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
            <p className="text-gray-600">
              AI is reading the assessment documents and generating a comprehensive care plan.
            </p>
            <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds.</p>
          </div>
        )}

        {step === "review" && generatedPlan && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Care Plan Generated Successfully</p>
                <p className="text-sm text-green-700">
                  Review the generated plan below. It will be saved as a draft for further editing.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Review Required</p>
                <p className="text-sm text-amber-700">
                  AI-generated content should always be reviewed and verified by qualified staff before use.
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-blue-600" />
                  Generated Care Plan Summary
                </h4>
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
                      {generatedPlan.medication_management?.medications?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Medications</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded">
                    <p className="text-2xl font-bold text-orange-700">
                      {generatedPlan.risk_factors?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Risk Factors</p>
                  </div>
                </div>

                {generatedPlan.care_tasks?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Sample Tasks:</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedPlan.care_tasks.slice(0, 5).map((task, idx) => (
                        <Badge key={idx} variant="outline">{task.task_name}</Badge>
                      ))}
                      {generatedPlan.care_tasks.length > 5 && (
                        <Badge variant="outline">+{generatedPlan.care_tasks.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {generatedPlan.risk_factors?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Identified Risks:</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedPlan.risk_factors.map((risk, idx) => (
                        <Badge 
                          key={idx} 
                          className={
                            risk.likelihood === 'high' || risk.impact === 'high'
                              ? 'bg-red-100 text-red-700'
                              : risk.likelihood === 'medium' || risk.impact === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }
                        >
                          {risk.risk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
                ← Back to Selection
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