import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const statusColors = {
  pending: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const leaveTypeColors = {
  holiday: "bg-blue-100 text-blue-800",
  sick: "bg-purple-100 text-purple-800",
  personal: "bg-pink-100 text-pink-800",
  emergency: "bg-red-100 text-red-800",
};

export default function LeaveRequestCard({
  request,
  carers,
  isManager,
  currentUserId,
  onApprove,
  onReject,
  onDelete,
  isApproving,
  isRejecting,
}) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [notes, setNotes] = useState("");

  const carer = carers.find(c => c.id === request.carer_id);
  const isOwnRequest = currentUserId === request.carer_id;

  const handleApprove = () => {
    onApprove(request.id, notes);
    setShowApproveDialog(false);
    setNotes("");
  };

  const handleReject = () => {
    if (!notes.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    onReject(request.id, notes);
    setShowRejectDialog(false);
    setNotes("");
  };

  const daysCount = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;

  return (
    <>
      <Card className="hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                  {carer?.full_name?.charAt(0) || "?"}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{carer?.full_name || "Unknown Carer"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={leaveTypeColors[request.leave_type]}>
                      {request.leave_type}
                    </Badge>
                    <Badge className={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {format(parseISO(request.start_date), "MMM d, yyyy")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
                </div>
                {request.created_date && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="text-xs">
                      Requested {format(parseISO(request.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                )}
              </div>

              {request.reason && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600">{request.reason}</p>
                </div>
              )}

              {request.response_notes && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Manager Response:
                      </p>
                      <p className="text-sm text-blue-800">{request.response_notes}</p>
                      {request.approved_by && (
                        <p className="text-xs text-blue-600 mt-1">
                          By {request.approved_by}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800">
                      This leave has been approved. The carer's status will be updated to "On Leave" during this period, and they won't be available for scheduling.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              {isManager && request.status === 'pending' && (
                <>
                  <Button
                    onClick={() => setShowApproveDialog(true)}
                    disabled={isApproving || isRejecting}
                    className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isApproving || isRejecting}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full md:w-auto"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}

              {(isOwnRequest && request.status === 'pending') && (
                <Button
                  onClick={() => onDelete(request.id)}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full md:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel Request
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Leave Request
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Carer:</strong> {carer?.full_name}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Dates:</strong> {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Duration:</strong> {daysCount} day{daysCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <Label htmlFor="approve-notes">Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the staff member..."
                className="h-24"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                The carer's status will be automatically updated to "On Leave" and they won't be available for scheduling during this period.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Leave Request
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Carer:</strong> {carer?.full_name}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Dates:</strong> {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Duration:</strong> {daysCount} day{daysCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <Label htmlFor="reject-notes">Reason for Rejection *</Label>
              <Textarea
                id="reject-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please provide a reason for rejecting this request..."
                className="h-24"
                required
              />
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                The staff member will be notified of this decision via notification.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting || !notes.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}