
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  Plus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ClientPortalBookings() {
  const [user, setUser] = useState(null);
  const [portalAccess, setPortalAccess] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_type: "book_session",
    requested_date: "",
    reason: "",
    additional_notes: "",
    transport_required: false,
    transport_type: "centre_transport",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUserAndAccess = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        const allAccess = await base44.entities.ClientPortalAccess.list();
        const userAccess = allAccess.find(a => 
          a.user_email === userData.email && a.is_active
        );
        setPortalAccess(userAccess);
      } catch (error) {
        console.error("Error loading portal access:", error);
      }
    };
    loadUserAndAccess();
  }, []);

  const { data: bookingRequests = [] } = useQuery({
    queryKey: ['booking-requests', portalAccess?.client_id],
    queryFn: async () => {
      if (!portalAccess) return [];
      const data = await base44.entities.SessionBookingRequest.filter(
        { client_id: portalAccess.client_id },
        '-created_date'
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!portalAccess,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (requestData) => {
      return base44.entities.SessionBookingRequest.create({
        ...requestData,
        client_id: portalAccess.client_id,
        client_type: portalAccess.client_type,
        requested_by_name: portalAccess.full_name,
        requested_by_email: portalAccess.user_email,
        requested_by_relationship: portalAccess.relationship,
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
      setShowRequestForm(false);
      setNewRequest({
        request_type: "book_session",
        requested_date: "",
        reason: "",
        additional_notes: "",
        transport_required: false,
        transport_type: "centre_transport",
      });
    },
  });

  const handleSubmitRequest = () => {
    if (!newRequest.requested_date || !newRequest.reason) {
      alert('Please fill in all required fields');
      return;
    }
    createRequestMutation.mutate(newRequest);
  };

  if (!portalAccess) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Loading...</h3>
                  <p className="text-sm text-orange-800">
                    Please wait while we load your booking requests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!portalAccess.can_request_bookings) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Access Denied</h3>
                  <p className="text-sm text-red-800">
                    You do not have permission to request bookings. Please contact the care team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    completed: "bg-gray-100 text-gray-800",
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    declined: XCircle,
    completed: CheckCircle,
  };

  const requestTypeLabels = {
    book_session: "Book Session",
    cancel_session: "Cancel Session",
    reschedule_session: "Reschedule Session",
    change_transport: "Change Transport",
  };

  if (showRequestForm) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setShowRequestForm(false)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>New Booking Request</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Request Type *
                  </label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newRequest.request_type}
                    onChange={(e) => setNewRequest({...newRequest, request_type: e.target.value})}
                  >
                    {Object.entries(requestTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Requested Date *
                  </label>
                  <Input
                    type="date"
                    value={newRequest.requested_date}
                    onChange={(e) => setNewRequest({...newRequest, requested_date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Reason *
                  </label>
                  <Textarea
                    placeholder="Please explain your request..."
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Additional Notes
                  </label>
                  <Textarea
                    placeholder="Any additional information..."
                    value={newRequest.additional_notes}
                    onChange={(e) => setNewRequest({...newRequest, additional_notes: e.target.value})}
                    rows={3}
                  />
                </div>

                {portalAccess.client_type === 'day_centre' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="transport"
                        checked={newRequest.transport_required}
                        onChange={(e) => setNewRequest({...newRequest, transport_required: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <label htmlFor="transport" className="text-sm font-medium text-gray-700">
                        Transport Required
                      </label>
                    </div>
                    
                    {newRequest.transport_required && (
                      <select
                        className="w-full p-2 border rounded-md mt-2"
                        value={newRequest.transport_type}
                        onChange={(e) => setNewRequest({...newRequest, transport_type: e.target.value})}
                      >
                        <option value="centre_transport">Centre Transport</option>
                        <option value="family_transport">Family Transport</option>
                        <option value="taxi">Taxi</option>
                        <option value="self_transport">Self Transport</option>
                      </select>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowRequestForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={createRequestMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const safeBookingRequests = Array.isArray(bookingRequests) ? bookingRequests : [];
  const pendingRequests = safeBookingRequests.filter(r => r && r.status === 'pending');
  const approvedRequests = safeBookingRequests.filter(r => r && r.status === 'approved');
  const completedRequests = safeBookingRequests.filter(r => r && r.status === 'completed');

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Requests</h1>
            <p className="text-gray-500">Request session bookings or changes</p>
          </div>
          <Button
            onClick={() => setShowRequestForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-600">{safeBookingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-600">{completedRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>All Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {safeBookingRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No booking requests yet</p>
                <Button
                  onClick={() => setShowRequestForm(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Create Your First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {safeBookingRequests.map((request) => {
                  if (!request) return null;
                  
                  const StatusIcon = statusIcons[request.status];
                  
                  return (
                    <div
                      key={request.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {requestTypeLabels[request.request_type]}
                            </p>
                            <p className="text-sm text-gray-600">
                              {request.requested_date}
                            </p>
                          </div>
                        </div>
                        <Badge className={statusColors[request.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {request.status}
                        </Badge>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>

                      {request.response_notes && (
                        <div className={`p-3 rounded-lg ${
                          request.status === 'approved' ? 'bg-green-50 border border-green-200' :
                          request.status === 'declined' ? 'bg-red-50 border border-red-200' :
                          'bg-gray-50'
                        }`}>
                          <p className="text-sm font-medium mb-1">
                            {request.status === 'approved' ? 'Approval' :
                             request.status === 'declined' ? 'Declined' : 'Response'}:
                          </p>
                          <p className="text-sm">{request.response_notes}</p>
                          {request.reviewed_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {format(parseISO(request.reviewed_date), 'PPp')}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>Requested: {format(parseISO(request.created_date), 'PPp')}</span>
                        {request.transport_required && (
                          <Badge variant="outline" className="text-xs">
                            Transport: {request.transport_type?.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
