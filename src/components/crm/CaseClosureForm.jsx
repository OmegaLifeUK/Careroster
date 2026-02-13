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
import { Archive, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function CaseClosureForm({ caseId, caseData, onComplete }) {
  const [formData, setFormData] = useState({
    closure_reason: "",
    closure_outcome: "",
    final_summary: "",
    funding_reconciled: false,
    funding_reconciliation_notes: "",
    data_retention_years: "7",
    final_risk_level: caseData?.risk_level || "medium",
    objectives_achieved_count: 0,
    total_sessions_count: 0,
    recommendations: "",
  });

  const [confirmationChecks, setConfirmationChecks] = useState({
    allDocumentsReviewed: false,
    fundingReconciled: false,
    retentionPolicyApplied: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const closeCaseMutation = useMutation({
    mutationFn: async (data) => {
      // Validate mandatory fields
      if (!data.closure_outcome || !data.final_summary || !data.funding_reconciled) {
        throw new Error("All mandatory fields must be completed");
      }

      if (!confirmationChecks.allDocumentsReviewed || !confirmationChecks.retentionPolicyApplied) {
        throw new Error("All confirmation checks must be completed");
      }

      // Calculate retention date
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + parseInt(data.data_retention_years));

      // Update case
      await base44.entities.Case.update(caseId, {
        status: 'closed',
        closure_date: format(new Date(), 'yyyy-MM-dd'),
        closure_reason: data.closure_reason,
        closure_outcome: data.closure_outcome,
        final_summary: data.final_summary,
        funding_reconciled: data.funding_reconciled,
        funding_reconciliation_notes: data.funding_reconciliation_notes,
        data_retention_date: format(retentionDate, 'yyyy-MM-dd'),
        final_risk_level: data.final_risk_level,
        audit_locked: true,
      });

      // Create closure document record
      await base44.entities.CaseDocument.create({
        case_id: caseId,
        document_type: 'closure_summary',
        document_name: `Case Closure Summary - ${caseData.case_number}`,
        status: 'reviewed',
        received_date: format(new Date(), 'yyyy-MM-dd'),
        reviewed_date: format(new Date(), 'yyyy-MM-dd'),
        reviewed_by: (await base44.auth.me()).full_name,
        sensitivity_level: 'confidential',
        notes: data.final_summary,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      toast.success("Case Closed", "Case has been closed and archived with data retention policy applied");
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to close case");
    }
  });

  const allChecksComplete = 
    confirmationChecks.allDocumentsReviewed &&
    confirmationChecks.fundingReconciled &&
    confirmationChecks.retentionPolicyApplied;

  const handleSubmit = (e) => {
    e.preventDefault();
    closeCaseMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-purple-600" />
          Case Closure & Archiving
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Important: Compliance Requirements</p>
              <p className="text-sm text-amber-800 mt-1">
                All mandatory fields must be completed before case closure. This action will audit-lock the case and apply data retention policies.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Closure Outcome */}
          <div>
            <Label>Closure Outcome Category * (Mandatory)</Label>
            <Select value={formData.closure_outcome} onValueChange={(val) => setFormData({...formData, closure_outcome: val})}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select outcome..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="successful_completion">Successful Completion</SelectItem>
                <SelectItem value="moved_to_another_service">Moved to Another Service</SelectItem>
                <SelectItem value="court_order_ended">Court Order Ended</SelectItem>
                <SelectItem value="family_withdrew">Family Withdrew</SelectItem>
                <SelectItem value="safeguarding_escalation">Safeguarding Escalation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Closure Reason */}
          <div>
            <Label>Closure Reason</Label>
            <Textarea
              value={formData.closure_reason}
              onChange={(e) => setFormData({...formData, closure_reason: e.target.value})}
              rows={2}
              className="mt-2"
              placeholder="Brief reason for closure..."
            />
          </div>

          {/* Final Summary */}
          <div>
            <Label>Final Summary * (Mandatory - Detailed case closure summary)</Label>
            <Textarea
              value={formData.final_summary}
              onChange={(e) => setFormData({...formData, final_summary: e.target.value})}
              rows={6}
              className="mt-2"
              placeholder="Comprehensive summary including: objectives achieved, progress made, family engagement, outcomes, and any ongoing recommendations..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This summary will be included in the final case report
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <Label>Ongoing Recommendations</Label>
            <Textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({...formData, recommendations: e.target.value})}
              rows={3}
              className="mt-2"
              placeholder="Any recommendations for ongoing support or future interventions..."
            />
          </div>

          {/* Funding Reconciliation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <Label className="text-base font-semibold">Funding Reconciliation * (Mandatory)</Label>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.funding_reconciled}
                onCheckedChange={(checked) => setFormData({...formData, funding_reconciled: checked})}
              />
              <Label>Funding has been reconciled with commissioning authority</Label>
            </div>

            <div>
              <Label>Reconciliation Notes</Label>
              <Textarea
                value={formData.funding_reconciliation_notes}
                onChange={(e) => setFormData({...formData, funding_reconciliation_notes: e.target.value})}
                rows={2}
                className="mt-2"
                placeholder="Details of funding reconciliation, final invoices, etc..."
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Objectives Achieved</Label>
              <Input
                type="number"
                value={formData.objectives_achieved_count}
                onChange={(e) => setFormData({...formData, objectives_achieved_count: parseInt(e.target.value) || 0})}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Total Sessions Delivered</Label>
              <Input
                type="number"
                value={formData.total_sessions_count}
                onChange={(e) => setFormData({...formData, total_sessions_count: parseInt(e.target.value) || 0})}
                className="mt-2"
              />
            </div>
          </div>

          {/* Final Risk Level */}
          <div>
            <Label>Final Risk Level</Label>
            <Select value={formData.final_risk_level} onValueChange={(val) => setFormData({...formData, final_risk_level: val})}>
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

          {/* Data Retention */}
          <div>
            <Label>Data Retention Period * (Years)</Label>
            <Select value={formData.data_retention_years} onValueChange={(val) => setFormData({...formData, data_retention_years: val})}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Years (Standard)</SelectItem>
                <SelectItem value="7">7 Years (Recommended)</SelectItem>
                <SelectItem value="10">10 Years (Extended)</SelectItem>
                <SelectItem value="25">25 Years (Safeguarding)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Data will be retained until {format(new Date(new Date().setFullYear(new Date().getFullYear() + parseInt(formData.data_retention_years))), 'MMM d, yyyy')}
            </p>
          </div>

          {/* Confirmation Checks */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
            <Label className="text-base font-semibold">Pre-Closure Confirmation Checks *</Label>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={confirmationChecks.allDocumentsReviewed}
                  onCheckedChange={(checked) => setConfirmationChecks({...confirmationChecks, allDocumentsReviewed: checked})}
                />
                <Label>All case documents have been reviewed and are complete</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={confirmationChecks.fundingReconciled}
                  onCheckedChange={(checked) => setConfirmationChecks({...confirmationChecks, fundingReconciled: checked})}
                />
                <Label>Funding reconciliation completed with commissioning body</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={confirmationChecks.retentionPolicyApplied}
                  onCheckedChange={(checked) => setConfirmationChecks({...confirmationChecks, retentionPolicyApplied: checked})}
                />
                <Label>Data retention policy has been applied and documented</Label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={closeCaseMutation.isPending || !allChecksComplete || !formData.closure_outcome || !formData.final_summary || !formData.funding_reconciled}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {closeCaseMutation.isPending ? "Closing Case..." : "Close & Archive Case"}
            </Button>
            {!allChecksComplete && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Complete all mandatory fields and confirmation checks
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}