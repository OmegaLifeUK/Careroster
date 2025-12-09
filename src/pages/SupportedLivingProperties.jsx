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
  MapPin, 
  Home, 
  Users, 
  Key,
  Wrench,
  DollarSign,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import PropertyDialog from "../components/supportedliving/PropertyDialog";

export default function SupportedLivingProperties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['supported-living-properties'],
    queryFn: () => base44.entities.SupportedLivingProperty.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['supported-living-clients'],
    queryFn: () => base44.entities.SupportedLivingClient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.property_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: properties.length,
    active: properties.filter(p => p.status === 'active').length,
    full: properties.filter(p => p.status === 'full').length,
    totalCapacity: properties.reduce((sum, p) => sum + (p.total_capacity || 0), 0),
    totalOccupancy: properties.reduce((sum, p) => sum + (p.current_occupancy || 0), 0),
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    full: "bg-blue-100 text-blue-800",
    maintenance: "bg-orange-100 text-orange-800",
    closed: "bg-red-100 text-red-800",
  };

  const propertyTypeLabels = {
    single_flat: "Single Flat",
    shared_house: "Shared House",
    cluster_flat: "Cluster Flat",
    bungalow: "Bungalow",
    bedsit: "Bedsit",
  };

  const supportModelLabels = {
    visiting_support: "Visiting Support",
    on_site_support: "On-Site Support",
    sleep_in: "Sleep-In",
    waking_night: "Waking Night",
  };

  if (selectedProperty) {
    const propertyClients = clients.filter(c => c.property_id === selectedProperty.id);
    const propertyManager = staff.find(s => s.id === selectedProperty.property_manager_id);
    const occupancyRate = selectedProperty.total_capacity > 0 
      ? ((selectedProperty.current_occupancy / selectedProperty.total_capacity) * 100).toFixed(0)
      : 0;

    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedProperty(null)}
            className="mb-6"
          >
            ← Back to Properties
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedProperty.property_name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColors[selectedProperty.status]}>
                {selectedProperty.status}
              </Badge>
              <Badge variant="outline">
                {propertyTypeLabels[selectedProperty.property_type]}
              </Badge>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{supportModelLabels[selectedProperty.support_model]}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-gray-600">Occupancy</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedProperty.current_occupancy}/{selectedProperty.total_capacity}
                </p>
                <p className="text-xs text-gray-500 mt-1">{occupancyRate}% occupied</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-gray-600">Available Spaces</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {selectedProperty.total_capacity - selectedProperty.current_occupancy}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <p className="text-sm text-gray-600">Rent per Unit</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  £{selectedProperty.rent_amount}
                </p>
                <p className="text-xs text-gray-500 mt-1">per month</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="w-4 h-4 text-orange-600" />
                  <p className="text-sm text-gray-600">Status</p>
                </div>
                <Badge className={statusColors[selectedProperty.status]}>
                  {selectedProperty.status}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4 text-indigo-900">Location</h3>
                    <div className="space-y-3">
                      {selectedProperty.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                          <div>
                            <p className="font-medium">{selectedProperty.address.street}</p>
                            <p className="text-gray-600">
                              {selectedProperty.address.city}, {selectedProperty.address.postcode}
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Property Type</p>
                        <p className="font-medium">{propertyTypeLabels[selectedProperty.property_type]}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 text-indigo-900">Management</h3>
                    <div className="space-y-3">
                      {propertyManager && (
                        <div>
                          <p className="text-sm text-gray-600">Property Manager</p>
                          <p className="font-medium">{propertyManager.full_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Landlord</p>
                        <p className="font-medium">{selectedProperty.landlord || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Support Model</p>
                        <p className="font-medium">{supportModelLabels[selectedProperty.support_model]}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedProperty.access_instructions && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <Key className="w-5 h-5 text-yellow-700 mt-1" />
                      <div>
                        <h3 className="font-semibold text-yellow-900 mb-2">Access Instructions</h3>
                        <p className="text-sm text-yellow-800">{selectedProperty.access_instructions}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {selectedProperty.facilities && selectedProperty.facilities.length > 0 && (
                <Card>
                  <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="text-lg">Facilities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {selectedProperty.facilities.map((facility, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{facility}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Capacity Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Capacity</span>
                      <span className="font-bold">{selectedProperty.total_capacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Occupancy</span>
                      <span className="font-bold text-blue-600">{selectedProperty.current_occupancy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available</span>
                      <span className="font-bold text-green-600">
                        {selectedProperty.total_capacity - selectedProperty.current_occupancy}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Occupancy Rate</span>
                        <span className="text-sm font-medium">{occupancyRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {propertyClients.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Current Residents</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {propertyClients.map((client) => (
                    <div key={client.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {client.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{client.full_name}</p>
                          <p className="text-sm text-gray-500">{client.support_hours_per_week}hrs/week</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {client.support_level} support
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Supported Living Properties</h1>
            <p className="text-gray-500">Manage properties and occupancy</p>
          </div>
          <Button
            onClick={() => {
              setEditingProperty(null);
              setShowPropertyDialog(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Properties</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalCapacity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Current Occupancy</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalOccupancy}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Overall Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalCapacity > 0 ? ((stats.totalOccupancy / stats.totalCapacity) * 100).toFixed(0) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search properties..."
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
                  variant={statusFilter === "full" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("full")}
                >
                  Full
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => {
            const propertyClients = clients.filter(c => c.property_id === property.id);
            const occupancyRate = property.total_capacity > 0 
              ? ((property.current_occupancy / property.total_capacity) * 100).toFixed(0)
              : 0;

            return (
              <Card key={property.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                        <Home className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{property.property_name}</h3>
                        <p className="text-sm text-gray-500">
                          {propertyTypeLabels[property.property_type]}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[property.status]}>
                      {property.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {property.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{property.address.city}, {property.address.postcode}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Occupancy</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        {property.current_occupancy}/{property.total_capacity}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500"
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-4 p-2 bg-purple-50 rounded">
                    <p className="text-xs text-purple-700 mb-1">Support Model:</p>
                    <p className="text-sm font-medium text-purple-900">
                      {supportModelLabels[property.support_model]}
                    </p>
                  </div>

                  {property.rent_amount && (
                    <div className="mb-4 flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm text-green-700">Rent per unit:</span>
                      <span className="font-bold text-green-900">£{property.rent_amount}/month</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedProperty(property)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProperty(property);
                        setShowPropertyDialog(true);
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

        {filteredProperties.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <p>No properties found</p>
          </div>
        )}

        {showPropertyDialog && (
          <PropertyDialog
            property={editingProperty}
            staff={staff}
            onClose={() => {
              setShowPropertyDialog(false);
              setEditingProperty(null);
            }}
          />
        )}
      </div>
    </div>
  );
}