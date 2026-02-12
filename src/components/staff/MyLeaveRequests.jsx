import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Calendar, Plus, X, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MyLeaveRequests({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: "holiday",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch carer or staff record
  const { data: staffRecord } = useQuery({
    queryKey: ['my-staff-record', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      // Try Carer entity first
      try {
        const carers = await base44.entities.Carer.filter({ email: user.email });
        if (Array.isArray(carers) && carers.length > 0) {
          return { ...carers[0], entity_type: 'Carer' };
        }
      } catch (error) {
        console.log("Carer record not found");
      }
      
      // Try Staff entity
      try {
        const staff = await base44.entities.Staff.filter({ email: user.email });
        if (Array.isArray(staff) && staff.length > 0) {
          return { ...staff[0], entity_type: 'Staff' };
        }
      } catch (error) {
        console.log("Staff record not found");
      }
      
      return null;
    },
    enabled: !!user?.email,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['my-leave-requests', staffRecord?.id],
    queryFn: async () => {
      if (!staffRecord?.id) return [];
      
      // Try LeaveRequest entity (for Carer)
      try {
        const requests = await base44.entities.LeaveRequest.filter({ carer_id: staffRecord.id });
        if (Array.isArray(requests) && requests.length > 0) {
          return requests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
      } catch (error) {
        console.log("LeaveRequest not found");
      }
      
      // Try TimeOffRequest entity (for Staff)
      try {
        const requests = await base44.entities.TimeOffRequest.filter({ staff_id: staffRecord.id });
        if (Array.isArray(requests) && requests.length > 0) {
          return requests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
      } catch (error) {
        console.log("TimeOffRequest not found");
      }
      
      return [];
    },
    enabled: !!staffRecord?.id,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      if (staffRecord.entity_type === 'Carer') {
        return await base44.entities.LeaveRequest.create({
          ...data,
          carer_id: staffRecord.id,
          status: "pending",
        });
      } else {
        // Staff entity uses TimeOffRequest
        return await base44.entities.TimeOffRequest.create({
          staff_id: staffRecord.id,
          start_date: data.start_date,
          end_date: data.end_date,
          type: data.leave_type,
          reason: data.reason,
          status: "pending",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      toast.success("Leave request submitted", "Your request has been sent for approval");
      setShowForm(false);
      setFormData({
        leave_type: "holiday",
        start_date: "",
        end_date: "",
        reason: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to submit request", error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!staffRecord?.id) {
      toast.error("Unable to submit request", "No staff record found for your account. Please contact your administrator.");
      return;
    }
    createRequestMutation.mutate(formData);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Leave Requests</h2>
        {staffRecord?.id ? (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "Request Leave"}
          </Button>
        ) : (
          <div className="text-sm text-red-600 font-medium">
            No staff record found. Contact administrator.
          </div>
        )}
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>New Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="leave_type">Leave Type *</Label>
                <select
                  id="leave_type"
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                >
                  <option value="holiday">Holiday</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Add any additional details..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {leaveRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No leave requests yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Request Leave" to create your first request</p>
            </CardContent>
          </Card>
        ) : (
          leaveRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg capitalize">{(request.leave_type || request.type || '').replace('_', ' ')}</h3>
                      <Badge className={statusColors[request.status]}>
                        <span className="flex items-center gap-1">
                          {statusIcons[request.status]}
                          {request.status}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(parseISO(request.start_date), 'MMM d, yyyy')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                {request.reason && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">{request.reason}</p>
                  </div>
                )}

                {request.response_notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-1">Response from manager:</p>
                    <p className="text-sm text-gray-600">{request.response_notes}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
                  <span>Submitted: {format(parseISO(request.created_date), 'MMM d, yyyy h:mm a')}</span>
                  {request.approved_by && (
                    <span>Reviewed by: {request.approved_by}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}