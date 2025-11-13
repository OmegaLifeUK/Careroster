import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, Repeat, AlertCircle, CalendarX, Plus, Trash2 } from "lucide-react";
import { format, addDays, addWeeks, addMonths, parseISO, isBefore, isSameDay, getDay, differenceInDays } from "date-fns";

export default function RecurringShiftDialog({ onClose, clients, carers }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_id: "",
    carer_id: "",
    start_time: "09:00",
    end_time: "17:00",
    duration_hours: 8,
    shift_type: "morning",
    tasks: [],
    notes: "",
    status: "published",
  });

  const [recurrenceData, setRecurrenceData] = useState({
    pattern: "weekly", // daily, weekly, biweekly, monthly, custom
    days_of_week: [], // For weekly pattern
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_type: "occurrences", // never, date, occurrences
    end_date: "",
    occurrences: 52,
    custom_interval: 1, // For custom pattern (e.g., every 3 days, every 4 weeks)
    custom_unit: "weeks", // days, weeks, months
    exclude_dates: [], // Dates to skip (holidays, etc.)
    include_weekends: true,
  });

  const [taskInput, setTaskInput] = useState("");
  const [excludeDateInput, setExcludeDateInput] = useState("");
  const [preview, setPreview] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showExcludeDates, setShowExcludeDates] = useState(false);

  const queryClient = useQueryClient();

  const createShiftsMutation = useMutation({
    mutationFn: async (shifts) => {
      return await base44.entities.Shift.bulkCreate(shifts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });

  const generateShifts = () => {
    const shifts = [];
    let currentDate = parseISO(recurrenceData.start_date);
    const endDate = recurrenceData.end_type === 'date' ? parseISO(recurrenceData.end_date) : null;
    const maxOccurrences = recurrenceData.end_type === 'occurrences' ? recurrenceData.occurrences : 
                          recurrenceData.end_type === 'never' ? 365 : 
                          10000;

    let count = 0;
    let iterations = 0;
    const maxIterations = 10000; // Safety limit

    while (count < maxOccurrences && iterations < maxIterations) {
      iterations++;
      
      if (endDate && isBefore(endDate, currentDate)) break;

      // Check if this date should be excluded
      const isExcluded = recurrenceData.exclude_dates.some(excludeDate => 
        isSameDay(parseISO(excludeDate), currentDate)
      );

      if (isExcluded) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check weekend exclusion
      if (!recurrenceData.include_weekends) {
        const dayOfWeek = getDay(currentDate);
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
          currentDate = addDays(currentDate, 1);
          continue;
        }
      }

      let shouldCreate = false;

      switch (recurrenceData.pattern) {
        case 'daily':
          shouldCreate = true;
          break;

        case 'weekly':
          if (recurrenceData.days_of_week.length > 0) {
            const dayOfWeek = getDay(currentDate);
            shouldCreate = recurrenceData.days_of_week.includes(dayOfWeek);
          }
          break;

        case 'biweekly':
          if (recurrenceData.days_of_week.length > 0) {
            const weekNumber = Math.floor(differenceInDays(currentDate, parseISO(recurrenceData.start_date)) / 7);
            if (weekNumber % 2 === 0) {
              const dayOfWeek = getDay(currentDate);
              shouldCreate = recurrenceData.days_of_week.includes(dayOfWeek);
            }
          }
          break;

        case 'monthly':
          shouldCreate = currentDate.getDate() === parseISO(recurrenceData.start_date).getDate();
          break;

        case 'custom':
          const daysDiff = differenceInDays(currentDate, parseISO(recurrenceData.start_date));
          if (recurrenceData.custom_unit === 'days') {
            shouldCreate = daysDiff % recurrenceData.custom_interval === 0;
          } else if (recurrenceData.custom_unit === 'weeks') {
            const weeksDiff = Math.floor(daysDiff / 7);
            shouldCreate = weeksDiff % recurrenceData.custom_interval === 0 && 
                          (recurrenceData.days_of_week.length === 0 || 
                           recurrenceData.days_of_week.includes(getDay(currentDate)));
          } else if (recurrenceData.custom_unit === 'months') {
            const monthsDiff = (currentDate.getFullYear() - parseISO(recurrenceData.start_date).getFullYear()) * 12 + 
                              (currentDate.getMonth() - parseISO(recurrenceData.start_date).getMonth());
            shouldCreate = monthsDiff % recurrenceData.custom_interval === 0 && 
                          currentDate.getDate() === parseISO(recurrenceData.start_date).getDate();
          }
          break;
      }

      if (shouldCreate) {
        shifts.push({
          ...formData,
          date: format(currentDate, 'yyyy-MM-dd'),
        });
        count++;
      }

      currentDate = addDays(currentDate, 1);
    }

    return shifts;
  };

  const generatePreview = () => {
    setGenerating(true);
    const shifts = generateShifts();
    setPreview(shifts.slice(0, 100)); // Show first 100 for preview
    setGenerating(false);
  };

  const handleSubmit = async () => {
    const shifts = generateShifts();
    await createShiftsMutation.mutate(shifts);
  };

  const addTask = () => {
    if (taskInput.trim()) {
      setFormData({ ...formData, tasks: [...formData.tasks, taskInput.trim()] });
      setTaskInput("");
    }
  };

  const removeTask = (index) => {
    setFormData({ ...formData, tasks: formData.tasks.filter((_, i) => i !== index) });
  };

  const addExcludeDate = () => {
    if (excludeDateInput && !recurrenceData.exclude_dates.includes(excludeDateInput)) {
      setRecurrenceData({
        ...recurrenceData,
        exclude_dates: [...recurrenceData.exclude_dates, excludeDateInput].sort()
      });
      setExcludeDateInput("");
    }
  };

  const removeExcludeDate = (date) => {
    setRecurrenceData({
      ...recurrenceData,
      exclude_dates: recurrenceData.exclude_dates.filter(d => d !== date)
    });
  };

  const addCommonHolidays = () => {
    const year = new Date().getFullYear();
    const holidays = [
      `${year}-01-01`, // New Year's Day
      `${year}-12-25`, // Christmas Day
      `${year}-12-26`, // Boxing Day
    ];
    
    const newExcludes = [...new Set([...recurrenceData.exclude_dates, ...holidays])].sort();
    setRecurrenceData({
      ...recurrenceData,
      exclude_dates: newExcludes
    });
  };

  const toggleDayOfWeek = (day) => {
    if (recurrenceData.days_of_week.includes(day)) {
      setRecurrenceData({
        ...recurrenceData,
        days_of_week: recurrenceData.days_of_week.filter(d => d !== day)
      });
    } else {
      setRecurrenceData({
        ...recurrenceData,
        days_of_week: [...recurrenceData.days_of_week, day].sort()
      });
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-blue-600" />
              Create Recurring Shifts
              <Badge variant="outline">Step {step} of 3</Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Shift Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Carer (Optional)</Label>
                  <Select
                    value={formData.carer_id}
                    onValueChange={(value) => setFormData({ ...formData, carer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Unassigned</SelectItem>
                      {carers.map(carer => (
                        <SelectItem key={carer.id} value={carer.id}>
                          {carer.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>

                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Shift Type</Label>
                  <Select
                    value={formData.shift_type}
                    onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="supervision">Supervision</SelectItem>
                      <SelectItem value="shadowing">Shadowing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Tasks</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                    placeholder="Add a task..."
                  />
                  <Button type="button" onClick={addTask}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tasks.map((task, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {task}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTask(index)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any special instructions or notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!formData.client_id}>
                  Next: Recurrence Pattern
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Recurrence Pattern</h3>

              <div>
                <Label>Repeat Pattern</Label>
                <Select
                  value={recurrenceData.pattern}
                  onValueChange={(value) => setRecurrenceData({ ...recurrenceData, pattern: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceData.pattern === 'custom' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <Label>Every</Label>
                    <Input
                      type="number"
                      min="1"
                      value={recurrenceData.custom_interval}
                      onChange={(e) => setRecurrenceData({ 
                        ...recurrenceData, 
                        custom_interval: parseInt(e.target.value) || 1 
                      })}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select
                      value={recurrenceData.custom_unit}
                      onValueChange={(value) => setRecurrenceData({ ...recurrenceData, custom_unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="col-span-2 text-sm text-gray-600">
                    Example: Every {recurrenceData.custom_interval} {recurrenceData.custom_unit}
                  </p>
                </div>
              )}

              {(recurrenceData.pattern === 'weekly' || 
                recurrenceData.pattern === 'biweekly' || 
                (recurrenceData.pattern === 'custom' && recurrenceData.custom_unit === 'weeks')) && (
                <div>
                  <Label>Repeat On</Label>
                  <div className="grid grid-cols-7 gap-2 mt-2">
                    {daysOfWeek.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={recurrenceData.days_of_week.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className="text-xs"
                      >
                        {day.short}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <Checkbox
                  id="include-weekends"
                  checked={recurrenceData.include_weekends}
                  onCheckedChange={(checked) => 
                    setRecurrenceData({ ...recurrenceData, include_weekends: checked })
                  }
                />
                <Label htmlFor="include-weekends" className="cursor-pointer">
                  Include weekends (Saturday & Sunday)
                </Label>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={recurrenceData.start_date}
                  onChange={(e) => setRecurrenceData({ ...recurrenceData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>End Pattern</Label>
                <Select
                  value={recurrenceData.end_type}
                  onValueChange={(value) => setRecurrenceData({ ...recurrenceData, end_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never (Generate 1 year ahead)</SelectItem>
                    <SelectItem value="date">On Specific Date</SelectItem>
                    <SelectItem value="occurrences">After Number of Occurrences</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceData.end_type === 'date' && (
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={recurrenceData.end_date}
                    onChange={(e) => setRecurrenceData({ ...recurrenceData, end_date: e.target.value })}
                    min={recurrenceData.start_date}
                  />
                </div>
              )}

              {recurrenceData.end_type === 'occurrences' && (
                <div>
                  <Label>Number of Occurrences</Label>
                  <Input
                    type="number"
                    min="1"
                    value={recurrenceData.occurrences}
                    onChange={(e) => setRecurrenceData({ ...recurrenceData, occurrences: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Total number of shifts to create</p>
                </div>
              )}

              {/* Exclude Dates Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <CalendarX className="w-4 h-4" />
                    Exclude Specific Dates (Holidays, etc.)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExcludeDates(!showExcludeDates)}
                  >
                    {showExcludeDates ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {showExcludeDates && (
                  <div className="space-y-3 p-4 bg-orange-50 rounded-lg">
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={excludeDateInput}
                        onChange={(e) => setExcludeDateInput(e.target.value)}
                        placeholder="Select date to exclude"
                      />
                      <Button type="button" onClick={addExcludeDate} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCommonHolidays}
                      className="w-full"
                    >
                      Add Common UK Holidays (New Year, Christmas, Boxing Day)
                    </Button>

                    {recurrenceData.exclude_dates.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Excluded Dates ({recurrenceData.exclude_dates.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {recurrenceData.exclude_dates.map((date) => (
                            <Badge key={date} variant="destructive" className="gap-1">
                              {format(parseISO(date), 'MMM d, yyyy')}
                              <Trash2 
                                className="w-3 h-3 cursor-pointer" 
                                onClick={() => removeExcludeDate(date)} 
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Advanced Scheduling:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Exclude specific dates for holidays or special events</li>
                    <li>Choose custom intervals (e.g., every 3 days, every 4 weeks)</li>
                    <li>Automatically skip weekends if needed</li>
                    <li>Create up to 10,000 shifts at once</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button onClick={() => { generatePreview(); setStep(3); }}>
                    Preview Shifts
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Preview & Confirm</h3>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-3 text-gray-800">Summary:</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-700">
                      <strong>Pattern:</strong> {recurrenceData.pattern === 'custom' 
                        ? `Every ${recurrenceData.custom_interval} ${recurrenceData.custom_unit}`
                        : recurrenceData.pattern}
                    </p>
                    <p className="text-gray-700">
                      <strong>Start:</strong> {format(parseISO(recurrenceData.start_date), 'MMM d, yyyy')}
                    </p>
                    {recurrenceData.end_type === 'date' && (
                      <p className="text-gray-700">
                        <strong>End:</strong> {format(parseISO(recurrenceData.end_date), 'MMM d, yyyy')}
                      </p>
                    )}
                    {recurrenceData.end_type === 'occurrences' && (
                      <p className="text-gray-700">
                        <strong>Occurrences:</strong> {recurrenceData.occurrences}
                      </p>
                    )}
                    {recurrenceData.end_type === 'never' && (
                      <p className="text-gray-700">
                        <strong>Duration:</strong> Ongoing (365 days initially)
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {recurrenceData.days_of_week.length > 0 && (
                      <p className="text-gray-700">
                        <strong>Days:</strong> {recurrenceData.days_of_week.map(d => 
                          daysOfWeek.find(day => day.value === d)?.short
                        ).join(', ')}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <strong>Weekends:</strong> {recurrenceData.include_weekends ? 'Included' : 'Excluded'}
                    </p>
                    <p className="text-gray-700">
                      <strong>Excluded Dates:</strong> {recurrenceData.exclude_dates.length}
                    </p>
                    <p className="text-green-700 font-bold text-lg">
                      <strong>Total Shifts:</strong> {preview.length}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">
                  Preview (First 100 shifts):
                </p>
                <div className="max-h-80 overflow-y-auto border rounded-lg p-3 space-y-1 bg-white">
                  {preview.map((shift, index) => (
                    <div key={index} className="text-sm py-2 px-3 bg-gray-50 rounded flex items-center justify-between hover:bg-gray-100">
                      <span className="font-medium">
                        {index + 1}. {format(parseISO(shift.date), 'EEE, MMM d, yyyy')}
                      </span>
                      <span className="text-gray-600">
                        {shift.start_time} - {shift.end_time}
                      </span>
                    </div>
                  ))}
                  {preview.length >= 100 && (
                    <div className="text-center text-sm text-gray-500 py-2 font-semibold">
                      ... and more shifts
                    </div>
                  )}
                </div>
              </div>

              {recurrenceData.exclude_dates.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="text-sm font-semibold text-orange-900 mb-2">
                    ⚠️ Excluded Dates (No shifts will be created on these dates):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {recurrenceData.exclude_dates.map((date) => (
                      <Badge key={date} variant="outline" className="text-xs">
                        {format(parseISO(date), 'MMM d')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createShiftsMutation.isPending || preview.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createShiftsMutation.isPending ? "Creating..." : `Create ${preview.length} Shifts`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}