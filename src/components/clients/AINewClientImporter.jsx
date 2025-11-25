import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
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
  ChevronDown,
  ChevronUp,
  UserPlus
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const IMPORT_TYPES = [
  { id: "care_plan", label: "Care Plan", color: "bg-blue-100 text-blue-800" },
  { id: "medication", label: "Medication / MAR Sheet", color: "bg-green-100 text-green-800" },
  { id: "risk_assessment", label: "Risk Assessment", color: "bg-orange-100 text-orange-800" },
  { id: "behavior_chart", label: "Behaviour Support Plan", color: "bg-purple-100 text-purple-800" },
  { id: "mental_capacity", label: "Mental Capacity Assessment", color: "bg-indigo-100 text-indigo-800" },
  { id: "peep", label: "PEEP (Emergency Evacuation)", color: "bg-red-100 text-red-800" },
];

export default function AINewClientImporter({ onClose, onClientCreated }) {
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(["care_plan", "medication", "risk_assessment"]);
  const [expandedSections, setExpandedSections] = useState({});
  const [importResults, setImportResults] = useState(null);
  const [createdClient, setCreatedClient] = useState(null);

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
    setCreatedClient(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setUploadedUrl(file_url);
    } catch (error) {
      toast.error("Upload Failed", "Could not upload file");
      setFile(null);
    }
  };

  const extractData = async () => {
    if (!uploadedUrl) return;

    setIsProcessing(true);
    setExtractedData(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a healthcare documentation expert. Analyze this document and extract ALL client information to create a new client record plus their care documentation.

FIRST, extract the CLIENT DETAILS:
- Full name
- Date of birth
- Phone number
- Address (street, city, postcode)
- Emergency contact (name, phone, relationship)
- Care needs (list)
- Medical notes
- Mobility level (independent, requires_assistance, wheelchair_user, bed_bound)
- Funding type (local_authority, self_funded, nhs, mixed)

THEN, extract data for these categories: ${selectedTypes.join(', ')}

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
            client: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                date_of_birth: { type: "string" },
                phone: { type: "string" },
                address: {
                  type: "object",
                  properties: {
                    street: { type: "string" },
                    city: { type: "string" },
                    postcode: { type: "string" }
                  }
                },
                emergency_contact: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    phone: { type: "string" },
                    relationship: { type: "string" }
                  }
                },
                care_needs: { type: "array", items: { type: "string" } },
                medical_notes: { type: "string" },
                mobility: { type: "string" },
                funding_type: { type: "string" }
              }
            },
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
      setExpandedSections({ client: true, ...selectedTypes.reduce((acc, t) => ({ ...acc, [t]: true }), {}) });
      toast.success("Data Extracted", "Review the extracted information below");
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Extraction Failed", "Could not extract data from document");
    } finally {
      setIsProcessing(false);
    }
  };

  const importData = async () => {
    if (!extractedData?.client?.full_name) {
      toast.error("Missing Client Name", "Could not find client name in document");
      return;
    }

    setIsProcessing(true);
    const results = { success: [], failed: [] };

    try {
      // First create the client
      const clientData = {
        full_name: extractedData.client.full_name,
        date_of_birth: extractedData.client.date_of_birth || "",
        phone: extractedData.client.phone || "",
        address: extractedData.client.address || {},
        emergency_contact: extractedData.client.emergency_contact || {},
        care_needs: extractedData.client.care_needs || [],
        medical_notes: extractedData.client.medical_notes || "",
        mobility: extractedData.client.mobility || "independent",
        funding_type: extractedData.client.funding_type || "self_funded",
        status: "active"
      };

      const newClient = await base44.entities.Client.create(clientData);
      setCreatedClient(newClient);
      results.success.push("Client Profile");

      const clientId = newClient.id;

      // Import Care Plan
      if (selectedTypes.includes("care_plan") && extractedData.care_plan) {
        try {
          await base44.entities.CarePlan.create({
            client_id: clientId,
            care_setting: "residential",
            plan_type: "initial",
            assessment_date: new Date().toISOString().split('T')[0],
            assessed_by: "AI Import",
            status: "active",
            care_needs: (extractedData.care_plan.care_needs || []).map(need => ({
              category: "personal_care",
              need: need,
              support_required: "",
              frequency: "daily"
            })),
            goals: extractedData.care_plan.goals || [],
            daily_routine: {
              morning: extractedData.care_plan.daily_routine || "",
              afternoon: "",
              evening: "",
              night: ""
            },
            mental_health: {
              communication_needs: extractedData.care_plan.communication_needs || ""
            },
            physical_health: {
              nutrition: extractedData.care_plan.dietary_requirements || ""
            },
            preferences: {
              likes: [],
              dislikes: [],
              hobbies: [],
              social_preferences: extractedData.care_plan.preferences || ""
            }
          });
          results.success.push("Care Plan");
        } catch (e) {
          console.error("Care plan error:", e);
          results.failed.push("Care Plan");
        }
      }

      // Import Medications
      if (selectedTypes.includes("medication") && extractedData.medication?.length > 0) {
        const currentMonth = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        let medCount = 0;
        for (const med of extractedData.medication) {
          try {
            const routeMap = { "oral": "oral", "sublingual": "sublingual", "topical": "topical", "inhaled": "inhaled", "injection": "injection_sc", "rectal": "rectal", "transdermal": "transdermal", "eye drops": "eye_drops", "ear drops": "ear_drops", "nasal": "nasal" };
            await base44.entities.MARSheet.create({
              client_id: clientId,
              month_year: currentMonth,
              medication_name: med.drug_name || "Unknown",
              dose: med.dosage || "As prescribed",
              frequency: med.frequency || "daily",
              route: routeMap[(med.route || "oral").toLowerCase()] || "oral",
              time_slots: med.time_slots || [],
              prescriber: med.prescriber || "",
              start_date: med.start_date || new Date().toISOString().split('T')[0],
              as_required: med.is_prn || false,
              reason_for_medication: med.special_instructions || med.prn_reason || ""
            });
            medCount++;
          } catch (e) {
            console.error("Medication error:", med.drug_name, e);
          }
        }
        if (medCount > 0) results.success.push(`Medications (${medCount})`);
        else results.failed.push("Medications");
      }

      // Import Risk Assessments
      if (selectedTypes.includes("risk_assessment") && extractedData.risk_assessment?.length > 0) {
        let riskCount = 0;
        for (const risk of extractedData.risk_assessment) {
          try {
            const riskLevelMap = { "low": "low", "medium": "medium", "high": "high", "critical": "critical" };
            await base44.entities.RiskAssessment.create({
              client_id: clientId,
              assessment_type: "general",
              assessment_date: new Date().toISOString().split('T')[0],
              assessed_by: "AI Import",
              risk_identified: (risk.risk_area || "General risk") + (risk.description ? ": " + risk.description : ""),
              risk_level: riskLevelMap[(risk.risk_level || "medium").toLowerCase()] || "medium",
              existing_controls: (risk.control_measures || []).map(m => ({
                control_measure: m,
                effectiveness: "effective"
              })),
              review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: "active"
            });
            riskCount++;
          } catch (e) {
            console.error("Risk assessment error:", risk.risk_area, e);
          }
        }
        if (riskCount > 0) results.success.push(`Risk Assessments (${riskCount})`);
        else results.failed.push("Risk Assessments");
      }

      // Import Behavior Chart
      if (selectedTypes.includes("behavior_chart") && extractedData.behavior_chart) {
        try {
          const triggersStr = (extractedData.behavior_chart.triggers || []).join(', ');
          const strategiesStr = (extractedData.behavior_chart.de_escalation_strategies || []).join(', ');
          await base44.entities.BehaviorChart.create({
            client_id: clientId,
            chart_date: new Date().toISOString().split('T')[0],
            behavior_being_monitored: (extractedData.behavior_chart.behaviors_of_concern || []).join(', ') || "Behavior support",
            monitoring_reason: "Imported from client documentation",
            target_outcome: (extractedData.behavior_chart.positive_strategies || []).join(', '),
            environmental_factors: triggersStr,
            recommended_actions: strategiesStr + (extractedData.behavior_chart.crisis_intervention ? ". Crisis: " + extractedData.behavior_chart.crisis_intervention : ""),
            daily_summary: extractedData.behavior_chart.post_incident_support || ""
          });
          results.success.push("Behaviour Support Plan");
        } catch (e) {
          console.error("Behavior chart error:", e);
          results.failed.push("Behaviour Support Plan");
        }
      }

      // Import Mental Capacity
      if (selectedTypes.includes("mental_capacity") && extractedData.mental_capacity) {
        try {
          await base44.entities.MentalCapacityAssessment.create({
            client_id: clientId,
            assessment_date: new Date().toISOString().split('T')[0],
            assessor: "AI Import",
            specific_decision: (extractedData.mental_capacity.assessment_areas || []).join(', ') || "General capacity",
            reason_for_assessment: "Imported from client documentation",
            conclusion: extractedData.mental_capacity.has_capacity ? "has_capacity" : "lacks_capacity",
            reasons_for_conclusion: extractedData.mental_capacity.notes || "",
            steps_taken: extractedData.mental_capacity.assessment_areas || [],
            review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
          results.success.push("Mental Capacity Assessment");
        } catch (e) {
          console.error("Mental capacity error:", e);
          results.failed.push("Mental Capacity Assessment");
        }
      }

      // Import PEEP
      if (selectedTypes.includes("peep") && extractedData.peep) {
        try {
          const mobilityMap = {
            "independent": "fully_mobile",
            "requires_assistance": "slow_mobility",
            "wheelchair_user": "wheelchair_assistance",
            "bed_bound": "immobile"
          };
          const evacMethodMap = {
            "independent": "independent",
            "with_supervision": "with_supervision",
            "with_assistance": "with_physical_assistance",
            "evacuation_chair": "evacuation_chair",
            "carried": "carried"
          };
          await base44.entities.PEEP.create({
            client_id: clientId,
            assessment_date: new Date().toISOString().split('T')[0],
            assessed_by: "AI Import",
            mobility_level: mobilityMap[extractedData.peep.mobility_level] || "slow_mobility",
            evacuation_method: evacMethodMap[extractedData.peep.evacuation_method] || "with_physical_assistance",
            equipment_required: extractedData.peep.equipment_required || [],
            staff_required: extractedData.peep.staff_required || 1,
            special_instructions: extractedData.peep.special_instructions || "",
            assembly_point: extractedData.peep.meeting_point || "",
            status: "active",
            review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
          results.success.push("PEEP");
        } catch (e) {
          console.error("PEEP error:", e);
          results.failed.push("PEEP");
        }
      }

      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      toast.success("Client Created", `${extractedData.client.full_name} has been added with all care records`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import Failed", "Could not create client");
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              Import New Client from Document
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Upload client documentation to automatically create a new client with all their care records
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
                <p className="font-medium mb-2">Upload client documentation</p>
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
            <label className="text-sm font-medium mb-3 block">What care records should we create?</label>
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
          {uploadedUrl && !extractedData && (
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
                  Extract Client & Care Data
                </>
              )}
            </Button>
          )}

          {/* Extracted Data Preview */}
          {extractedData && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Extracted Data - Review Before Creating</h3>
              
              {/* Client Info */}
              {extractedData.client && (
                <Card className="border-gray-300 bg-gray-50">
                  <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("client")}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge className="bg-gray-700 text-white">Client Profile</Badge>
                        <span className="font-bold text-lg">{extractedData.client.full_name}</span>
                      </CardTitle>
                      {expandedSections.client ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {expandedSections.client && (
                    <CardContent className="text-sm space-y-2">
                      {extractedData.client.date_of_birth && <div><strong>DOB:</strong> {extractedData.client.date_of_birth}</div>}
                      {extractedData.client.phone && <div><strong>Phone:</strong> {extractedData.client.phone}</div>}
                      {extractedData.client.address?.city && <div><strong>Address:</strong> {extractedData.client.address.street}, {extractedData.client.address.city} {extractedData.client.address.postcode}</div>}
                      {extractedData.client.mobility && <div><strong>Mobility:</strong> {extractedData.client.mobility}</div>}
                      {extractedData.client.care_needs?.length > 0 && <div><strong>Care Needs:</strong> {extractedData.client.care_needs.join(', ')}</div>}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Care Plan */}
              {selectedTypes.includes("care_plan") && extractedData.care_plan && (
                <Card className="border-blue-200">
                  <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("care_plan")}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base"><Badge className="bg-blue-100 text-blue-800">Care Plan</Badge></CardTitle>
                      {expandedSections.care_plan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {expandedSections.care_plan && (
                    <CardContent className="text-sm space-y-2">
                      {extractedData.care_plan.daily_routine && <div><strong>Daily Routine:</strong> {extractedData.care_plan.daily_routine}</div>}
                      {extractedData.care_plan.dietary_requirements && <div><strong>Dietary:</strong> {extractedData.care_plan.dietary_requirements}</div>}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Medications */}
              {selectedTypes.includes("medication") && extractedData.medication?.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("medication")}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base"><Badge className="bg-green-100 text-green-800">Medications ({extractedData.medication.length})</Badge></CardTitle>
                      {expandedSections.medication ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {expandedSections.medication && (
                    <CardContent className="text-sm">
                      {extractedData.medication.map((med, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded mb-1">
                          <strong>{med.drug_name}</strong> - {med.dosage}, {med.frequency}
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Risk Assessments */}
              {selectedTypes.includes("risk_assessment") && extractedData.risk_assessment?.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection("risk_assessment")}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base"><Badge className="bg-orange-100 text-orange-800">Risk Assessments ({extractedData.risk_assessment.length})</Badge></CardTitle>
                      {expandedSections.risk_assessment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {expandedSections.risk_assessment && (
                    <CardContent className="text-sm">
                      {extractedData.risk_assessment.map((risk, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded mb-1">
                          <strong>{risk.risk_area}</strong> - Level: {risk.risk_level}
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}

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
                  Creating Client & Records...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create {extractedData.client?.full_name || "Client"} with All Records
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
                  Client Created Successfully
                </h4>
                <p className="text-sm text-green-800 mb-2">
                  ✓ Created: {importResults.success.join(', ')}
                </p>
                {importResults.failed.length > 0 && (
                  <p className="text-sm text-red-600">
                    ✗ Failed: {importResults.failed.join(', ')}
                  </p>
                )}
                <Button 
                  onClick={() => {
                    onClose();
                    if (onClientCreated && createdClient) {
                      onClientCreated(createdClient);
                    }
                  }} 
                  className="mt-4 w-full"
                >
                  View Client
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}