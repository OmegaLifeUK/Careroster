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
import { X, Calendar, Repeat, AlertCircle } from "lucide-react";
import { format, addDays, addWeeks, addMonths, parseISO, isBefore } from "date-fns";

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
    pattern: "weekly", // daily, weekly, biweekly, monthly
    days_of_week: [], // For weekly pattern
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_type: "never", // never, date, occurrences
    end_date: "",
    occurrences: 52,
  });

  const [taskInput, setTaskInput] = useState("");
  const [preview, setPreview] = useState([]);
  const [generating, setGenerating] = useState(false);

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

  const generatePreview = () => {
    setGenerating(true);
    const shifts = [];
    let currentDate = parseISO(recurrenceData.start_date);
    const endDate = recurrenceData.end_type === 'date' ? parseISO(recurrenceData.end_date) : null;
    const maxOccurrences = recurrenceData.end_type === 'occurrences' ? recurrenceData.occurrences : 
                          recurrenceData.end_type === 'never' ? 365 : // Generate 1 year if never-ending
                          1000; // Max 1000 shifts for date-based end

    let count = 0;

    while (count < maxOccurrences) {
      if (endDate && isBefore(endDate, currentDate)) break;

      // Check if this day matches the pattern
      let shouldCreate = false;

      if (recurrenceData.pattern === 'daily') {
        shouldCreate = true;
      } else if (recurrenceData.pattern === 'weekly' && recurrenceData.days_of_week.length > 0) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        shouldCreate = recurrenceData.days_of_week.includes(dayOfWeek);
      } else if (recurrenceData.pattern === 'biweekly' && recurrenceData.days_of_week.length > 0) {
        const weekNumber = Math.floor((currentDate - parseISO(recurrenceData.start_date)) / (7 * 24 * 60 * 60 * 1000));
        if (weekNumber % 2 === 0) {
          const dayOfWeek = currentDate.getDay();
          shouldCreate = recurrenceData.days_of_week.includes(dayOfWeek);
        }
      } else if (recurrenceData.pattern === 'monthly') {
        shouldCreate = currentDate.getDate() === parseISO(recurrenceData.start_date).getDate();
      }

      if (shouldCreate) {
        shifts.push({
          ...formData,
          date: format(currentDate, 'yyyy-MM-dd'),
        });
        count++;
      }

      currentDate = addDays(currentDate, 1);

      // Safety check to prevent infinite loops
      if (shifts.length > 10000) break;
    }

    setPreview(shifts.slice(0, 50)); // Show first 50 for preview
    setGenerating(false);
  };

  const handleSubmit = async () => {
    // Generate all shifts
    const shifts = [];
    let currentDate = parseISO(recurrenceData.start_date);
    const endDate = recurrenceData.end_type === 'date' ? parseISO(recurrenceData.end_date) : null;
    const maxOccurrences = recurrenceData.end_type === 'occurrences' ? recurrenceData.occurrences : 
                          recurrenceData.end_type === 'never' ? 365 : // Generate 1 year ahead if never-ending
                          10000;

    let count = 0;

    while (count < maxOccurrences) {
      if (endDate && isBefore(endDate, currentDate)) break;

      let shouldCreate = false;

      if (recurrenceData.pattern === 'daily') {
        shouldCreate = true;
      } else if (recurrenceData.pattern === 'weekly' && recurrenceData.days_of_week.length > 0) {
        const dayOfWeek = currentDate.getDay();
        shouldCreate = recurrenceData.days_of_week.includes(dayOfWeek);
      } else if (recurrenceData.pattern === 'biweekly' && recurrenceData.days_of_week.length > 0) {
        const weekNumber = Math.floor((currentDate - parseISO(recurrenceData.start_date)) / (7 * 24 * 60 * 60 * 1000));
        if (weekNumber % 2 === 0) {
          const dayOfWeek = currentDate.getDay();
          shouldCreate = recurrenceData.days_of_week.includes(dayOfWeek);
        }
      } else if (recurrenceData.pattern === 'monthly') {
        shouldCreate = currentDate.getDate() === parseISO(recurrenceData.start_date).getDate();
      }

      if (shouldCreate) {
        shifts.push({
          ...formData,
          date: format(currentDate, 'yyyy-MM-dd'),
        });
        count++;
      }

      currentDate = addDays(currentDate, 1);

      if (shifts.length > 10000) break;
    }

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

  const toggleDayOfWeek = (day) => {
    if (recurrenceData.days_of_week.includes(day)) {
      setRecurrenceData({
        ...recurrenceData,
        days_of_week: recurrenceData.days_of_week.filter(d => d !== day)
      });
    } else {
      setRecurrenceData({
        ...recurrenceData,
        days_of_week: [...recurrenceData.days_of_week, day]
      });
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
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
                  </SelectContent>
                </Select>
              </div>

              {(recurrenceData.pattern === 'weekly' || recurrenceData.pattern === 'biweekly') && (
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
                        {day.label.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

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
                  />
                </div>
              )}

              {recurrenceData.end_type === 'occurrences' && (
                <div>
                  <Label>Number of Occurrences</Label>
                  <Input
                    type="number"
                    value={recurrenceData.occurrences}
                    onChange={(e) => setRecurrenceData({ ...recurrenceData, occurrences: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Tip:</p>
                  <p>Choose "Never" to create shifts indefinitely. The system will generate shifts 1 year ahead, and you can extend further anytime.</p>
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

              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm font-semibold mb-2">Summary:</p>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Pattern: {recurrenceData.pattern}</li>
                  <li>• Start: {format(parseISO(recurrenceData.start_date), 'MMM d, yyyy')}</li>
                  {recurrenceData.end_type === 'date' && (
                    <li>• End: {format(parseISO(recurrenceData.end_date), 'MMM d, yyyy')}</li>
                  )}
                  {recurrenceData.end_type === 'occurrences' && (
                    <li>• Occurrences: {recurrenceData.occurrences}</li>
                  )}
                  {recurrenceData.end_type === 'never' && (
                    <li>• Duration: Ongoing (365 shifts will be created initially)</li>
                  )}
                  <li className="font-semibold text-green-700">• Total shifts to create: {preview.length}+ shifts</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">First 50 Shifts Preview:</p>
                <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                  {preview.map((shift, index) => (
                    <div key={index} className="text-sm py-1 px-2 bg-gray-50 rounded">
                      {format(parseISO(shift.date), 'EEE, MMM d, yyyy')} - {shift.start_time} to {shift.end_time}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createShiftsMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createShiftsMutation.isPending ? "Creating..." : `Create ${preview.length}+ Shifts`}
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