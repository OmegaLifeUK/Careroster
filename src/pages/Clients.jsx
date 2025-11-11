
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Phone, MapPin, Heart, Trash2, Sparkles } from "lucide-react";
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

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showCarePlanGenerator, setShowCarePlanGenerator] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Success",
        description: "Client removed successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove client",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    },
  });

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingClient(null);
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setActiveTab("details");
  };

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    archived: "bg-red-100 text-red-800",
  };

  // Prepare data for export
  const exportData = filteredClients.map(client => ({
    full_name: client.full_name,
    date_of_birth: client.date_of_birth,
    phone: client.phone,
    status: client.status,
    mobility: client.mobility,
    funding_type: client.funding_type,
    care_needs: client.care_needs?.join('; ') || '',
    city: client.address?.city || '',
    postcode: client.address?.postcode || '',
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
            <Button
              onClick={() => setShowCarePlanGenerator(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Care Plan
            </Button>
          </div>

          {/* Alert Banner */}
          <AlertBanner clientId={selectedClient.id} section={activeTab} compact={true} />

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "details" ? "default" : "ghost"}
              onClick={() => setActiveTab("details")}
              className="flex-shrink-0"
            >
              Details
            </Button>
            <Button
              variant={activeTab === "alerts" ? "default" : "ghost"}
              onClick={() => setActiveTab("alerts")}
              className="flex-shrink-0"
            >
              Alerts
            </Button>
            <Button
              variant={activeTab === "medication" ? "default" : "ghost"}
              onClick={() => setActiveTab("medication")}
              className="flex-shrink-0"
            >
              Medication
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

          {/* Tab Content */}
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

          {activeTab === "alerts" && (
            <ClientAlertManager client={selectedClient} />
          )}

          {activeTab === "medication" && (
            <MedicationManagement client={selectedClient} />
          )}

          {activeTab === "consent" && (
            <ConsentManagement client={selectedClient} />
          )}

          {activeTab === "emergency" && (
            <EmergencyContactsManager 
              client={selectedClient}
              onUpdate={(data) => {
                // Placeholder for handling emergency contact update,
                // you might want to call a mutation here or update client data in some other way.
                console.log("Updating client emergency contacts:", selectedClient.id, data);
                // Example: base44.entities.Client.update(selectedClient.id, { emergency_contacts: data });
                // Make sure to invalidate queries or refetch to update UI if needed
              }}
            />
          )}

          {activeTab === "documents" && (
            <DocumentManager client={selectedClient} />
          )}

          {showCarePlanGenerator && (
            <AICareplanGenerator
              client={selectedClient}
              onClose={() => setShowCarePlanGenerator(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
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
            const preferredCarers = carers.filter(c => 
              client.preferred_carers?.includes(c.id)
            );

            return (
              <Card key={client.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-semibold text-lg">
                        {client.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{client.full_name}</h3>
                        <p className="text-sm text-gray-500">{client.funding_type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[client.status]}>
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

                  {client.care_needs && client.care_needs.length > 0 && (
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
                      onClick={() => handleViewDetails(client)} 
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(client.id)}
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
          <div className="text-center py-12 text-gray-500">
            <p>No clients found</p>
          </div>
        )}

        {showDialog && (
          <ClientDialog
            client={editingClient}
            carers={carers}
            onClose={handleCloseDialog}
          />
        )}
      </div>
    </div>
  );
}
