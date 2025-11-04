import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Check, CheckCheck, User, Clock, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MessagingInterface({ messages, clients, staff, isLoading }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ clientId, content }) => {
      // Send message
      const message = await base44.entities.ClientMessage.create({
        client_id: clientId,
        sender_type: "staff",
        sender_id: user.email,
        message_content: content,
        is_read: false,
        status: "responded",
        priority: "normal",
        category: "general_query",
      });

      // Log communication
      await base44.entities.ClientCommunication.create({
        client_id: clientId,
        staff_id: user.email,
        communication_type: "message",
        direction: "outbound",
        subject: "Secure message sent",
        content: content,
        status: "sent",
        priority: "normal",
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
      queryClient.invalidateQueries({ queryKey: ['client-communications'] });
      setMessageContent("");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (messageId) => 
      base44.entities.ClientMessage.update(messageId, {
        is_read: true,
        read_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ messageId, status, staffId }) =>
      base44.entities.ClientMessage.update(messageId, {
        status: status,
        assigned_to_staff_id: staffId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
    },
  });

  const handleSendMessage = () => {
    if (!selectedClient || !messageContent.trim()) return;
    sendMessageMutation.mutate({ 
      clientId: selectedClient, 
      content: messageContent.trim() 
    });
  };

  const filteredMessages = messages.filter(m => {
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const getClientById = (clientId) => clients.find(c => c.id === clientId);
  const getStaffById = (staffId) => staff.find(s => s.id === staffId || s.email === staffId);

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    responded: "bg-green-100 text-green-800",
    resolved: "bg-gray-100 text-gray-800",
    archived: "bg-gray-100 text-gray-600",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Message List */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Client Messages</CardTitle>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No messages found</p>
                </div>
              ) : (
                filteredMessages.map((message) => {
                  const client = getClientById(message.client_id);
                  const sender = message.sender_type === "staff" 
                    ? getStaffById(message.sender_id)
                    : client;

                  return (
                    <div
                      key={message.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !message.is_read && message.sender_type === "client" ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedClient(message.client_id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                            {client?.full_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {client?.full_name || "Unknown Client"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {message.sender_type === "client" ? "From client" : `Staff: ${sender?.full_name || "Unknown"}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xs text-gray-500">
                            {format(parseISO(message.created_date), "MMM d, HH:mm")}
                          </p>
                          <div className="flex gap-1">
                            <Badge className={statusColors[message.status]}>
                              {message.status.replace('_', ' ')}
                            </Badge>
                            {message.priority !== 'normal' && (
                              <Badge className={priorityColors[message.priority]}>
                                {message.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {message.message_content}
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {message.category.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-2">
                          {!message.is_read && message.sender_type === "client" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(message.id);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {message.status === "new" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ 
                                  messageId: message.id, 
                                  status: "in_progress",
                                  staffId: user?.email 
                                });
                              }}
                            >
                              Assign to me
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Message Panel */}
      <div>
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Message
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Client</label>
                <Select value={selectedClient || ""} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {messageContent.length}/500 characters
                </p>
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={!selectedClient || !messageContent.trim() || sendMessageMutation.isPending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>

              {selectedClient && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">Messaging to:</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                      {getClientById(selectedClient)?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">
                        {getClientById(selectedClient)?.full_name}
                      </p>
                      <p className="text-xs text-blue-700">
                        {getClientById(selectedClient)?.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <span className="text-xs font-medium text-blue-900">New Messages</span>
              <span className="text-sm font-bold text-blue-900">
                {messages.filter(m => m.status === 'new').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
              <span className="text-xs font-medium text-yellow-900">In Progress</span>
              <span className="text-sm font-bold text-yellow-900">
                {messages.filter(m => m.status === 'in_progress').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-xs font-medium text-green-900">Responded</span>
              <span className="text-sm font-bold text-green-900">
                {messages.filter(m => m.status === 'responded').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}