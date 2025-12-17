import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Save, RotateCcw, Copy, CalendarDays } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { addWeeks, startOfWeek, addDays, format } from "date-fns";

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

  const workingHours = Array.isArray(availability) ? availability.filter(a => a?.availability_type === 'working_hours') : [];
  
  const [scheduleType, setScheduleType] = useState('weekly');
  const [selectedWeek, setSelectedWeek] = useState('week1');
  const [hoursWeek1, setHoursWeek1] = useState({});
  const [hoursWeek2, setHoursWeek2] = useState({});
  const [specificDates, setSpecificDates] = useState([]);

  const getDefaultHours = (pattern = null) => {
    const defaults = {};
    DAYS_OF_WEEK.forEach(day => {
      const existing = workingHours.find(w => 
        w?.day_of_week === day.value && 
        (!pattern || w.schedule_pattern === pattern)
      );
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

  const [hours, setHours] = useState(() => getDefaultHours());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!carerId) return;
    
    const hasWeek1 = workingHours.some(w => w?.schedule_pattern === 'alternate_week_1');
    const hasWeek2 = workingHours.some(w => w?.schedule_pattern === 'alternate_week_2');
    const hasSpecific = workingHours.some(w => w?.schedule_pattern === 'specific_date');
    
    if (hasWeek1 || hasWeek2) {
      setScheduleType('alternate_weeks');
      const week1Hours = getDefaultHours('alternate_week_1');
      const week2Hours = getDefaultHours('alternate_week_2');
      setHoursWeek1(week1Hours);
      setHoursWeek2(week2Hours);
      // Keep the current selected week view
      const currentWeek = selectedWeek || 'week1';
      setHours(currentWeek === 'week2' ? week2Hours : week1Hours);
    } else if (hasSpecific) {
      setScheduleType('specific_dates');
      const dates = workingHours
        .filter(w => w?.schedule_pattern === 'specific_date' && w?.specific_date)
        .map(w => w.specific_date);
      setSpecificDates(dates);
    } else {
      setScheduleType('weekly');
      setHours(getDefaultHours('weekly'));
    }
    
    setHasChanges(false);
  }, [carerId, availability]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = [];

      // Delete all existing working hours for this carer first
      for (const existing of workingHours) {
        promises.push(base44.entities.CarerAvailability.delete(existing.id));
      }
      await Promise.all(promises);
      promises.length = 0;

      if (scheduleType === 'specific_dates') {
        // Save specific dates
        for (const dateStr of specificDates) {
          const data = {
            carer_id: carerId,
            availability_type: 'working_hours',
            schedule_pattern: 'specific_date',
            specific_date: dateStr,
            is_recurring: false,
            start_time: '09:00',
            end_time: '17:00'
          };
          promises.push(base44.entities.CarerAvailability.create(data));
        }
      } else if (scheduleType === 'alternate_weeks') {
        // Get the latest data for both weeks
        // Current `hours` state contains the active week's latest edits
        // hoursWeek1/hoursWeek2 contain the stored data for the other week
        let week1Data, week2Data;
        
        if (selectedWeek === 'week1') {
          week1Data = hours; // Current edits are for week 1
          week2Data = hoursWeek2; // Week 2 from stored state
        } else {
          week1Data = hoursWeek1; // Week 1 from stored state
          week2Data = hours; // Current edits are for week 2
        }
        
        // Save both week patterns
        const saveWeekPattern = (weekHours, pattern) => {
          for (const day of DAYS_OF_WEEK) {
            const dayHours = weekHours[day.value];
            if (dayHours && dayHours.enabled) {
              const data = {
                carer_id: carerId,
                availability_type: 'working_hours',
                schedule_pattern: pattern,
                day_of_week: day.value,
                start_time: dayHours.start_time,
                end_time: dayHours.end_time,
                is_recurring: true
              };
              promises.push(base44.entities.CarerAvailability.create(data));
            }
          }
        };

        saveWeekPattern(week1Data, 'alternate_week_1');
        saveWeekPattern(week2Data, 'alternate_week_2');
      } else {
        // Standard weekly pattern
        for (const day of DAYS_OF_WEEK) {
          const dayHours = hours[day.value];
          if (dayHours && dayHours.enabled) {
            const data = {
              carer_id: carerId,
              availability_type: 'working_hours',
              schedule_pattern: 'weekly',
              day_of_week: day.value,
              start_time: dayHours.start_time,
              end_time: dayHours.end_time,
              is_recurring: true
            };
            promises.push(base44.entities.CarerAvailability.create(data));
          }
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
    const newHours = {
      ...hours,
      [dayValue]: { ...hours[dayValue], enabled }
    };
    setHours(newHours);
    
    // Update the appropriate week state immediately
    if (scheduleType === 'alternate_weeks') {
      if (selectedWeek === 'week1') {
        setHoursWeek1(newHours);
      } else {
        setHoursWeek2(newHours);
      }
    }
    
    setHasChanges(true);
  };

  const handleTimeChange = (dayValue, field, value) => {
    const newHours = {
      ...hours,
      [dayValue]: { ...hours[dayValue], [field]: value }
    };
    setHours(newHours);
    
    // Update the appropriate week state immediately
    if (scheduleType === 'alternate_weeks') {
      if (selectedWeek === 'week1') {
        setHoursWeek1(newHours);
      } else {
        setHoursWeek2(newHours);
      }
    }
    
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
    
    // Update week state if in alternate weeks mode
    if (scheduleType === 'alternate_weeks') {
      if (selectedWeek === 'week1') {
        setHoursWeek1(newHours);
      } else {
        setHoursWeek2(newHours);
      }
    }
    
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
    
    // Update week state if in alternate weeks mode
    if (scheduleType === 'alternate_weeks') {
      if (selectedWeek === 'week1') {
        setHoursWeek1(defaultHours);
      } else {
        setHoursWeek2(defaultHours);
      }
    }
    
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

  const getNextMonthDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      dates.push({
        date: format(date, 'yyyy-MM-dd'),
        dayOfWeek: date.getDay(),
        label: format(date, 'EEE, MMM d')
      });
    }
    return dates;
  };

  const toggleSpecificDate = (dateStr) => {
    setSpecificDates(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
    setHasChanges(true);
  };

  if (!carerId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No carer selected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Working Hours
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
          
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Schedule Pattern</label>
              <Select 
                value={scheduleType} 
                onValueChange={(val) => {
                  setScheduleType(val);
                  if (val === 'alternate_weeks') {
                    // Initialize both weeks with current hours
                    const currentHours = { ...hours };
                    setHoursWeek1(currentHours);
                    setHoursWeek2(currentHours);
                    setSelectedWeek('week1');
                    setHours(currentHours);
                  }
                  setHasChanges(true);
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Standard Weekly Pattern</SelectItem>
                  <SelectItem value="alternate_weeks">Alternate Weeks</SelectItem>
                  <SelectItem value="specific_dates">Choose Specific Dates (30 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {scheduleType === 'alternate_weeks' && (
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Editing Week</label>
                <Select 
                  value={selectedWeek} 
                  onValueChange={(val) => {
                    // Save current edits and switch in one go
                    if (selectedWeek === 'week1') {
                      setHoursWeek1(hours);
                      setSelectedWeek(val);
                      setHours(hoursWeek2);
                    } else {
                      setHoursWeek2(hours);
                      setSelectedWeek(val);
                      setHours(hoursWeek1);
                    }
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week1">Week 1</SelectItem>
                    <SelectItem value="week2">Week 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {scheduleType === 'specific_dates' ? (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Select the specific dates over the next 30 days when this carer is available to work:
              </p>
              <Badge variant="outline" className="text-blue-600">
                {specificDates.length} dates selected
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto p-2">
              {getNextMonthDates().map(({ date, dayOfWeek, label }) => {
                const isSelected = specificDates.includes(date);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                
                return (
                  <button
                    key={date}
                    onClick={() => toggleSpecificDate(date)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'bg-green-100 border-green-500 text-green-900'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{label}</div>
                    {isWeekend && (
                      <Badge className="mt-1 text-xs bg-purple-100 text-purple-700">Weekend</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduleType === 'alternate_weeks' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-sm text-amber-800">
                  You are editing <strong>{selectedWeek === 'week1' ? 'Week 1' : 'Week 2'}</strong> of the alternating schedule.
                  These hours will repeat every other week. Switch between Week 1 and Week 2 above to set different schedules.
                </p>
                <div className="text-xs text-amber-700 mt-2">
                  Debug: Week1 enabled days: {Object.values(hoursWeek1).filter(h => h?.enabled).length} | 
                  Week2 enabled days: {Object.values(hoursWeek2).filter(h => h?.enabled).length} |
                  Current enabled days: {Object.values(hours).filter(h => h?.enabled).length}
                </div>
              </div>
            )}
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
        )}

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