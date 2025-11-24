import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building, User, Calendar, FileCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function ReferralManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    referral_source: "local_authority",
    referrer_name: "",
    referrer_organization: "",
    referrer_email: "",
    referrer_phone: "",
    client_name: "",
    client_dob: "",
    care_type_required: "residential_care",
    funding_source: "local_authority",
    urgency: "routine",
    referral_reason: "",
    care_needs_summary: "",
    assigned_to: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: referrals = [] } = useQuery({
    queryKey: ['crm-referrals'],
    queryFn: async () => {
      const data = await base44.entities.Referral.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const referralData = {
        ...data,
        referral_number: selectedReferral?.referral_number || `REF-${Date.now()}`,
        status: selectedReferral?.status || "received",
        rag_status: "green",
      };
      
      if (selectedReferral) {
        return base44.entities.Referral.update(selectedReferral.id, referralData);
      }
      return base44.entities.Referral.create(referralData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-referrals'] });
      toast.success("Success", selectedReferral ? "Referral updated" : "Referral created");
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      referral_source: "local_authority",
      referrer_name: "",
      referrer_organization: "",
      referrer_email: "",
      referrer_phone: "",
      client_name: "",
      client_dob: "",
      care_type_required: "residential_care",
      funding_source: "local_authority",
      urgency: "routine",
      referral_reason: "",
      care_needs_summary: "",
      assigned_to: "",
    });
    setSelectedReferral(null);
  };

  const handleEdit = (referral) => {
    setSelectedReferral(referral);
    setFormData({
      referral_source: referral.referral_source,
      referrer_name: referral.referrer_name || "",
      referrer_organization: referral.referrer_organization || "",
      referrer_email: referral.referrer_email || "",
      referrer_phone: referral.referrer_phone || "",
      client_name: referral.client_name,
      client_dob: referral.client_dob || "",
      care_type_required: referral.care_type_required,
      funding_source: referral.funding_source || "local_authority",
      urgency: referral.urgency,
      referral_reason: referral.referral_reason || "",
      care_needs_summary: referral.care_needs_summary || "",
      assigned_to: referral.assigned_to || "",
    });
    setShowDialog(true);
  };

  const filteredReferrals = referrals.filter(r => {
    const matchesSearch = r.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.referrer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ragColors = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };

  const statusColors = {
    received: "bg-blue-100 text-blue-800",
    screening: "bg-purple-100 text-purple-800",
    assessment_pending: "bg-orange-100 text-orange-800",
    assessment_scheduled: "bg-indigo-100 text-indigo-800",
    assessment_complete: "bg-teal-100 text-teal-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    converted: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 flex-1">
          <Input
            placeholder="Search referrals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="screening">Screening</SelectItem>
              <SelectItem value="assessment_pending">Assessment Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Referral
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReferrals.map(referral => (
          <Card key={referral.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{referral.referral_number}</p>
                  <h3 className="font-semibold text-lg">{referral.client_name}</h3>
                  <p className="text-sm text-gray-600">{referral.care_type_required?.replace('_', ' ')}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge className={statusColors[referral.status] || statusColors.received}>
                    {referral.status?.replace('_', ' ')}
                  </Badge>
                  {referral.rag_status && (
                    <Badge className={ragColors[referral.rag_status]}>
                      {referral.rag_status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>{referral.referrer_organization || referral.referrer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{referral.referral_source?.replace('_', ' ')}</span>
                </div>
                {referral.urgency !== "routine" && (
                  <Badge className="bg-red-100 text-red-800">
                    {referral.urgency}
                  </Badge>
                )}
              </div>

              <Button size="sm" variant="outline" onClick={() => handleEdit(referral)} className="w-full">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReferrals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No referrals found</p>
          </CardContent>
        </Card>
      )}

      {showDialog && (
        <Dialog open onOpenChange={() => { setShowDialog(false); resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReferral ? "Edit Referral" : "New Referral"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Referral Source</Label>
                  <Select value={formData.referral_source} onValueChange={(v) => setFormData({...formData, referral_source: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local_authority">Local Authority</SelectItem>
                      <SelectItem value="nhs">NHS</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="gp">GP</SelectItem>
                      <SelectItem value="self_referral">Self Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(v) => setFormData({...formData, urgency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Referrer Name</Label>
                  <Input value={formData.referrer_name} onChange={(e) => setFormData({...formData, referrer_name: e.target.value})} />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input value={formData.referrer_organization} onChange={(e) => setFormData({...formData, referrer_organization: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Referrer Email</Label>
                  <Input type="email" value={formData.referrer_email} onChange={(e) => setFormData({...formData, referrer_email: e.target.value})} />
                </div>
                <div>
                  <Label>Referrer Phone</Label>
                  <Input value={formData.referrer_phone} onChange={(e) => setFormData({...formData, referrer_phone: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.client_dob} onChange={(e) => setFormData({...formData, client_dob: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Care Type Required</Label>
                  <Select value={formData.care_type_required} onValueChange={(v) => setFormData({...formData, care_type_required: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential_care">Residential Care</SelectItem>
                      <SelectItem value="domiciliary_care">Domiciliary Care</SelectItem>
                      <SelectItem value="supported_living">Supported Living</SelectItem>
                      <SelectItem value="day_centre">Day Centre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Funding Source</Label>
                  <Select value={formData.funding_source} onValueChange={(v) => setFormData({...formData, funding_source: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local_authority">Local Authority</SelectItem>
                      <SelectItem value="nhs">NHS</SelectItem>
                      <SelectItem value="self_funded">Self Funded</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Assigned To</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Referral Reason</Label>
                <Textarea 
                  value={formData.referral_reason} 
                  onChange={(e) => setFormData({...formData, referral_reason: e.target.value})}
                  className="h-20"
                />
              </div>

              <div>
                <Label>Care Needs Summary</Label>
                <Textarea 
                  value={formData.care_needs_summary} 
                  onChange={(e) => setFormData({...formData, care_needs_summary: e.target.value})}
                  className="h-20"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.client_name || !formData.care_type_required || saveMutation.isPending}
              >
                {selectedReferral ? "Update" : "Create"} Referral
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}