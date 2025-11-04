import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Bell, 
  History,
  Mail,
  Phone,
  Send,
  Calendar
} from "lucide-react";

import MessagingInterface from "../components/communication/MessagingInterface";
import AutomatedReminders from "../components/communication/AutomatedReminders";
import CommunicationHistory from "../components/communication/CommunicationHistory";
import SendBulkMessage from "../components/communication/SendBulkMessage";

export default function CommunicationHub() {
  const [activeTab, setActiveTab] = useState("messages");

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['client-messages'],
    queryFn: () => base44.entities.ClientMessage.list('-created_date'),
    refetchInterval: 30000,
  });

  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['client-communications'],
    queryFn: () => base44.entities.ClientCommunication.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list(),
  });

  const newMessages = messages.filter(m => m.status === 'new').length;
  const pendingMessages = messages.filter(m => m.status === 'in_progress').length;
  const todayCommunications = communications.filter(c => {
    try {
      const commDate = new Date(c.created_date);
      const today = new Date();
      return commDate.toDateString() === today.toDateString();
    } catch {
      return false;
    }
  }).length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Communication Hub</h1>
          <p className="text-gray-500">Manage client communications and automated reminders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">New Messages</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{newMessages}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{pendingMessages}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <History className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-gray-600">Today's Comms</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{todayCommunications}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-gray-600">Total Logs</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{communications.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Secure Messages
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Bulk Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <MessagingInterface 
              messages={messages}
              clients={clients}
              staff={staff}
              isLoading={messagesLoading}
            />
          </TabsContent>

          <TabsContent value="reminders">
            <AutomatedReminders
              visits={visits}
              clients={clients}
              staff={staff}
            />
          </TabsContent>

          <TabsContent value="history">
            <CommunicationHistory
              communications={communications}
              clients={clients}
              staff={staff}
              visits={visits}
              isLoading={communicationsLoading}
            />
          </TabsContent>

          <TabsContent value="bulk">
            <SendBulkMessage
              clients={clients}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}