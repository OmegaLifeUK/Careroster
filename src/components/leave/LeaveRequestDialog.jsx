import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, AlertCircle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

export default function LeaveRequestDialog({ carer, onClose }) {
  const [formData, setFormData] = useState({
    leave_type: "holiday",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create leave request
      const request = await base44.entities.LeaveRequest.create({
        carer_id: carer.id,
        ...data,
        status: "pending",
      });

      // Notify all admin users
      try {
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        const days = differenceInDays(parseISO(data.end_date), parseISO(data.start_date)) + 1;

        const notificationPromises = admins.map(admin =>
          base44.entities.Notification.create({
            recipient_id: admin.email,
            title: `New Leave Request: ${carer.full_name}`,
            message: `${carer.full_name} has requested ${data.leave_type} leave from ${format(parseISO(data.start_date), "MMM d, yyyy")} to ${format(parseISO(data.end_date), "MMM d, yyyy")} (${days} day${days !== 1 ? 's' : ''}).`,
            type: "leave_request",
            priority: "high",
            is_read: false,
            related_entity_type: "leave_request",
            related_entity_id: request.id,
          })
        );

        await Promise.all(notificationPromises);
      } catch (error) {
        console.error("Error creating notifications:", error);
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date) {
      alert("Please select start and end dates");
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (endDate < startDate) {
      alert("End date must be after start date");
      return;
    }

    createMutation.mutate(formData);
  };

  const getDaysCount = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    try {
      return differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1;
    } catch {
      return 0;
    }
  };

  const daysCount = getDaysCount();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Request Leave
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="leave_type">Leave Type *</Label>
              <Select
                value={formData.leave_type}
                onValueChange={(value) => handleInputChange("leave_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange("start_date", e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
                min={formData.start_date || format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>

            {daysCount > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Duration:</strong> {daysCount} day{daysCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                placeholder="Provide additional details if needed..."
                className="h-24"
              />
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  Your manager will be notified and will review your request. You'll receive a notification once a decision is made.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}