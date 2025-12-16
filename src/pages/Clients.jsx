import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Phone, MapPin, Heart, Trash2, Sparkles, Eye, Upload } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { useToast } from "@/components/ui/toast";

import ClientDialog from "../components/clients/ClientDialog";
import MedicationManagement from "../components/clients/MedicationManagement";
import ConsentManagement from "../components/clients/ConsentManagement";
import EmergencyContactsManager from "../components/clients/EmergencyContactsManager";
import DocumentManager from "../components/clients/DocumentManager";
import ClientAlertManager from "../components/clients/ClientAlertManager";
import AlertBanner from "../components/clients/AlertBanner";
import AICareplanGenerator from "../components/clients/AICareplanGenerator";
import CarePlanManager from "../components/clients/CarePlanManager";
import RiskAssessmentManager from "../components/clients/RiskAssessmentManager";
import PEEPManager from "../components/clients/PEEPManager";
import RepositioningChartManager from "../components/clients/RepositioningChartManager";
import BehaviorChartManager from "../components/clients/BehaviorChartManager";
import MentalCapacityManager from "../components/clients/MentalCapacityManager";
import SafeguardingManager from "../components/clients/SafeguardingManager";
import OnboardingTracker from "../components/onboarding/OnboardingTracker";
import TaskManager from "../components/tasks/TaskManager";
import AIDocumentImporter from "../components/clients/AIDocumentImporter";
import AINewClientImporter from "../components/clients/AINewClientImporter";
import ClientProgressReport from "../components/clients/ClientProgressReport";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showCarePlanGenerator, setShowCarePlanGenerator] = useState(false);
  const [showDocumentImporter, setShowDocumentImporter] = useState(false);
  const [showNewClientImporter, setShowNewClientImporter] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Client Deleted", "Client removed successfully");
    },
    onError: (error) => {
      toast.error("Error", "Failed to remove client");
      console.error("Delete error:", error);
    },
  });

  const filteredClients = Array.isArray(clients) ? clients.filter(client => {
    if (!client) return false;
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const handleEdit = (client) => {
    if (!client || !client.id) {
      console.error("No valid client provided to handleEdit");
      toast.error("Cannot edit client", "Invalid client data");
      return;
    }
    setEditingClient(client);
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (!id) {
      console.error("No client ID provided to handleDelete");
      return;
    }
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingClient(null);
  };

  const handleViewDetails = (client) => {
    if (!client) {
      console.error("No client provided to handleViewDetails");
      return;
    }
    console.log("Viewing client details:", client);
    setSelectedClient(client);
    setActiveTab("details");
  };

  const stats = {
    total: filteredClients.length,
    active: filteredClients.filter(c => c && c.status === 'active').length,
    inactive: filteredClients.filter(c => c && c.status === 'inactive').length,
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    archived: "bg-red-100 text-red-800",
  };

  const exportData = filteredClients.map(client => ({
    full_name: client?.full_name || '',
    date_of_birth: client?.date_of_birth || '',
    phone: client?.phone || '',
    status: client?.status || '',
    mobility: client?.mobility || '',
    funding_type: client?.funding_type || '',
    care_needs: client?.care_needs?.join('; ') || '',
    city: client?.address?.city || '',
    postcode: client?.address?.postcode || '',
  }));

  const exportColumns = [
    { key: 'full_name', header: 'Name' },
    { key: 'date_of_birth', header: 'Date of Birth' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'mobility', header: 'Mobility' },
    { key: 'funding_type', header: 'Funding Type' },
    { key: 'care_needs', header: 'Care Needs' },
    { key: 'city', header: 'City' },
    { key: 'postcode', header: 'Postcode' },
  ];

  if (selectedClient) {
    return (
      <div className="p-4 md:p-8">
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
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedClient.status]}>
                  {selectedClient.status}
                </Badge>
                <span className="text-gray-500">•</span>
                <span className="text-gray-500 capitalize">{selectedClient.funding_type?.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleEdit(selectedClient)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Client
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDocumentImporter(true)}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Documents
              </Button>
              <Button
                onClick={() => setShowCarePlanGenerator(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Care Plan
              </Button>
            </div>
          </div>

          <AlertBanner clientId={selectedClient.id} section={activeTab} compact={true} />

          <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "details" ? "default" : "ghost"}
              onClick={() => setActiveTab("details")}
              className="flex-shrink-0"
            >
              Details
            </Button>
            <Button
              variant={activeTab === "onboarding" ? "default" : "ghost"}
              onClick={() => setActiveTab("onboarding")}
              className="flex-shrink-0"
            >
              Onboarding
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
            <Button
              variant={activeTab === "progress" ? "default" : "ghost"}
              onClick={() => setActiveTab("progress")}
              className="flex-shrink-0"
            >
              Progress Report
            </Button>
          </div>

          {activeTab === "details" && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Client Information</h3>
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
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{selectedClient.phone}</p>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium">
                            {selectedClient.address.street && `${selectedClient.address.street}, `}
                            {selectedClient.address.city} {selectedClient.address.postcode}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Care Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Funding Type</p>
                        <p className="font-medium capitalize">{selectedClient.funding_type?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Mobility</p>
                        <p className="font-medium capitalize">{selectedClient.mobility?.replace('_', ' ')}</p>
                      </div>
                      {selectedClient.care_needs && selectedClient.care_needs.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Care Needs</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedClient.care_needs.map((need, idx) => (
                              <Badge key={idx} variant="outline">{need}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedClient.medical_notes && (
                        <div>
                          <p className="text-sm text-gray-600">Medical Notes</p>
                          <p className="font-medium">{selectedClient.medical_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "onboarding" && (
            <OnboardingTracker clientId={selectedClient.id} />
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

          {activeTab === "progress" && (
            <ClientProgressReport clientId={selectedClient.id} client={selectedClient} />
          )}

          {showCarePlanGenerator && (
            <AICareplanGenerator
              client={selectedClient}
              onClose={() => setShowCarePlanGenerator(false)}
            />
          )}

          {showDocumentImporter && (
            <AIDocumentImporter
              clientId={selectedClient.id}
              clientName={selectedClient.full_name}
              onClose={() => setShowDocumentImporter(false)}
            />
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
            <p className="text-gray-500">Manage client information and care plans</p>
          </div>
          <div className="flex gap-2">
            <ExportButton 
              data={exportData} 
              filename="clients" 
              columns={exportColumns}
            />
            <Button
              onClick={() => setShowNewClientImporter(true)}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import from Document
            </Button>
            <Button
              onClick={() => {
                setEditingClient(null);
                setShowDialog(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("all")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("active")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("inactive")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
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
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            if (!client) return null;
            
            const preferredCarers = Array.isArray(carers) ? carers.filter(c => 
              c && client.preferred_carers?.includes(c.id)
            ) : [];

            return (
              <Card key={client.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-semibold text-lg">
                        {client.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{client.full_name}</h3>
                        <p className="text-sm text-gray-500">{client.funding_type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[client.status] || statusColors.inactive}>
                      {client.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address?.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{client.address.city}, {client.address.postcode}</span>
                      </div>
                    )}
                  </div>

                  {client.care_needs && Array.isArray(client.care_needs) && client.care_needs.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <Heart className="w-4 h-4" />
                        <span className="font-medium">Care Needs:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.care_needs.slice(0, 3).map((need, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {need}
                          </Badge>
                        ))}
                        {client.care_needs.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{client.care_needs.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {preferredCarers.length > 0 && (
                    <div className="mb-4 p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-700 mb-1">Preferred Carers:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {preferredCarers.map(c => c.full_name).join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(client);
                      }}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(client);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(client.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
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
              <p className="text-sm text-gray-400 mt-2">
                {searchQuery ? "Try adjusting your search" : "Add your first client to get started"}
              </p>
            </CardContent>
          </Card>
        )}

        {showDialog && (
          <ClientDialog
            client={editingClient}
            carers={carers}
            onClose={handleCloseDialog}
          />
        )}

        {showNewClientImporter && (
          <AINewClientImporter
            onClose={() => setShowNewClientImporter(false)}
            onClientCreated={(client) => {
              setShowNewClientImporter(false);
              setSelectedClient(client);
            }}
          />
        )}
      </div>
    </div>
  );
}