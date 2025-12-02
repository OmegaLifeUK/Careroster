import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Phone, Mail, Calendar, CheckCircle, Clock, AlertCircle, 
  Bell, Send, FileText, Users, Building, ExternalLink, MessageSquare,
  RefreshCw, AlertTriangle, ChevronDown, ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, isPast, addDays, differenceInDays, isToday } from "date-fns";

export default function FollowUpManager({ clientId, showCreateButton = true }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [expandedId, setExpandedId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    follow_up_type: "document_chase",
    recipient_type: "external",
    related_entity_type: "document",
    related_entity_id: clientId || "",
    title: "",
    description: "",
    assigned_to: "",
    assigned_to_email: "",
    external_contact_name: "",
    external_contact_email: "",
    external_contact_organisation: "",
    external_contact_role: "social_worker",
    priority: "medium",
    due_date: "",
    reminder_days_before: 1,
    escalation_after_days: 3,
    contact_method: "email",
    document_sent_name: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Error loading user:", e);
      }
    };
    loadUser();
  }, []);

  const { data: followUps = [], refetch: refetchFollowUps } = useQuery({
    queryKey: ['crm-followups', clientId],
    queryFn: async () => {
      let data;
      if (clientId) {
        data = await base44.entities.CRMFollowUp.filter({ related_entity_id: clientId });
      } else {
        data = await base44.entities.CRMFollowUp.list('-created_date');
      }
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

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const data = await base44.entities.User.list();
      return Array.isArray(data) ? data : [];
    },
  });

  // Check for overdue items and send alerts
  useEffect(() => {
    const checkAndSendAlerts = async () => {
      const now = new Date();
      
      for (const followUp of followUps) {
        if (followUp.status === 'completed' || followUp.status === 'cancelled') continue;
        
        const dueDate = new Date(followUp.due_date);
        const reminderDate = followUp.reminder_date ? new Date(followUp.reminder_date) : addDays(dueDate, -(followUp.reminder_days_before || 1));
        
        // Check if reminder should be sent
        if (!followUp.reminder_sent && isPast(reminderDate) && !isPast(dueDate)) {
          await sendReminderNotification(followUp);
        }
        
        // Check if overdue alert should be sent
        if (!followUp.overdue_alert_sent && isPast(dueDate)) {
          await sendOverdueAlert(followUp);
        }
        
        // Check if escalation should be sent
        const escalationDate = addDays(dueDate, followUp.escalation_after_days || 3);
        if (!followUp.escalation_sent && isPast(escalationDate)) {
          await sendEscalationAlert(followUp);
        }
      }
    };
    
    if (followUps.length > 0) {
      checkAndSendAlerts();
    }
  }, [followUps]);

  const sendReminderNotification = async (followUp) => {
    try {
      // Send to assigned person
      if (followUp.assigned_to_email) {
        await base44.entities.Notification.create({
          user_email: followUp.assigned_to_email,
          title: `Reminder: ${followUp.title}`,
          message: `This follow-up is due on ${format(new Date(followUp.due_date), 'MMM d, yyyy h:mm a')}. Please take action.`,
          type: "warning",
          is_read: false,
          link: "/CRMDashboard"
        });
      }
      
      // Update follow-up
      await base44.entities.CRMFollowUp.update(followUp.id, {
        reminder_sent: true,
        reminder_sent_date: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
    } catch (e) {
      console.error("Error sending reminder:", e);
    }
  };

  const sendOverdueAlert = async (followUp) => {
    try {
      // Alert the assigned person
      if (followUp.assigned_to_email) {
        await base44.entities.Notification.create({
          user_email: followUp.assigned_to_email,
          title: `OVERDUE: ${followUp.title}`,
          message: `This follow-up was due on ${format(new Date(followUp.due_date), 'MMM d, yyyy')} and has not been completed. Please action immediately.`,
          type: "error",
          is_read: false,
          link: "/CRMDashboard"
        });
      }
      
      // Alert the creator
      if (followUp.created_by_email && followUp.created_by_email !== followUp.assigned_to_email) {
        await base44.entities.Notification.create({
          user_email: followUp.created_by_email,
          title: `Follow-up Overdue: ${followUp.title}`,
          message: `The follow-up you created is now overdue. It was due on ${format(new Date(followUp.due_date), 'MMM d, yyyy')}.`,
          type: "error",
          is_read: false,
          link: "/CRMDashboard"
        });
      }
      
      // Update follow-up status
      await base44.entities.CRMFollowUp.update(followUp.id, {
        status: "overdue",
        overdue_alert_sent: true,
        overdue_alert_sent_date: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
    } catch (e) {
      console.error("Error sending overdue alert:", e);
    }
  };

  const sendEscalationAlert = async (followUp) => {
    try {
      // Send escalation to creator and assigned
      const emails = [followUp.created_by_email, followUp.assigned_to_email].filter(Boolean);
      const uniqueEmails = [...new Set(emails)];
      
      for (const email of uniqueEmails) {
        await base44.entities.Notification.create({
          user_email: email,
          title: `ESCALATION: ${followUp.title}`,
          message: `This follow-up has been overdue for ${followUp.escalation_after_days || 3} days. Immediate action required.`,
          type: "error",
          is_read: false,
          link: "/CRMDashboard"
        });
      }
      
      // Also try to send email
      if (followUp.created_by_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: followUp.created_by_email,
            subject: `ESCALATION: Follow-up Overdue - ${followUp.title}`,
            body: `<h2>Follow-up Escalation Alert</h2>
              <p>The following follow-up has been overdue for ${followUp.escalation_after_days || 3} days and requires immediate attention:</p>
              <p><strong>Title:</strong> ${followUp.title}</p>
              <p><strong>Due Date:</strong> ${format(new Date(followUp.due_date), 'MMM d, yyyy')}</p>
              <p><strong>Description:</strong> ${followUp.description || 'N/A'}</p>
              <p>Please log in to address this immediately.</p>`
          });
        } catch (emailError) {
          console.log("Email send failed:", emailError);
        }
      }
      
      await base44.entities.CRMFollowUp.update(followUp.id, {
        escalation_sent: true
      });
      
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
    } catch (e) {
      console.error("Error sending escalation:", e);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const saveData = {
        ...data,
        created_by_email: currentUser?.email,
        created_by_staff_id: currentUser?.id,
        reminder_date: data.due_date ? addDays(new Date(data.due_date), -(data.reminder_days_before || 1)).toISOString() : null,
      };
      
      if (selectedFollowUp) {
        return base44.entities.CRMFollowUp.update(selectedFollowUp.id, saveData);
      }
      return base44.entities.CRMFollowUp.create(saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Success", selectedFollowUp ? "Follow-up updated" : "Follow-up created");
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error", "Failed to save follow-up");
    }
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, outcome }) => {
      await base44.entities.CRMFollowUp.update(id, {
        status: "completed",
        completed_date: new Date().toISOString(),
        response_received: true,
        response_received_date: new Date().toISOString(),
        outcome: outcome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Completed", "Follow-up marked as complete");
    },
  });

  const markSentMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.CRMFollowUp.update(id, {
        status: "awaiting_response",
        sent_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Updated", "Marked as sent");
    },
  });

  const sendManualReminder = async (followUp) => {
    try {
      // Send notification
      if (followUp.assigned_to_email) {
        await base44.entities.Notification.create({
          user_email: followUp.assigned_to_email,
          title: `Reminder: ${followUp.title}`,
          message: `Please complete this follow-up. Due: ${format(new Date(followUp.due_date), 'MMM d, yyyy h:mm a')}`,
          type: "warning",
          is_read: false,
          link: "/CRMDashboard"
        });
      }
      
      // Try to send email
      const recipientEmail = followUp.recipient_type === 'external' 
        ? followUp.external_contact_email 
        : followUp.assigned_to_email;
        
      if (recipientEmail) {
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `Reminder: ${followUp.title}`,
          body: `<h2>Follow-up Reminder</h2>
            <p>This is a reminder regarding: <strong>${followUp.title}</strong></p>
            <p>${followUp.description || ''}</p>
            <p><strong>Due Date:</strong> ${format(new Date(followUp.due_date), 'MMMM d, yyyy')}</p>
            <p>Please respond at your earliest convenience.</p>`
        });
        toast.success("Sent", "Reminder email sent successfully");
      } else {
        toast.success("Sent", "Notification sent");
      }
    } catch (e) {
      toast.error("Error", "Failed to send reminder");
    }
  };

  const resetForm = () => {
    setFormData({
      follow_up_type: "document_chase",
      recipient_type: "external",
      related_entity_type: "document",
      related_entity_id: clientId || "",
      title: "",
      description: "",
      assigned_to: "",
      assigned_to_email: "",
      external_contact_name: "",
      external_contact_email: "",
      external_contact_organisation: "",
      external_contact_role: "social_worker",
      priority: "medium",
      due_date: "",
      reminder_days_before: 1,
      escalation_after_days: 3,
      contact_method: "email",
      document_sent_name: "",
    });
    setSelectedFollowUp(null);
  };

  const handleEdit = (followUp) => {
    setSelectedFollowUp(followUp);
    setFormData({
      follow_up_type: followUp.follow_up_type,
      recipient_type: followUp.recipient_type || "internal",
      related_entity_type: followUp.related_entity_type || "document",
      related_entity_id: followUp.related_entity_id || "",
      title: followUp.title,
      description: followUp.description || "",
      assigned_to: followUp.assigned_to || "",
      assigned_to_email: followUp.assigned_to_email || "",
      external_contact_name: followUp.external_contact_name || "",
      external_contact_email: followUp.external_contact_email || "",
      external_contact_organisation: followUp.external_contact_organisation || "",
      external_contact_role: followUp.external_contact_role || "social_worker",
      priority: followUp.priority,
      due_date: followUp.due_date?.slice(0, 16) || "",
      reminder_days_before: followUp.reminder_days_before || 1,
      escalation_after_days: followUp.escalation_after_days || 3,
      contact_method: followUp.contact_method || "email",
      document_sent_name: followUp.document_sent_name || "",
    });
    setShowDialog(true);
  };

  const handleStaffSelect = (staffId) => {
    const selectedStaff = staff.find(s => s.id === staffId);
    const userMatch = users.find(u => u.email === selectedStaff?.email);
    setFormData({
      ...formData,
      assigned_to: staffId,
      assigned_to_email: selectedStaff?.email || userMatch?.email || ""
    });
  };

  const filteredFollowUps = followUps.filter(f => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return !['completed', 'cancelled'].includes(f.status);
    }
    if (statusFilter === "overdue") {
      return f.status !== "completed" && f.status !== "cancelled" && isPast(new Date(f.due_date));
    }
    if (statusFilter === "awaiting") {
      return f.status === "awaiting_response";
    }
    return f.status === statusFilter;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const stats = {
    total: followUps.filter(f => !['completed', 'cancelled'].includes(f.status)).length,
    overdue: followUps.filter(f => !['completed', 'cancelled'].includes(f.status) && isPast(new Date(f.due_date))).length,
    dueToday: followUps.filter(f => !['completed', 'cancelled'].includes(f.status) && isToday(new Date(f.due_date))).length,
    awaiting: followUps.filter(f => f.status === 'awaiting_response').length,
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    awaiting_response: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-500",
  };

  const typeIcons = {
    phone_call: <Phone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    meeting: <Calendar className="w-4 h-4" />,
    document_chase: <FileText className="w-4 h-4" />,
    report_request: <FileText className="w-4 h-4" />,
    information_request: <MessageSquare className="w-4 h-4" />,
    internal_task: <Users className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-sm text-blue-600">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-sm text-red-600">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{stats.dueToday}</p>
            <p className="text-sm text-amber-600">Due Today</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">{stats.awaiting}</p>
            <p className="text-sm text-purple-600">Awaiting Response</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Follow-ups</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="awaiting">Awaiting Response</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetchFollowUps()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {showCreateButton && (
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Follow-up
          </Button>
        )}
      </div>

      {/* Follow-up List */}
      <div className="space-y-3">
        {filteredFollowUps.map(followUp => {
          const isOverdue = !['completed', 'cancelled'].includes(followUp.status) && isPast(new Date(followUp.due_date));
          const displayStatus = isOverdue ? "overdue" : followUp.status;
          const daysOverdue = isOverdue ? differenceInDays(new Date(), new Date(followUp.due_date)) : 0;
          const isExpanded = expandedId === followUp.id;
          const assignedStaff = staff.find(s => s.id === followUp.assigned_to);
          
          return (
            <Card 
              key={followUp.id} 
              className={`transition-all ${isOverdue ? 'border-red-300 bg-red-50/50' : 'hover:shadow-md'}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button onClick={() => setExpandedId(isExpanded ? null : followUp.id)} className="mt-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="mt-1 text-gray-500">
                      {typeIcons[followUp.follow_up_type] || <Calendar className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{followUp.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {followUp.recipient_type === 'external' ? <ExternalLink className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                          {followUp.recipient_type}
                        </Badge>
                      </div>
                      
                      {followUp.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{followUp.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                        {followUp.recipient_type === 'external' && followUp.external_contact_name && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {followUp.external_contact_name}
                            {followUp.external_contact_organisation && ` (${followUp.external_contact_organisation})`}
                          </span>
                        )}
                        {followUp.recipient_type === 'internal' && assignedStaff && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {assignedStaff.full_name}
                          </span>
                        )}
                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                          <Clock className="w-3 h-3" />
                          Due: {format(new Date(followUp.due_date), 'MMM d, yyyy h:mm a')}
                          {isOverdue && <span className="text-red-600">({daysOverdue} days overdue)</span>}
                        </div>
                      </div>
                      
                      {/* Alert indicators */}
                      <div className="flex items-center gap-2 mt-2">
                        {followUp.reminder_sent && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            <Bell className="w-3 h-3 mr-1" /> Reminder sent
                          </Badge>
                        )}
                        {followUp.overdue_alert_sent && (
                          <Badge variant="outline" className="text-xs bg-red-50">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue alert sent
                          </Badge>
                        )}
                        {followUp.escalation_sent && (
                          <Badge className="text-xs bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" /> Escalated
                          </Badge>
                        )}
                        {followUp.sent_date && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            <Send className="w-3 h-3 mr-1" /> Sent {format(new Date(followUp.sent_date), 'MMM d')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end ml-4">
                    <Badge className={statusColors[displayStatus]}>
                      {displayStatus.replace('_', ' ')}
                    </Badge>
                    <Badge className={priorityColors[followUp.priority]}>
                      {followUp.priority}
                    </Badge>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Created by</p>
                        <p className="font-medium">{followUp.created_by_email || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Reminder</p>
                        <p className="font-medium">{followUp.reminder_days_before || 1} day(s) before</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Escalation</p>
                        <p className="font-medium">{followUp.escalation_after_days || 3} day(s) after due</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Contact Method</p>
                        <p className="font-medium capitalize">{followUp.contact_method || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {followUp.outcome && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Outcome:</p>
                        <p className="text-sm text-green-700">{followUp.outcome}</p>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {followUp.status !== "completed" && followUp.status !== "cancelled" && (
                        <>
                          {!followUp.sent_date && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markSentMutation.mutate(followUp.id)}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Mark as Sent
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => sendManualReminder(followUp)}
                          >
                            <Bell className="w-3 h-3 mr-1" />
                            Send Reminder
                          </Button>
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
                        </>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(followUp)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFollowUps.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No follow-ups found</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <Dialog open onOpenChange={() => { setShowDialog(false); resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedFollowUp ? "Edit Follow-up" : "Create Follow-up"}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="recipient">Recipient</TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Follow-up Type *</Label>
                    <Select value={formData.follow_up_type} onValueChange={(v) => setFormData({...formData, follow_up_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document_chase">Document Chase</SelectItem>
                        <SelectItem value="report_request">Report/Assessment Request</SelectItem>
                        <SelectItem value="information_request">Information Request</SelectItem>
                        <SelectItem value="internal_task">Internal Task</SelectItem>
                        <SelectItem value="phone_call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
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
                  <Input 
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    placeholder="e.g., Chase assessment report from Social Worker"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Details about what needs to be done or what was sent..."
                    className="h-24"
                  />
                </div>
                
                <div>
                  <Label>Document/Report Name (if applicable)</Label>
                  <Input 
                    value={formData.document_sent_name} 
                    onChange={(e) => setFormData({...formData, document_sent_name: e.target.value})}
                    placeholder="e.g., Care Assessment Form v2"
                  />
                </div>

                <div>
                  <Label>Due Date & Time *</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.due_date} 
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="recipient" className="space-y-4 mt-4">
                <div>
                  <Label>Recipient Type</Label>
                  <Select value={formData.recipient_type} onValueChange={(v) => setFormData({...formData, recipient_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal (Staff/Colleague)</SelectItem>
                      <SelectItem value="external">External (Social Worker, GP, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recipient_type === 'internal' ? (
                  <div>
                    <Label>Assign To Staff Member *</Label>
                    <Select value={formData.assigned_to} onValueChange={handleStaffSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.assigned_to_email && (
                      <p className="text-xs text-gray-500 mt-1">Email: {formData.assigned_to_email}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contact Name *</Label>
                        <Input 
                          value={formData.external_contact_name} 
                          onChange={(e) => setFormData({...formData, external_contact_name: e.target.value})}
                          placeholder="e.g., Jane Smith"
                        />
                      </div>
                      <div>
                        <Label>Contact Role</Label>
                        <Select value={formData.external_contact_role} onValueChange={(v) => setFormData({...formData, external_contact_role: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="social_worker">Social Worker</SelectItem>
                            <SelectItem value="gp">GP</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="therapist">Therapist</SelectItem>
                            <SelectItem value="family_member">Family Member</SelectItem>
                            <SelectItem value="local_authority">Local Authority</SelectItem>
                            <SelectItem value="nhs">NHS</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input 
                        type="email"
                        value={formData.external_contact_email} 
                        onChange={(e) => setFormData({...formData, external_contact_email: e.target.value})}
                        placeholder="jane.smith@council.gov.uk"
                      />
                    </div>
                    <div>
                      <Label>Organisation</Label>
                      <Input 
                        value={formData.external_contact_organisation} 
                        onChange={(e) => setFormData({...formData, external_contact_organisation: e.target.value})}
                        placeholder="e.g., Local Authority Adult Social Care"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Preferred Contact Method</Label>
                  <Select value={formData.contact_method} onValueChange={(v) => setFormData({...formData, contact_method: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="video_call">Video Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="reminders" className="space-y-4 mt-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Automatic Reminders & Alerts
                    </h4>
                    <p className="text-sm text-blue-700">
                      The system will automatically send reminders and alerts based on your settings below.
                    </p>
                  </CardContent>
                </Card>

                <div>
                  <Label>Send Reminder Before Due Date</Label>
                  <Select 
                    value={String(formData.reminder_days_before)} 
                    onValueChange={(v) => setFormData({...formData, reminder_days_before: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">On due date</SelectItem>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="2">2 days before</SelectItem>
                      <SelectItem value="3">3 days before</SelectItem>
                      <SelectItem value="5">5 days before</SelectItem>
                      <SelectItem value="7">1 week before</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    A reminder notification will be sent to the assigned person
                  </p>
                </div>

                <div>
                  <Label>Escalate If Overdue By</Label>
                  <Select 
                    value={String(formData.escalation_after_days)} 
                    onValueChange={(v) => setFormData({...formData, escalation_after_days: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    An escalation alert will be sent to both you and the assigned person
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-2">Alert Sequence:</h4>
                  <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                    <li>Reminder sent {formData.reminder_days_before || 1} day(s) before due date</li>
                    <li>Overdue alert sent on due date if not completed</li>
                    <li>Escalation sent {formData.escalation_after_days || 3} days after due date</li>
                  </ol>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.title || !formData.due_date || saveMutation.isPending}
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