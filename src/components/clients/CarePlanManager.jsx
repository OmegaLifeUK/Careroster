import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar, 
  Heart, 
  Pill,
  ListChecks,
  Target,
  AlertTriangle,
  Clock,
  User,
  ChevronRight,
  FileText,
  Sparkles
} from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { useToast } from "@/components/ui/toast";
import CarePlanEditor from "@/components/careplan/CarePlanEditor";
import CarePlanViewer from "@/components/careplan/CarePlanViewer";
import AICarePlanGenerator from "@/components/careplan/AICarePlanGenerator";
import AICarePlanAssistant from "@/components/careplan/AICarePlanAssistant";
import { AssessmentToCarePlanWorkflow } from "@/components/workflow/AssessmentToCarePlanWorkflow";

export default function CarePlanManager({ client }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [assistantMode, setAssistantMode] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: carePlans = [], isLoading } = useQuery({
    queryKey: ['care-plans', client.id],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.list('-assessment_date');
      return plans.filter(p => p.client_id === client.id);
    },
  });

  // Fetch assessment documents from visits and shifts
  const { data: assessmentDocs = [] } = useQuery({
    queryKey: ['assessment-docs', client.id],
    queryFn: async () => {
      const docs = [];
      
      // Get from visits (domiciliary care)
      try {
        const visits = await base44.entities.Visit.filter({ client_id: client.id });
        (visits || []).forEach(v => {
          if (v.assessment_documents?.length) {
            docs.push(...v.assessment_documents.map(d => ({
              ...d,
              source: 'visit',
              source_id: v.id,
              visit_type: v.visit_type
            })));
          }
        });
      } catch (e) { console.log("No visits found"); }
      
      // Get from shifts (residential, supported living, day centre)
      try {
        const shifts = await base44.entities.Shift.filter({ client_id: client.id });
        (shifts || []).forEach(s => {
          if (s.assessment_documents?.length) {
            docs.push(...s.assessment_documents.map(d => ({
              ...d,
              source: 'shift',
              source_id: s.id,
              shift_type: s.shift_type
            })));
          }
        });
      } catch (e) { console.log("No shifts found"); }
      
      return docs;
    },
  });

  // Fetch actual care tasks for accurate counts
  const { data: careTasks = [] } = useQuery({
    queryKey: ['care-tasks-for-plans', client.id],
    queryFn: async () => {
      try {
        const tasks = await base44.entities.CareTask.filter({ client_id: client.id });
        return Array.isArray(tasks) ? tasks : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch MAR sheets for accurate medication counts
  const { data: marSheets = [] } = useQuery({
    queryKey: ['mar-sheets-for-plans', client.id],
    queryFn: async () => {
      try {
        const sheets = await base44.entities.MARSheet.filter({ client_id: client.id });
        return Array.isArray(sheets) ? sheets : [];
      } catch {
        return [];
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarePlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Deleted", "Care plan removed");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    under_review: "bg-yellow-100 text-yellow-800",
    archived: "bg-red-100 text-red-800",
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowEditor(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this care plan?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleApproveCarePlan = async (planId) => {
    if (confirm("Approve this care plan? This will create all medication, task, and risk records.")) {
      try {
        const result = await AssessmentToCarePlanWorkflow.approveCarePlan(planId);
        if (result.success) {
          // Mark as approved
          await base44.entities.CarePlan.update(planId, { 
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
        } else {
          toast.error('Approval failed', result.error);
        }
      } catch (error) {
        console.error("Approval error:", error);
        toast.error('Approval failed', error.message || 'Unknown error');
      }
    }
  };

  const getReviewStatus = (reviewDate) => {
    if (!reviewDate) return null;
    const review = parseISO(reviewDate);
    const daysUntil = differenceInDays(review, new Date());
    
    if (isPast(review)) {
      return { status: 'overdue', label: 'Review Overdue', color: 'bg-red-100 text-red-700' };
    }
    if (daysUntil <= 14) {
      return { status: 'soon', label: `Review in ${daysUntil} days`, color: 'bg-amber-100 text-amber-700' };
    }
    return null;
  };

  // Get active plan
  const activePlan = carePlans.find(p => p.status === 'active');

  if (selectedPlan) {
    return (
      <CarePlanViewer 
        carePlan={selectedPlan} 
        client={client}
        onBack={() => setSelectedPlan(null)}
        onEdit={() => handleEdit(selectedPlan)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Heart className="w-5 h-5 text-blue-600" />
          Care Plans
        </h2>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
            onClick={() => { setAssistantMode('create'); setShowAIAssistant(true); }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate Care Plan
          </Button>
          {activePlan && (
            <Button 
              size="sm" 
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => { setAssistantMode('adjust'); setShowAIAssistant(true); }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Suggest Adjustments
            </Button>
          )}
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => { setEditingPlan(null); setShowEditor(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Care Plan
          </Button>
        </div>
      </div>

      {/* Assessment Documents Available */}
      {assessmentDocs.length > 0 && (
        <Card className="mb-4 border-purple-200 bg-purple-50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-800">
                <strong>{assessmentDocs.length}</strong> assessment document(s) available from visits
              </span>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              className="text-purple-700"
              onClick={() => setShowAIGenerator(true)}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Care Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Plan Summary */}
      {activePlan && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">Active Plan</Badge>
                <span className="text-sm text-gray-600">
                  Assessed {format(parseISO(activePlan.assessment_date), 'MMM d, yyyy')}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (!activePlan || !activePlan.id) {
                    console.error("Invalid active plan", activePlan);
                    toast.error("Error", "Cannot view plan");
                    return;
                  }
                  setSelectedPlan(activePlan);
                }}
              >
                View Full Plan <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Objectives</p>
                  <p className="font-semibold">{activePlan.care_objectives?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500">Tasks</p>
                  <p className="font-semibold">
                    {careTasks.filter(t => t.related_care_plan_id === activePlan.id && t.is_active).length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-pink-600" />
                <div>
                  <p className="text-xs text-gray-500">Medications</p>
                  <p className="font-semibold">{marSheets.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-xs text-gray-500">Risk Factors</p>
                  <p className="font-semibold">{activePlan.risk_factors?.length || 0}</p>
                </div>
              </div>
            </div>
            
            {getReviewStatus(activePlan.review_date) && (
              <div className={`mt-3 p-2 rounded flex items-center gap-2 ${getReviewStatus(activePlan.review_date).color}`}>
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{getReviewStatus(activePlan.review_date).label}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : carePlans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No care plans</h3>
            <p className="text-gray-500 mb-4">Create a comprehensive care plan to document care needs, objectives, and interventions</p>
            <Button onClick={() => { setEditingPlan(null); setShowEditor(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Care Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {carePlans.map(plan => {
            const reviewStatus = getReviewStatus(plan.review_date);
            
            return (
              <Card key={plan.id} className={plan.status === 'active' ? 'border-green-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Heart className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold capitalize">{plan.plan_type} Care Plan</h3>
                        <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
                        {plan.generated_from_assessment && (
                          <Badge className="bg-purple-100 text-purple-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        {reviewStatus && (
                          <Badge className={reviewStatus.color}>{reviewStatus.label}</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 mb-3">
                        <p><strong>Setting:</strong> {plan.care_setting?.replace('_', ' ')}</p>
                        <p><strong>Assessed:</strong> {format(parseISO(plan.assessment_date), 'MMM d, yyyy')}</p>
                        <p><strong>By:</strong> {plan.assessed_by}</p>
                        {plan.review_date && (
                          <p><strong>Review:</strong> {format(parseISO(plan.review_date), 'MMM d, yyyy')}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {plan.care_objectives?.length || 0} objectives
                        </span>
                        <span className="flex items-center gap-1">
                          <ListChecks className="w-3 h-3" />
                          {careTasks.filter(t => t.related_care_plan_id === plan.id && t.is_active).length} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Pill className="w-3 h-3" />
                          {marSheets.length} medications
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Show approval button for AI-generated plans that haven't been approved */}
                      {plan.generated_from_assessment && !plan.approval_completed && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            console.log('Approving care plan:', plan.id, plan);
                            handleApproveCarePlan(plan.id);
                          }}
                          className={plan.status === 'draft' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
                          title="Create care tasks, medications, and risk assessments from this plan"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {plan.status === 'draft' ? 'Approve & Create Records' : 'Activate Care Plan & Workflows'}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (!plan || !plan.id) {
                            console.error("Invalid plan", plan);
                            toast.error("Error", "Cannot view plan");
                            return;
                          }
                          setSelectedPlan(plan);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(plan.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showEditor && (
        <CarePlanEditor
          carePlan={editingPlan}
          client={client}
          onClose={() => { setShowEditor(false); setEditingPlan(null); }}
        />
      )}

      {showAIGenerator && (
        <AICarePlanGenerator
          client={client}
          assessmentDocuments={assessmentDocs}
          onClose={() => setShowAIGenerator(false)}
          onSuccess={() => setShowAIGenerator(false)}
        />
      )}

      {showAIAssistant && (
        <AICarePlanAssistant
          client={client}
          existingCarePlan={assistantMode === 'adjust' ? activePlan : null}
          onClose={() => { setShowAIAssistant(false); setAssistantMode(null); }}
          onSuccess={() => {
            setShowAIAssistant(false);
            setAssistantMode(null);
            queryClient.invalidateQueries({ queryKey: ['care-plans'] });
          }}
        />
      )}
    </div>
  );
}