import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  Heart,
  AlertCircle,
  Calendar,
  Clock,
  Home,
  FileText,
  Edit,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import SupportedLivingClientDialog from "../components/supportedliving/SupportedLivingClientDialog";

export default function SupportedLivingClientProfile() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['supported-living-client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.SupportedLivingClient.list();
      return clients.find(c => c.id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: property } = useQuery({
    queryKey: ['property', client?.property_id],
    queryFn: async () => {
      const properties = await base44.entities.SupportedLivingProperty.list();
      return properties.find(p => p.id === client.property_id);
    },
    enabled: !!client?.property_id,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['client-shifts', clientId],
    queryFn: async () => {
      const allShifts = await base44.entities.SupportedLivingShift.list('-date');
      return allShifts.filter(s => s.client_id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans', clientId],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.list();
      return plans.filter(p => p.client_id === clientId);
    },
    enabled: !!clientId,
  });

  if (clientLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Client Not Found</h2>
              <Link to={createPageUrl('SupportedLivingClients')}>
                <Button>Back to Clients</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const upcomingShifts = shifts.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= new Date() && s.status !== 'cancelled' && s.status !== 'completed';
  }).slice(0, 5);

  const activeCareplan = carePlans.find(p => p.status === 'active');

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('SupportedLivingClients')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
              <p className="text-gray-500">Supported Living Resident</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              client.status === 'active' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }>
              {client.status || 'Active'}
            </Badge>
            <Button onClick={() => setShowEditDialog(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact & Property Info */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-indigo-600" />
                  Residence & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Property</p>
                    <div className="flex items-start gap-2">
                      <Home className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium">{property?.property_name || 'N/A'}</p>
                        {property?.address && (
                          <p className="text-sm text-gray-600">
                            {property.address.street}, {property.address.postcode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{client.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Move-in Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{client.move_in_date || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Support Level</p>
                    <Badge variant="outline">{client.support_level || 'Not specified'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {client.emergency_contact && (
              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium">{client.emergency_contact.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Relationship</p>
                      <p className="font-medium">{client.emergency_contact.relationship}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{client.emergency_contact.phone}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Support Needs */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-purple-100">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  Support Needs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Primary Needs</p>
                  <div className="flex flex-wrap gap-2">
                    {client.support_needs && client.support_needs.length > 0 ? (
                      client.support_needs.map((need, idx) => (
                        <Badge key={idx} variant="outline" className="bg-purple-50">
                          {need}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No support needs specified</p>
                    )}
                  </div>
                </div>
                {client.risk_management_plan && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Risk Management</p>
                    <p className="text-sm bg-purple-50 p-3 rounded border border-purple-200">
                      {client.risk_management_plan}
                    </p>
                  </div>
                )}
                {client.key_safe_code && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Key Safe Code</p>
                    <Badge variant="outline" className="font-mono">{client.key_safe_code}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Care Plan */}
            {activeCareplan && (
              <Card>
                <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-teal-100">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Active Care Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Assessment Date</p>
                        <p className="font-medium">{activeCareplan.assessment_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Review Date</p>
                        <p className="font-medium">{activeCareplan.review_date}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Support Goals */}
            {client.support_goals && client.support_goals.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    Support Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {client.support_goals.map((goal, idx) => (
                      <div key={idx} className="p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-sm">{goal}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Support */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Upcoming Support
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {upcomingShifts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming shifts</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingShifts.map(shift => (
                      <div key={shift.id} className="p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{shift.date}</p>
                          <Badge variant="outline" className="text-xs">{shift.shift_type}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Shifts</span>
                  <span className="font-bold text-lg">{shifts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Upcoming</span>
                  <span className="font-bold text-lg text-blue-600">
                    {upcomingShifts.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showEditDialog && (
          <SupportedLivingClientDialog
            client={client}
            onClose={() => setShowEditDialog(false)}
          />
        )}
      </div>
    </div>
  );
}