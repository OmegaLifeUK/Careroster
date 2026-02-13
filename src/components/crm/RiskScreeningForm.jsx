import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Shield, Lock, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function RiskScreeningForm({ caseId, onComplete }) {
  const [formData, setFormData] = useState({
    risk_category: "",
    risk_level: "medium",
    risk_description: "",
    risk_indicators: [],
    protective_factors: "",
    mitigation_plan: "",
    immediate_actions: [],
    escalation_required: false,
    escalated_to: "",
  });

  const [newIndicator, setNewIndicator] = useState("");
  const [newAction, setNewAction] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createAssessmentMutation = useMutation({
    mutationFn: async (data) => {
      const assessment = await base44.entities.CaseRiskAssessment.create({
        case_id: caseId,
        assessment_date: format(new Date(), 'yyyy-MM-dd'),
        assessed_by: (await base44.auth.me()).full_name,
        ...data,
        audit_locked: true, // Lock immediately after submission
      });

      // Update case risk level
      await base44.entities.Case.update(caseId, {
        risk_level: data.risk_level,
        status: 'risk_screening',
      });

      // Auto-escalate if high/critical risk
      if ((data.risk_level === 'high' || data.risk_level === 'critical') && data.escalation_required) {
        await base44.entities.SafeguardingAlert.create({
          case_id: caseId,
          alert_type: 'risk_escalation',
          severity: data.risk_level,
          description: `Risk screening identified ${data.risk_level} risk: ${data.risk_description}`,
          source: 'automated_system',
          service_area: 'day_centre',
          status: 'open',
          escalated_to: data.escalated_to,
          escalation_date: new Date().toISOString(),
        });
      }

      return assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-risk-assessments', caseId] });
      toast.success("Success", "Risk screening completed and audit-locked");
      setIsLocked(true);
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast.error("Error", "Failed to save risk screening");
      console.error(error);
    }
  });

  const addIndicator = () => {
    if (newIndicator.trim()) {
      setFormData({
        ...formData,
        risk_indicators: [...formData.risk_indicators, newIndicator.trim()]
      });
      setNewIndicator("");
    }
  };

  const addAction = () => {
    if (newAction.trim()) {
      setFormData({
        ...formData,
        immediate_actions: [...formData.immediate_actions, newAction.trim()]
      });
      setNewAction("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.risk_description || !formData.mitigation_plan) {
      toast.error("Validation Error", "Please complete all required fields");
      return;
    }

    createAssessmentMutation.mutate(formData);
  };

  // Check if high/critical risk to show escalation requirement
  const requiresEscalation = formData.risk_level === 'high' || formData.risk_level === 'critical';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          Structured Risk Screening Form
          {isLocked && (
            <Lock className="w-4 h-4 text-gray-500 ml-2" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLocked ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-green-900">Risk Screening Completed</p>
            <p className="text-sm text-gray-600 mt-1">This assessment is now audit-locked</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Risk Category */}
            <div>
              <Label>Risk Category *</Label>
              <Select value={formData.risk_category} onValueChange={(val) => setFormData({...formData, risk_category: val})}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safeguarding_concern">Safeguarding Concern</SelectItem>
                  <SelectItem value="domestic_violence">Domestic Violence</SelectItem>
                  <SelectItem value="substance_misuse">Substance Misuse</SelectItem>
                  <SelectItem value="mental_health">Mental Health</SelectItem>
                  <SelectItem value="criminal_activity">Criminal Activity</SelectItem>
                  <SelectItem value="financial_hardship">Financial Hardship</SelectItem>
                  <SelectItem value="accommodation_issues">Accommodation Issues</SelectItem>
                  <SelectItem value="disability_support">Disability Support</SelectItem>
                  <SelectItem value="education_concerns">Education Concerns</SelectItem>
                  <SelectItem value="behavioural_concerns">Behavioural Concerns</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Level */}
            <div>
              <Label>Risk Level *</Label>
              <Select value={formData.risk_level} onValueChange={(val) => setFormData({...formData, risk_level: val})}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requiresEscalation && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">Escalation Required</p>
                    <p className="text-sm text-red-700 mt-1">
                      High and critical risk levels require immediate escalation to management
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Description */}
            <div>
              <Label>Risk Description * (Detailed assessment of identified risks)</Label>
              <Textarea
                value={formData.risk_description}
                onChange={(e) => setFormData({...formData, risk_description: e.target.value})}
                rows={4}
                className="mt-2"
                placeholder="Describe the identified risks in detail..."
              />
            </div>

            {/* Risk Indicators */}
            <div>
              <Label>Risk Indicators</Label>
              <div className="mt-2 space-y-2">
                {formData.risk_indicators.map((indicator, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="flex-1 text-sm">{indicator}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({
                        ...formData,
                        risk_indicators: formData.risk_indicators.filter((_, i) => i !== idx)
                      })}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newIndicator}
                    onChange={(e) => setNewIndicator(e.target.value)}
                    placeholder="Add risk indicator..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndicator())}
                  />
                  <Button type="button" onClick={addIndicator} variant="outline">Add</Button>
                </div>
              </div>
            </div>

            {/* Protective Factors */}
            <div>
              <Label>Protective Factors</Label>
              <Textarea
                value={formData.protective_factors}
                onChange={(e) => setFormData({...formData, protective_factors: e.target.value})}
                rows={3}
                className="mt-2"
                placeholder="Identify protective factors and strengths..."
              />
            </div>

            {/* Mitigation Plan */}
            <div>
              <Label>Mitigation Plan * (Actions to reduce risk)</Label>
              <Textarea
                value={formData.mitigation_plan}
                onChange={(e) => setFormData({...formData, mitigation_plan: e.target.value})}
                rows={4}
                className="mt-2"
                placeholder="Detailed plan for risk mitigation..."
              />
            </div>

            {/* Immediate Actions */}
            <div>
              <Label>Immediate Actions Required</Label>
              <div className="mt-2 space-y-2">
                {formData.immediate_actions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <span className="flex-1 text-sm">{action}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({
                        ...formData,
                        immediate_actions: formData.immediate_actions.filter((_, i) => i !== idx)
                      })}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    placeholder="Add immediate action..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAction())}
                  />
                  <Button type="button" onClick={addAction} variant="outline">Add</Button>
                </div>
              </div>
            </div>

            {/* Escalation */}
            {requiresEscalation && (
              <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.escalation_required}
                    onCheckedChange={(checked) => setFormData({...formData, escalation_required: checked})}
                  />
                  <Label>Escalation Required *</Label>
                </div>
                
                {formData.escalation_required && (
                  <div>
                    <Label>Escalate To * (Manager/Senior Staff)</Label>
                    <Input
                      value={formData.escalated_to}
                      onChange={(e) => setFormData({...formData, escalated_to: e.target.value})}
                      placeholder="Name of manager/senior staff"
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={createAssessmentMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {createAssessmentMutation.isPending ? "Submitting..." : "Submit & Audit Lock"}
              </Button>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                This assessment will be permanently locked after submission
              </p>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}