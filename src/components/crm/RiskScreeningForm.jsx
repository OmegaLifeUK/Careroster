import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Lock, Shield } from "lucide-react";
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

  const [auditLocked, setAuditLocked] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const riskIndicators = [
    "Physical harm or threat",
    "Domestic violence present",
    "Substance misuse in household",
    "Mental health concerns",
    "Previous safeguarding incidents",
    "Criminal activity",
    "Poor accommodation conditions",
    "Financial exploitation",
    "Educational neglect",
    "Emotional abuse indicators",
    "Social isolation",
    "Unexplained injuries"
  ];

  const createRiskAssessmentMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      const assessment = await base44.entities.CaseRiskAssessment.create({
        case_id: caseId,
        assessment_date: format(new Date(), 'yyyy-MM-dd'),
        assessed_by: user.full_name,
        ...data,
        audit_locked: auditLocked,
        review_date: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 90 days
      });

      // Update case risk level
      await base44.entities.Case.update(caseId, {
        risk_level: data.risk_level,
      });

      // Auto-escalate if critical or high risk
      if ((data.risk_level === 'critical' || data.risk_level === 'high') && !data.escalated_to) {
        await base44.entities.SafeguardingAlert.create({
          case_id: caseId,
          alert_type: 'risk_escalation',
          severity: data.risk_level === 'critical' ? 'critical' : 'high',
          description: `Risk assessment identified ${data.risk_level} risk: ${data.risk_description}`,
          source: 'automated_system',
          reported_by: user.full_name,
          service_area: 'day_centre',
          status: 'open',
          alert_date: new Date().toISOString(),
        });
      }

      return assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-risk-assessments', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success("Risk Assessment Complete", "Assessment saved and case updated");
      if (onComplete) onComplete();
    },
    onError: () => {
      toast.error("Error", "Failed to save risk assessment");
    }
  });

  const toggleIndicator = (indicator) => {
    setFormData(prev => ({
      ...prev,
      risk_indicators: prev.risk_indicators.includes(indicator)
        ? prev.risk_indicators.filter(i => i !== indicator)
        : [...prev.risk_indicators, indicator]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.risk_level === 'critical' || formData.risk_level === 'high') {
      setFormData(prev => ({ ...prev, escalation_required: true }));
    }

    createRiskAssessmentMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          Risk Screening Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Risk Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Risk Category *</label>
            <Select value={formData.risk_category} onValueChange={(val) => setFormData({...formData, risk_category: val})}>
              <SelectTrigger>
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
            <label className="block text-sm font-medium mb-2">Risk Level *</label>
            <Select value={formData.risk_level} onValueChange={(val) => setFormData({...formData, risk_level: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            {(formData.risk_level === 'high' || formData.risk_level === 'critical') && (
              <p className="text-sm text-orange-600 mt-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                This risk level will trigger automatic escalation
              </p>
            )}
          </div>

          {/* Risk Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Risk Description *</label>
            <Textarea
              value={formData.risk_description}
              onChange={(e) => setFormData({...formData, risk_description: e.target.value})}
              placeholder="Detailed description of identified risks..."
              rows={4}
            />
          </div>

          {/* Risk Indicators */}
          <div>
            <label className="block text-sm font-medium mb-2">Risk Indicators</label>
            <div className="grid md:grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
              {riskIndicators.map((indicator) => (
                <label key={indicator} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.risk_indicators.includes(indicator)}
                    onCheckedChange={() => toggleIndicator(indicator)}
                  />
                  {indicator}
                </label>
              ))}
            </div>
          </div>

          {/* Protective Factors */}
          <div>
            <label className="block text-sm font-medium mb-2">Protective Factors</label>
            <Textarea
              value={formData.protective_factors}
              onChange={(e) => setFormData({...formData, protective_factors: e.target.value})}
              placeholder="Identify protective factors and strengths..."
              rows={3}
            />
          </div>

          {/* Mitigation Plan */}
          <div>
            <label className="block text-sm font-medium mb-2">Mitigation Plan *</label>
            <Textarea
              value={formData.mitigation_plan}
              onChange={(e) => setFormData({...formData, mitigation_plan: e.target.value})}
              placeholder="Plan to mitigate identified risks..."
              rows={4}
            />
          </div>

          {/* Escalation */}
          {formData.escalation_required && (
            <div>
              <label className="block text-sm font-medium mb-2">Escalated To</label>
              <input
                type="text"
                value={formData.escalated_to}
                onChange={(e) => setFormData({...formData, escalated_to: e.target.value})}
                placeholder="Name of manager/authority"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}

          {/* Audit Lock */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={auditLocked}
                onCheckedChange={setAuditLocked}
              />
              <Lock className="w-4 h-4" />
              Audit Lock Assessment (prevents future editing)
            </label>
            <p className="text-xs text-gray-600 mt-2 ml-6">
              Once submitted with audit lock, this assessment cannot be modified - ensuring regulatory compliance
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="submit"
              disabled={createRiskAssessmentMutation.isPending || !formData.risk_category || !formData.risk_description || !formData.mitigation_plan}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Complete Risk Assessment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}