
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

import LeaveRequestDialog from "../components/leave/LeaveRequestDialog";
import LeaveRequestCard from "../components/leave/LeaveRequestCard";

export default function LeaveRequests() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [carer, setCarer] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Try to find carer record
        const allCarers = await base44.entities.Carer.list();
        const carerRecord = allCarers.find(c => c.email === userData.email);
        setCarer(carerRecord);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      const request = leaveRequests.find(r => r.id === id);
      if (!request) throw new Error("Request not found");

      // Update leave request
      await base44.entities.LeaveRequest.update(id, {
        status: "approved",
        approved_by: user.email,
        response_notes: notes,
      });

      // Update carer status to on_leave
      if (request.carer_id) {
        await base44.entities.Carer.update(request.carer_id, {
          status: "on_leave",
        });
      }

      // Send notification to carer
      const carer = carers.find(c => c.id === request.carer_id);
      if (carer) {
        await base44.entities.Notification.create({
          recipient_id: carer.email,
          title: "Leave Request Approved",
          message: `Your ${request.leave_type} leave request from ${format(parseISO(request.start_date), "MMM d")} to ${format(parseISO(request.end_date), "MMM d")} has been approved.${notes ? ` Manager notes: ${notes}` : ''}`,
          type: "leave_request",
          priority: "normal",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['carers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      const request = leaveRequests.find(r => r.id === id);
      if (!request) throw new Error("Request not found");

      // Update leave request
      await base44.entities.LeaveRequest.update(id, {
        status: "rejected",
        approved_by: user.email,
        response_notes: notes || "Request declined",
      });

      // Send notification to carer
      const carer = carers.find(c => c.id === request.carer_id);
      if (carer) {
        await base44.entities.Notification.create({
          recipient_id: carer.email,
          title: "Leave Request Declined",
          message: `Your ${request.leave_type} leave request from ${format(parseISO(request.start_date), "MMM d")} to ${format(parseISO(request.end_date), "MMM d")} has been declined.${notes ? ` Reason: ${notes}` : ''}`,
          type: "leave_request",
          priority: "high",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeaveRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const handleApprove = (id, notes) => {
    approveMutation.mutate({ id, notes });
  };

  const handleReject = (id, notes) => {
    rejectMutation.mutate({ id, notes });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this leave request?")) {
      deleteMutation.mutate(id);
    }
  };

  const isManager = user?.role === 'admin';

  const filteredRequests = leaveRequests.filter(request => {
    // If not manager, only show own requests
    if (!isManager && carer) {
      if (request.carer_id !== carer.id) return false;
    }

    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  };

  const statusButtons = [
    { value: "all", label: "All", count: filteredRequests.length },
    { value: "pending", label: "Pending", count: leaveRequests.filter(r => r.status === 'pending').length },
    { value: "approved", label: "Approved", count: leaveRequests.filter(r => r.status === 'approved').length },
    { value: "rejected", label: "Rejected", count: leaveRequests.filter(r => r.status === 'rejected').length },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Requests</h1>
            <p className="text-gray-500">
              {isManager ? "Manage staff leave requests" : "View and submit leave requests"}
            </p>
          </div>
          {carer && (
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600">Total Requests</p>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Approved</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {stats.pending > 0 && isManager && (
          <Card className="mb-6 bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Action Required</h3>
                  <p className="text-sm text-orange-800">
                    {stats.pending} leave request{stats.pending !== 1 ? 's' : ''} pending your review
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2">
              {statusButtons.map(btn => (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(btn.value)}
                >
                  {btn.label} ({btn.value === "all" ? filteredRequests.length : btn.count})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <LeaveRequestCard
              key={request.id}
              request={request}
              carers={carers}
              isManager={isManager}
              currentUserId={carer?.id}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}

          {filteredRequests.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
                <p className="text-gray-500">
                  {statusFilter === "pending" 
                    ? "No pending leave requests at the moment"
                    : "No leave requests found"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {showDialog && (
          <LeaveRequestDialog
            carer={carer}
            onClose={() => setShowDialog(false)}
          />
        )}
      </div>
    </div>
  );
}
