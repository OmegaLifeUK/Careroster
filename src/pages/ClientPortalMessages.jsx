import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ClientPortalMessages() {
  const [user, setUser] = useState(null);
  const [portalAccess, setPortalAccess] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: "",
    message_content: "",
    category: "general",
    priority: "normal",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUserAndAccess = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        const allAccess = await base44.entities.ClientPortalAccess.list();
        const userAccess = allAccess.find(a => 
          a.user_email === userData.email && a.is_active
        );
        setPortalAccess(userAccess);
      } catch (error) {
        console.error("Error loading portal access:", error);
      }
    };
    loadUserAndAccess();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-messages', portalAccess?.client_id],
    queryFn: async () => {
      if (!portalAccess) return [];
      return base44.entities.ClientPortalMessage.filter(
        { client_id: portalAccess.client_id },
        '-created_date'
      );
    },
    enabled: !!portalAccess,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return base44.entities.ClientPortalMessage.create({
        ...messageData,
        client_id: portalAccess.client_id,
        sender_type: 'family',
        sender_id: portalAccess.id,
        sender_name: portalAccess.full_name,
        recipient_type: 'all_staff',
        status: 'sent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
      setShowCompose(false);
      setNewMessage({
        subject: "",
        message_content: "",
        category: "general",
        priority: "normal",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      return base44.entities.ClientPortalMessage.update(messageId, {
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: portalAccess.full_name,
        status: 'read',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.message_content.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const handleViewMessage = async (message) => {
    setSelectedMessage(message);
    if (!message.is_read && message.sender_type === 'staff') {
      markAsReadMutation.mutate(message.id);
    }
  };

  if (!portalAccess) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Loading...</h3>
                  <p className="text-sm text-orange-800">
                    Please wait while we load your messages.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!portalAccess.can_send_messages) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Access Denied</h3>
                  <p className="text-sm text-red-800">
                    You do not have permission to send messages. Please contact the care team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-red-100 text-red-800",
  };

  const categoryLabels = {
    general: "General",
    schedule: "Schedule",
    medication: "Medication",
    care_plan: "Care Plan",
    feedback: "Feedback",
    concern: "Concern",
    request: "Request",
  };

  if (showCompose) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setShowCompose(false)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Messages
          </Button>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>New Message</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    To
                  </label>
                  <Input
                    value="Care Team"
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Subject
                  </label>
                  <Input
                    placeholder="Enter message subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Category
                    </label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newMessage.category}
                      onChange={(e) => setNewMessage({...newMessage, category: e.target.value})}
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Priority
                    </label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newMessage.priority}
                      onChange={(e) => setNewMessage({...newMessage, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Message
                  </label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={newMessage.message_content}
                    onChange={(e) => setNewMessage({...newMessage, message_content: e.target.value})}
                    rows={8}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCompose(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !newMessage.message_content.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (selectedMessage) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedMessage(null)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Messages
          </Button>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedMessage.subject || 'No Subject'}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={priorityColors[selectedMessage.priority]}>
                      {selectedMessage.priority}
                    </Badge>
                    <Badge variant="outline">
                      {categoryLabels[selectedMessage.category]}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div>
                    <p className="font-medium">{selectedMessage.sender_name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedMessage.sender_type === 'staff' ? 'Care Team' : 'You'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {format(parseISO(selectedMessage.created_date), 'PPP')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(selectedMessage.created_date), 'p')}
                    </p>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">
                    {selectedMessage.message_content}
                  </p>
                </div>
              </div>

              {selectedMessage.sender_type === 'staff' && !selectedMessage.has_reply && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      setNewMessage({
                        subject: `Re: ${selectedMessage.subject || 'Your message'}`,
                        message_content: "",
                        category: selectedMessage.category,
                        priority: "normal",
                      });
                      setShowCompose(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const unreadMessages = messages.filter(m => !m.is_read && m.sender_type === 'staff');
  const sentMessages = messages.filter(m => m.sender_type === 'family');
  const receivedMessages = messages.filter(m => m.sender_type === 'staff');

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
            <p className="text-gray-500">Communicate with your care team</p>
          </div>
          <Button
            onClick={() => setShowCompose(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-blue-600">{messages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-green-600">{unreadMessages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Send className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-2xl font-bold text-purple-600">{sentMessages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>All Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet</p>
                <Button
                  onClick={() => setShowCompose(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Send Your First Message
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleViewMessage(message)}
                    className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                      !message.is_read && message.sender_type === 'staff'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          message.sender_type === 'staff' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {message.sender_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{message.sender_name}</p>
                          <p className="text-sm text-gray-600">
                            {message.sender_type === 'staff' ? 'Care Team' : 'You'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          {!message.is_read && message.sender_type === 'staff' && (
                            <Badge className="bg-green-500 text-white">New</Badge>
                          )}
                          <Badge className={priorityColors[message.priority]}>
                            {message.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(message.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    
                    <p className="font-medium mb-1">{message.subject || 'No Subject'}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {message.message_content}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[message.category]}
                      </Badge>
                      {message.is_read && message.sender_type === 'family' && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CheckCircle className="w-3 h-3" />
                          <span>Read</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}