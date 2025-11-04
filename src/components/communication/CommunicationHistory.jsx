import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Phone, Mail, MessageSquare, Calendar, User, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function CommunicationHistory({ communications, clients, staff, visits, isLoading }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterClient, setFilterClient] = useState("all");

  const filteredCommunications = communications.filter(comm => {
    const client = clients.find(c => c.id === comm.client_id);
    const matchesSearch = 
      client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || comm.communication_type === filterType;
    const matchesClient = filterClient === "all" || comm.client_id === filterClient;

    return matchesSearch && matchesType && matchesClient;
  });

  const communicationIcons = {
    phone_call: Phone,
    sms: MessageSquare,
    email: Mail,
    in_person: User,
    message: MessageSquare,
    automated_reminder: Calendar,
  };

  const communicationColors = {
    phone_call: "from-green-500 to-green-600",
    sms: "from-blue-500 to-blue-600",
    email: "from-purple-500 to-purple-600",
    in_person: "from-orange-500 to-orange-600",
    message: "from-indigo-500 to-indigo-600",
    automated_reminder: "from-yellow-500 to-yellow-600",
  };

  const getClientById = (clientId) => clients.find(c => c.id === clientId);
  const getStaffById = (staffId) => staff.find(s => s.id === staffId || s.email === staffId);
  const getVisitById = (visitId) => visits.find(v => v.id === visitId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search communications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="message">Secure Message</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="automated_reminder">Automated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredCommunications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No communications found</p>
              </div>
            ) : (
              filteredCommunications.map(comm => {
                const client = getClientById(comm.client_id);
                const staffMember = getStaffById(comm.staff_id);
                const relatedVisit = getVisitById(comm.related_visit_id);
                const Icon = communicationIcons[comm.communication_type] || MessageSquare;

                return (
                  <div key={comm.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${communicationColors[comm.communication_type]}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{client?.full_name}</p>
                            <p className="text-sm text-gray-500">
                              {staffMember?.full_name} • {format(parseISO(comm.created_date), "MMM d, yyyy 'at' HH:mm")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="capitalize">
                              {comm.communication_type.replace('_', ' ')}
                            </Badge>
                            <Badge className={
                              comm.direction === "inbound" 
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }>
                              {comm.direction === "inbound" ? "Received" : "Sent"}
                            </Badge>
                          </div>
                        </div>

                        {comm.subject && (
                          <p className="font-medium text-sm text-gray-900 mb-1">
                            {comm.subject}
                          </p>
                        )}

                        <p className="text-sm text-gray-700 mb-2">
                          {comm.content}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {relatedVisit && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Related to visit: {format(parseISO(relatedVisit.scheduled_start), "MMM d 'at' HH:mm")}</span>
                            </div>
                          )}
                          {comm.requires_followup && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Requires Follow-up
                            </Badge>
                          )}
                          {comm.priority === 'high' || comm.priority === 'urgent' && (
                            <Badge className={
                              comm.priority === 'urgent'
                                ? "bg-red-100 text-red-800"
                                : "bg-orange-100 text-orange-800"
                            }>
                              {comm.priority}
                            </Badge>
                          )}
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
    </div>
  );
}