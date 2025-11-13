import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Send, Clock, User, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, parseISO, addHours } from "date-fns";

export default function ShiftRequestDialog({ shift, client, carers = [], onClose }) {
  const [selectedCarers, setSelectedCarers] = useState(new Set());
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [expiryHours, setExpiryHours] = useState(24);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendRequestMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Create shift request
      const request = await base44.entities.ShiftRequest.create({
        shift_id: shift.id,
        requested_by_staff_id: user.email,
        carer_ids: Array.from(selectedCarers),
        client_id: shift.client_id,
        shift_date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        duration_hours: shift.duration_hours,
        message: message.trim() || undefined,
        priority: priority,
        status: "pending",
        expires_at: addHours(new Date(), expiryHours).toISOString(),
        responses: []
      });

      // Create staff messages for each carer
      for (const carerId of selectedCarers) {
        await base44.entities.StaffMessage.create({
          sender_id: user.email,
          sender_name: user.full_name || user.email,
          recipient_ids: [carerId],
          subject: `Shift Request: ${client?.full_name || 'Client'} on ${shift.date}`,
          message: message.trim() || `You have a new shift request. Please respond as soon as possible.`,
          message_type: "shift_request",
          priority: priority,
          related_entity_type: "shift_request",
          related_entity_id: request.id,
          read_by: [],
          requires_acknowledgment: true,
          acknowledgments: []
        });

        // Create notification
        await base44.entities.Notification.create({
          recipient_id: carerId,
          title: "New Shift Request",
          message: `You have a shift request for ${shift.date} at ${shift.start_time}`,
          type: "shift_request",
          priority: priority,
          is_read: false,
          related_entity_id: request.id,
          related_entity_type: "shift"
        });
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-requests'] });
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      toast.success(
        "Request Sent",
        `Shift request sent to ${selectedCarers.size} carer${selectedCarers.size > 1 ? 's' : ''}`
      );
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to send shift request: " + error.message);
    }
  });

  const toggleCarer = (carerId) => {
    const newSelected = new Set(selectedCarers);
    if (newSelected.has(carerId)) {
      newSelected.delete(carerId);
    } else {
      newSelected.add(carerId);
    }
    setSelectedCarers(newSelected);
  };

  const selectAll = () => {
    setSelectedCarers(new Set(carers.filter(c => c && c.status === 'active').map(c => c.id)));
  };

  const clearAll = () => {
    setSelectedCarers(new Set());
  };

  const activeCarers = Array.isArray(carers) ? carers.filter(c => c && c.status === 'active') : [];

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Send Shift Request</CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  Request carers to accept this shift
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          {/* Shift Details */}
          <Card className="mb-6 border-2 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Shift Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Client</p>
                    <p className="font-medium">{client?.full_name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium">{shift.date && format(parseISO(shift.date), 'EEE, MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="font-medium">{shift.start_time} - {shift.end_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-medium">{shift.duration_hours || 0} hours</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Priority Level
            </label>
            <div className="flex gap-2">
              {['low', 'normal', 'high', 'urgent'].map(p => (
                <Button
                  key={p}
                  variant={priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(p)}
                  className={priority === p ? priorityColors[p] : ''}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Expiry Time */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Request Expires In
            </label>
            <div className="flex gap-2">
              {[12, 24, 48, 72].map(hours => (
                <Button
                  key={hours}
                  variant={expiryHours === hours ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpiryHours(hours)}
                >
                  {hours}h
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Message (Optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any additional information for the carers..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Carer Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-900">
                Select Carers ({selectedCarers.size} selected)
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
            </div>

            {activeCarers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No active carers available</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                {activeCarers.map(carer => (
                  <div
                    key={carer.id}
                    onClick={() => toggleCarer(carer.id)}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedCarers.has(carer.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedCarers.has(carer.id)}
                      onCheckedChange={() => toggleCarer(carer.id)}
                    />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {carer.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {carer.full_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {carer.employment_type?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <div className="p-6 border-t bg-gray-50 flex gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => sendRequestMutation.mutate()}
            disabled={selectedCarers.size === 0 || sendRequestMutation.isPending}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {sendRequestMutation.isPending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedCarers.size} Carer{selectedCarers.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}