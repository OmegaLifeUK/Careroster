import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { AssessmentToCarePlanWorkflow } from "./AssessmentToCarePlanWorkflow";

/**
 * Monitors for completed assessments and prompts care plan generation
 */
export default function AssessmentMonitor({ clientId }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = React.useState(null);

  const { data: pendingAssessments = [], refetch } = useQuery({
    queryKey: ['pending-assessments', clientId],
    queryFn: async () => {
      const pending = [];

      // Check visits with assessment documents
      const visits = await base44.entities.Visit.filter({ 
        client_id: clientId,
        visit_type: 'assessment',
        status: 'completed'
      });

      for (const visit of visits) {
        if (visit.assessment_documents?.length > 0 && !visit.linked_care_plan_id) {
          pending.push({
            type: 'visit',
            id: visit.id,
            client_id: visit.client_id,
            documents: visit.assessment_documents,
            date: visit.actual_end || visit.scheduled_start,
            documentCount: visit.assessment_documents.length
          });
        }
      }

      // Check shifts with assessment documents
      const shifts = await base44.entities.Shift.filter({ 
        client_id: clientId
      });

      const assessmentShifts = shifts.filter(s => 
        s.shift_type === 'assessment' && s.status === 'completed'
      );

      for (const shift of assessmentShifts) {
        if (shift.assessment_documents?.length > 0 && !shift.linked_care_plan_id) {
          pending.push({
            type: 'shift',
            id: shift.id,
            client_id: shift.client_id,
            documents: shift.assessment_documents,
            date: shift.actual_end_time || shift.date,
            documentCount: shift.assessment_documents.length
          });
        }
      }

      // Check uploaded client documents (for transfers from other providers)
      const clientDocs = await base44.entities.ClientDocument.filter({ 
        client_id: clientId
      });

      const assessmentDocs = clientDocs.filter(doc => 
        doc.document_type === 'assessment' || 
        doc.document_type === 'care_plan' ||
        doc.document_type === 'medical_report'
      );

      // Check if we have care plan documents but no active care plan
      if (assessmentDocs.length > 0) {
        const carePlans = await base44.entities.CarePlan.filter({ 
          client_id: clientId, 
          status: 'active' 
        });

        if (carePlans.length === 0) {
          pending.push({
            type: 'uploaded_documents',
            id: `docs_${clientId}`,
            client_id: clientId,
            documents: assessmentDocs.map(doc => ({
              document_name: doc.document_name,
              document_url: doc.file_url,
              document_type: doc.document_type,
              uploaded_date: doc.upload_date
            })),
            date: assessmentDocs[0].upload_date,
            documentCount: assessmentDocs.length
          });
        }
      }

      return pending;
    },
    refetchInterval: 60000, // Check every minute
  });

  const handleGenerateCarePlan = async (assessment) => {
    setGenerating(assessment.id);
    
    try {
      toast.info("Generating care plan", "AI is analyzing assessment documents...");

      // Step 1: Generate care plan data from assessment
      const aiResult = await AssessmentToCarePlanWorkflow.generateCarePlanFromAssessment(
        assessment,
        assessment.client_id
      );

      if (!aiResult.success) {
        toast.error("Generation failed", aiResult.error);
        setGenerating(null);
        return;
      }

      // Step 2: Create draft care plan
      const draftResult = await AssessmentToCarePlanWorkflow.createDraftCarePlan(
        aiResult.carePlanData,
        assessment.client_id,
        assessment
      );

      if (!draftResult.success) {
        toast.error("Failed to create care plan", draftResult.error);
        setGenerating(null);
        return;
      }

      // Success - refresh queries
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['pending-assessments'] });
      
      toast.success(
        "Care plan created", 
        "Draft care plan ready for review and approval"
      );
      
      refetch();
    } catch (error) {
      toast.error("Error", error.message);
    } finally {
      setGenerating(null);
    }
  };

  if (pendingAssessments.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">
                Assessment Ready for Care Planning
              </h3>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              {pendingAssessments.length} completed assessment{pendingAssessments.length > 1 ? 's' : ''} with {' '}
              {pendingAssessments.reduce((sum, a) => sum + a.documentCount, 0)} document(s) available. 
              Generate a comprehensive care plan using AI.
            </p>

            <div className="space-y-2">
              {pendingAssessments.map((assessment) => (
                <div 
                  key={`${assessment.type}-${assessment.id}`}
                  className="bg-white rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">
                        {assessment.type === 'visit' ? 'Assessment Visit' : 
                         assessment.type === 'shift' ? 'Assessment Session' : 
                         'Uploaded Assessment Documents'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>Date: {new Date(assessment.date).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {assessment.documentCount} document{assessment.documentCount > 1 ? 's' : ''}
                        </Badge>
                        {assessment.type === 'uploaded_documents' && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">Transfer/Import</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleGenerateCarePlan(assessment)}
                    disabled={generating === assessment.id}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {generating === assessment.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Care Plan
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}