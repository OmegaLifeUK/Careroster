import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Calendar, User, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, parseISO, isPast } from "date-fns";

export default function MyShiftRequests() {
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseNotes, setResponseNotes] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: shiftRequests = [], isLoading } = useQuery({
    queryKey: ['my-shift-requests'],
    queryFn: async () => {
      if (!user) return [];
      const allRequests = await base44.entities.ShiftRequest.list('-created_date');
      
      // Filter requests sent to this carer
      return Array.isArray(allRequests) 
        ? allRequests.filter(r => 
            r && 
            Array.isArray(r.carer_ids) && 
            r.carer_ids.includes(user.email)
          )
        : [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, response }) => {
      const request = shiftRequests.find(r => r && r.id === requestId);
      if (!request) throw new Error("Request not found");

      const existingResponses = Array.isArray(request.responses) ? request.responses : [];
      const newResponse = {
        carer_id: user.email,
        response: response,
        response_date: new Date().toISOString(),
        notes: responseNotes.trim() || undefined
      };

      // Update or add response
      const updatedResponses = existingResponses.filter(r => r && r.carer_id !== user.email);
      updatedResponses.push(newResponse);

      // Determine new status
      const acceptedCount = updatedResponses.filter(r => r && r.response === 'accepted').length;
      const declinedCount = updatedResponses.filter(r => r && r.response === 'declined').length;
      const totalCarers = request.carer_ids?.length || 0;

      let newStatus = request.status;
      if (acceptedCount > 0 && acceptedCount < totalCarers) {
        newStatus = 'partially_accepted';
      } else if (acceptedCount === totalCarers) {
        newStatus = 'accepted';
      } else if (declinedCount === totalCarers) {
        newStatus = 'declined';
      }

      // Update shift request
      const updated = await base44.entities.ShiftRequest.update(requestId, {
        responses: updatedResponses,
        status: newStatus,
        assigned_to_carer_id: response === 'accepted' ? user.email : undefined
      });

      // If accepted, update the shift
      if (response === 'accepted') {
        await base44.entities.Shift.update(request.shift_id, {
          carer_id: user.email,
          status: 'scheduled'
        });
      }

      return updated;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-shift-requests'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      
      toast.success(
        "Response Sent",
        `You ${variables.response} the shift request`
      );
      setRespondingTo(null);
      setResponseNotes("");
    },
    onError: (error) => {
      toast.error("Error", "Failed to respond: " + error.message);
    }
  });

  const getClientName = (clientId) => {
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === clientId) : null;
    return client?.full_name || 'Unknown';
  };

  const getMyResponse = (request) => {
    if (!request || !Array.isArray(request.responses)) return null;
    return request.responses.find(r => r && r.carer_id === user?.email);
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    try {
      return isPast(parseISO(expiresAt));
    } catch {
      return false;
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    partially_accepted: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    assigned: "bg-purple-100 text-purple-800"
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Shift Requests</h2>
        <Badge variant="outline">
          {shiftRequests.filter(r => r && !getMyResponse(r) && !isExpired(r.expires_at)).length} pending
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : shiftRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shift Requests</h3>
            <p className="text-gray-500">You don't have any shift requests at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shiftRequests.map(request => {
            if (!request) return null;
            
            const myResponse = getMyResponse(request);
            const expired = isExpired(request.expires_at);
            const canRespond = !myResponse && !expired;

            return (
              <Card key={request.id} className={`${
                canRespond ? 'border-l-4 border-blue-500' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          Shift Request
                        </h3>
                        <Badge className={statusColors[request.status]}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                        {request.priority !== 'normal' && (
                          <Badge className={priorityColors[request.priority]}>
                            {request.priority}
                          </Badge>
                        )}
                        {expired && (
                          <Badge className="bg-gray-100 text-gray-800">Expired</Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-500">Client</p>
                            <p className="font-medium">{getClientName(request.client_id)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="font-medium">
                              {request.shift_date && format(parseISO(request.shift_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-500">Time</p>
                            <p className="font-medium">
                              {request.start_time} - {request.end_time}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request.message && (
                        <div className="p-3 bg-blue-50 rounded-lg mb-4">
                          <p className="text-sm text-blue-900">{request.message}</p>
                        </div>
                      )}

                      {myResponse && (
                        <div className={`p-3 rounded-lg mb-4 ${
                          myResponse.response === 'accepted' ? 'bg-green-50' :
                          myResponse.response === 'declined' ? 'bg-red-50' :
                          'bg-yellow-50'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {myResponse.response === 'accepted' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : myResponse.response === 'declined' ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-600" />
                            )}
                            <p className="font-semibold">
                              You {myResponse.response} this request
                            </p>
                          </div>
                          {myResponse.notes && (
                            <p className="text-sm mt-2">{myResponse.notes}</p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            {myResponse.response_date && format(parseISO(myResponse.response_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {canRespond && respondingTo === request.id ? (
                    <div className="space-y-4 pt-4 border-t">
                      <Textarea
                        value={responseNotes}
                        onChange={(e) => setResponseNotes(e.target.value)}
                        placeholder="Add optional notes with your response..."
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => respondMutation.mutate({ requestId: request.id, response: 'accepted' })}
                          disabled={respondMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept Shift
                        </Button>
                        <Button
                          onClick={() => respondMutation.mutate({ requestId: request.id, response: 'declined' })}
                          disabled={respondMutation.isPending}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseNotes("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : canRespond ? (
                    <Button
                      onClick={() => setRespondingTo(request.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Respond to Request
                    </Button>
                  ) : null}

                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t flex items-center justify-between">
                    <span>
                      Sent {request.created_date && format(parseISO(request.created_date), 'MMM d, h:mm a')}
                    </span>
                    {request.expires_at && (
                      <span className={expired ? 'text-red-600' : 'text-orange-600'}>
                        {expired ? 'Expired' : 'Expires'} {format(parseISO(request.expires_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}