import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarOff, 
  Plus, 
  Trash2, 
  Calendar,
  AlertCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, parseISO, isAfter, isBefore, isToday, addDays } from "date-fns";

export default function UnavailabilityManager({ carerId, availability = [], leaveRequests = [] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'single', // single, range, recurring
    specific_date: format(new Date(), 'yyyy-MM-dd'),
    date_range_start: format(new Date(), 'yyyy-MM-dd'),
    date_range_end: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    reason: ''
  });

  if (!carerId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No carer selected
        </CardContent>
      </Card>
    );
  }

  const unavailability = Array.isArray(availability) ? availability.filter(a => 
    a?.availability_type === 'unavailable' || a?.availability_type === 'day_off'
  ) : [];

  const approvedLeave = Array.isArray(leaveRequests) ? leaveRequests.filter(l => l?.status === 'approved') : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.CarerAvailability.create({
        carer_id: carerId,
        availability_type: 'unavailable',
        ...data,
        is_recurring: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-availability'] });
      setShowAddForm(false);
      setFormData({
        type: 'single',
        specific_date: format(new Date(), 'yyyy-MM-dd'),
        date_range_start: format(new Date(), 'yyyy-MM-dd'),
        date_range_end: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        start_time: '',
        end_time: '',
        reason: ''
      });
      toast.success("Added", "Unavailability period added");
    },
    onError: () => {
      toast.error("Error", "Failed to add unavailability");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarerAvailability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-availability'] });
      toast.success("Removed", "Unavailability removed");
    }
  });

  const handleSubmit = () => {
    const data = {
      reason: formData.reason
    };

    if (formData.type === 'single') {
      data.specific_date = formData.specific_date;
      if (formData.start_time && formData.end_time) {
        data.start_time = formData.start_time;
        data.end_time = formData.end_time;
      }
    } else {
      data.date_range_start = formData.date_range_start;
      data.date_range_end = formData.date_range_end;
    }

    createMutation.mutate(data);
  };

  const getStatusBadge = (item) => {
    const today = new Date();
    const startDate = item.specific_date ? parseISO(item.specific_date) : parseISO(item.date_range_start);
    const endDate = item.date_range_end ? parseISO(item.date_range_end) : startDate;

    if (isAfter(startDate, today)) {
      return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
    }
    if (isBefore(endDate, today)) {
      return <Badge className="bg-gray-100 text-gray-600">Past</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Approved Leave Requests */}
      {approvedLeave.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <Calendar className="w-4 h-4" />
              Approved Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {approvedLeave.map(leave => (
                <div key={leave.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(parseISO(leave.start_date), 'MMM d')} - {format(parseISO(leave.end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">{leave.leave_type || 'Annual Leave'}</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">
                    Via Leave System
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Unavailability Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5" />
              Unavailability Periods
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "outline" : "default"}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              {showAddForm ? 'Cancel' : 'Add Unavailability'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Day</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'single' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={formData.specific_date}
                      onChange={(e) => setFormData({ ...formData, specific_date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">From Time (optional)</label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">To Time (optional)</label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Leave times empty for full day unavailability</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={formData.date_range_start}
                      onChange={(e) => setFormData({ ...formData, date_range_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={formData.date_range_end}
                      onChange={(e) => setFormData({ ...formData, date_range_end: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g., Personal appointment, Training, etc."
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Unavailability'}
              </Button>
            </div>
          )}

          {/* List of unavailability */}
          {unavailability.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No unavailability periods set</p>
              <p className="text-sm">Add periods when this carer is not available for shifts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unavailability.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      {item.start_time ? (
                        <Clock className="w-5 h-5 text-orange-600" />
                      ) : (
                        <CalendarOff className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.specific_date ? (
                          format(parseISO(item.specific_date), 'EEEE, MMM d, yyyy')
                        ) : (
                          `${format(parseISO(item.date_range_start), 'MMM d')} - ${format(parseISO(item.date_range_end), 'MMM d, yyyy')}`
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {item.start_time && item.end_time && (
                          <span>{item.start_time} - {item.end_time}</span>
                        )}
                        {item.reason && <span>• {item.reason}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}