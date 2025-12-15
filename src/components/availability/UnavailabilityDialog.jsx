import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Calendar, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function UnavailabilityDialog({ staffId, availability, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    type: availability?.date_range_start ? 'range' : 'single',
    specificDate: availability?.specific_date || '',
    startDate: availability?.date_range_start || '',
    endDate: availability?.date_range_end || '',
    reason: availability?.reason || '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CarerAvailability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
      toast.success('Unavailability marked');
      onClose();
    },
    onError: () => {
      toast.error('Failed to mark unavailability');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CarerAvailability.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
      toast.success('Unavailability updated');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update unavailability');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      carer_id: staffId,
      availability_type: 'unavailable',
      reason: formData.reason,
    };

    if (formData.type === 'single') {
      data.specific_date = formData.specificDate;
    } else {
      data.date_range_start = formData.startDate;
      data.date_range_end = formData.endDate;
    }

    if (availability?.id) {
      updateMutation.mutate({ id: availability.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600" />
              Mark Unavailable
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div>
              <Label>Unavailability Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  type="button"
                  variant={formData.type === 'single' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'single' })}
                  className="w-full"
                >
                  Single Day
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'range' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'range' })}
                  className="w-full"
                >
                  Date Range
                </Button>
              </div>
            </div>

            {/* Date Input */}
            {formData.type === 'single' ? (
              <div>
                <Label htmlFor="specificDate">Date</Label>
                <Input
                  id="specificDate"
                  type="date"
                  value={formData.specificDate}
                  onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Holiday, Personal, Sick leave..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}