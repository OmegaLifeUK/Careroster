import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Loader2, 
  Sparkles, 
  X, 
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const IMPORT_TYPES = [
  { id: "care_plan", label: "Care Plan", entity: "CarePlan", color: "bg-blue-100 text-blue-800" },
  { id: "medication", label: "Medication / MAR Sheet", entity: "MARSheet", color: "bg-green-100 text-green-800" },
  { id: "risk_assessment", label: "Risk Assessment", entity: "RiskAssessment", color: "bg-orange-100 text-orange-800" },
  { id: "behavior_chart", label: "Behaviour Support Plan", entity: "BehaviorChart", color: "bg-purple-100 text-purple-800" },
  { id: "mental_capacity", label: "Mental Capacity Assessment", entity: "MentalCapacityAssessment", color: "bg-indigo-100 text-indigo-800" },
  { id: "peep", label: "PEEP (Emergency Evacuation)", entity: "PEEP", color: "bg-red-100 text-red-800" },
];

export default function AIDocumentImporter({ clientId, clientName, onClose }) {
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [importResults, setImportResults] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Invalid File", "Please upload a PDF, Word document, or image");
      return;
    }

    setFile(selectedFile);
    setExtractedData(null);
    setImportResults(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setUploadedUrl(file_url);
    } catch (error) {
      toast.error("Upload Failed", "Could not upload file");
      setFile(null);
    }
  };

  const extractData = async () => {
    if (!uploadedUrl || selectedTypes.length === 0) return;

    setIsProcessing(true);
    setExtractedData(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a healthcare documentation expert. Analyze this document and extract structured care information for a client named "${clientName}".

Extract data for the following categories: ${selectedTypes.join(', ')}

For each category found, extract the relevant information:

CARE_PLAN: Extract care needs, goals, interventions, preferences, daily routines, communication needs, personal care requirements.

MEDICATION: Extract all medications with drug name, dosage, frequency, route, time of administration, prescriber, start date, and any PRN instructions.

RISK_ASSESSMENT: Extract identified risks, risk levels (low/medium/high), control measures, triggers, warning signs, and review dates.

BEHAVIOR_CHART: Extract behaviors of concern, triggers, early warning signs, de-escalation strategies, positive behavior support strategies, and crisis interventions.

MENTAL_CAPACITY: Extract capacity assessment details, decision-specific assessments, best interest decisions, and any restrictions.

PEEP: Extract mobility level, evacuation requirements, equipment needed, assistance level, and specific evacuation instructions.

Be thorough and extract ALL relevant information from the document.`,
        file_urls: [uploadedUrl],
        response_json_schema: {
          type: "object",
          properties: {
            care_plan: {
              type: "object",
              properties: {
                care_needs: { type: "array", items: { type: "string" } },
                goals: { type: "array", items: { type: "object", properties: { goal: { type: "string" }, target_date: { type: "string" } } } },
                daily_routine: { type: "string" },
                personal_care_needs: { type: "string" },
                communication_needs: { type: "string" },
                dietary_requirements: { type: "string" },
                preferences: { type: "string" },
                notes: { type: "string" }
              }
            },
            medication: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drug_name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  route: { type: "string" },
                  time_slots: { type: "array", items: { type: "string" } },
                  prescriber: { type: "string" },
                  start_date: { type: "string" },
                  is_prn: { type: "boolean" },
                  prn_reason: { type: "string" },
                  special_instructions: { type: "string" }
                }
              }
            },
            risk_assessment: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_area: { type: "string" },
                  risk_level: { type: "string" },
                  description: { type: "string" },
                  triggers: { type: "array", items: { type: "string" } },
                  control_measures: { type: "array", items: { type: "string" } },
                  review_date: { type: "string" }
                }
              }
            },
            behavior_chart: {
              type: "object",
              properties: {
                behaviors_of_concern: { type: "array", items: { type: "string" } },
                triggers: { type: "array", items: { type: "string" } },
                early_warning_signs: { type: "array", items: { type: "string" } },
                de_escalation_strategies: { type: "array", items: { type: "string" } },
                positive_strategies: { type: "array", items: { type: "string" } },
                crisis_intervention: { type: "string" },
                post_incident_support: { type: "string" }
              }
            },
            mental_capacity: {
              type: "object",
              properties: {
                has_capacity: { type: "boolean" },
                assessment_areas: { type: "array", items: { type: "string" } },
                decisions_assessed: { type: "array", items: { type: "object", properties: { decision: { type: "string" }, has_capacity: { type: "boolean" }, best_interest_decision: { type: "string" } } } },
                restrictions: { type: "string" },
                notes: { type: "string" }
              }
            },
            peep: {
              type: "object",
              properties: {
                mobility_level: { type: "string" },
                evacuation_method: { type: "string" },
                equipment_required: { type: "array", items: { type: "string" } },
                staff_required: { type: "number" },
                special_instructions: { type: "string" },
                meeting_point: { type: "string" }
              }
            }
          }
        }
      });

      setExtractedData(result);
      setExpandedSections(selectedTypes.reduce((acc, t) => ({ ...acc, [t]: true }), {}));
      toast.success("Data Extracted", "Review the extracted information below");
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Extraction Failed", "Could not extract data from document");
    } finally {
      setIsProcessing(false);
    }
  };

  const importData = async () => {
    if (!extractedData) return;

    setIsProcessing(true);
    const results = { success: [], failed: [] };

    try {
      // Import Care Plan
      if (selectedTypes.includes("care_plan") && extractedData.care_plan) {
        try {
          const currentUser = await base44.auth.me();
          await base44.entities.CarePlan.create({
            client_id: clientId,
            care_setting: "residential",
            plan_type: "initial",
            assessment_date: new Date().toISOString().split('T')[0],
            assessed_by: currentUser.email,
            status: "draft"
          });
          results.success.push("Care Plan");
        } catch (e) {
          console.error("Care Plan error:", e);
          results.failed.push("Care Plan");
        }
      }

      // Import Medications
      if (selectedTypes.includes("medication") && extractedData.medication?.length > 0) {
        try {
          for (const med of extractedData.medication) {
            await base44.entities.MARSheet.create({
              client_id: clientId,
              medication_name: med.drug_name,
              dosage: med.dosage,
              route: med.route || "oral",
              frequency: med.frequency || "once_daily",
              start_date: med.start_date || new Date().toISOString().split('T')[0],
              mar_status: "active"
            });
          }
          results.success.push(`Medications (${extractedData.medication.length})`);
        } catch (e) {
          console.error("Medication error:", e);
          results.failed.push("Medications");
        }
      }

      // Import Risk Assessments
      if (selectedTypes.includes("risk_assessment") && extractedData.risk_assessment?.length > 0) {
        try {
          for (const risk of extractedData.risk_assessment) {
            await base44.entities.RiskAssessment.create({
              client_id: clientId,
              risk_title: risk.risk_area,
              risk_level: risk.risk_level || "medium",
              description: risk.description || "",
              assessment_date: new Date().toISOString().split('T')[0]
            });
          }
          results.success.push(`Risk Assessments (${extractedData.risk_assessment.length})`);
        } catch (e) {
          console.error("Risk Assessment error:", e);
          results.failed.push("Risk Assessments");
        }
      }

      // Import Behavior Chart
      if (selectedTypes.includes("behavior_chart") && extractedData.behavior_chart) {
        try {
          await base44.entities.BehaviorChart.create({
            client_id: clientId,
            chart_date: new Date().toISOString().split('T')[0]
          });
          results.success.push("Behaviour Support Plan");
        } catch (e) {
          console.error("Behavior Chart error:", e);
          results.failed.push("Behaviour Support Plan");
        }
      }

      // Import Mental Capacity
      if (selectedTypes.includes("mental_capacity") && extractedData.mental_capacity) {
        try {
          await base44.entities.MentalCapacityAssessment.create({
            client_id: clientId,
            assessment_date: new Date().toISOString().split('T')[0],
            decision_to_assess: "General capacity assessment"
          });
          results.success.push("Mental Capacity Assessment");
        } catch (e) {
          console.error("Mental Capacity error:", e);
          results.failed.push("Mental Capacity Assessment");
        }
      }

      // Import PEEP
      if (selectedTypes.includes("peep") && extractedData.peep) {
        try {
          await base44.entities.PEEP.create({
            client_id: clientId,
            assessment_date: new Date().toISOString().split('T')[0]
          });
          results.success.push("PEEP");
        } catch (e) {
          console.error("PEEP error:", e);
          results.failed.push("PEEP");
        }
      }

      setImportResults(results);
      queryClient.invalidateQueries();

      if (results.success.length > 0) {
        toast.success("Import Complete", `Successfully imported: ${results.success.join(', ')}`);
      }
      if (results.failed.length > 0) {
        toast.error("Some Imports Failed", `Failed: ${results.failed.join(', ')}`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import Failed", "Could not import data");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleType = (typeId) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderExtractedData = () => {
    if (!extractedData) return null;

    return (
      <div className="space-y-4 mt-6">
        <h3 className="font-semibold text-lg">Extracted Data - Review Before Importing</h3>
        
        {selectedTypes.includes("care_plan") && extractedData.care_plan && (
          <Card className="border-blue-200">
            <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("care_plan")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">Care Plan</Badge>
                </CardTitle>
                {expandedSections.care_plan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.care_plan && (
              <CardContent className="text-sm space-y-2">
                {extractedData.care_plan.care_needs?.length > 0 && (
                  <div><strong>Care Needs:</strong> {extractedData.care_plan.care_needs.join(', ')}</div>
                )}
                {extractedData.care_plan.daily_routine && (
                  <div><strong>Daily Routine:</strong> {extractedData.care_plan.daily_routine}</div>
                )}
                {extractedData.care_plan.personal_care_needs && (
                  <div><strong>Personal Care:</strong> {extractedData.care_plan.personal_care_needs}</div>
                )}
                {extractedData.care_plan.dietary_requirements && (
                  <div><strong>Dietary:</strong> {extractedData.care_plan.dietary_requirements}</div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {selectedTypes.includes("medication") && extractedData.medication?.length > 0 && (
          <Card className="border-green-200">
            <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("medication")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">Medications ({extractedData.medication.length})</Badge>
                </CardTitle>
                {expandedSections.medication ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.medication && (
              <CardContent className="text-sm">
                <div className="space-y-2">
                  {extractedData.medication.map((med, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded">
                      <strong>{med.drug_name}</strong> - {med.dosage}, {med.frequency}
                      {med.is_prn && <Badge className="ml-2 bg-orange-100 text-orange-800">PRN</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {selectedTypes.includes("risk_assessment") && extractedData.risk_assessment?.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("risk_assessment")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">Risk Assessments ({extractedData.risk_assessment.length})</Badge>
                </CardTitle>
                {expandedSections.risk_assessment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.risk_assessment && (
              <CardContent className="text-sm">
                <div className="space-y-2">
                  {extractedData.risk_assessment.map((risk, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded">
                      <strong>{risk.risk_area}</strong> - Level: {risk.risk_level}
                      <p className="text-gray-600 text-xs mt-1">{risk.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {selectedTypes.includes("behavior_chart") && extractedData.behavior_chart && (
          <Card className="border-purple-200">
            <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("behavior_chart")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800">Behaviour Support Plan</Badge>
                </CardTitle>
                {expandedSections.behavior_chart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.behavior_chart && (
              <CardContent className="text-sm space-y-2">
                {extractedData.behavior_chart.behaviors_of_concern?.length > 0 && (
                  <div><strong>Behaviours of Concern:</strong> {extractedData.behavior_chart.behaviors_of_concern.join(', ')}</div>
                )}
                {extractedData.behavior_chart.triggers?.length > 0 && (
                  <div><strong>Triggers:</strong> {extractedData.behavior_chart.triggers.join(', ')}</div>
                )}
                {extractedData.behavior_chart.de_escalation_strategies?.length > 0 && (
                  <div><strong>De-escalation:</strong> {extractedData.behavior_chart.de_escalation_strategies.join(', ')}</div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {selectedTypes.includes("peep") && extractedData.peep && (
          <Card className="border-red-200">
            <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("peep")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">PEEP</Badge>
                </CardTitle>
                {expandedSections.peep ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.peep && (
              <CardContent className="text-sm space-y-2">
                <div><strong>Mobility:</strong> {extractedData.peep.mobility_level}</div>
                <div><strong>Evacuation Method:</strong> {extractedData.peep.evacuation_method}</div>
                <div><strong>Staff Required:</strong> {extractedData.peep.staff_required}</div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Document Importer
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Upload documentation for <strong>{clientName}</strong> to automatically extract and create care records
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {file ? (
              <div className="space-y-2">
                <FileText className="w-12 h-12 mx-auto text-blue-600" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); setUploadedUrl(null); setExtractedData(null); }}>
                  Remove
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="font-medium mb-2">Click to upload documentation</p>
                <p className="text-sm text-gray-500">PDF, Word, or Image files</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Document Type Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">What should we extract?</label>
            <div className="flex flex-wrap gap-2">
              {IMPORT_TYPES.map(type => (
                <Badge
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    selectedTypes.includes(type.id) 
                      ? type.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleType(type.id)}
                >
                  {selectedTypes.includes(type.id) && <CheckCircle className="w-3 h-3 mr-1" />}
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Extract Button */}
          {uploadedUrl && selectedTypes.length > 0 && !extractedData && (
            <Button
              onClick={extractData}
              disabled={isProcessing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Document...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Data
                </>
              )}
            </Button>
          )}

          {/* Extracted Data Preview */}
          {renderExtractedData()}

          {/* Import Button */}
          {extractedData && !importResults && (
            <Button
              onClick={importData}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Import to {clientName}'s Records
                </>
              )}
            </Button>
          )}

          {/* Import Results */}
          {importResults && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Import Complete
                </h4>
                {importResults.success.length > 0 && (
                  <p className="text-sm text-green-800">
                    ✓ Successfully imported: {importResults.success.join(', ')}
                  </p>
                )}
                {importResults.failed.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    ✗ Failed: {importResults.failed.join(', ')}
                  </p>
                )}
                <Button onClick={onClose} className="mt-4 w-full" variant="outline">
                  Close
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}