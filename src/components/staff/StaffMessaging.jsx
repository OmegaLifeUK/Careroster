import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Bell, CheckCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function StaffMessaging({ carer }) {
  const [messageContent, setMessageContent] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("normal");

  const queryClient = useQueryClient();

  const { data: myMessages = [] } = useQuery({
    queryKey: ['staff-messages', carer?.id],
    queryFn: async () => {
      if (!carer) return [];
      const notifications = await base44.entities.DomCareNotification.filter({
        recipient_id: carer.id
      }, '-created_date');
      return notifications;
    },
    enabled: !!carer,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, priority }) => {
      // Create notification to agency (admin users)
      await base44.entities.DomCareNotification.create({
        recipient_id: "agency_admin", // Could be a specific admin or group
        title: `Message from ${carer.full_name}`,
        message: content,
        type: "general",
        priority: priority,
        is_read: false,
        related_entity_id: carer.id,
        related_entity_type: "staff",
      });

      // Create a communication log
      await base44.entities.ClientCommunication.create({
        client_id: "agency", // Placeholder for agency communications
        staff_id: carer.id,
        communication_type: "message",
        direction: "outbound",
        subject: "Staff message to agency",
        content: content,
        status: "sent",
        priority: priority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
      setMessageContent("");
      setSelectedPriority("normal");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.DomCareNotification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate({
      content: messageContent.trim(),
      priority: selectedPriority,
    });
  };

  const unreadCount = myMessages.filter(m => !m.is_read).length;

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const typeIcons = {
    visit_assigned: Bell,
    visit_changed: Clock,
    visit_request: MessageSquare,
    timeoff_request: Clock,
    sos_alert: Bell,
    run_published: CheckCircle,
    general: MessageSquare,
  };

  return (
    <div className="space-y-6">
      {/* Send Message Card */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Message Agency
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Priority Level</label>
              <div className="flex gap-2">
                {['low', 'normal', 'high', 'urgent'].map(priority => (
                  <Button
                    key={priority}
                    variant={selectedPriority === priority ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPriority(priority)}
                    className={selectedPriority === priority ? priorityColors[priority] : ''}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Your Message</label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message to the agency here..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {messageContent.length}/500 characters
              </p>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sendMessageMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Use this for:</strong> Questions about shifts, reporting issues, 
                requesting time off, or any general queries for the management team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages & Notifications */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Messages & Notifications
            </CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} New
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {myMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet</p>
              </div>
            ) : (
              myMessages.map(message => {
                const Icon = typeIcons[message.type] || MessageSquare;
                
                return (
                  <div
                    key={message.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !message.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !message.is_read && markAsReadMutation.mutate(message.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        message.priority === 'urgent' ? 'bg-red-500' :
                        message.priority === 'high' ? 'bg-orange-500' :
                        message.priority === 'normal' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-semibold ${!message.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {message.title}
                          </h4>
                          {!message.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {message.message}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {format(parseISO(message.created_date), "MMM d, yyyy 'at' HH:mm")}
                          </span>
                          {message.priority !== 'normal' && (
                            <Badge className={priorityColors[message.priority]}>
                              {message.priority}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {message.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Communication Tips
          </h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Messages marked as <strong>urgent</strong> will be prioritized by the team</li>
            <li>• Check this section regularly for shift updates and notifications</li>
            <li>• Use the SOS button for emergencies during shifts</li>
            <li>• Response time is typically within 2 hours during office hours</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}