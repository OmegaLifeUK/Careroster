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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AIScheduleGenerator({ carers, clients, shifts, leaveRequests, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    start_date: format(new Date(), "yyyy-MM-dd"),
    duration: "7",
    clients: [],
    shift_preferences: "balanced",
    additional_instructions: "",
  });
  const [generatedSchedule, setGeneratedSchedule] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const generateSchedule = async () => {
    setIsGenerating(true);
    try {
      // Prepare data for AI
      const activeCarers = carers.filter(c => c.status === 'active');
      const activeClients = formData.clients.length > 0 
        ? clients.filter(c => formData.clients.includes(c.id))
        : clients.filter(c => c.status === 'active');

      // Get leave requests for the period
      const relevantLeave = leaveRequests.filter(leave => {
        if (leave.status !== 'approved') return false;
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        const periodStart = new Date(formData.start_date);
        const periodEnd = addDays(periodStart, parseInt(formData.duration));
        return leaveStart <= periodEnd && leaveEnd >= periodStart;
      });

      const prompt = `You are an expert care scheduling assistant. Generate an optimal shift schedule based on the following data:

**Carers (${activeCarers.length} available):**
${activeCarers.map(c => `- ${c.full_name}: ${c.employment_type} (${c.qualifications?.join(', ') || 'No qualifications'})`).join('\n')}

**Carers on Leave:**
${relevantLeave.map(leave => {
  const carer = carers.find(c => c.id === leave.carer_id);
  return `- ${carer?.full_name}: ${leave.start_date} to ${leave.end_date}`;
}).join('\n') || 'None'}

**Clients (${activeClients.length} requiring care):**
${activeClients.map(c => `- ${c.full_name}: Care needs: ${c.care_needs?.join(', ') || 'General care'}, Preferred carers: ${c.preferred_carers?.map(id => carers.find(cr => cr.id === id)?.full_name).filter(Boolean).join(', ') || 'None'}`).join('\n')}

**Scheduling Requirements:**
- Period: ${formData.start_date} for ${formData.duration} days
- Preference: ${formData.shift_preferences}
- ${formData.additional_instructions || 'No additional instructions'}

**Rules:**
1. Each client needs at least one visit per day (morning 9-12, afternoon 14-17, or evening 18-21)
2. Respect carer qualifications and client care needs
3. Prioritize preferred carers when possible
4. Balance workload across carers (${formData.shift_preferences === 'balanced' ? 'evenly distribute' : formData.shift_preferences === 'minimize_carers' ? 'minimize number of carers' : 'maximize continuity'})
5. No carer should have overlapping shifts
6. Respect leave requests
7. Limit to 8 hours per day per carer

Generate shifts for ${formData.duration} days. For each shift provide: client_name, carer_name, date, start_time, end_time, shift_type, tasks, confidence_score (0-100).`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  client_name: { type: "string" },
                  carer_name: { type: "string" },
                  date: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" },
                  shift_type: { type: "string" },
                  tasks: { type: "array", items: { type: "string" } },
                  confidence_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            summary: { type: "string" },
            warnings: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Map names back to IDs
      const scheduleWithIds = response.schedule.map(shift => {
        const client = activeClients.find(c => c.full_name === shift.client_name);
        const carer = activeCarers.find(c => c.full_name === shift.carer_name);
        
        return {
          ...shift,
          client_id: client?.id,
          carer_id: carer?.id,
          status: "draft",
        };
      }).filter(s => s.client_id && s.carer_id);

      setGeneratedSchedule({
        shifts: scheduleWithIds,
        summary: response.summary,
        warnings: response.warnings || []
      });
      setStep(2);
    } catch (error) {
      console.error("Error generating schedule:", error);
      alert("Failed to generate schedule. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const shiftsToCreate = generatedSchedule.shifts.map(shift => ({
        client_id: shift.client_id,
        carer_id: shift.carer_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        shift_type: shift.shift_type,
        status: "scheduled",
        tasks: shift.tasks || [],
        notes: shift.reasoning || `AI-generated shift (Confidence: ${shift.confidence_score}%)`,
        duration_hours: calculateDuration(shift.start_time, shift.end_time),
      }));

      await Promise.all(shiftsToCreate.map(shift => 
        base44.entities.Shift.create(shift)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const handleClientToggle = (clientId) => {
    setFormData(prev => ({
      ...prev,
      clients: prev.clients.includes(clientId)
        ? prev.clients.filter(id => id !== clientId)
        : [...prev.clients, clientId]
    }));
  };

  const getCarerName = (carerId) => carers.find(c => c.id === carerId)?.full_name || "Unknown";
  const getClientName = (clientId) => clients.find(c => c.id === clientId)?.full_name || "Unknown";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Schedule Generator
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">AI-Powered Scheduling</h3>
                  <p className="text-sm text-purple-800">
                    Our AI will analyze carer qualifications, client needs, preferences, and availability to generate an optimal schedule.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (Days)</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 Week (7 days)</SelectItem>
                    <SelectItem value="14">2 Weeks (14 days)</SelectItem>
                    <SelectItem value="30">1 Month (30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Clients to Include</Label>
              <p className="text-sm text-gray-500 mb-3">Leave empty to include all active clients</p>
              <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                {clients.filter(c => c.status === 'active').map(client => (
                  <label key={client.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.clients.includes(client.id)}
                      onChange={() => handleClientToggle(client.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{client.full_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="shift_preferences">Optimization Priority</Label>
              <Select
                value={formData.shift_preferences}
                onValueChange={(value) => setFormData(prev => ({ ...prev, shift_preferences: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced Workload</SelectItem>
                  <SelectItem value="continuity">Maximize Continuity of Care</SelectItem>
                  <SelectItem value="minimize_carers">Minimize Number of Carers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="additional_instructions">Additional Instructions (Optional)</Label>
              <Textarea
                id="additional_instructions"
                value={formData.additional_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, additional_instructions: e.target.value }))}
                placeholder="e.g., Avoid early morning shifts for John, Prioritize continuity for Mrs. Smith..."
                className="h-24"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">Schedule Generated!</h3>
                  <p className="text-sm text-green-800 mb-3">{generatedSchedule.summary}</p>
                  <p className="text-sm font-medium text-green-900">
                    {generatedSchedule.shifts.length} shifts created
                  </p>
                </div>
              </div>
            </div>

            {generatedSchedule.warnings && generatedSchedule.warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-2">Warnings:</h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {generatedSchedule.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Preview Schedule ({generatedSchedule.shifts.length} shifts)</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {generatedSchedule.shifts.map((shift, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{format(parseISO(shift.date), "EEE, MMM d")}</span>
                          <Badge variant="outline" className="text-xs">{shift.shift_type}</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><strong>Carer:</strong> {getCarerName(shift.carer_id)}</p>
                          <p><strong>Client:</strong> {getClientName(shift.client_id)}</p>
                          <p><strong>Time:</strong> {shift.start_time} - {shift.end_time}</p>
                          {shift.tasks && shift.tasks.length > 0 && (
                            <p><strong>Tasks:</strong> {shift.tasks.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={
                        shift.confidence_score >= 80 ? "bg-green-100 text-green-800" :
                        shift.confidence_score >= 60 ? "bg-yellow-100 text-yellow-800" :
                        "bg-orange-100 text-orange-800"
                      }>
                        {shift.confidence_score}% match
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              onClick={generateSchedule}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Schedule
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => createScheduleMutation.mutate()}
                disabled={createScheduleMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${generatedSchedule.shifts.length} Shifts`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}