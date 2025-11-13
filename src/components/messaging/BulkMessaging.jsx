import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Filter, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function BulkMessaging({ carers = [], onClose }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCarers, setSelectedCarers] = useState(new Set());
  const [messageType, setMessageType] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [requiresAck, setRequiresAck] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendBulkMessageMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Create one message record for the bulk send
      const bulkMessage = await base44.entities.StaffMessage.create({
        sender_id: user.email,
        sender_name: user.full_name || user.email,
        recipient_ids: Array.from(selectedCarers),
        subject: subject.trim(),
        message: message.trim(),
        message_type: messageType,
        priority: priority,
        related_entity_type: "general",
        read_by: [],
        requires_acknowledgment: requiresAck,
        acknowledgments: []
      });

      // Create individual notifications for each carer
      for (const carerId of selectedCarers) {
        await base44.entities.Notification.create({
          recipient_id: carerId,
          title: subject.trim(),
          message: message.trim(),
          type: "general",
          priority: priority,
          is_read: false,
          related_entity_id: bulkMessage.id,
          related_entity_type: "shift"
        });
      }

      return bulkMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      toast.success(
        "Messages Sent",
        `Bulk message sent to ${selectedCarers.size} recipient${selectedCarers.size > 1 ? 's' : ''}`
      );
      
      setSubject("");
      setMessage("");
      setSelectedCarers(new Set());
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to send bulk message: " + error.message);
    }
  });

  const toggleCarer = (carerId) => {
    const newSelected = new Set(selectedCarers);
    if (newSelected.has(carerId)) {
      newSelected.delete(carerId);
    } else {
      newSelected.add(carerId);
    }
    setSelectedCarers(newSelected);
  };

  const selectAll = () => {
    const filtered = filteredCarers.map(c => c.id);
    setSelectedCarers(new Set(filtered));
  };

  const clearAll = () => {
    setSelectedCarers(new Set());
  };

  const filteredCarers = Array.isArray(carers) 
    ? carers.filter(c => {
        if (!c) return false;
        if (filterStatus === "all") return true;
        return c.status === filterStatus;
      })
    : [];

  const messageTypeColors = {
    general: "bg-gray-100 text-gray-800",
    announcement: "bg-blue-100 text-blue-800",
    urgent: "bg-red-100 text-red-800",
    reminder: "bg-yellow-100 text-yellow-800",
    update: "bg-green-100 text-green-800"
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Messaging
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Compose Message */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject..."
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {subject.length}/100 characters
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/1000 characters
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-2 block">
                    Message Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['general', 'announcement', 'urgent', 'reminder', 'update'].map(type => (
                      <Button
                        key={type}
                        variant={messageType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMessageType(type)}
                        className={messageType === type ? messageTypeColors[type] : ''}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900 mb-2 block">
                    Priority
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['low', 'normal', 'high', 'urgent'].map(p => (
                      <Button
                        key={p}
                        variant={priority === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPriority(p)}
                        className={priority === p ? priorityColors[p] : ''}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires-ack"
                  checked={requiresAck}
                  onCheckedChange={setRequiresAck}
                />
                <label htmlFor="requires-ack" className="text-sm text-gray-700 cursor-pointer">
                  Require acknowledgment from recipients
                </label>
              </div>
            </div>

            {/* Recipient Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-900">
                  Recipients ({selectedCarers.size})
                </label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Filter */}
              <div className="mb-3">
                <div className="flex gap-2">
                  {['all', 'active', 'inactive', 'on_leave'].map(status => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus(status)}
                    >
                      {status === 'all' ? 'All' : status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filteredCarers.map(carer => (
                  <div
                    key={carer.id}
                    onClick={() => toggleCarer(carer.id)}
                    className={`flex items-center gap-3 p-3 border-b cursor-pointer transition-all ${
                      selectedCarers.has(carer.id)
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedCarers.has(carer.id)}
                      onCheckedChange={() => toggleCarer(carer.id)}
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {carer.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {carer.full_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {carer.status}
                      </p>
                    </div>
                    {selectedCarers.has(carer.id) && (
                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button
              onClick={() => sendBulkMessageMutation.mutate()}
              disabled={
                !subject.trim() || 
                !message.trim() || 
                selectedCarers.size === 0 || 
                sendBulkMessageMutation.isPending
              }
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {sendBulkMessageMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to {selectedCarers.size} Recipient{selectedCarers.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}