import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Phone, Mail, Calendar, User, FileText, Send } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function EnquiryManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    enquiry_type: "new_client",
    enquiry_source: "phone",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    relationship_to_client: "self",
    potential_client_name: "",
    care_type_needed: "residential_care",
    urgency: "medium",
    enquiry_details: "",
    assigned_to: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: enquiries = [] } = useQuery({
    queryKey: ['crm-enquiries'],
    queryFn: async () => {
      const data = await base44.entities.ClientEnquiry.list();
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
      if (selectedEnquiry) {
        return base44.entities.ClientEnquiry.update(selectedEnquiry.id, data);
      }
      return base44.entities.ClientEnquiry.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-enquiries'] });
      toast.success("Success", selectedEnquiry ? "Enquiry updated" : "Enquiry created");
      setShowDialog(false);
      resetForm();
    },
  });

  const sendFormsMutation = useMutation({
    mutationFn: async (enquiryId) => {
      const enquiry = enquiries.find(e => e.id === enquiryId);
      
      // Create document tracking record
      await base44.entities.CRMDocument.create({
        document_type: "intake_form",
        document_name: "Initial Assessment Form",
        related_entity_type: "enquiry",
        related_entity_id: enquiryId,
        recipient_name: enquiry.contact_name,
        recipient_email: enquiry.contact_email,
        status: "sent",
        sent_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assigned_to: enquiry.assigned_to,
        rag_status: "green",
      });

      // Send email
      await base44.integrations.Core.SendEmail({
        to: enquiry.contact_email,
        subject: "Care Assessment Forms - Action Required",
        body: `Dear ${enquiry.contact_name},

Thank you for your enquiry about our care services.

To proceed with your assessment, please complete the attached forms at your earliest convenience. These forms help us understand the care needs and create a personalized care plan.

Please complete within 7 days to ensure a smooth onboarding process.

If you have any questions, please don't hesitate to contact us.

Best regards,
Care Team`,
      });

      // Update enquiry status
      await base44.entities.ClientEnquiry.update(enquiryId, {
        status: "forms_sent",
        forms_sent_date: new Date().toISOString(),
        rag_status: "green",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['crm-documents'] });
      toast.success("Forms Sent", "Assessment forms sent to enquirer");
    },
  });

  const resetForm = () => {
    setFormData({
      enquiry_type: "new_client",
      enquiry_source: "phone",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      relationship_to_client: "self",
      potential_client_name: "",
      care_type_needed: "residential_care",
      urgency: "medium",
      enquiry_details: "",
      assigned_to: "",
    });
    setSelectedEnquiry(null);
  };

  const handleEdit = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setFormData({
      enquiry_type: enquiry.enquiry_type,
      enquiry_source: enquiry.enquiry_source,
      contact_name: enquiry.contact_name,
      contact_email: enquiry.contact_email || "",
      contact_phone: enquiry.contact_phone || "",
      relationship_to_client: enquiry.relationship_to_client,
      potential_client_name: enquiry.potential_client_name || "",
      care_type_needed: enquiry.care_type_needed,
      urgency: enquiry.urgency,
      enquiry_details: enquiry.enquiry_details,
      assigned_to: enquiry.assigned_to || "",
    });
    setShowDialog(true);
  };

  const filteredEnquiries = enquiries.filter(e => {
    const matchesSearch = e.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         e.potential_client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ragColors = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-purple-100 text-purple-800",
    forms_sent: "bg-indigo-100 text-indigo-800",
    forms_pending: "bg-orange-100 text-orange-800",
    referral_created: "bg-green-100 text-green-800",
    converted: "bg-emerald-100 text-emerald-800",
    not_suitable: "bg-gray-100 text-gray-800",
    closed: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 flex-1">
          <Input
            placeholder="Search enquiries..."
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
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="forms_sent">Forms Sent</SelectItem>
              <SelectItem value="forms_pending">Forms Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Enquiry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEnquiries.map(enquiry => (
          <Card key={enquiry.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{enquiry.contact_name}</h3>
                  <p className="text-sm text-gray-600">{enquiry.care_type_needed?.replace('_', ' ')}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge className={statusColors[enquiry.status] || statusColors.new}>
                    {enquiry.status?.replace('_', ' ')}
                  </Badge>
                  {enquiry.rag_status && (
                    <Badge className={ragColors[enquiry.rag_status]}>
                      {enquiry.rag_status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {enquiry.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{enquiry.contact_phone}</span>
                  </div>
                )}
                {enquiry.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{enquiry.contact_email}</span>
                  </div>
                )}
                {enquiry.potential_client_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>For: {enquiry.potential_client_name}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(enquiry)} className="flex-1">
                  View Details
                </Button>
                {enquiry.status === "contacted" && enquiry.contact_email && (
                  <Button 
                    size="sm" 
                    onClick={() => sendFormsMutation.mutate(enquiry.id)}
                    disabled={sendFormsMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Send Forms
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEnquiries.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No enquiries found</p>
          </CardContent>
        </Card>
      )}

      {showDialog && (
        <Dialog open onOpenChange={() => { setShowDialog(false); resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEnquiry ? "Edit Enquiry" : "New Enquiry"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Enquiry Type</Label>
                  <Select value={formData.enquiry_type} onValueChange={(v) => setFormData({...formData, enquiry_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_client">New Client</SelectItem>
                      <SelectItem value="service_enquiry">Service Enquiry</SelectItem>
                      <SelectItem value="general_enquiry">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={formData.enquiry_source} onValueChange={(v) => setFormData({...formData, enquiry_source: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Contact Name *</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Email</Label>
                  <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Relationship to Client</Label>
                  <Select value={formData.relationship_to_client} onValueChange={(v) => setFormData({...formData, relationship_to_client: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="social_worker">Social Worker</SelectItem>
                      <SelectItem value="healthcare_professional">Healthcare Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Potential Client Name</Label>
                  <Input value={formData.potential_client_name} onChange={(e) => setFormData({...formData, potential_client_name: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Care Type Needed</Label>
                  <Select value={formData.care_type_needed} onValueChange={(v) => setFormData({...formData, care_type_needed: v})}>
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
                  <Label>Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(v) => setFormData({...formData, urgency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
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
                <Label>Enquiry Details *</Label>
                <Textarea 
                  value={formData.enquiry_details} 
                  onChange={(e) => setFormData({...formData, enquiry_details: e.target.value})}
                  className="h-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.contact_name || !formData.enquiry_details || saveMutation.isPending}
              >
                {selectedEnquiry ? "Update" : "Create"} Enquiry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}