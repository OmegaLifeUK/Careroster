import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Sparkles, CheckCircle, XCircle, Edit, FileText, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AICarePlanGenerator({ client, onClose, onSuccess }) {
  const [step, setStep] = useState("select"); // select, generating, review
  const [careSetting, setCareSetting] = useState("residential");
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [sectionStatus, setSectionStatus] = useState({});
  const [editingSections, setEditingSections] = useState({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available assessment documents
  const { data: assessmentDocs = [] } = useQuery({
    queryKey: ['assessment-docs', client.id],
    queryFn: async () => {
      const [visits, shifts, assessments, clientDocs] = await Promise.all([
        base44.entities.Visit.filter({ client_id: client.id }).catch(() => []),
        base44.entities.Shift.filter({ client_id: client.id }).catch(() => []),
        base44.entities.Assessment.filter({ client_id: client.id }).catch(() => []),
        base44.entities.ClientDocument.filter({ client_id: client.id }).catch(() => [])
      ]);

      const docs = [];
      
      visits?.forEach(v => {
        if (v.assessment_document_url) {
          docs.push({
            id: `visit-${v.id}`,
            type: 'visit_assessment',
            date: v.visit_date,
            url: v.assessment_document_url,
            label: `Visit Assessment - ${v.visit_date}`
          });
        }
      });

      shifts?.forEach(s => {
        if (s.assessment_document_url) {
          docs.push({
            id: `shift-${s.id}`,
            type: 'shift_assessment',
            date: s.shift_date,
            url: s.assessment_document_url,
            label: `Shift Assessment - ${s.shift_date}`
          });
        }
      });

      // Include ClientDocuments that are assessments
      clientDocs?.forEach(d => {
        if (d.document_type === 'assessment' && d.file_url) {
          const uploadDate = d.upload_date 
            ? (typeof d.upload_date === 'string' ? d.upload_date.split('T')[0] : new Date().toISOString().split('T')[0])
            : new Date().toISOString().split('T')[0];
          
          docs.push({
            id: `doc-${d.id}`,
            type: 'client_document',
            date: uploadDate,
            url: d.file_url,
            label: `${d.document_name}`
          });
        }
      });

      assessments?.forEach(a => {
        // Check if description contains a document URL
        const urlMatch = a.assessment_description?.match(/Document URL: (https?:\/\/[^\s]+)/);
        docs.push({
          id: `assessment-${a.id}`,
          type: a.assessment_type,
          date: a.assessment_date,
          url: urlMatch ? urlMatch[1] : null,
          description: a.assessment_description,
          label: `${a.assessment_title} - ${a.assessment_date}`
        });
      });

      return docs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
  });

  const toggleDocument = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const generateCarePlan = async () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setStep("generating");

    try {
      const selectedDocs = assessmentDocs.filter(doc => selectedDocuments.includes(doc.id));
      const fileUrls = selectedDocs.filter(d => d.url).map(d => d.url);
      const textContent = selectedDocs.filter(d => d.description).map(d => 
        `${d.label}:\n${d.description}`
      ).join('\n\n');

      const systemPrompt = `You are a UK care-sector documentation assistant that supports regulated professionals by drafting person-centred care plans. You do not make decisions, do not provide clinical or legal judgement, and all outputs require human review and approval.

CRITICAL RULES:
- Use only the provided documents
- Avoid assumptions or diagnoses
- Highlight uncertainty clearly
- Use professional, neutral language
- Follow UK care standards and terminology
- Produce a DRAFT requiring human approval
- Do not invent data`;

      const userPrompt = `Using the uploaded assessments and documents for ${client.full_name}, generate a structured DRAFT care plan for ${careSetting} care setting.

Available Assessment Information:
${textContent}

${additionalContext ? `Additional Context:\n${additionalContext}\n\n` : ''}

Extract all relevant care needs, risks, preferences, and outcomes. Clearly flag:
- Missing information
- Conflicting data
- Safeguarding or capacity indicators

Generate a UK-compliant care plan following this structure:
1. Personal Details
2. About Me (Person-Centred preferences, communication needs, likes/dislikes)
3. Assessed Needs (Physical health, mental health, mobility, nutrition, personal care, medication support, social needs)
4. Desired Outcomes (What the person wants to achieve)
5. Support Interventions (For each need: what support, how delivered, frequency, who responsible)
6. Risk Management (Identified risks, likelihood/impact, mitigation strategies)
7. Mental Capacity & Consent (If applicable)
8. Safeguarding (If applicable - summary only)

Write in clear, professional UK English.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: userPrompt,
        add_context_from_internet: false,
        file_urls: fileUrls.length > 0 ? fileUrls : null,
        response_json_schema: {
          type: "object",
          properties: {
            personal_details: {
              type: "object",
              properties: {
                content: { type: "string" },
                missing_info: { type: "array", items: { type: "string" } },
                flags: { type: "array", items: { type: "string" } }
              }
            },
            about_me: {
              type: "object",
              properties: {
                content: { type: "string" },
                missing_info: { type: "array", items: { type: "string" } }
              }
            },
            assessed_needs: {
              type: "object",
              properties: {
                content: { type: "string" },
                needs_list: { type: "array", items: { type: "string" } },
                missing_info: { type: "array", items: { type: "string" } }
              }
            },
            desired_outcomes: {
              type: "object",
              properties: {
                content: { type: "string" },
                outcomes_list: { type: "array", items: { type: "string" } }
              }
            },
            support_interventions: {
              type: "object",
              properties: {
                content: { type: "string" },
                interventions: { type: "array", items: { type: "string" } }
              }
            },
            risk_management: {
              type: "object",
              properties: {
                content: { type: "string" },
                risks: { type: "array", items: { type: "string" } },
                safeguarding_flags: { type: "array", items: { type: "string" } }
              }
            },
            mental_capacity_consent: {
              type: "object",
              properties: {
                content: { type: "string" },
                capacity_indicators: { type: "array", items: { type: "string" } }
              }
            },
            safeguarding: {
              type: "object",
              properties: {
                content: { type: "string" },
                flags: { type: "array", items: { type: "string" } }
              }
            },
            overall_flags: {
              type: "array",
              items: { type: "string" },
              description: "Overall concerns, missing data, or contradictions"
            }
          }
        }
      });

      setGeneratedPlan(response);
      
      // Initialize all sections as pending review
      const initialStatus = {};
      Object.keys(response).forEach(key => {
        if (key !== 'overall_flags') {
          initialStatus[key] = 'pending';
        }
      });
      setSectionStatus(initialStatus);
      
      setStep("review");
      toast.success("Draft care plan generated", "Please review and approve each section");
    } catch (error) {
      console.error("Error generating care plan:", error);
      toast.error("Failed to generate care plan", error.message);
      setStep("select");
    }
  };

  const handleSectionAction = (section, action) => {
    if (action === 'edit') {
      setEditingSections(prev => ({ ...prev, [section]: generatedPlan[section].content }));
    } else if (action === 'save_edit') {
      setGeneratedPlan(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          content: editingSections[section]
        }
      }));
      setEditingSections(prev => {
        const updated = { ...prev };
        delete updated[section];
        return updated;
      });
      setSectionStatus(prev => ({ ...prev, [section]: 'edited' }));
      toast.success("Section updated");
    } else if (action === 'cancel_edit') {
      setEditingSections(prev => {
        const updated = { ...prev };
        delete updated[section];
        return updated;
      });
    } else {
      setSectionStatus(prev => ({ ...prev, [section]: action }));
      if (action === 'accepted') {
        toast.success("Section accepted");
      } else if (action === 'rejected') {
        toast.info("Section rejected");
      }
    }
  };

  const saveCarePlanMutation = useMutation({
    mutationFn: async () => {
      const acceptedSections = Object.entries(sectionStatus)
        .filter(([_, status]) => status === 'accepted' || status === 'edited')
        .map(([section]) => section);

      if (acceptedSections.length === 0) {
        throw new Error("Please accept at least one section before saving");
      }

      const currentUser = await base44.auth.me();

      // Prepare care plan data
      const carePlanData = {
        client_id: client.id,
        care_setting: careSetting,
        plan_type: "initial",
        assessment_date: new Date().toISOString().split('T')[0],
        assessed_by: currentUser.email,
        status: "draft",
        
        // Map AI sections to care plan structure
        personal_details: generatedPlan.personal_details?.content ? {
          notes: generatedPlan.personal_details.content
        } : null,
        
        care_objectives: generatedPlan.desired_outcomes?.outcomes_list?.map(outcome => ({
          objective: outcome,
          status: "not_started"
        })) || [],
        
        risk_factors: generatedPlan.risk_management?.risks?.map(risk => ({
          risk: risk,
          likelihood: "medium",
          impact: "medium",
          control_measures: generatedPlan.risk_management.content
        })) || [],
        
        consent: {
          notes: generatedPlan.mental_capacity_consent?.content || ""
        },
        
        // Store full AI-generated content in a notes field
        ai_generated_content: {
          timestamp: new Date().toISOString(),
          sections: generatedPlan,
          accepted_sections: acceptedSections,
          source_documents: selectedDocuments,
          care_setting: careSetting
        }
      };

      const newCarePlan = await base44.entities.CarePlan.create(carePlanData);

      // Create notification for the care plan review
      try {
        await base44.entities.Notification.create({
          recipient_id: currentUser.id,
          title: 'New Care Plan Ready for Review',
          message: `AI-generated care plan created for ${client.full_name}. Please review and approve.`,
          type: 'general',
          priority: 'high',
          is_read: false
        });
      } catch (notifError) {
        console.log("Could not create notification:", notifError);
      }

      return newCarePlan;
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans', client.id] });
      toast.success("Draft care plan saved", "Please review and complete the full care plan");
      if (onSuccess) onSuccess(newPlan);
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to save care plan", error.message);
    }
  });

  const canSave = Object.values(sectionStatus).some(status => 
    status === 'accepted' || status === 'edited'
  );

  const sectionLabels = {
    personal_details: "Personal Details",
    about_me: "About Me",
    assessed_needs: "Assessed Needs",
    desired_outcomes: "Desired Outcomes",
    support_interventions: "Support Interventions",
    risk_management: "Risk Management",
    mental_capacity_consent: "Mental Capacity & Consent",
    safeguarding: "Safeguarding"
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Assisted Care Plan Generation (UK Compliant)
          </DialogTitle>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> This care plan is drafted with AI assistance using existing assessments. 
                It must be reviewed, edited, and approved by a qualified professional before use. 
                AI is advisory only and does not replace professional judgement.
              </p>
            </div>
          </div>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-6 py-4">
            <div>
              <Label>Care Setting *</Label>
              <Select value={careSetting} onValueChange={setCareSetting}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential Care</SelectItem>
                  <SelectItem value="domiciliary">Domiciliary Care</SelectItem>
                  <SelectItem value="supported_living">Supported Living</SelectItem>
                  <SelectItem value="day_centre">Day Centre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-3 block">Select Assessment Documents *</Label>
              {assessmentDocs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No assessment documents found. Please upload assessments before generating a care plan.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {assessmentDocs.map(doc => (
                    <div key={doc.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => toggleDocument(doc.id)}
                        id={doc.id}
                      />
                      <label htmlFor={doc.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{doc.label}</span>
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          {doc.type.replace('_', ' ')}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {selectedDocuments.length} document(s) selected
              </p>
            </div>

            <div>
              <Label>Additional Context (Optional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Add any additional information or specific focus areas for the care plan..."
                className="mt-2 h-24"
              />
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Draft Care Plan</h3>
            <p className="text-gray-600">
              AI is analysing assessment documents and drafting a UK-compliant care plan...
            </p>
            <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
          </div>
        )}

        {step === "review" && generatedPlan && (
          <div className="space-y-4 py-4">
            {generatedPlan.overall_flags && generatedPlan.overall_flags.length > 0 && (
              <Card className="border-orange-300 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Attention Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-orange-900">
                    {generatedPlan.overall_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="personal_details" className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
                {Object.keys(sectionLabels).map(section => (
                  generatedPlan[section] && (
                    <TabsTrigger key={section} value={section} className="text-xs">
                      {sectionStatus[section] === 'accepted' && <CheckCircle className="w-3 h-3 mr-1 text-green-600" />}
                      {sectionStatus[section] === 'rejected' && <XCircle className="w-3 h-3 mr-1 text-red-600" />}
                      {sectionStatus[section] === 'edited' && <Edit className="w-3 h-3 mr-1 text-blue-600" />}
                      {sectionLabels[section].split(' ')[0]}
                    </TabsTrigger>
                  )
                ))}
              </TabsList>

              {Object.keys(sectionLabels).map(section => (
                generatedPlan[section] && (
                  <TabsContent key={section} value={section} className="mt-4">
                    <Card>
                      <CardHeader className="bg-purple-50">
                        <CardTitle className="flex items-center justify-between">
                          <span>{sectionLabels[section]}</span>
                          <Badge variant={
                            sectionStatus[section] === 'accepted' ? 'default' :
                            sectionStatus[section] === 'rejected' ? 'destructive' :
                            sectionStatus[section] === 'edited' ? 'secondary' :
                            'outline'
                          }>
                            {sectionStatus[section] === 'accepted' && 'Accepted'}
                            {sectionStatus[section] === 'rejected' && 'Rejected'}
                            {sectionStatus[section] === 'edited' && 'Edited'}
                            {sectionStatus[section] === 'pending' && 'Pending Review'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {editingSections[section] !== undefined ? (
                          <div className="space-y-4">
                            <Textarea
                              value={editingSections[section]}
                              onChange={(e) => setEditingSections(prev => ({
                                ...prev,
                                [section]: e.target.value
                              }))}
                              className="min-h-[200px]"
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => handleSectionAction(section, 'save_edit')}>
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => handleSectionAction(section, 'cancel_edit')}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="prose max-w-none mb-4">
                              <div className="whitespace-pre-wrap text-gray-900">
                                {generatedPlan[section].content}
                              </div>
                            </div>

                            {generatedPlan[section].missing_info && generatedPlan[section].missing_info.length > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                                <p className="text-sm font-semibold text-yellow-900 mb-2">Missing Information:</p>
                                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                                  {generatedPlan[section].missing_info.map((info, idx) => (
                                    <li key={idx}>{info}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {generatedPlan[section].flags && generatedPlan[section].flags.length > 0 && (
                              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                                <p className="text-sm font-semibold text-red-900 mb-2">Flags:</p>
                                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                                  {generatedPlan[section].flags.map((flag, idx) => (
                                    <li key={idx}>{flag}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t">
                              <Button
                                variant={sectionStatus[section] === 'accepted' ? 'default' : 'outline'}
                                onClick={() => handleSectionAction(section, 'accepted')}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleSectionAction(section, 'edit')}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant={sectionStatus[section] === 'rejected' ? 'destructive' : 'outline'}
                                onClick={() => handleSectionAction(section, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )
              ))}
            </Tabs>
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={generateCarePlan}
                disabled={selectedDocuments.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Draft Care Plan
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                ← Back
              </Button>
              <Button
                onClick={() => saveCarePlanMutation.mutate()}
                disabled={!canSave || saveCarePlanMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveCarePlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Save Draft Care Plan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}