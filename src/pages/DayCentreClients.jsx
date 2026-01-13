import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Phone, 
  MapPin, 
  Calendar,
  Heart,
  Utensils,
  Activity,
  Bus,
  Eye,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import MedicationManagement from "../components/clients/MedicationManagement";
import ConsentManagement from "../components/clients/ConsentManagement";
import EmergencyContactsManager from "../components/clients/EmergencyContactsManager";
import DocumentManager from "../components/clients/DocumentManager";
import ClientAlertManager from "../components/clients/ClientAlertManager";
import CarePlanManager from "../components/clients/CarePlanManager";
import RiskAssessmentManager from "../components/clients/RiskAssessmentManager";
import PEEPManager from "../components/clients/PEEPManager";
import RepositioningChartManager from "../components/clients/RepositioningChartManager";
import BehaviorChartManager from "../components/clients/BehaviorChartManager";
import MentalCapacityManager from "../components/clients/MentalCapacityManager";
import SafeguardingManager from "../components/clients/SafeguardingManager";
import TaskManager from "../components/tasks/TaskManager";
import DayCentreClientDialog from "../components/daycentre/DayCentreClientDialog";

export default function DayCentreClients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['daycentre-clients'],
    queryFn: async () => {
      const data = await base44.entities.DayCentreClient.list();
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

  const handleViewDetails = (client) => {
    if (!client) {
      console.error("No client provided to handleViewDetails");
      return;
    }
    console.log("Viewing day centre client details:", client);
    setSelectedClient(client);
    setActiveTab("details");
  };

  const filteredClients = Array.isArray(clients) ? clients.filter(client => {
    if (!client) return false;
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const stats = {
    total: filteredClients.length,
    active: filteredClients.filter(c => c && c.status === 'active').length,
    onHold: filteredClients.filter(c => c && c.status === 'on_hold').length,
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    on_hold: "bg-orange-100 text-orange-800",
    ended: "bg-gray-100 text-gray-800",
  };

  const mobilityColors = {
    independent: "bg-green-100 text-green-800",
    requires_assistance: "bg-yellow-100 text-yellow-800",
    wheelchair_user: "bg-blue-100 text-blue-800",
  };

  const transportColors = {
    self_transport: "bg-green-100 text-green-800",
    family_transport: "bg-blue-100 text-blue-800",
    centre_transport: "bg-purple-100 text-purple-800",
    taxi: "bg-orange-100 text-orange-800",
  };

  const dayLabels = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  if (selectedClient) {
    const keyWorker = Array.isArray(staff) ? staff.find(s => s && s.id === selectedClient.key_worker_id) : null;

    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedClient(null)}
            className="mb-6"
          >
            ← Back to Clients List
          </Button>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedClient.full_name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColors[selectedClient.status]}>
                  {selectedClient.status?.replace('_', ' ')}
                </Badge>
                <Badge className={mobilityColors[selectedClient.mobility]}>
                  {selectedClient.mobility?.replace('_', ' ')}
                </Badge>
                <span className="text-gray-500">•</span>
                <span className="text-gray-500">{selectedClient.contracted_sessions_per_week} sessions/week</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingClient(selectedClient);
                  setShowClientDialog(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Client
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "details" ? "default" : "ghost"}
              onClick={() => setActiveTab("details")}
              className="flex-shrink-0"
            >
              Details
            </Button>
            <Button
              variant={activeTab === "tasks" ? "default" : "ghost"}
              onClick={() => setActiveTab("tasks")}
              className="flex-shrink-0"
            >
              Care Tasks
            </Button>
            <Button
              variant={activeTab === "alerts" ? "default" : "ghost"}
              onClick={() => setActiveTab("alerts")}
              className="flex-shrink-0"
            >
              Alerts
            </Button>
            <Button
              variant={activeTab === "care_plan" ? "default" : "ghost"}
              onClick={() => setActiveTab("care_plan")}
              className="flex-shrink-0"
            >
              Care Plan
            </Button>
            <Button
              variant={activeTab === "risk_assessments" ? "default" : "ghost"}
              onClick={() => setActiveTab("risk_assessments")}
              className="flex-shrink-0"
            >
              Risk Assessments
            </Button>
            <Button
              variant={activeTab === "medication" ? "default" : "ghost"}
              onClick={() => setActiveTab("medication")}
              className="flex-shrink-0"
            >
              Medication
            </Button>
            <Button
              variant={activeTab === "peep" ? "default" : "ghost"}
              onClick={() => setActiveTab("peep")}
              className="flex-shrink-0"
            >
              PEEP
            </Button>
            <Button
              variant={activeTab === "repositioning" ? "default" : "ghost"}
              onClick={() => setActiveTab("repositioning")}
              className="flex-shrink-0"
            >
              Repositioning
            </Button>
            <Button
              variant={activeTab === "behavior" ? "default" : "ghost"}
              onClick={() => setActiveTab("behavior")}
              className="flex-shrink-0"
            >
              Behavior
            </Button>
            <Button
              variant={activeTab === "mental_capacity" ? "default" : "ghost"}
              onClick={() => setActiveTab("mental_capacity")}
              className="flex-shrink-0"
            >
              Mental Capacity
            </Button>
            <Button
              variant={activeTab === "safeguarding" ? "default" : "ghost"}
              onClick={() => setActiveTab("safeguarding")}
              className="flex-shrink-0"
            >
              Safeguarding
            </Button>
            <Button
              variant={activeTab === "consent" ? "default" : "ghost"}
              onClick={() => setActiveTab("consent")}
              className="flex-shrink-0"
            >
              Consent
            </Button>
            <Button
              variant={activeTab === "emergency" ? "default" : "ghost"}
              onClick={() => setActiveTab("emergency")}
              className="flex-shrink-0"
            >
              Emergency
            </Button>
            <Button
              variant={activeTab === "documents" ? "default" : "ghost"}
              onClick={() => setActiveTab("documents")}
              className="flex-shrink-0"
            >
              Documents
            </Button>
          </div>

          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-4 text-amber-900">Personal Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="font-medium">{selectedClient.full_name}</p>
                        </div>
                        {selectedClient.date_of_birth && (
                          <div>
                            <p className="text-sm text-gray-600">Date of Birth</p>
                            <p className="font-medium">{selectedClient.date_of_birth}</p>
                          </div>
                        )}
                        {selectedClient.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{selectedClient.phone}</span>
                          </div>
                        )}
                        {selectedClient.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                            <div>
                              <p className="font-medium">{selectedClient.address.street}</p>
                              <p className="text-gray-600">
                                {selectedClient.address.city} {selectedClient.address.postcode}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4 text-amber-900">Attendance Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Attendance Days</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedClient.attendance_days?.map((day, idx) => (
                              <Badge key={idx} variant="outline" className="bg-amber-50">
                                {dayLabels[day]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Sessions Per Week</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {selectedClient.contracted_sessions_per_week}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Funding Type</p>
                          <p className="font-medium capitalize">
                            {selectedClient.funding_type?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedClient.emergency_contact && (
                    <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                      <h3 className="font-semibold text-red-900 mb-3">Emergency Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-red-700">Name</p>
                          <p className="font-medium text-red-900">{selectedClient.emergency_contact.name}</p>
                        </div>
                        <div>
                          <p className="text-red-700">Phone</p>
                          <p className="font-medium text-red-900">{selectedClient.emergency_contact.phone}</p>
                        </div>
                        <div>
                          <p className="text-red-700">Relationship</p>
                          <p className="font-medium text-red-900">{selectedClient.emergency_contact.relationship}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                    <CardTitle className="text-lg">Support Team</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {keyWorker && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700 font-medium mb-1">Key Worker</p>
                        <p className="text-blue-900 font-semibold">{keyWorker.full_name}</p>
                      </div>
                    )}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Bus className="w-4 h-4 text-purple-600" />
                        <p className="text-sm text-purple-700 font-medium">Transport</p>
                      </div>
                      <Badge className={transportColors[selectedClient.transport_arrangement]}>
                        {selectedClient.transport_arrangement?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {selectedClient.pick_up_time && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700 font-medium mb-1">Pick-up Time</p>
                        <p className="text-green-900 font-semibold">{selectedClient.pick_up_time}</p>
                      </div>
                    )}
                    {selectedClient.drop_off_time && (
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-700 font-medium mb-1">Drop-off Time</p>
                        <p className="text-orange-900 font-semibold">{selectedClient.drop_off_time}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <TaskManager client={selectedClient} />
          )}

          {activeTab === "alerts" && (
            <ClientAlertManager client={selectedClient} />
          )}

          {activeTab === "care_plan" && (
            <CarePlanManager client={selectedClient} />
          )}

          {activeTab === "risk_assessments" && (
            <RiskAssessmentManager client={selectedClient} />
          )}

          {activeTab === "medication" && (
            <MedicationManagement client={selectedClient} />
          )}

          {activeTab === "peep" && (
            <PEEPManager client={selectedClient} />
          )}

          {activeTab === "repositioning" && (
            <RepositioningChartManager client={selectedClient} />
          )}

          {activeTab === "behavior" && (
            <BehaviorChartManager client={selectedClient} />
          )}

          {activeTab === "mental_capacity" && (
            <MentalCapacityManager client={selectedClient} />
          )}

          {activeTab === "safeguarding" && (
            <SafeguardingManager client={selectedClient} />
          )}

          {activeTab === "consent" && (
            <ConsentManagement client={selectedClient} />
          )}

          {activeTab === "emergency" && (
            <EmergencyContactsManager 
              client={selectedClient}
              onUpdate={(data) => {
                console.log("Updating client emergency contacts:", selectedClient.id, data);
              }}
            />
          )}

          {activeTab === "documents" && (
            <DocumentManager client={selectedClient} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Centre Clients</h1>
            <p className="text-gray-500">Manage day centre participants</p>
          </div>
          <Button
            onClick={() => {
              setEditingClient(null);
              setShowClientDialog(true);
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">On Hold</p>
              <p className="text-2xl font-bold text-orange-600">{stats.onHold}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
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
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "on_hold" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("on_hold")}
                >
                  On Hold
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            if (!client) return null;
            
            const keyWorker = Array.isArray(staff) ? staff.find(s => s && s.id === client.key_worker_id) : null;

            return (
              <Card key={client.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-lg">
                        {client.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{client.full_name}</h3>
                        <p className="text-sm text-gray-500">
                          {client.contracted_sessions_per_week} sessions/week
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[client.status] || statusColors.ended}>
                      {client.status?.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.attendance_days && Array.isArray(client.attendance_days) && client.attendance_days.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div className="flex gap-1">
                          {client.attendance_days.map((day, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {dayLabels[day] || day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className={mobilityColors[client.mobility] || mobilityColors.independent}>
                        {client.mobility?.replace('_', ' ')}
                      </Badge>
                      <Badge className={transportColors[client.transport_arrangement] || transportColors.self_transport}>
                        {client.transport_arrangement?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {keyWorker && (
                    <div className="mb-4 p-2 bg-amber-50 rounded">
                      <p className="text-xs text-amber-700 mb-1">Key Worker:</p>
                      <p className="text-sm font-medium text-amber-900">{keyWorker.full_name}</p>
                    </div>
                  )}

                  {client.interests_and_hobbies && Array.isArray(client.interests_and_hobbies) && client.interests_and_hobbies.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <Heart className="w-4 h-4" />
                        <span className="font-medium">Interests:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.interests_and_hobbies.slice(0, 3).map((interest, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {client.interests_and_hobbies.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{client.interests_and_hobbies.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={`${createPageUrl('DayCentreClientProfile')}?id=${client.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(client);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClient(client);
                        setShowClientDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredClients.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 text-lg">No clients found</p>
            </CardContent>
          </Card>
        )}

        {showClientDialog && (
          <DayCentreClientDialog
            client={editingClient}
            staff={staff}
            onClose={() => {
              setShowClientDialog(false);
              setEditingClient(null);
            }}
          />
        )}
      </div>
    </div>
  );
}