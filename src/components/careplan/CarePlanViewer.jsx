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
  Star
} from "lucide-react";
import { format, parseISO } from "date-fns";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Care Plans
        </Button>
        <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
          <Edit className="w-4 h-4 mr-2" />
          Edit Plan
        </Button>
      </div>

      {/* Plan Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
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
        <CardContent className="pt-4">
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
            {carePlan.personal_details?.preferred_name && (
              <div>
                <p className="text-gray-500">Preferred Name</p>
                <p className="font-medium">{carePlan.personal_details.preferred_name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
              <Badge className="bg-red-100 text-red-800">DNACPR in Place</Badge>
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
  );
}