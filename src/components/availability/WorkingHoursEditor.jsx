import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Clock, Save, RotateCcw, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

export default function WorkingHoursEditor({ carerId, availability = [] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const workingHours = availability.filter(a => a.availability_type === 'working_hours');

  const getDefaultHours = () => {
    const defaults = {};
    DAYS_OF_WEEK.forEach(day => {
      const existing = workingHours.find(w => w.day_of_week === day.value);
      defaults[day.value] = existing ? {
        enabled: true,
        start_time: existing.start_time || '09:00',
        end_time: existing.end_time || '17:00',
        id: existing.id
      } : {
        enabled: false,
        start_time: '09:00',
        end_time: '17:00',
        id: null
      };
    });
    return defaults;
  };

  const [hours, setHours] = useState(getDefaultHours);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHours(getDefaultHours());
    setHasChanges(false);
  }, [carerId, availability]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = [];

      for (const day of DAYS_OF_WEEK) {
        const dayHours = hours[day.value];
        const existing = workingHours.find(w => w.day_of_week === day.value);

        if (dayHours.enabled) {
          const data = {
            carer_id: carerId,
            availability_type: 'working_hours',
            day_of_week: day.value,
            start_time: dayHours.start_time,
            end_time: dayHours.end_time,
            is_recurring: true
          };

          if (existing) {
            promises.push(base44.entities.CarerAvailability.update(existing.id, data));
          } else {
            promises.push(base44.entities.CarerAvailability.create(data));
          }
        } else if (existing) {
          promises.push(base44.entities.CarerAvailability.delete(existing.id));
        }
      }

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer-availability'] });
      setHasChanges(false);
      toast.success("Saved", "Working hours updated successfully");
    },
    onError: () => {
      toast.error("Error", "Failed to save working hours");
    }
  });

  const handleDayToggle = (dayValue, enabled) => {
    setHours(prev => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], enabled }
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (dayValue, field, value) => {
    setHours(prev => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], [field]: value }
    }));
    setHasChanges(true);
  };

  const applyToWeekdays = () => {
    const monday = hours[1];
    const weekdays = [1, 2, 3, 4, 5];
    const newHours = { ...hours };
    weekdays.forEach(day => {
      newHours[day] = { ...monday, id: hours[day]?.id };
    });
    setHours(newHours);
    setHasChanges(true);
    toast.success("Applied", "Monday hours applied to all weekdays");
  };

  const resetToDefault = () => {
    const defaultHours = {};
    DAYS_OF_WEEK.forEach(day => {
      const isWeekday = day.value >= 1 && day.value <= 5;
      defaultHours[day.value] = {
        enabled: isWeekday,
        start_time: '09:00',
        end_time: '17:00',
        id: hours[day.value]?.id
      };
    });
    setHours(defaultHours);
    setHasChanges(true);
  };

  const calculateTotalHours = () => {
    let total = 0;
    Object.entries(hours).forEach(([_, dayHours]) => {
      if (dayHours.enabled) {
        const [startH, startM] = dayHours.start_time.split(':').map(Number);
        const [endH, endM] = dayHours.end_time.split(':').map(Number);
        total += (endH * 60 + endM - startH * 60 - startM) / 60;
      }
    });
    return total.toFixed(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Weekly Working Hours
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-600">
              {calculateTotalHours()} hrs/week
            </Badge>
            <Button variant="outline" size="sm" onClick={applyToWeekdays}>
              <Copy className="w-4 h-4 mr-1" />
              Apply Mon to Weekdays
            </Button>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map(day => {
            const dayHours = hours[day.value];
            const isWeekend = day.value === 0 || day.value === 6;
            
            return (
              <div 
                key={day.value}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  dayHours.enabled 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="w-28">
                  <span className={`font-medium ${isWeekend ? 'text-purple-700' : 'text-gray-900'}`}>
                    {day.label}
                  </span>
                </div>

                <Switch
                  checked={dayHours.enabled}
                  onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                />

                {dayHours.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayHours.start_time}
                      onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={dayHours.end_time}
                      onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      className="w-32"
                    />
                    <Badge className="bg-green-100 text-green-700">
                      {(() => {
                        const [startH, startM] = dayHours.start_time.split(':').map(Number);
                        const [endH, endM] = dayHours.end_time.split(':').map(Number);
                        const hrs = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                        return `${hrs.toFixed(1)} hrs`;
                      })()}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Not working</span>
                )}
              </div>
            );
          })}
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Working Hours'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}