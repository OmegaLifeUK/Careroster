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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Loader2, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Heart,
  Upload,
  Palette,
  BookTemplate,
  Target,
  CheckCircle2,
  Circle,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addMonths } from "date-fns";

// Tone/Style Options
const TONE_OPTIONS = [
  { value: "professional", label: "Professional & Clinical", description: "Formal medical terminology, suitable for clinical settings" },
  { value: "person_centered", label: "Person-Centered", description: "Warm, personal language focusing on individual preferences" },
  { value: "family_friendly", label: "Family-Friendly", description: "Clear, accessible language for family members to understand" },
  { value: "detailed_technical", label: "Detailed Technical", description: "Comprehensive with specific medical details and protocols" }
];

// Condition Templates
const CONDITION_TEMPLATES = [
  { value: "dementia", label: "Dementia/Alzheimer's", icon: "🧠", tasks: ["Memory prompts", "Orientation support", "Safe wandering spaces"] },
  { value: "mobility", label: "Mobility Impairment", icon: "🦽", tasks: ["Transfer assistance", "Fall prevention", "Mobility exercises"] },
  { value: "diabetes", label: "Diabetes Management", icon: "💉", tasks: ["Blood sugar monitoring", "Dietary management", "Foot care"] },
  { value: "stroke", label: "Post-Stroke Recovery", icon: "❤️‍🩹", tasks: ["Speech therapy support", "Physio exercises", "Medication timing"] },
  { value: "palliative", label: "Palliative/End of Life", icon: "🕊️", tasks: ["Comfort measures", "Pain management", "Family support"] },
  { value: "mental_health", label: "Mental Health Support", icon: "🧘", tasks: ["Mood monitoring", "Social engagement", "Crisis prevention"] },
  { value: "learning_disability", label: "Learning Disability", icon: "📚", tasks: ["Routine consistency", "Communication aids", "Skill development"] },
  { value: "elderly_frail", label: "Elderly/Frail Care", icon: "👴", tasks: ["Nutrition support", "Skin integrity", "Social interaction"] }
];

