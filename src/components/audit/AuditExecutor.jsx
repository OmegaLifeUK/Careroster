import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Camera,
  AlertCircle,
  ClipboardCheck,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function AuditExecutor({ task, auditTemplate, onClose, onComplete }) {
  const [responses, setResponses] = useState([]);
  const [findings, setFindings] = useState("");
  const [areaAudited, setAreaAudited] = useState("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const sections = auditTemplate.sections || [];
  const currentSection = sections[currentSectionIndex];

  // Calculate scores
  const calculateScores = () => {
    let totalScore = 0;
    let maxScore = 0;
    const nonCompliances = [];

    responses.forEach((response) => {
      if (response.response === 'yes') {
        totalScore += 1;
        maxScore += 1;
      } else if (response.response === 'no') {
        maxScore += 1;
        nonCompliances.push({
          item: response.item,
          severity: response.is_critical ? 'high' : 'medium',
          description: response.notes || 'Not compliant'
        });
      } else if (response.response_type === 'rating' && response.score) {
        totalScore += parseFloat(response.score);
        maxScore += 5; // Assuming 5-point scale
      }
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    let outcome = 'pass';
    if (percentage < 60) outcome = 'fail';
    else if (percentage < 80) outcome = 'requires_improvement';

    return { totalScore, maxScore, percentage, outcome, nonCompliances };
  };

  const handleResponseChange = (item, field, value) => {
    setResponses(prev => {
      const existing = prev.find(r => r.item === item.item && r.section === currentSection.section_name);
      const newResponse = {
        section: currentSection.section_name,
        item: item.item,
        response_type: item.response_type,
        is_critical: item.is_critical,
        ...existing,
        [field]: value
      };

      if (field === 'response') {
        newResponse.is_compliant = value === 'yes';
      }

      if (existing) {
        return prev.map(r => 
          r.item === item.item && r.section === currentSection.section_name ? newResponse : r
        );
      } else {
        return [...prev, newResponse];
      }
    });
  };

  const getResponse = (item) => {
    return responses.find(r => r.item === item.item && r.section === currentSection.section_name) || {};
  };

  const isSectionComplete = () => {
    if (!currentSection) return true;
    return currentSection.checklist_items.every(item => {
      const response = getResponse(item);
      return response.response || response.score;
    });
  };

  const handleNext = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!areaAudited) {
      toast.error("Required Field", "Please specify the area audited");
      return;
    }

    setIsSaving(true);

    try {
      const { totalScore, maxScore, percentage, outcome, nonCompliances } = calculateScores();

      // Create audit record
      const auditRecord = await base44.entities.AuditRecord.create({
        template_id: auditTemplate.id,
        audit_date: task.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
        auditor_staff_id: currentUser?.email || task.assigned_to_staff_id,
        area_audited: areaAudited,
        responses,
        overall_score: totalScore,
        percentage_score: percentage,
        outcome,
        findings,
        non_compliances: nonCompliances,
        status: 'submitted'
      });

      // Update the task
      await base44.entities.StaffTask.update(task.id, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        audit_record_id: auditRecord.id
      });

      // If there are non-compliances, create an action plan
      if (nonCompliances.length > 0) {
        const actionPlan = await base44.entities.ActionPlan.create({
          title: `Action Plan - ${auditTemplate.template_name} (${areaAudited})`,
          description: `Action plan generated from audit conducted on ${format(new Date(), 'dd/MM/yyyy')}. ${nonCompliances.length} non-compliance(s) identified.`,
          category: 'compliance',
          priority: nonCompliances.some(nc => nc.severity === 'high') ? 'high' : 'medium',
          status: 'active',
          assigned_to_staff_ids: [task.assigned_to_staff_id],
          target_completion_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days
          related_entity_type: 'audit',
          related_entity_id: auditRecord.id,
          actions: nonCompliances.map(nc => ({
            action: `Address: ${nc.item}`,
            responsible_person: task.assigned_to_staff_id,
            target_date: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 14 days
            status: 'pending',
            notes: nc.description
          })),
          progress_percentage: 0
        });

        // Link action plan back to audit record
        await base44.entities.AuditRecord.update(auditRecord.id, {
          action_plan_id: actionPlan.id,
          status: 'action_required'
        });

        toast.success("Audit Complete", `Action plan created with ${nonCompliances.length} action(s)`);
      } else {
        toast.success("Audit Complete", "No issues found - audit passed!");
      }

      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['audit-records'] });
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });

      onComplete?.();
    } catch (error) {
      console.error("Error submitting audit:", error);
      toast.error("Error", "Failed to submit audit");
    } finally {
      setIsSaving(false);
    }
  };

  const completedSections = sections.filter((section, idx) => 
    idx < currentSectionIndex || (idx === currentSectionIndex && isSectionComplete())
  ).length;

  const progressPercentage = sections.length > 0 ? (completedSections / sections.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{auditTemplate.template_name}</h1>
                <p className="text-sm text-gray-600">{task.title}</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700">
              <ClipboardCheck className="w-4 h-4 mr-1" />
              Audit
            </Badge>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Section {currentSectionIndex + 1} of {sections.length}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Area Audited */}
        {currentSectionIndex === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Audit Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Area/Department Being Audited *</Label>
              <Input
                value={areaAudited}
                onChange={(e) => setAreaAudited(e.target.value)}
                placeholder="e.g., Ground Floor, Kitchen, Medication Room"
                className="mt-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Current Section */}
        {currentSection && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{currentSection.section_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSection.checklist_items.map((item, idx) => {
                const response = getResponse(item);
                
                return (
                  <div key={idx} className="pb-6 border-b last:border-b-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        response.response === 'yes' ? 'bg-green-100' :
                        response.response === 'no' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        {response.response === 'yes' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                         response.response === 'no' ? <XCircle className="w-5 h-5 text-red-600" /> :
                         <span className="text-sm font-medium text-gray-600">{idx + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.item}</p>
                        {item.is_critical && (
                          <Badge className="bg-red-100 text-red-700 mt-1">Critical</Badge>
                        )}
                        {item.guidance && (
                          <p className="text-sm text-gray-500 mt-1">{item.guidance}</p>
                        )}
                      </div>
                    </div>

                    {item.response_type === 'yes_no' && (
                      <RadioGroup
                        value={response.response}
                        onValueChange={(value) => handleResponseChange(item, 'response', value)}
                        className="flex gap-4 ml-11"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id={`yes-${idx}`} />
                          <Label htmlFor={`yes-${idx}`} className="cursor-pointer">Yes (Compliant)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id={`no-${idx}`} />
                          <Label htmlFor={`no-${idx}`} className="cursor-pointer">No (Non-Compliant)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="n_a" id={`na-${idx}`} />
                          <Label htmlFor={`na-${idx}`} className="cursor-pointer">N/A</Label>
                        </div>
                      </RadioGroup>
                    )}

                    {item.response_type === 'rating' && (
                      <div className="ml-11">
                        <Label className="text-sm">Rating (1-5)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          value={response.score || ''}
                          onChange={(e) => handleResponseChange(item, 'score', e.target.value)}
                          className="w-24 mt-1"
                        />
                      </div>
                    )}

                    {item.response_type === 'text' && (
                      <div className="ml-11">
                        <Textarea
                          value={response.response || ''}
                          onChange={(e) => handleResponseChange(item, 'response', e.target.value)}
                          placeholder="Enter details..."
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="ml-11 mt-3">
                      <Label className="text-sm">Notes (Optional)</Label>
                      <Textarea
                        value={response.notes || ''}
                        onChange={(e) => handleResponseChange(item, 'notes', e.target.value)}
                        placeholder="Add any observations or comments..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Overall Findings - Last Section */}
        {currentSectionIndex === sections.length - 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Overall Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Summary of overall findings, observations, and recommendations..."
                rows={4}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
          >
            Previous
          </Button>

          {currentSectionIndex < sections.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!isSectionComplete()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next Section
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isSectionComplete() || !areaAudited || isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Audit
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}