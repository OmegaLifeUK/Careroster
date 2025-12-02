import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { addDays, addWeeks, addMonths, setDay, format } from "date-fns";

const REPORT_TYPES = [
  { id: "client_progress", label: "Client Progress" },
  { id: "staff_performance", label: "Staff Performance" },
  { id: "compliance", label: "Compliance Summary" },
  { id: "payroll_summary", label: "Payroll Summary" },
  { id: "incident_trends", label: "Incident Trends" },
  { id: "training_compliance", label: "Training Compliance" },
  { id: "audit_summary", label: "Audit Summary" },
  { id: "medication_compliance", label: "Medication Compliance" },
];

const FREQUENCIES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "fortnightly", label: "Fortnightly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "annually", label: "Annually" },
];

const DAYS_OF_WEEK = [
  { id: 0, label: "Sunday" },
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

export default function ScheduledReportDialog({ schedule, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    report_name: schedule?.report_name || "",
    report_type: schedule?.report_type || "client_progress",
    schedule_frequency: schedule?.schedule_frequency || "weekly",
    schedule_day: schedule?.schedule_day ?? 1,
    schedule_time: schedule?.schedule_time || "08:00",
    recipients: schedule?.recipients?.join(", ") || "",
    output_format: schedule?.output_format || "email_summary",
    include_charts: schedule?.include_charts ?? true,
    is_active: schedule?.is_active ?? true,
    notes: schedule?.notes || "",
    parameters: schedule?.parameters || {
      date_range_type: "last_period",
      include_summary: true,
      include_details: true,
    },
  });

  const { toast } = useToast();

  const calculateNextRunDate = (frequency, day, time) => {
    const now = new Date();
    const [hours, minutes] = (time || "08:00").split(':').map(Number);
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        if (nextRun <= now) nextRun = addDays(nextRun, 1);
        break;
      case 'weekly':
        nextRun = setDay(nextRun, day || 1, { weekStartsOn: 0 });
        if (nextRun <= now) nextRun = addWeeks(nextRun, 1);
        break;
      case 'fortnightly':
        nextRun = setDay(nextRun, day || 1, { weekStartsOn: 0 });
        if (nextRun <= now) nextRun = addWeeks(nextRun, 2);
        break;
      case 'monthly':
        nextRun.setDate(day || 1);
        if (nextRun <= now) nextRun = addMonths(nextRun, 1);
        break;
      case 'quarterly':
        nextRun.setDate(day || 1);
        if (nextRun <= now) nextRun = addMonths(nextRun, 3);
        break;
      case 'annually':
        nextRun.setDate(day || 1);
        if (nextRun <= now) nextRun = addMonths(nextRun, 12);
        break;
    }
    return nextRun.toISOString();
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const recipients = data.recipients
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

      const nextRun = calculateNextRunDate(data.schedule_frequency, data.schedule_day, data.schedule_time);

      const payload = {
        report_name: data.report_name,
        report_type: data.report_type,
        schedule_frequency: data.schedule_frequency,
        schedule_day: data.schedule_day,
        schedule_time: data.schedule_time,
        recipients,
        output_format: data.output_format,
        include_charts: data.include_charts,
        is_active: data.is_active,
        notes: data.notes,
        parameters: data.parameters,
        next_run_date: nextRun,
      };

      if (schedule?.id) {
        return base44.entities.ScheduledReport.update(schedule.id, payload);
      } else {
        return base44.entities.ScheduledReport.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(schedule ? "Schedule Updated" : "Schedule Created");
      onSaved();
    },
    onError: (error) => {
      toast.error("Save Failed", error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.report_name) {
      toast.error("Name Required", "Please enter a report name");
      return;
    }
    saveMutation.mutate(formData);
  };

  const showDayOfWeek = ['weekly', 'fortnightly'].includes(formData.schedule_frequency);
  const showDayOfMonth = ['monthly', 'quarterly', 'annually'].includes(formData.schedule_frequency);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit Scheduled Report" : "Create Scheduled Report"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label>Report Name *</Label>
              <Input
                value={formData.report_name}
                onChange={(e) => setFormData(prev => ({ ...prev, report_name: e.target.value }))}
                placeholder="e.g., Weekly Staff Performance Report"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Report Type</Label>
                <Select
                  value={formData.report_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, report_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Frequency</Label>
                <Select
                  value={formData.schedule_frequency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(freq => (
                      <SelectItem key={freq.id} value={freq.id}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {showDayOfWeek && (
                <div>
                  <Label>Day of Week</Label>
                  <Select
                    value={String(formData.schedule_day)}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_day: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.id} value={String(day.id)}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showDayOfMonth && (
                <div>
                  <Label>Day of Month</Label>
                  <Select
                    value={String(formData.schedule_day)}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_day: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Email Recipients (comma separated)</Label>
              <Input
                value={formData.recipients}
                onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="manager@care.com, admin@care.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Output Format</Label>
                <Select
                  value={formData.output_format}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, output_format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_summary">Email Summary</SelectItem>
                    <SelectItem value="pdf">PDF Attachment</SelectItem>
                    <SelectItem value="csv">CSV Attachment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-charts"
                    checked={formData.include_charts}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_charts: checked }))}
                  />
                  <Label htmlFor="include-charts">Include Charts</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is-active">Active</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this scheduled report"
                className="h-20"
              />
            </div>

            {formData.schedule_frequency && formData.schedule_time && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <strong>Next run:</strong> {format(
                  new Date(calculateNextRunDate(formData.schedule_frequency, formData.schedule_day, formData.schedule_time)),
                  'EEEE, MMMM d, yyyy \'at\' HH:mm'
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                schedule ? "Update Schedule" : "Create Schedule"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}