import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

import BulkMessaging from "../components/messaging/BulkMessaging";
import ShiftRequestDialog from "../components/messaging/ShiftRequestDialog";
import { format, parseISO } from "date-fns";

export default function MessagingCenter() {
  const [activeTab, setActiveTab] = useState("requests");
  const [showBulkMessage, setShowBulkMessage] = useState(false);

  const { data: shiftRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['shift-requests'],
    queryFn: async () => {
      const data = await base44.entities.ShiftRequest.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });

  const { data: staffMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['staff-messages'],
    queryFn: async () => {
      const data = await base44.entities.StaffMessage.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const pendingRequests = shiftRequests.filter(r => r && r.status === 'pending').length;
  const unreadMessages = staffMessages.filter(m => 
    m && Array.isArray(m.read_by) && m.read_by.length < m.recipient_ids?.length
  ).length;

  const getCarerName = (carerId) => {
    const carer = Array.isArray(carers) ? carers.find(c => c && c.id === carerId) : null;
    return carer?.full_name || 'Unknown';
  };

  const getClientName = (clientId) => {
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === clientId) : null;
    return client?.full_name || 'Unknown';
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    partially_accepted: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    assigned: "bg-purple-100 text-purple-800"
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Messaging Center</h1>
            <p className="text-gray-500">Send shift requests and bulk messages to your team</p>
          </div>
          <Button
            onClick={() => setShowBulkMessage(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Bulk Message
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setActiveTab("requests")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-gray-600">Pending Requests</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{pendingRequests}</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setActiveTab("messages")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">Unread Messages</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{unreadMessages}</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setShowBulkMessage(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Active Carers</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {carers.filter(c => c && c.status === 'active').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Shift Requests
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Shift Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : shiftRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No shift requests yet</p>
                    <p className="text-sm text-gray-400">
                      Send shift requests from the Schedule page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shiftRequests.map(request => {
                      if (!request) return null;
                      
                      const acceptedCount = Array.isArray(request.responses) 
                        ? request.responses.filter(r => r && r.response === 'accepted').length 
                        : 0;
                      const totalCount = request.carer_ids?.length || 0;

                      return (
                        <Card key={request.id} className="border-l-4 border-blue-400">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">
                                    {getClientName(request.client_id)}
                                  </h3>
                                  <Badge className={statusColors[request.status]}>
                                    {request.status.replace('_', ' ')}
                                  </Badge>
                                  {request.priority !== 'normal' && (
                                    <Badge className={priorityColors[request.priority]}>
                                      {request.priority}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-600 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {request.shift_date && format(parseISO(request.shift_date), 'MMM d, yyyy')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {request.start_time} - {request.end_time}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    {acceptedCount}/{totalCount} accepted
                                  </div>
                                </div>

                                {request.message && (
                                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-3">
                                    {request.message}
                                  </p>
                                )}

                                {Array.isArray(request.responses) && request.responses.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-600">Responses:</p>
                                    {request.responses.map((response, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          response.response === 'accepted' ? 'bg-green-100' :
                                          response.response === 'declined' ? 'bg-red-100' :
                                          'bg-yellow-100'
                                        }`}>
                                          {response.response === 'accepted' ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                          ) : response.response === 'declined' ? (
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                          ) : (
                                            <Clock className="w-4 h-4 text-yellow-600" />
                                          )}
                                        </div>
                                        <span className="font-medium">{getCarerName(response.carer_id)}</span>
                                        <span className="text-gray-500">
                                          {response.response}
                                        </span>
                                        {response.notes && (
                                          <span className="text-gray-400 text-xs">- {response.notes}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-xs text-gray-500 flex items-center justify-between">
                              <span>
                                Created {request.created_date && format(parseISO(request.created_date), 'MMM d, h:mm a')}
                              </span>
                              {request.expires_at && (
                                <span className="text-orange-600">
                                  Expires {format(parseISO(request.expires_at), 'MMM d, h:mm a')}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : staffMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No messages yet</p>
                    <Button onClick={() => setShowBulkMessage(true)}>
                      Send First Message
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffMessages.map(msg => {
                      if (!msg) return null;
                      
                      const readCount = Array.isArray(msg.read_by) ? msg.read_by.length : 0;
                      const totalRecipients = msg.recipient_ids?.length || 0;
                      const ackCount = Array.isArray(msg.acknowledgments) ? msg.acknowledgments.length : 0;

                      return (
                        <Card key={msg.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                                  <Badge variant="outline">{msg.message_type}</Badge>
                                  {msg.priority !== 'normal' && (
                                    <Badge className={priorityColors[msg.priority]}>
                                      {msg.priority}
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-700 mb-3">{msg.message}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    {readCount} read
                                  </div>
                                  {msg.requires_acknowledgment && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <CheckCircle className="w-4 h-4" />
                                      {ackCount} acknowledged
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              From {msg.sender_name} • {msg.created_date && format(parseISO(msg.created_date), 'MMM d, h:mm a')}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showBulkMessage && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Bulk Message</h2>
                <Button variant="ghost" onClick={() => setShowBulkMessage(false)}>
                  Close
                </Button>
              </div>
              <div className="p-4">
                <BulkMessaging carers={carers} onClose={() => setShowBulkMessage(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}