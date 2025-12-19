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
  Mail, 
  User, 
  Heart,
  AlertCircle,
  Calendar,
  Clock,
  Shield,
  FileText,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import DomCareClientDialog from "../components/domcare/DomCareClientDialog";

export default function DomCareClientProfile() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['domcare-client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.DomCareClient.list();
      return clients.find(c => c.id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['client-visits', clientId],
    queryFn: async () => {
      const allVisits = await base44.entities.Visit.list('-scheduled_start');
      return allVisits.filter(v => v.client_id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
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
              <p className="text-gray-600 mb-6">The client you're looking for doesn't exist.</p>
              <Link to={createPageUrl('DomCareClients')}>
                <Button>Back to Clients</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const upcomingVisits = visits.filter(v => {
    const visitDate = new Date(v.scheduled_start);
    return visitDate >= new Date() && v.status !== 'cancelled' && v.status !== 'completed';
  }).slice(0, 5);

  const recentVisits = visits.filter(v => v.status === 'completed').slice(0, 5);

  const activeCareplan = carePlans.find(p => p.status === 'active');

  const preferredStaff = staff.filter(s => client.preferred_staff?.includes(s.id));

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('DomCareClients')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
              <p className="text-gray-500">Domiciliary Care Client</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              client.status === 'active' ? 'bg-green-100 text-green-800' :
              client.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
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
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{client.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium">{client.address?.street || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {client.address?.city}, {client.address?.postcode}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Funding Type</p>
                    <Badge variant="outline">{client.funding_type || 'Not specified'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Standard Visit Duration</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{client.standard_visit_duration || 30} minutes</p>
                    </div>
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

            {/* Care Needs */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-purple-100">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  Care Needs & Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Care Needs</p>
                  <div className="flex flex-wrap gap-2">
                    {client.care_needs && client.care_needs.length > 0 ? (
                      client.care_needs.map((need, idx) => (
                        <Badge key={idx} variant="outline" className="bg-purple-50">
                          {need}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No care needs specified</p>
                    )}
                  </div>
                </div>
                {client.medical_notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Medical Notes</p>
                    <p className="text-sm bg-purple-50 p-3 rounded border border-purple-200">
                      {client.medical_notes}
                    </p>
                  </div>
                )}
                {client.access_instructions && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Access Instructions</p>
                    <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                      {client.access_instructions}
                    </p>
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
                      <div>
                        <p className="text-sm text-gray-600">Assessed By</p>
                        <p className="font-medium">{activeCareplan.assessed_by}</p>
                      </div>
                    </div>
                    {activeCareplan.care_tasks && activeCareplan.care_tasks.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Care Tasks ({activeCareplan.care_tasks.length})</p>
                        <div className="space-y-1">
                          {activeCareplan.care_tasks.slice(0, 3).map((task, idx) => (
                            <div key={idx} className="text-sm bg-teal-50 px-3 py-2 rounded border border-teal-200">
                              {task.task_name}
                            </div>
                          ))}
                          {activeCareplan.care_tasks.length > 3 && (
                            <p className="text-xs text-gray-500 mt-1">
                              +{activeCareplan.care_tasks.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            {/* Preferred Staff */}
            {preferredStaff.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    Preferred Staff
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {preferredStaff.map(staffMember => (
                      <div key={staffMember.id} className="flex items-center gap-2 p-2 bg-amber-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-medium">
                          {staffMember.full_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{staffMember.full_name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Visits */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Upcoming Visits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {upcomingVisits.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming visits</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingVisits.map(visit => {
                      const visitStaff = staff.find(s => s.id === visit.staff_id || s.id === visit.assigned_staff_id);
                      return (
                        <div key={visit.id} className="p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">
                              {format(new Date(visit.scheduled_start), 'EEE, MMM d')}
                            </p>
                            <Badge variant="outline" className="text-xs">{visit.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-600">
                            {format(new Date(visit.scheduled_start), 'HH:mm')} - 
                            {format(new Date(visit.scheduled_end), 'HH:mm')}
                          </p>
                          {visitStaff && (
                            <p className="text-xs text-gray-500 mt-1">
                              Staff: {visitStaff.full_name}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Visits */}
            {recentVisits.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Recent Visits
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {recentVisits.map(visit => (
                      <div key={visit.id} className="p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-sm font-medium">
                          {format(new Date(visit.scheduled_start), 'EEE, MMM d')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(visit.scheduled_start), 'HH:mm')} - 
                          {format(new Date(visit.scheduled_end), 'HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Visits</span>
                  <span className="font-bold text-lg">{visits.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-bold text-lg text-green-600">
                    {visits.filter(v => v.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Upcoming</span>
                  <span className="font-bold text-lg text-blue-600">
                    {upcomingVisits.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showEditDialog && (
          <DomCareClientDialog
            client={client}
            onClose={() => setShowEditDialog(false)}
          />
        )}
      </div>
    </div>
  );
}