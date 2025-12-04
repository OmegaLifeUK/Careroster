import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Users, Calendar, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function BulkShiftRequestDialog({ shifts = [], carers = [], clients = [], onClose }) {
  const [selectedCarers, setSelectedCarers] = useState([]);
  const [message, setMessage] = useState(
    "Hi, we have shifts that need coverage. Would you be available to work any of these? Please let us know as soon as possible."
  );
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get active carers who could potentially cover
  const availableCarers = carers.filter(c => c && c.status === 'active');

  const toggleCarer = (carerId) => {
    setSelectedCarers(prev =>
      prev.includes(carerId) ? prev.filter(id => id !== carerId) : [...prev, carerId]
    );
  };

  const selectAllCarers = () => {
    if (selectedCarers.length === availableCarers.length) {
      setSelectedCarers([]);
    } else {
      setSelectedCarers(availableCarers.map(c => c.id));
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c?.id === clientId);
    return client?.full_name || 'Unknown Client';
  };

  const sendRequests = async () => {
    if (selectedCarers.length === 0) {
      toast.error("No Carers Selected", "Please select at least one carer to send requests to");
      return;
    }

    setIsSending(true);
    const user = await base44.auth.me();
    let successCount = 0;

    try {
      // Create a single bulk shift request record
      await base44.entities.ShiftRequest.create({
        shift_ids: shifts.map(s => s.id),
        requested_by_staff_id: user.id || user.email,
        carer_ids: selectedCarers,
        shift_count: shifts.length,
        message: message,
        priority: 'high',
        status: 'pending',
        is_bulk: true,
        created_at: new Date().toISOString()
      });

      // Send notifications to each selected carer
      const shiftSummary = shifts
        .slice(0, 3)
        .map(s => `${format(parseISO(s.date), 'EEE dd MMM')} ${s.start_time}-${s.end_time}`)
        .join(', ');
      const moreText = shifts.length > 3 ? ` and ${shifts.length - 3} more` : '';

      for (const carerId of selectedCarers) {
        const carer = carers.find(c => c.id === carerId);
        if (carer?.email) {
          try {
            await base44.entities.Notification.create({
              recipient_email: carer.email,
              title: `Coverage Request: ${shifts.length} Shift${shifts.length > 1 ? 's' : ''}`,
              message: `You have been asked to cover shifts: ${shiftSummary}${moreText}. ${message}`,
              type: "shift_request",
              priority: "high",
              is_read: false,
              related_entity_type: "ShiftRequest"
            });
            successCount++;
          } catch (e) {
            console.error("Failed to notify carer:", carerId, e);
          }
        }
      }

      toast.success(
        "Requests Sent",
        `Coverage requests sent to ${successCount} carer${successCount !== 1 ? 's' : ''} for ${shifts.length} shift${shifts.length !== 1 ? 's' : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['shift-requests'] });
      onClose();
    } catch (error) {
      console.error("Failed to create bulk request:", error);
      toast.error("Error", "Failed to send shift requests");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Send Bulk Coverage Requests
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Request coverage for {shifts.length} shift{shifts.length !== 1 ? 's' : ''} from selected carers
          </p>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          {/* Shifts Summary */}
          <div className="mb-6">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Shifts to Request Coverage For ({shifts.length})
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
              {shifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">
                      {format(parseISO(shift.date), 'EEE dd MMM')}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {shift.start_time} - {shift.end_time}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getClientName(shift.client_id)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Carer Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Carers to Request ({selectedCarers.length} selected)
              </h3>
              <Button size="sm" variant="outline" onClick={selectAllCarers}>
                {selectedCarers.length === availableCarers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
              {availableCarers.map((carer) => (
                <label
                  key={carer.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${
                    selectedCarers.includes(carer.id) ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedCarers.includes(carer.id)}
                    onCheckedChange={() => toggleCarer(carer.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{carer.full_name}</p>
                    <p className="text-xs text-gray-500">{carer.email}</p>
                  </div>
                  {carer.available_for_overtime && (
                    <Badge className="bg-green-100 text-green-700 text-xs">OT Available</Badge>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Message to Carers</h3>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Enter a message to include with the request..."
            />
          </div>
        </CardContent>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={sendRequests}
            disabled={selectedCarers.length === 0 || isSending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedCarers.length} Carer{selectedCarers.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}