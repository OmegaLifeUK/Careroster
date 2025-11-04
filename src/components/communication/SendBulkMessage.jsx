import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Mail, MessageSquare, Users } from "lucide-react";

export default function SendBulkMessage({ clients }) {
  const [selectedClients, setSelectedClients] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [messageMethod, setMessageMethod] = useState("email");

  const queryClient = useQueryClient();

  const sendBulkMessageMutation = useMutation({
    mutationFn: async ({ clientIds, content, method }) => {
      const promises = clientIds.map(async (clientId) => {
        // Create communication log
        await base44.entities.ClientCommunication.create({
          client_id: clientId,
          staff_id: "system",
          communication_type: method,
          direction: "outbound",
          subject: "Bulk Communication",
          content: content,
          status: "sent",
          priority: "normal",
        });
      });

      await Promise.all(promises);
      return { success: true, count: clientIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-communications'] });
      setSelectedClients([]);
      setMessageContent("");
    },
  });

  const handleClientToggle = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  const handleSendBulk = () => {
    if (selectedClients.length === 0 || !messageContent.trim()) return;

    sendBulkMessageMutation.mutate({
      clientIds: selectedClients,
      content: messageContent.trim(),
      method: messageMethod,
    });
  };

  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Select Recipients</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedClients.length === activeClients.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {activeClients.map(client => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-4 border-b hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedClients.includes(client.id)}
                    onCheckedChange={() => handleClientToggle(client.id)}
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-semibold">
                      {client.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-sm text-gray-500">
                        {client.phone} • {client.address?.postcode}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Send Method</label>
                <div className="flex gap-2">
                  <Button
                    variant={messageMethod === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMessageMethod("email")}
                    className="flex-1"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant={messageMethod === "sms" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMessageMethod("sms")}
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {messageContent.length}/{messageMethod === "sms" ? "160" : "1000"} characters
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Recipients</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {selectedClients.length}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {selectedClients.length === 0 
                    ? "No clients selected"
                    : `${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} selected`}
                </p>
              </div>

              <Button
                onClick={handleSendBulk}
                disabled={selectedClients.length === 0 || !messageContent.trim() || sendBulkMessageMutation.isPending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendBulkMessageMutation.isPending 
                  ? "Sending..." 
                  : `Send to ${selectedClients.length} Client${selectedClients.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Messages will be logged in communication history. 
              SMS messages are limited to 160 characters. Emails can be up to 1000 characters.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}