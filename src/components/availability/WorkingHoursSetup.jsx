import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Clock, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export default function WorkingHoursSetup({ staffId, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingAvailability = [] } = useQuery({
    queryKey: ['staff-availability', staffId],
    queryFn: async () => {
      const all = await base44.entities.CarerAvailability.list();
      return all.filter(a => a.carer_id === staffId && a.availability_type === 'working_hours');
    },
  });

  const [schedulePattern, setSchedulePattern] = useState('weekly');
  const [workingDays, setWorkingDays] = useState(() => {
    const days = {};
    DAYS.forEach(day => {
      const existing = existingAvailability.find(a => a.day_of_week === day.value);
      days[day.value] = {
        enabled: !!existing,
        startTime: existing?.start_time || '09:00',
        endTime: existing?.end_time || '17:00',
        id: existing?.id,
      };
    });
    return days;
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CarerAvailability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CarerAvailability.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarerAvailability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
    },
  });

  const handleDayToggle = (dayValue) => {
    setWorkingDays(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        enabled: !prev[dayValue].enabled,
      },
    }));
  };

  const handleTimeChange = (dayValue, field, value) => {
    setWorkingDays(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      const promises = [];

      if (schedulePattern === 'alternate_weeks') {
        // Create entries for both week 1 and week 2
        for (const day of DAYS) {
          const dayData = workingDays[day.value];
          
          if (dayData.enabled) {
            // Week 1
            const week1Data = {
              carer_id: staffId,
              availability_type: 'working_hours',
              day_of_week: day.value,
              start_time: dayData.startTime,
              end_time: dayData.endTime,
              is_recurring: true,
              schedule_pattern: 'alternate_week_1',
            };

            // Week 2
            const week2Data = {
              carer_id: staffId,
              availability_type: 'working_hours',
              day_of_week: day.value,
              start_time: dayData.startTime,
              end_time: dayData.endTime,
              is_recurring: true,
              schedule_pattern: 'alternate_week_2',
            };

            promises.push(createMutation.mutateAsync(week1Data));
            promises.push(createMutation.mutateAsync(week2Data));
          }
        }
      } else {
        // Standard weekly pattern
        for (const day of DAYS) {
          const dayData = workingDays[day.value];
          
          if (dayData.enabled) {
            const data = {
              carer_id: staffId,
              availability_type: 'working_hours',
              day_of_week: day.value,
              start_time: dayData.startTime,
              end_time: dayData.endTime,
              is_recurring: true,
              schedule_pattern: 'weekly',
            };

            if (dayData.id) {
              promises.push(updateMutation.mutateAsync({ id: dayData.id, data }));
            } else {
              promises.push(createMutation.mutateAsync(data));
            }
          } else if (dayData.id) {
            promises.push(deleteMutation.mutateAsync(dayData.id));
          }
        }
      }

      await Promise.all(promises);
      toast.success('Working hours updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update working hours');
    }
  };

  const handleApplyToAll = () => {
    const monday = workingDays[1];
    const newDays = {};
    DAYS.forEach(day => {
      newDays[day.value] = {
        ...workingDays[day.value],
        startTime: monday.startTime,
        endTime: monday.endTime,
        enabled: monday.enabled,
      };
    });
    setWorkingDays(newDays);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Set Working Hours
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Schedule Pattern Selection */}
          <div className="space-y-2">
            <Label className="font-semibold">Schedule Pattern</Label>
            <div className="flex gap-2">
              <Button
                variant={schedulePattern === 'weekly' ? 'default' : 'outline'}
                onClick={() => setSchedulePattern('weekly')}
                className="flex-1"
              >
                Every Week
              </Button>
              <Button
                variant={schedulePattern === 'alternate_weeks' ? 'default' : 'outline'}
                onClick={() => setSchedulePattern('alternate_weeks')}
                className="flex-1"
              >
                Alternate Weeks
              </Button>
            </div>
            {schedulePattern === 'alternate_weeks' && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                This will apply the same hours to both weeks. You can edit specific weeks later.
              </p>
            )}
          </div>

          {/* Apply to All Days */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-blue-900">Quick Setup</h4>
                <p className="text-xs text-blue-700 mt-1">Apply Monday's hours to all days</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleApplyToAll}>
                Apply to All
              </Button>
            </div>
          </div>

          {/* Days Configuration */}
          <div className="space-y-4">
            {DAYS.map(day => {
              const dayData = workingDays[day.value];
              return (
                <div key={day.value} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={dayData.enabled}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <Label className="font-semibold w-24">{day.label}</Label>
                    
                    {dayData.enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={dayData.startTime}
                          onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-gray-500">to</span>
                        <Input
                          type="time"
                          value={dayData.endTime}
                          onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600 ml-2">
                          {(() => {
                            const start = dayData.startTime.split(':');
                            const end = dayData.endTime.split(':');
                            const hours = (parseInt(end[0]) * 60 + parseInt(end[1])) - 
                                        (parseInt(start[0]) * 60 + parseInt(start[1]));
                            return `(${(hours / 60).toFixed(1)}h)`;
                          })()}
                        </span>
                      </div>
                    )}
                    
                    {!dayData.enabled && (
                      <span className="text-gray-400 text-sm">Not working</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Working Hours
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}