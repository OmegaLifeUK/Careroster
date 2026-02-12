import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function ReferralIntakeDialog({ onClose }) {
  const [formData, setFormData] = useState({
    referral_type: "",
    legal_status: "",
    funding_authority: "",
    referral_source: "",
    referral_date: format(new Date(), 'yyyy-MM-dd'),
    social_worker_name: "",
    social_worker_contact: "",
    notes: "",
    is_court_mandated: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate case number
      const caseNumber = `DC-${Date.now()}`;
      
      return await base44.entities.Case.create({
        ...data,
        case_number: caseNumber,
        status: "pending_documentation",
        risk_level: "medium",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success("Referral Created", "Case has been created and is pending documentation");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create referral");
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Referral Intake</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Referral Type *</Label>
              <Select value={formData.referral_type} onValueChange={(val) => setFormData({...formData, referral_type: val})}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="court_directed_public_law">Court Directed - Public Law</SelectItem>
                  <SelectItem value="court_directed_private_law">Court Directed - Private Law</SelectItem>
                  <SelectItem value="child_in_need">Child in Need</SelectItem>
                  <SelectItem value="child_protection">Child Protection</SelectItem>
                  <SelectItem value="early_help">Early Help</SelectItem>
                  <SelectItem value="self_referral">Self Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Legal Status *</Label>
              <Select value={formData.legal_status} onValueChange={(val) => setFormData({...formData, legal_status: val})}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cin">CIN</SelectItem>
                  <SelectItem value="cp">CP</SelectItem>
                  <SelectItem value="lac">LAC</SelectItem>
                  <SelectItem value="care_proceedings">Care Proceedings</SelectItem>
                  <SelectItem value="supervision_order">Supervision Order</SelectItem>
                  <SelectItem value="no_order">No Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Funding Authority</Label>
              <Input
                value={formData.funding_authority}
                onChange={(e) => setFormData({...formData, funding_authority: e.target.value})}
                placeholder="e.g. Essex County Council"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Referral Date *</Label>
              <Input
                type="date"
                value={formData.referral_date}
                onChange={(e) => setFormData({...formData, referral_date: e.target.value})}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label>Referral Source</Label>
            <Input
              value={formData.referral_source}
              onChange={(e) => setFormData({...formData, referral_source: e.target.value})}
              placeholder="e.g. Family Court, Social Services"
              className="mt-2"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Social Worker Name</Label>
              <Input
                value={formData.social_worker_name}
                onChange={(e) => setFormData({...formData, social_worker_name: e.target.value})}
                placeholder="Social worker name"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Social Worker Contact</Label>
              <Input
                value={formData.social_worker_contact}
                onChange={(e) => setFormData({...formData, social_worker_contact: e.target.value})}
                placeholder="Email or phone"
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_court_mandated}
                onChange={(e) => setFormData({...formData, is_court_mandated: e.target.checked})}
                className="rounded"
              />
              Court Mandated Case
            </Label>
          </div>

          <div>
            <Label>Initial Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Initial referral notes..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !formData.referral_type || !formData.legal_status}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Referral"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}