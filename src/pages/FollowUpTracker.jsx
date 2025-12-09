import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter,
  Phone,
  Mail,
  FileText,
  User,
  Building,
  Calendar,
  Bell
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function FollowUpTracker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['crm-followups'],
    queryFn: async () => {
      const data = await base44.entities.CRMFollowUp.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CRMFollowUp.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
      toast.success("Follow-up Updated", "Status updated successfully");
      setSelectedFollowUp(null);
    },
    onError: () => {
      toast.error("Error", "Failed to update follow-up");
    },
  });

  const filteredFollowUps = followUps.filter(f => {
    const matchesSearch = f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         f.external_contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: followUps.filter(f => f.status === 'pending').length,
    inProgress: followUps.filter(f => f.status === 'in_progress').length,
    awaitingResponse: followUps.filter(f => f.status === 'awaiting_response').length,
    overdue: followUps.filter(f => {
      if (f.status === 'completed') return false;
      if (!f.due_date) return false;
      return new Date(f.due_date) < new Date();
    }).length,
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    awaiting_response: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    overdue: "bg-red-100 text-red-800",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const typeIcons = {
    phone_call: Phone,
    email: Mail,
    document_chase: FileText,
    report_request: FileText,
    information_request: FileText,
    general: Clock,
  };

  if (selectedFollowUp) {
    const assignedStaff = staff.find(s => s.id === selectedFollowUp.assigned_to);
    const isOverdue = selectedFollowUp.due_date && new Date(selectedFollowUp.due_date) < new Date();

    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedFollowUp(null)} className="mb-6">
            ← Back to Follow-ups
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedFollowUp.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColors[selectedFollowUp.status]}>
                {selectedFollowUp.status.replace('_', ' ')}
              </Badge>
              <Badge className={priorityColors[selectedFollowUp.priority]}>
                {selectedFollowUp.priority} priority
              </Badge>
              {isOverdue && <Badge className="bg-red-100 text-red-800">Overdue</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b">
                <CardTitle>Follow-up Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="mb-2 block">Description</Label>
                  <p className="text-gray-700">{selectedFollowUp.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Type</Label>
                    <Badge variant="outline" className="capitalize">
                      {selectedFollowUp.follow_up_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label className="mb-2 block">Due Date</Label>
                    <p className="font-medium">{format(new Date(selectedFollowUp.due_date), 'PPP')}</p>
                  </div>
                </div>

                {selectedFollowUp.recipient_type === 'internal' && assignedStaff && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Label className="mb-2 block">Assigned To</Label>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{assignedStaff.full_name}</span>
                      <span className="text-sm text-gray-500">({assignedStaff.email})</span>
                    </div>
                  </div>
                )}

                {selectedFollowUp.recipient_type === 'external' && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Label className="mb-2 block">External Contact</Label>
                    <div className="space-y-2">
                      <p className="font-medium">{selectedFollowUp.external_contact_name}</p>
                      <p className="text-sm text-gray-600">{selectedFollowUp.external_contact_email}</p>
                      {selectedFollowUp.external_contact_organisation && (
                        <p className="text-sm text-gray-600">{selectedFollowUp.external_contact_organisation}</p>
                      )}
                      <Badge variant="outline">
                        {selectedFollowUp.external_contact_role?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Update Status</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateFollowUpMutation.mutate({ 
                        id: selectedFollowUp.id, 
                        data: { status: 'in_progress' } 
                      })}
                      variant={selectedFollowUp.status === 'in_progress' ? 'default' : 'outline'}
                      size="sm"
                    >
                      In Progress
                    </Button>
                    <Button
                      onClick={() => updateFollowUpMutation.mutate({ 
                        id: selectedFollowUp.id, 
                        data: { status: 'awaiting_response' } 
                      })}
                      variant={selectedFollowUp.status === 'awaiting_response' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Awaiting Response
                    </Button>
                    <Button
                      onClick={() => updateFollowUpMutation.mutate({ 
                        id: selectedFollowUp.id, 
                        data: { 
                          status: 'completed',
                          completed_date: new Date().toISOString()
                        } 
                      })}
                      variant={selectedFollowUp.status === 'completed' ? 'default' : 'outline'}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  </div>
                </div>

                {selectedFollowUp.notes && selectedFollowUp.notes.length > 0 && (
                  <div>
                    <Label className="mb-3 block">Activity Notes</Label>
                    <div className="space-y-2">
                      {selectedFollowUp.notes.map((note, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">{note.date}</span>
                            <span className="text-xs text-gray-500">{note.added_by}</span>
                          </div>
                          <p className="text-sm">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-gray-500 text-xs">{format(new Date(selectedFollowUp.created_date), 'PPP')}</p>
                    </div>
                  </div>
                  {selectedFollowUp.sent_date && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium">Sent</p>
                        <p className="text-gray-500 text-xs">{format(new Date(selectedFollowUp.sent_date), 'PPP')}</p>
                      </div>
                    </div>
                  )}
                  {selectedFollowUp.response_received_date && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <p className="font-medium">Response Received</p>
                        <p className="text-gray-500 text-xs">{format(new Date(selectedFollowUp.response_received_date), 'PPP')}</p>
                      </div>
                    </div>
                  )}
                  {selectedFollowUp.completed_date && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Completed</p>
                        <p className="text-gray-500 text-xs">{format(new Date(selectedFollowUp.completed_date), 'PPP')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isOverdue && selectedFollowUp.status !== 'completed' && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Overdue</p>
                        <p className="text-sm text-red-700">
                          Due {format(new Date(selectedFollowUp.due_date), 'PPP')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Follow-up Tracker</h1>
          <p className="text-gray-500">Track and manage follow-up actions and responses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-gray-600">Awaiting Response</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.awaitingResponse}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search follow-ups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("in_progress")}
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === "awaiting_response" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("awaiting_response")}
                >
                  Awaiting
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filteredFollowUps.map((followUp) => {
            const TypeIcon = typeIcons[followUp.follow_up_type] || Clock;
            const isOverdue = followUp.due_date && new Date(followUp.due_date) < new Date() && followUp.status !== 'completed';
            const assignedStaff = staff.find(s => s.id === followUp.assigned_to);

            return (
              <Card
                key={followUp.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isOverdue ? 'border-red-300 bg-red-50/30' : ''
                }`}
                onClick={() => setSelectedFollowUp(followUp)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{followUp.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{followUp.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className={statusColors[followUp.status]}>
                        {followUp.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={priorityColors[followUp.priority]}>
                        {followUp.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    {followUp.recipient_type === 'internal' && assignedStaff && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{assignedStaff.full_name}</span>
                      </div>
                    )}
                    {followUp.recipient_type === 'external' && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span>{followUp.external_contact_name}</span>
                        {followUp.external_contact_role && (
                          <Badge variant="outline" className="text-xs">
                            {followUp.external_contact_role.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(followUp.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredFollowUps.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No follow-ups found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}