export default function AICarePlanGenerator({ client, assessmentDocuments = [], onClose, onSuccess }) {
  const [selectedDocs, setSelectedDocs] = useState(assessmentDocuments.map(d => d.document_url));
  const [additionalContext, setAdditionalContext] = useState("");
  const [careSetting, setCareSetting] = useState("domiciliary");
  const [selectedTone, setSelectedTone] = useState("person_centered");
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [step, setStep] = useState("select");
  const [activeTab, setActiveTab] = useState("documents");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleTemplate = (templateValue) => {
    setSelectedTemplates(prev => 
      prev.includes(templateValue) 
        ? prev.filter(t => t !== templateValue)
        : [...prev, templateValue]
    );
  };

  const toggleDoc = (url) => {
    setSelectedDocs(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const generateCarePlan = async () => {
    if (selectedDocs.length === 0 && selectedTemplates.length === 0) {
      toast.error("No Input", "Please select documents or condition templates");
      return;
    }

    setIsGenerating(true);
    setStep("generating");

    try {
      // Build tone instructions
      const toneInstructions = {
        professional: "Use formal medical terminology and clinical language. Be precise and professional.",
        person_centered: "Use warm, personal language that focuses on the individual's preferences and dignity. Refer to the person by name.",
        family_friendly: "Use clear, accessible language that family members can easily understand. Avoid jargon.",
        detailed_technical: "Include comprehensive medical details, specific protocols, and technical terminology."
      };

      // Build template-specific instructions
      const templateInstructions = selectedTemplates.map(t => {
        const template = CONDITION_TEMPLATES.find(ct => ct.value === t);
        return template ? `Include specific considerations for ${template.label}: ${template.tasks.join(', ')}` : '';
      }).filter(Boolean).join('\n');

      const prompt = `You are a care plan specialist. Based on the following assessment documents for ${client.full_name}, generate a comprehensive care plan.

WRITING STYLE & TONE:
${toneInstructions[selectedTone] || toneInstructions.person_centered}

${templateInstructions ? `CONDITION-SPECIFIC REQUIREMENTS:\n${templateInstructions}\n` : ''}

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
  "dols": {
    "applicable": boolean,
    "status": "string describing current status if applicable",
    "restrictions": ["array of restrictions in place"],
    "authorisation_start": "YYYY-MM-DD or empty",
    "authorisation_end": "YYYY-MM-DD or empty",
    "supervisory_body": "string",
    "case_reference": "string",
    "reason": "why DoLS is required"
  },
  "dnacpr": {
    "in_place": boolean,
    "decision_date": "YYYY-MM-DD or empty",
    "decision_maker": "name of clinician",
    "decision_maker_role": "role e.g. GP, Consultant",
    "clinical_reasons": "clinical justification",
    "mental_capacity": "has_capacity|lacks_capacity_for_this_decision|fluctuating_capacity",
    "patient_involvement": "patient_has_capacity_and_agrees|patient_has_capacity_and_disagrees|patient_lacks_capacity|patient_not_informed_clinical_reasons",
    "family_involved": boolean
  },
  "emergency_info": {
    "hospital_preference": "string",
    "dnacpr_in_place": boolean,
    "emergency_protocol": "what to do in emergency"
  }
}

CRITICAL - DoLS & DNACPR:
- If documents mention DoLS, Deprivation of Liberty Safeguards, or restrictions on liberty, extract all details
- If documents mention DNACPR, Do Not Resuscitate, or end-of-life decisions, extract all details
- These are CQC requirements and must be accurately captured

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
            dols: { type: "object" },
            dnacpr: { type: "object" },
            emergency_info: { type: "object" }
          }
        }
      });

      setGeneratedPlan(result);
      setStep("review");
    } catch (error) {
      console.error("Error generating care plan:", error);
      
      // Provide more specific error message
      let errorMessage = "Failed to generate care plan. ";
      if (error?.message?.includes('file') || error?.message?.includes('document')) {
        errorMessage += "Unable to read the uploaded documents. Please ensure files are valid PDFs or images.";
      } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        errorMessage += "AI service limit reached. Please try again later.";
      } else if (error?.message?.includes('timeout')) {
        errorMessage += "Request took too long. Try with fewer documents or smaller files.";
      } else {
        errorMessage += "Please check your documents and try again.";
      }
      
      toast.error("Generation Failed", errorMessage);
      setStep("select");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me().catch(() => null);
      
      const carePlanData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: "initial",
        assessment_date: format(new Date(), "yyyy-MM-dd"),
        review_date: format(addMonths(new Date(), 3), "yyyy-MM-dd"),
        assessed_by: currentUser?.full_name || "AI Generated",
        status: "draft",
        version: 1
      };
      
      // Only add non-empty sections
      if (generatedPlan.personal_details && Object.keys(generatedPlan.personal_details).length) {
        carePlanData.personal_details = generatedPlan.personal_details;
      }
      if (generatedPlan.physical_health && Object.keys(generatedPlan.physical_health).length) {
        carePlanData.physical_health = generatedPlan.physical_health;
      }
      if (generatedPlan.mental_health && Object.keys(generatedPlan.mental_health).length) {
        carePlanData.mental_health = generatedPlan.mental_health;
      }
      if (generatedPlan.daily_routine && Object.keys(generatedPlan.daily_routine).length) {
        carePlanData.daily_routine = generatedPlan.daily_routine;
      }
      
      if (generatedPlan.care_objectives?.length) {
        carePlanData.care_objectives = generatedPlan.care_objectives;
      }
      
      if (generatedPlan.care_tasks?.length) {
        carePlanData.care_tasks = generatedPlan.care_tasks.map((task, idx) => {
          const taskObj = {
            task_id: `task_${Date.now()}_${idx}`,
            category: String(task.category || 'personal_care'),
            task_name: String(task.task_name || task.description || 'Care Task'),
            description: String(task.description || task.task_name || ''),
            frequency: String(task.frequency || 'daily'),
            preferred_time: String(task.preferred_time || ''),
            duration_minutes: Number(task.duration_minutes) || 30,
            special_instructions: String(task.special_instructions || ''),
            requires_two_carers: Boolean(task.requires_two_carers),
            is_active: true,
            linked_shift_types: Array.isArray(task.linked_shift_types) ? task.linked_shift_types : []
          };
          
          // Ensure all string fields are actually strings
          Object.keys(taskObj).forEach(key => {
            if (typeof taskObj[key] === 'undefined' || taskObj[key] === null) {
              if (key === 'duration_minutes') {
                taskObj[key] = 30;
              } else if (key === 'requires_two_carers' || key === 'is_active') {
                taskObj[key] = key === 'is_active';
              } else if (key === 'linked_shift_types') {
                taskObj[key] = [];
              } else {
                taskObj[key] = '';
              }
            }
          });
          
          return taskObj;
        });
      }
      
      if (generatedPlan.medication_management?.medications?.length) {
        carePlanData.medication_management = {
          self_administers: generatedPlan.medication_management.self_administers || false,
          administration_support: generatedPlan.medication_management.administration_support || 'assistance',
          medication_storage: generatedPlan.medication_management.medication_storage || '',
          pharmacy_details: generatedPlan.medication_management.pharmacy_details || '',
          gp_details: generatedPlan.medication_management.gp_details || '',
          medications: generatedPlan.medication_management.medications,
          allergies_sensitivities: generatedPlan.medication_management.allergies_sensitivities || '',
          notes: ''
        };
      }
      
      if (generatedPlan.preferences && Object.keys(generatedPlan.preferences).length) {
        carePlanData.preferences = generatedPlan.preferences;
      }
      
      if (generatedPlan.risk_factors?.length) {
        carePlanData.risk_factors = generatedPlan.risk_factors;
      }
      
      carePlanData.consent = { capacity_to_consent: true, consent_given_by: '', relationship: '', restrictions: '' };
      carePlanData.emergency_info = {
        hospital_preference: generatedPlan.emergency_info?.hospital_preference || '',
        dnacpr_in_place: Boolean(generatedPlan.dnacpr?.in_place),
        advance_directive: generatedPlan.emergency_info?.advance_directive || '',
        emergency_protocol: generatedPlan.emergency_info?.emergency_protocol || ''
      };
      
      // Store DoLS/DNACPR separately for later workflow activation
      if (generatedPlan.dols || generatedPlan.dnacpr) {
        carePlanData.last_reviewed_by = JSON.stringify({ 
          dols_pending: generatedPlan.dols, 
          dnacpr_pending: generatedPlan.dnacpr 
        });
      }
      
      return await base44.entities.CarePlan.create(carePlanData);
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Success!", "Care plan saved. Activate it to create tasks and workflows.");
      onSuccess?.(newPlan);
      onClose();
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Save Failed", error?.message || "Check that all required fields are valid");
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
                Configure your care plan generation for <strong>{client.full_name}</strong>. 
                Select documents, choose a tone, and apply condition templates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label className="mb-2 block font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Writing Tone
                </Label>
                <Select value={selectedTone} onValueChange={setSelectedTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map(tone => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({selectedDocs.length})
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <BookTemplate className="w-4 h-4" />
                  Templates ({selectedTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="context" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Context
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-4">
                {assessmentDocuments.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-gray-500">
                      <Upload className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No assessment documents attached to visits</p>
                      <p className="text-sm mt-1">Attach documents to assessment visits first</p>
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
                          <p className="text-sm text-gray-500">
                            {getDocTypeLabel(doc.document_type)}
                            {doc.uploaded_date && ` • ${format(new Date(doc.uploaded_date), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="templates" className="mt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Select condition templates to include specialized care tasks and considerations:
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {CONDITION_TEMPLATES.map((template) => (
                    <div
                      key={template.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplates.includes(template.value)
                          ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-300'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleTemplate(template.value)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={selectedTemplates.includes(template.value)}
                          onCheckedChange={() => toggleTemplate(template.value)}
                        />
                        <span className="text-xl">{template.icon}</span>
                        <span className="font-medium text-sm">{template.label}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.tasks.slice(0, 2).map((task, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{task}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="context" className="mt-4">
                <Label className="mb-2 block">Additional Context (Optional)</Label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Add any additional information not in the documents, such as recent observations, family preferences, or specific concerns..."
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Selected tone: <strong>{TONE_OPTIONS.find(t => t.value === selectedTone)?.description}</strong>
                </p>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={generateCarePlan}
                disabled={selectedDocs.length === 0 && selectedTemplates.length === 0}
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

                {/* Objectives with Progress Tracking */}
                {generatedPlan.care_objectives?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Care Objectives (with progress tracking)
                    </p>
                    <div className="space-y-2">
                      {generatedPlan.care_objectives.map((obj, idx) => {
                        const statusConfig = {
                          not_started: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Not Started', progress: 0 },
                          in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress', progress: 50 },
                          achieved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', label: 'Achieved', progress: 100 },
                          revised: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Revised', progress: 25 },
                          discontinued: { icon: Circle, color: 'text-red-500', bg: 'bg-red-100', label: 'Discontinued', progress: 0 }
                        };
                        const config = statusConfig[obj.status || 'not_started'];
                        const StatusIcon = config.icon;
                        
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${config.bg}`}>
                            <div className="flex items-start gap-2">
                              <StatusIcon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{obj.objective}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Progress value={config.progress} className="h-1.5 flex-1" />
                                  <span className="text-xs text-gray-500">{config.label}</span>
                                </div>
                                {obj.target_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Target: {format(new Date(obj.target_date), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={obj.status || 'not_started'}
                                onValueChange={(value) => {
                                  setGeneratedPlan(prev => ({
                                    ...prev,
                                    care_objectives: prev.care_objectives.map((o, i) => 
                                      i === idx ? { ...o, status: value } : o
                                    )
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-28 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="achieved">Achieved</SelectItem>
                                  <SelectItem value="revised">Revised</SelectItem>
                                  <SelectItem value="discontinued">Discontinued</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {generatedPlan.care_tasks?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Care Tasks:</p>
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

                {/* Templates Applied */}
                {selectedTemplates.length > 0 && (
                  <div className="mt-4 p-2 bg-purple-50 rounded border border-purple-100">
                    <p className="text-xs font-medium text-purple-700 mb-1">Templates Applied:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplates.map(t => {
                        const template = CONDITION_TEMPLATES.find(ct => ct.value === t);
                        return template ? (
                          <Badge key={t} variant="outline" className="text-xs">
                            {template.icon} {template.label}
                          </Badge>
                        ) : null;
                      })}
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