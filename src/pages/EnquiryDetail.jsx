import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { 
  ArrowLeft, UserPlus, ClipboardList, Calendar, 
  FileText, CheckCircle2, History, Send, Eye
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function EnquiryDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const enquiryId = new URLSearchParams(location.search).get('id');
  
  const [selectedTasks, setSelectedTasks] = useState([]);

  const { data: enquiry, isLoading } = useQuery({
    queryKey: ['enquiry', enquiryId],
    queryFn: async () => {
      const all = await base44.entities.ClientEnquiry.list();
      return all.find(e => e.id === enquiryId);
    },
    enabled: !!enquiryId
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ['enquiry-followups', enquiryId],
    queryFn: async () => {
      const all = await base44.entities.CRMFollowUp.filter({
        related_entity_type: 'enquiry',
        related_entity_id: enquiryId
      });
      return all || [];
    },
    enabled: !!enquiryId
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['enquiry-activity', enquiryId],
    queryFn: async () => {
      return enquiry?.notes || [];
    },
    enabled: !!enquiry
  });

  const updateEnquiryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientEnquiry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
      toast.success("Updated", "Enquiry updated successfully");
    }
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CRMFollowUp.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiry-followups'] });
    }
  });

  const convertToClientMutation = useMutation({
    mutationFn: async () => {
      const clientData = {
        full_name: enquiry.potential_client_name || enquiry.contact_name,
        status: 'active',
        care_needs: [enquiry.care_type_needed],
        emergency_contact: {
          name: enquiry.contact_name,
          phone: enquiry.contact_phone,
          relationship: enquiry.relationship_to_client
        }
      };
      
      const client = await base44.entities.Client.create(clientData);
      
      await base44.entities.ClientEnquiry.update(enquiry.id, {
        status: 'converted',
        converted_to_client_id: client.id
      });
      
      return client;
    },
    onSuccess: (client) => {
      toast.success("Converted", "Enquiry converted to client successfully");
      navigate(createPageUrl('Clients'));
    }
  });

  const handleTaskToggle = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleCompleteSelected = async () => {
    for (const taskId of selectedTasks) {
      await updateFollowUpMutation.mutateAsync({
        id: taskId,
        data: { 
          status: 'completed',
          completed_date: new Date().toISOString()
        }
      });
    }
    setSelectedTasks([]);
    toast.success("Completed", `${selectedTasks.length} tasks marked complete`);
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      forms_sent: 'bg-purple-100 text-purple-800',
      forms_pending: 'bg-orange-100 text-orange-800',
      referral_created: 'bg-indigo-100 text-indigo-800',
      converted: 'bg-green-100 text-green-800',
      not_suitable: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getProgressPercentage = () => {
    if (!enquiry) return 0;
    const statuses = ['new', 'contacted', 'forms_sent', 'forms_pending', 'referral_created', 'converted'];
    const currentIndex = statuses.indexOf(enquiry.status);
    return ((currentIndex + 1) / statuses.length) * 100;
  };

  if (isLoading || !enquiry) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">Loading enquiry details...</p>
      </div>
    );
  }

  const pendingTasks = followUps.filter(f => f.status !== 'completed');
  const completedTasks = followUps.filter(f => f.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('CRMDashboard'))}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Enquiries
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('CRMDashboard'))}
              >
                <History className="w-4 h-4 mr-2" />
                Audit Log
              </Button>
              <Button
                onClick={() => convertToClientMutation.mutate()}
                disabled={enquiry.status === 'converted' || convertToClientMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Convert to Client
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Enquiry: {enquiry.potential_client_name || enquiry.contact_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(enquiry.status)}>
                  {enquiry.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {enquiry.enquiry_type.replace(/_/g, ' ')}
                </Badge>
                <span className="text-sm text-gray-500">
                  Created {format(new Date(enquiry.created_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks
              {pendingTasks.length > 0 && (
                <Badge className="ml-2 bg-orange-500">{pendingTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Name</label>
                  <p className="text-gray-900 mt-1">{enquiry.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Relationship</label>
                  <p className="text-gray-900 mt-1 capitalize">
                    {enquiry.relationship_to_client?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 mt-1">{enquiry.contact_email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900 mt-1">{enquiry.contact_phone || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Care Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Care Type Needed</label>
                  <p className="text-gray-900 mt-1 capitalize">
                    {enquiry.care_type_needed?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Urgency</label>
                  <Badge className={
                    enquiry.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                    enquiry.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                    enquiry.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {enquiry.urgency}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Enquiry Details</label>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                    {enquiry.enquiry_details || 'No details provided'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    Enquiry Tasks
                  </CardTitle>
                  <div className="flex gap-2">
                    <span className="text-sm text-gray-500">
                      {selectedTasks.length} selected
                    </span>
                    <Button
                      size="sm"
                      onClick={handleCompleteSelected}
                      disabled={selectedTasks.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Complete Selected
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No tasks yet. Tasks will appear as the enquiry progresses.
                    </p>
                  ) : (
                    <>
                      {pendingTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedTasks.includes(task.id)}
                            onCheckedChange={() => handleTaskToggle(task.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-600">{task.description}</p>
                            {task.due_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {format(new Date(task.due_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                      
                      {completedTasks.length > 0 && (
                        <>
                          <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Completed</p>
                          </div>
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 opacity-60"
                            >
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 line-through">{task.title}</p>
                                <p className="text-sm text-gray-600">{task.description}</p>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLog.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No activities recorded</p>
                ) : (
                  <div className="space-y-3">
                    {activityLog.map((note, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="text-gray-900">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.created_by} • {note.created_date}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Enquiry Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-8 space-y-6">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  <div className="relative">
                    <div className="absolute -left-6 w-4 h-4 rounded-full bg-blue-500" />
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-medium">Enquiry Created</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(enquiry.created_date), 'PPP p')}
                      </p>
                    </div>
                  </div>

                  {enquiry.forms_sent_date && (
                    <div className="relative">
                      <div className="absolute -left-6 w-4 h-4 rounded-full bg-purple-500" />
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="font-medium">Forms Sent</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(enquiry.forms_sent_date), 'PPP p')}
                        </p>
                      </div>
                    </div>
                  )}

                  {enquiry.forms_completed_date && (
                    <div className="relative">
                      <div className="absolute -left-6 w-4 h-4 rounded-full bg-green-500" />
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium">Forms Completed</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(enquiry.forms_completed_date), 'PPP p')}
                        </p>
                      </div>
                    </div>
                  )}

                  {enquiry.status === 'converted' && (
                    <div className="relative">
                      <div className="absolute -left-6 w-4 h-4 rounded-full bg-emerald-500" />
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="font-medium">Converted to Client</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(enquiry.updated_date), 'PPP p')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}