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
import { Plus, Phone, Mail, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, isPast } from "date-fns";

export default function FollowUpManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    follow_up_type: "phone_call",
    related_entity_type: "enquiry",
    related_entity_id: "",
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    due_date: "",
    contact_name: "",
    contact_method: "phone",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: followUps = [] } = useQuery({
    queryKey: ['crm-followups'],
    queryFn: async () => {
      const data = await base44.entities.CRMFollowUp.list();
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
      if (selectedFollowUp) {
        return base44.entities.CRMFollowUp.update(selectedFollowUp.id, data);
      }
      return base44.entities.CRMFollowUp.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Success", selectedFollowUp ? "Follow-up updated" : "Follow-up created");
      setShowDialog(false);
      resetForm();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, outcome }) => {
      await base44.entities.CRMFollowUp.update(id, {
        status: "completed",
        completed_date: new Date().toISOString(),
        outcome: outcome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Completed", "Follow-up marked as complete");
    },
  });

  const resetForm = () => {
    setFormData({
      follow_up_type: "phone_call",
      related_entity_type: "enquiry",
      related_entity_id: "",
      title: "",
      description: "",
      assigned_to: "",
      priority: "medium",
      due_date: "",
      contact_name: "",
      contact_method: "phone",
    });
    setSelectedFollowUp(null);
  };

  const handleEdit = (followUp) => {
    setSelectedFollowUp(followUp);
    setFormData({
      follow_up_type: followUp.follow_up_type,
      related_entity_type: followUp.related_entity_type,
      related_entity_id: followUp.related_entity_id || "",
      title: followUp.title,
      description: followUp.description || "",
      assigned_to: followUp.assigned_to,
      priority: followUp.priority,
      due_date: followUp.due_date?.split('T')[0] || "",
      contact_name: followUp.contact_name || "",
      contact_method: followUp.contact_method || "phone",
    });
    setShowDialog(true);
  };

  const filteredFollowUps = followUps.filter(f => {
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") {
      return f.status !== "completed" && isPast(new Date(f.due_date));
    }
    return f.status === statusFilter;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
  };

  const typeIcons = {
    phone_call: <Phone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    meeting: <Calendar className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Follow-ups</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Follow-up
        </Button>
      </div>

      <div className="space-y-3">
        {filteredFollowUps.map(followUp => {
          const isOverdue = followUp.status !== "completed" && isPast(new Date(followUp.due_date));
          const displayStatus = isOverdue ? "overdue" : followUp.status;
          
          return (
            <Card key={followUp.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {typeIcons[followUp.follow_up_type] || <Calendar className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{followUp.title}</h3>
                      {followUp.description && (
                        <p className="text-sm text-gray-600 mb-2">{followUp.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {followUp.contact_name && (
                          <span>Contact: {followUp.contact_name}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                            Due: {format(new Date(followUp.due_date), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                      {followUp.outcome && (
                        <p className="text-sm mt-2 p-2 bg-green-50 rounded">
                          <span className="font-medium">Outcome:</span> {followUp.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className={statusColors[displayStatus]}>
                      {displayStatus.replace('_', ' ')}
                    </Badge>
                    <Badge className={priorityColors[followUp.priority]}>
                      {followUp.priority}
                    </Badge>
                    {followUp.status !== "completed" && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const outcome = prompt("Enter follow-up outcome:");
                          if (outcome) {
                            completeMutation.mutate({ id: followUp.id, outcome });
                          }
                        }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFollowUps.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No follow-ups found</p>
          </CardContent>
        </Card>
      )}

      {showDialog && (
        <Dialog open onOpenChange={() => { setShowDialog(false); resetForm(); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selectedFollowUp ? "Edit Follow-up" : "New Follow-up"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Follow-up Type</Label>
                  <Select value={formData.follow_up_type} onValueChange={(v) => setFormData({...formData, follow_up_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone_call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="document_chase">Document Chase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
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
                <Label>Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} />
                </div>
                <div>
                  <Label>Contact Method</Label>
                  <Select value={formData.contact_method} onValueChange={(v) => setFormData({...formData, contact_method: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="video_call">Video Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned To *</Label>
                  <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.due_date} 
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.title || !formData.assigned_to || !formData.due_date || saveMutation.isPending}
              >
                {selectedFollowUp ? "Update" : "Create"} Follow-up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}