import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Edit, 
  ArrowLeft,
  Calendar,
  User,
  Target,
  ListChecks,
  Pill,
  AlertTriangle,
  Clock,
  Sun,
  Sunset,
  Moon,
  CloudMoon,
  ThumbsUp,
  ThumbsDown,
  Star,
  Download,
  Printer,
  Activity,
  Brain,
  Shield,
  Sparkles,
  CheckCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PrintableCarePlan from "./PrintableCarePlan";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";
import { AssessmentToCarePlanWorkflow } from "@/components/workflow/AssessmentToCarePlanWorkflow";

const TASK_CATEGORIES = {
  personal_care: "Personal Care",
  nutrition: "Nutrition & Hydration",
  medication: "Medication",
  mobility: "Mobility",
  social: "Social & Activities",
  emotional: "Emotional Support",
  healthcare: "Healthcare",
  domestic: "Domestic Tasks",
  other: "Other"
};

export default function CarePlanViewer({ carePlan, client, onBack, onEdit }) {
  const printRef = React.useRef();
  const [printing, setPrinting] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('standard'); // 'standard' or 'printable'
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debug: Log care plan data
  React.useEffect(() => {
    console.log('=== CARE PLAN VIEWER DEBUG ===');
    console.log('Care Plan ID:', carePlan.id);
    console.log('generated_from_assessment:', carePlan.generated_from_assessment);
    console.log('approval_completed:', carePlan.approval_completed);
    console.log('status:', carePlan.status);
    console.log('Should show button:', carePlan.generated_from_assessment && !carePlan.approval_completed);
    console.log('Full care plan:', carePlan);
  }, [carePlan]);

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    under_review: "bg-yellow-100 text-yellow-800",
    archived: "bg-red-100 text-red-800",
  };

  const objectiveStatusColors = {
    not_started: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    achieved: "bg-green-100 text-green-700",
    revised: "bg-amber-100 text-amber-700",
    discontinued: "bg-red-100 text-red-700"
  };

  const riskColors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700"
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApproveCarePlan = async () => {
    if (confirm("Approve this care plan? This will create all medication, task, and risk records.")) {
      try {
        const result = await AssessmentToCarePlanWorkflow.approveCarePlan(carePlan.id);
        if (result.success) {
          await base44.entities.CarePlan.update(carePlan.id, { 
            status: 'active',
            approval_completed: true,
            approved_date: new Date().toISOString().split('T')[0]
          });
          
          queryClient.invalidateQueries({ queryKey: ['care-plans'] });
          queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['mar-sheets'] });
          queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
          toast.success(
            'Care plan approved',
            `Created ${result.results.tasks.length} tasks, ${result.results.medications.length} medications, ${result.results.risks.length} risks`
          );
          onBack(); // Go back to list view
        } else {
          toast.error('Approval failed', result.error);
        }
      } catch (error) {
        console.error("Approval error:", error);
        toast.error('Approval failed', error.message || 'Unknown error');
      }
    }
  };

  const handleExportPDF = async () => {
    setPrinting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(`care-plan-${client.full_name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden mb-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Care Plans
        </Button>
        <div className="flex gap-2">
          {/* DEBUG: Always show button with status */}
          <Button 
            onClick={() => {
              alert(`DEBUG INFO:\ngenerated_from_assessment: ${carePlan.generated_from_assessment}\napproval_completed: ${carePlan.approval_completed}\nstatus: ${carePlan.status}\nid: ${carePlan.id}`);
              handleApproveCarePlan();
            }}
            className="bg-green-600 hover:bg-green-700"
            title={`generated_from_assessment: ${carePlan.generated_from_assessment}, approval_completed: ${carePlan.approval_completed}`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Activate Care Plan & Workflows (DEBUG)
          </Button>
          <div className="flex gap-1 mr-2">
            <Button
              variant={viewMode === 'standard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('standard')}
            >
              Standard View
            </Button>
            <Button
              variant={viewMode === 'printable' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('printable')}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              CQC Print Format
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="border-blue-300 text-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={printing}
            className="border-green-300 text-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {printing ? 'Generating...' : 'Export PDF'}
          </Button>
          <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
            <Edit className="w-4 h-4 mr-2" />
            Edit Plan
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {viewMode === 'printable' ? (
          <PrintableCarePlan carePlan={carePlan} client={client} />
        ) : (
          <div>

      {/* Plan Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Heart className="w-6 h-6 text-blue-600" />
                Care Plan - {client.full_name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1 capitalize">
                {carePlan.plan_type} Assessment • {carePlan.care_setting?.replace('_', ' ')}
              </p>
            </div>
            <Badge className={`text-sm ${statusColors[carePlan.status]}`}>
              {carePlan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Assessment Date</p>
              <p className="font-medium">{format(parseISO(carePlan.assessment_date), 'PPP')}</p>
            </div>
            <div>
              <p className="text-gray-500">Assessed By</p>
              <p className="font-medium">{carePlan.assessed_by}</p>
            </div>
            {carePlan.review_date && (
              <div>
                <p className="text-gray-500">Next Review</p>
                <p className="font-medium">{format(parseISO(carePlan.review_date), 'PPP')}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Version</p>
              <p className="font-medium">v{carePlan.version || 1}</p>
            </div>
          </div>

          {/* Personal Details */}
          {carePlan.personal_details && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Personal Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {carePlan.personal_details.preferred_name && (
                  <div>
                    <p className="text-gray-500">Preferred Name</p>
                    <p className="font-medium">{carePlan.personal_details.preferred_name}</p>
                  </div>
                )}
                {carePlan.personal_details.language && (
                  <div>
                    <p className="text-gray-500">Language</p>
                    <p className="font-medium">{carePlan.personal_details.language}</p>
                  </div>
                )}
                {carePlan.personal_details.religion && (
                  <div>
                    <p className="text-gray-500">Religion</p>
                    <p className="font-medium">{carePlan.personal_details.religion}</p>
                  </div>
                )}
                {carePlan.personal_details.cultural_needs && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-gray-500">Cultural Needs</p>
                    <p className="font-medium">{carePlan.personal_details.cultural_needs}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Physical Health */}
      {carePlan.physical_health && Object.keys(carePlan.physical_health).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-red-600" />
              Physical Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {carePlan.physical_health.mobility && (
                <div>
                  <p className="text-sm text-gray-500">Mobility</p>
                  <p className="font-medium capitalize">{carePlan.physical_health.mobility.replace(/_/g, ' ')}</p>
                </div>
              )}
              {carePlan.physical_health.continence && (
                <div>
                  <p className="text-sm text-gray-500">Continence</p>
                  <p className="font-medium capitalize">{carePlan.physical_health.continence.replace(/_/g, ' ')}</p>
                </div>
              )}
              {carePlan.physical_health.skin_integrity && (
                <div>
                  <p className="text-sm text-gray-500">Skin Integrity</p>
                  <p className="font-medium">{carePlan.physical_health.skin_integrity}</p>
                </div>
              )}
            </div>

            {carePlan.physical_health.nutrition && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Nutrition Needs</p>
                <p className="text-gray-700">{carePlan.physical_health.nutrition}</p>
              </div>
            )}

            {carePlan.physical_health.pain_management && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Pain Management</p>
                <p className="text-gray-700">{carePlan.physical_health.pain_management}</p>
              </div>
            )}

            {carePlan.physical_health.medical_conditions?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Medical Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {carePlan.physical_health.medical_conditions.map((condition, idx) => (
                    <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {carePlan.physical_health.allergies?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">⚠️ Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {carePlan.physical_health.allergies.map((allergy, idx) => (
                    <Badge key={idx} className="bg-red-100 text-red-800">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mental Health */}
      {carePlan.mental_health && Object.keys(carePlan.mental_health).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-purple-600" />
              Mental Health & Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {carePlan.mental_health.cognitive_function && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Cognitive Function</p>
                <p className="text-gray-700">{carePlan.mental_health.cognitive_function}</p>
              </div>
            )}

            {carePlan.mental_health.communication_needs && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Communication Needs</p>
                <p className="text-gray-700">{carePlan.mental_health.communication_needs}</p>
              </div>
            )}

            {carePlan.mental_health.behaviour_support_needs && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Behaviour Support Needs</p>
                <p className="text-gray-700">{carePlan.mental_health.behaviour_support_needs}</p>
              </div>
            )}

            {carePlan.mental_health.mental_health_conditions?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Mental Health Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {carePlan.mental_health.mental_health_conditions.map((condition, idx) => (
                    <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consent Information */}
      {carePlan.consent && Object.keys(carePlan.consent).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-indigo-600" />
              Consent & Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Capacity to Consent</p>
                <p className="font-medium">{carePlan.consent.capacity_to_consent ? 'Yes' : 'No'}</p>
              </div>
              {carePlan.consent.consent_given_by && (
                <div>
                  <p className="text-sm text-gray-500">Consent Given By</p>
                  <p className="font-medium">{carePlan.consent.consent_given_by}</p>
                </div>
              )}
              {carePlan.consent.relationship && (
                <div>
                  <p className="text-sm text-gray-500">Relationship</p>
                  <p className="font-medium">{carePlan.consent.relationship}</p>
                </div>
              )}
            </div>
            {carePlan.consent.restrictions && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Restrictions</p>
                <p className="text-gray-700">{carePlan.consent.restrictions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Care Objectives */}
      {carePlan.care_objectives?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-600" />
              Care Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {carePlan.care_objectives.map((obj, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">Objective {idx + 1}</h4>
                    <Badge className={objectiveStatusColors[obj.status]}>
                      {obj.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-gray-700 mb-2">{obj.objective}</p>
                  {obj.outcome_measures && (
                    <p className="text-sm text-gray-600"><strong>Success measures:</strong> {obj.outcome_measures}</p>
                  )}
                  {obj.target_date && (
                    <p className="text-sm text-gray-500 mt-1">Target: {format(parseISO(obj.target_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care Tasks */}
      {carePlan.care_tasks?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="w-5 h-5 text-purple-600" />
              Care Tasks & Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {carePlan.care_tasks.filter(t => t.is_active).map((task, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">
                        {TASK_CATEGORIES[task.category] || task.category}
                      </Badge>
                      {task.requires_two_carers && (
                        <Badge variant="outline" className="text-orange-600">2 Carers Required</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {task.frequency?.replace('_', ' ')}
                      {task.duration_minutes && ` • ${task.duration_minutes} mins`}
                    </div>
                  </div>
                  <h4 className="font-medium mb-1">{task.task_name}</h4>
                  {task.description && (
                    <p className="text-gray-700 text-sm mb-2">{task.description}</p>
                  )}
                  {task.special_instructions && (
                    <div className="p-2 bg-amber-50 rounded text-sm text-amber-800 mt-2">
                      <strong>Special Instructions:</strong> {task.special_instructions}
                    </div>
                  )}
                  {task.preferred_time && (
                    <p className="text-sm text-gray-500 mt-1">Preferred time: {task.preferred_time}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medication Management */}
      {carePlan.medication_management && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="w-5 h-5 text-pink-600" />
              Medication Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Self Administers</p>
                <p className="font-medium">{carePlan.medication_management.self_administers ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Support Level</p>
                <p className="font-medium capitalize">{carePlan.medication_management.administration_support?.replace('_', ' ')}</p>
              </div>
              {carePlan.medication_management.pharmacy_details && (
                <div>
                  <p className="text-sm text-gray-500">Pharmacy</p>
                  <p className="font-medium">{carePlan.medication_management.pharmacy_details}</p>
                </div>
              )}
              {carePlan.medication_management.gp_details && (
                <div>
                  <p className="text-sm text-gray-500">GP</p>
                  <p className="font-medium">{carePlan.medication_management.gp_details}</p>
                </div>
              )}
            </div>

            {carePlan.medication_management.allergies_sensitivities && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">⚠️ Allergies & Sensitivities</p>
                <p className="text-red-700">{carePlan.medication_management.allergies_sensitivities}</p>
              </div>
            )}

            {carePlan.medication_management.medications?.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Current Medications</h4>
                <div className="space-y-2">
                  {carePlan.medication_management.medications.map((med, idx) => (
                    <div key={idx} className="p-3 border rounded-lg flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{med.name}</p>
                          {med.is_prn && <Badge className="bg-orange-100 text-orange-700">PRN</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">{med.dose} • {med.frequency}</p>
                        {med.purpose && <p className="text-sm text-gray-500">For: {med.purpose}</p>}
                        {med.special_instructions && (
                          <p className="text-sm text-amber-700 mt-1">📝 {med.special_instructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Routine */}
      {carePlan.daily_routine && Object.values(carePlan.daily_routine).some(v => v) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-cyan-600" />
              Daily Routine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carePlan.daily_routine.morning && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium">Morning</h4>
                  </div>
                  <p className="text-gray-700">{carePlan.daily_routine.morning}</p>
                </div>
              )}
              {carePlan.daily_routine.afternoon && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sunset className="w-5 h-5 text-orange-600" />
                    <h4 className="font-medium">Afternoon</h4>
                  </div>
                  <p className="text-gray-700">{carePlan.daily_routine.afternoon}</p>
                </div>
              )}
              {carePlan.daily_routine.evening && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium">Evening</h4>
                  </div>
                  <p className="text-gray-700">{carePlan.daily_routine.evening}</p>
                </div>
              )}
              {carePlan.daily_routine.night && (
                <div className="p-4 bg-slate-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudMoon className="w-5 h-5 text-slate-600" />
                    <h4 className="font-medium">Night</h4>
                  </div>
                  <p className="text-gray-700">{carePlan.daily_routine.night}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      {carePlan.preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-amber-500" />
              Preferences & Special Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carePlan.preferences.likes?.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">Likes</h4>
                  </div>
                  <ul className="list-disc list-inside text-gray-700">
                    {carePlan.preferences.likes.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {carePlan.preferences.dislikes?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsDown className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium">Dislikes</h4>
                  </div>
                  <ul className="list-disc list-inside text-gray-700">
                    {carePlan.preferences.dislikes.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {carePlan.preferences.hobbies?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Hobbies & Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {carePlan.preferences.hobbies.map((hobby, idx) => (
                    <Badge key={idx} variant="outline">{hobby}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carePlan.preferences.food_preferences && (
                <div>
                  <h4 className="font-medium mb-1">Food Preferences</h4>
                  <p className="text-gray-700">{carePlan.preferences.food_preferences}</p>
                </div>
              )}
              {carePlan.preferences.personal_care_preferences && (
                <div>
                  <h4 className="font-medium mb-1">Personal Care Preferences</h4>
                  <p className="text-gray-700">{carePlan.preferences.personal_care_preferences}</p>
                </div>
              )}
              {carePlan.preferences.communication_preferences && (
                <div>
                  <h4 className="font-medium mb-1">Communication Preferences</h4>
                  <p className="text-gray-700">{carePlan.preferences.communication_preferences}</p>
                </div>
              )}
              {carePlan.preferences.social_preferences && (
                <div>
                  <h4 className="font-medium mb-1">Social Preferences</h4>
                  <p className="text-gray-700">{carePlan.preferences.social_preferences}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {carePlan.risk_factors?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {carePlan.risk_factors.map((risk, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{risk.risk}</h4>
                    <div className="flex gap-2">
                      <Badge className={riskColors[risk.likelihood]}>
                        Likelihood: {risk.likelihood}
                      </Badge>
                      <Badge className={riskColors[risk.impact]}>
                        Impact: {risk.impact}
                      </Badge>
                    </div>
                  </div>
                  {risk.control_measures && (
                    <div className="p-2 bg-gray-50 rounded mt-2">
                      <p className="text-sm"><strong>Control Measures:</strong> {risk.control_measures}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DoLS Information - CQC Requirement */}
      {carePlan.dols_info?.applicable && (
        <Card className="border-amber-300 border-2">
          <CardHeader className="bg-amber-50">
            <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
              <Shield className="w-5 h-5" />
              DoLS - Deprivation of Liberty Safeguards
            </CardTitle>
            <p className="text-sm text-amber-700 mt-1">CQC Regulatory Requirement</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg">
              <p className="text-sm font-semibold text-amber-900">⚠️ DoLS Authorisation in Place</p>
              <p className="text-sm text-amber-800 mt-1">
                This person is subject to Deprivation of Liberty Safeguards. All staff must be aware of the restrictions and conditions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {carePlan.dols_info.status && (
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{carePlan.dols_info.status}</p>
                </div>
              )}
              {carePlan.dols_info.case_reference && (
                <div>
                  <p className="text-sm text-gray-500">Case Reference</p>
                  <p className="font-medium">{carePlan.dols_info.case_reference}</p>
                </div>
              )}
              {carePlan.dols_info.supervisory_body && (
                <div>
                  <p className="text-sm text-gray-500">Supervisory Body</p>
                  <p className="font-medium">{carePlan.dols_info.supervisory_body}</p>
                </div>
              )}
              {carePlan.dols_info.authorisation_start && (
                <div>
                  <p className="text-sm text-gray-500">Authorisation Start</p>
                  <p className="font-medium">{format(parseISO(carePlan.dols_info.authorisation_start), 'PPP')}</p>
                </div>
              )}
              {carePlan.dols_info.authorisation_end && (
                <div>
                  <p className="text-sm text-gray-500">Authorisation End</p>
                  <p className="font-medium">{format(parseISO(carePlan.dols_info.authorisation_end), 'PPP')}</p>
                </div>
              )}
            </div>

            {carePlan.dols_info.reason && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Reason for DoLS</p>
                <p className="text-gray-700">{carePlan.dols_info.reason}</p>
              </div>
            )}

            {carePlan.dols_info.restrictions?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Restrictions in Place</p>
                <div className="space-y-2">
                  {carePlan.dols_info.restrictions.map((restriction, idx) => (
                    <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-sm text-amber-900">• {restriction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-800">Staff Responsibilities</p>
              <p className="text-xs text-blue-700 mt-1">
                • Ensure restrictions are applied consistently<br/>
                • Monitor for changes in capacity<br/>
                • Report concerns to DoLS lead<br/>
                • Review conditions regularly
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DNACPR Information - CQC Requirement */}
      {carePlan.dnacpr_info?.in_place && (
        <Card className="border-red-300 border-2">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-lg text-red-900">
              <AlertTriangle className="w-5 h-5" />
              DNACPR - Do Not Attempt Cardiopulmonary Resuscitation
            </CardTitle>
            <p className="text-sm text-red-700 mt-1">CQC Regulatory Requirement - Emergency Services Must Be Informed</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm font-semibold text-red-900">🚨 DNACPR Order in Place</p>
              <p className="text-sm text-red-800 mt-1">
                In the event of cardiac or respiratory arrest, CPR should NOT be attempted. Emergency services must be informed immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {carePlan.dnacpr_info.decision_date && (
                <div>
                  <p className="text-sm text-gray-500">Decision Date</p>
                  <p className="font-medium">{format(parseISO(carePlan.dnacpr_info.decision_date), 'PPP')}</p>
                </div>
              )}
              {carePlan.dnacpr_info.decision_maker && (
                <div>
                  <p className="text-sm text-gray-500">Decision Made By</p>
                  <p className="font-medium">{carePlan.dnacpr_info.decision_maker}</p>
                  {carePlan.dnacpr_info.decision_maker_role && (
                    <p className="text-xs text-gray-500">{carePlan.dnacpr_info.decision_maker_role}</p>
                  )}
                </div>
              )}
              {carePlan.dnacpr_info.mental_capacity && (
                <div>
                  <p className="text-sm text-gray-500">Mental Capacity</p>
                  <p className="font-medium capitalize">{carePlan.dnacpr_info.mental_capacity.replace(/_/g, ' ')}</p>
                </div>
              )}
              {carePlan.dnacpr_info.patient_involvement && (
                <div>
                  <p className="text-sm text-gray-500">Patient Involvement</p>
                  <p className="font-medium capitalize">{carePlan.dnacpr_info.patient_involvement.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>

            {carePlan.dnacpr_info.clinical_reasons && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Clinical Reasons</p>
                <p className="text-gray-700">{carePlan.dnacpr_info.clinical_reasons}</p>
              </div>
            )}

            {carePlan.dnacpr_info.family_involved && (
              <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                <p className="text-sm text-purple-800">✓ Family involved in decision-making process</p>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-800">Emergency Procedures</p>
              <p className="text-xs text-blue-700 mt-1">
                • Call 999 and inform of DNACPR status immediately<br/>
                • Provide comfort and dignity<br/>
                • Follow agreed care pathway<br/>
                • Contact family as per wishes<br/>
                • Location of signed DNACPR form: [Check DoLS/DNACPR tab for document location]
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Info */}
      {carePlan.emergency_info && (carePlan.emergency_info.hospital_preference || carePlan.emergency_info.emergency_protocol) && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-lg text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Emergency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {carePlan.emergency_info.hospital_preference && (
              <div>
                <p className="text-sm text-gray-500">Preferred Hospital</p>
                <p className="font-medium">{carePlan.emergency_info.hospital_preference}</p>
              </div>
            )}
            {carePlan.emergency_info.dnacpr_in_place && (
              <Badge className="bg-red-100 text-red-800">DNACPR in Place - See DNACPR Section Above</Badge>
            )}
            {carePlan.emergency_info.emergency_protocol && (
              <div>
                <p className="text-sm text-gray-500">Emergency Protocol</p>
                <p className="text-gray-700">{carePlan.emergency_info.emergency_protocol}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </div>
        )}
      </div>
    </div>
  );
}