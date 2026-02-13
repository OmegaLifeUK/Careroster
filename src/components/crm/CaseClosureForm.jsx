import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function CaseClosureForm({ caseData, onClose }) {
  const [formData, setFormData] = useState({
    closure_reason: "",
    closure_outcome: "",
    final_summary: "",
    funding_reconciliation_complete: false,
    funding_reconciliation_notes: "",
    data_retention_period_years: "7",
    archive_date: "",
  });

  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const closeCaseMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Update case
      await base44.entities.Case.update(caseData.id, {
        status: 'closed',
        closure_date: format(new Date(), 'yyyy-MM-dd'),
        closure_reason: data.closure_reason,
        closure_outcome: data.closure_outcome,
        audit_locked: true, // Lock case on closure
      });

      // Create closure document
      await base44.entities.CaseDocument.create({
        case_id: caseData.id,
        document_type: 'closure_summary',
        document_name: `Case Closure Summary - ${caseData.case_number}`,
        status: 'reviewed',
        reviewed_by: user.full_name,
        reviewed_date: format(new Date(), 'yyyy-MM-dd'),
        sensitivity_level: 'confidential',
        notes: JSON.stringify({
          final_summary: data.final_summary,
          funding_reconciliation_complete: data.funding_reconciliation_complete,
          funding_reconciliation_notes: data.funding_reconciliation_notes,
          data_retention_period_years: data.data_retention_period_years,
          archive_date: data.archive_date,
          closed_by: user.full_name,
          closed_date: new Date().toISOString(),
        }),
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success("Case Closed", "Case has been closed and archived according to retention policy");
      if (onClose) onClose();
    },
    onError: () => {
      toast.error("Error", "Failed to close case");
    }
  });

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.closure_reason) {
      newErrors.closure_reason = "Closure reason is required";
    }
    if (!formData.closure_outcome) {
      newErrors.closure_outcome = "Outcome category is required";
    }
    if (!formData.final_summary || formData.final_summary.length < 100) {
      newErrors.final_summary = "Final summary must be at least 100 characters";
    }
    if (!formData.funding_reconciliation_complete) {
      newErrors.funding_reconciliation = "Funding reconciliation must be confirmed";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Calculate archive date
      const archiveDate = new Date();
      archiveDate.setFullYear(archiveDate.getFullYear() + parseInt(formData.data_retention_period_years));
      
      closeCaseMutation.mutate({
        ...formData,
        archive_date: format(archiveDate, 'yyyy-MM-dd'),
      });
    }
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Archive className="w-5 h-5" />
          Case Closure & Archiving
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded mb-4">
          <p className="text-sm font-medium text-orange-900">Important: Case Closure</p>
          <p className="text-sm text-orange-800 mt-1">
            This action will close the case, trigger audit lock, and set data retention schedule. This cannot be undone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Case Information */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p><span className="font-medium">Case:</span> {caseData.case_number}</p>
            <p><span className="font-medium">Status:</span> {caseData.status?.replace(/_/g, ' ')}</p>
            <p><span className="font-medium">Opened:</span> {format(new Date(caseData.referral_date || caseData.created_date), 'MMM d, yyyy')}</p>
          </div>

          {/* Closure Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Closure Reason *
            </label>
            <Textarea
              value={formData.closure_reason}
              onChange={(e) => setFormData({...formData, closure_reason: e.target.value})}
              placeholder="Detailed reason for case closure..."
              rows={3}
              className={errors.closure_reason ? 'border-red-500' : ''}
            />
            {errors.closure_reason && (
              <p className="text-sm text-red-600 mt-1">{errors.closure_reason}</p>
            )}
          </div>

          {/* Outcome Category */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Outcome Category *
            </label>
            <Select 
              value={formData.closure_outcome} 
              onValueChange={(val) => setFormData({...formData, closure_outcome: val})}
            >
              <SelectTrigger className={errors.closure_outcome ? 'border-red-500' : ''}>
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
            {errors.closure_outcome && (
              <p className="text-sm text-red-600 mt-1">{errors.closure_outcome}</p>
            )}
          </div>

          {/* Final Summary */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Final Summary * (minimum 100 characters)
            </label>
            <Textarea
              value={formData.final_summary}
              onChange={(e) => setFormData({...formData, final_summary: e.target.value})}
              placeholder="Comprehensive summary of case journey, outcomes achieved, key sessions, and final status..."
              rows={6}
              className={errors.final_summary ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-600 mt-1">
              {formData.final_summary.length} / 100 characters minimum
            </p>
            {errors.final_summary && (
              <p className="text-sm text-red-600 mt-1">{errors.final_summary}</p>
            )}
          </div>

          {/* Funding Reconciliation */}
          <div className="p-4 border rounded-lg space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={formData.funding_reconciliation_complete}
                onChange={(e) => setFormData({...formData, funding_reconciliation_complete: e.target.checked})}
                className="rounded"
              />
              Funding Reconciliation Complete *
            </label>
            {errors.funding_reconciliation && (
              <p className="text-sm text-red-600">{errors.funding_reconciliation}</p>
            )}
            
            <Textarea
              value={formData.funding_reconciliation_notes}
              onChange={(e) => setFormData({...formData, funding_reconciliation_notes: e.target.value})}
              placeholder="Funding reconciliation notes (invoices, payments, outstanding amounts)..."
              rows={3}
            />
          </div>

          {/* Data Retention Policy */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Data Retention Period *
            </label>
            <Select 
              value={formData.data_retention_period_years} 
              onValueChange={(val) => setFormData({...formData, data_retention_period_years: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="7">7 Years (Standard)</SelectItem>
                <SelectItem value="10">10 Years</SelectItem>
                <SelectItem value="25">25 Years (Safeguarding)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-1">
              Case will be eligible for archiving on: {format(
                new Date(Date.now() + parseInt(formData.data_retention_period_years) * 365 * 24 * 60 * 60 * 1000),
                'MMM d, yyyy'
              )}
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={closeCaseMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Close Case & Archive
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}