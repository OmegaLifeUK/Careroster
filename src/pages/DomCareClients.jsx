
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Phone, MapPin, Heart, Key, Trash2 } from "lucide-react";

import AlertBanner from "../components/clients/AlertBanner";

export default function DomCareClients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const handleViewDetails = (client) => {
    setSelectedClient(client);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedClient.full_name}</h1>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[selectedClient.status]}>
                {selectedClient.status}
              </Badge>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500 capitalize">{selectedClient.funding_type?.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Alert Banner for Dom Care Clients */}
          <AlertBanner clientId={selectedClient.id} section="dashboard" compact={true} />

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
                    {selectedClient.access_instructions && (
                      <div>
                        <p className="text-sm text-gray-600">Access Instructions</p>
                        <p className="font-medium">{selectedClient.access_instructions}</p>
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
                      <p className="text-sm text-gray-600">Standard Visit Duration</p>
                      <p className="font-medium">{selectedClient.standard_visit_duration} minutes</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dom Care Clients</h1>
            <p className="text-gray-500">Manage home care clients</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
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
            const preferredStaff = staff.filter(s =>
              client.preferred_staff?.includes(s.id)
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
                    {client.address?.postcode && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{client.address.city}, {client.address.postcode}</span>
                      </div>
                    )}
                    {client.access_instructions && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Key className="w-4 h-4" />
                        <span className="truncate">{client.access_instructions.substring(0, 30)}...</span>
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
                            +{client.care_needs.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {client.standard_visit_duration && (
                    <div className="mb-4 p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-700">Standard visit:</p>
                      <p className="text-sm font-medium text-blue-900">{client.standard_visit_duration} mins</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewDetails(client)}
                    >
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
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
      </div>
    </div>
  );
}
