import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, Repeat, Clock, AlertTriangle } from "lucide-react";
import { format, addDays, addWeeks, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

// Helper to estimate distance based on postcode area
const getPostcodeDistance = (postcode1, postcode2) => {
  if (!postcode1 || !postcode2) return 999;
  
  const area1 = postcode1.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  const area2 = postcode2.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  
  if (area1 === area2) return 0;
  
  const proximityGroups = [
    ['M', 'SK', 'OL', 'BL', 'WN'],
    ['BN', 'RH', 'TN'],
    ['L', 'CH', 'WA'],
    ['B', 'WS', 'WV', 'DY'],
    ['LS', 'BD', 'HX', 'WF'],
    ['S', 'DN', 'HD'],
    ['NE', 'SR', 'DH'],
    ['GL', 'SN', 'BA'],
    ['NG', 'DE', 'LE'],
    ['CV', 'LE', 'NN'],
  ];
  
  for (const group of proximityGroups) {
    if (group.includes(area1) && group.includes(area2)) return 15;
  }
  
  return 100;
};

export default function RecurringVisitDialog({ clients, staff, onClose }) {
  const [formData, setFormData] = useState({
    client_id: "",
    assigned_staff_id: "",
    visit_type: "regular",
    start_date: "",
    start_time: "09:00",
    duration_minutes: 60,
    recurrence_pattern: "weekly",
    recurrence_days: [1], // Monday
    end_date: "",
    occurrences: 12,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createVisitsMutation = useMutation({
    mutationFn: async (visits) => {
      return await base44.entities.Visit.bulkCreate(visits);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success("Success", `Created ${data.length} recurring visits`);
      onClose();
    },
  });

  const toggleDay = (day) => {
    if (formData.recurrence_days.includes(day)) {
      setFormData({
        ...formData,
        recurrence_days: formData.recurrence_days.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        recurrence_days: [...formData.recurrence_days, day].sort()
      });
    }
  };

  const generateVisits = () => {
    const visits = [];
    const startDate = parseISO(`${formData.start_date}T${formData.start_time}`);
    const endDate = formData.end_date ? parseISO(formData.end_date) : null;
    
    let currentDate = startDate;
    let count = 0;
    const maxOccurrences = formData.occurrences || 52;

    while (count < maxOccurrences) {
      if (endDate && currentDate > endDate) break;

      const dayOfWeek = currentDate.getDay();
      
      if (formData.recurrence_pattern === "daily" || 
          formData.recurrence_days.includes(dayOfWeek)) {
        const scheduledEnd = new Date(currentDate.getTime() + formData.duration_minutes * 60000);
        
        visits.push({
          client_id: formData.client_id,
          assigned_staff_id: formData.assigned_staff_id || undefined,
          scheduled_start: currentDate.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          status: formData.assigned_staff_id ? "published" : "draft",
          visit_type: formData.visit_type,
          duration_minutes: formData.duration_minutes,
          is_recurring: true,
        });
        count++;
      }

      currentDate = formData.recurrence_pattern === "daily" 
        ? addDays(currentDate, 1)
        : addDays(currentDate, 1);
    }

    return visits;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.recurrence_pattern === "weekly" && formData.recurrence_days.length === 0) {
      toast.error("Validation Error", "Please select at least one day of the week");
      return;
    }

    const visits = generateVisits();
    
    if (visits.length === 0) {
      toast.error("No Visits", "No visits were generated with the current settings");
      return;
    }

    if (visits.length > 100) {
      toast.error("Too Many Visits", "Please reduce the number of occurrences (max 100)");
      return;
    }

    // Geographic validation if staff assigned
    if (formData.assigned_staff_id && formData.client_id) {
      const client = clients.find(c => c.id === formData.client_id);
      const staffMember = staff.find(s => s.id === formData.assigned_staff_id);
      const clientPostcode = client?.address?.postcode;
      const staffPostcode = staffMember?.address?.postcode;
      const distance = getPostcodeDistance(clientPostcode, staffPostcode);
      
      if (distance >= 100) {
        if (!confirm(
          `⚠️ GEOGRAPHIC MISMATCH WARNING!\n\n` +
          `Client: ${client?.full_name} (${clientPostcode || 'Unknown'})\n` +
          `Staff: ${staffMember?.full_name} (${staffPostcode || 'Unknown'})\n\n` +
          `These locations are in different regions and may be hours apart.\n` +
          `This assignment is not recommended for efficient rostering.\n\n` +
          `Do you still want to proceed?`
        )) {
          return;
        }
      }
    }

    createVisitsMutation.mutate(visits);
  };

  const previewCount = () => {
    try {
      return generateVisits().length;
    } catch {
      return 0;
    }
  };

  const DAYS = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-600" />
            Create Recurring Visits
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <Label htmlFor="client_id" className="mb-2 block">Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.status === 'active').map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name} - {client.address?.postcode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Visit Type</Label>
              <Select
                value={formData.visit_type}
                onValueChange={(value) => setFormData({ ...formData, visit_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Visit</SelectItem>
                  <SelectItem value="initial">Initial Visit</SelectItem>
                  <SelectItem value="assessment">Assessment Visit</SelectItem>
                  <SelectItem value="review">Review Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Assigned Staff</Label>
              {formData.assigned_staff_id && formData.client_id && (() => {
                const client = clients.find(c => c.id === formData.client_id);
                const staffMember = staff.find(s => s.id === formData.assigned_staff_id);
                const distance = getPostcodeDistance(client?.address?.postcode, staffMember?.address?.postcode);
                
                if (distance >= 100) {
                  return (
                    <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-red-800">
                        <p className="font-semibold">Geographic Mismatch Warning</p>
                        <p className="mt-1">Client: {client?.address?.postcode || 'Unknown'} • Staff: {staffMember?.address?.postcode || 'Unknown'}</p>
                        <p className="mt-1">These locations are very far apart. Consider assigning local staff.</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <Select
                value={formData.assigned_staff_id || ""}
                onValueChange={(value) => setFormData({ ...formData, assigned_staff_id: value === "__unassigned__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Leave Unassigned</SelectItem>
                  {staff.filter(s => s.is_active).map(member => {
                    const client = clients.find(c => c.id === formData.client_id);
                    const distance = getPostcodeDistance(client?.address?.postcode, member?.address?.postcode);
                    const isFar = distance >= 100;
                    
                    return (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          {member.full_name}
                          {member.address?.postcode && (
                            <span className="text-xs text-gray-500">({member.address.postcode})</span>
                          )}
                          {isFar && <span className="text-xs text-red-600 font-semibold">⚠️ Far</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start_date" className="mb-2 block">Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="start_time" className="mb-2 block">Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="duration_minutes" className="mb-2 block">Duration (mins)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min="15"
                step="15"
                required
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Recurrence Pattern</Label>
            <Select
              value={formData.recurrence_pattern}
              onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly (select days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.recurrence_pattern === "weekly" && (
            <div>
              <Label className="mb-2 block">Days of the Week *</Label>
              <div className="flex gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      formData.recurrence_days.includes(day.value)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="occurrences" className="mb-2 block">Number of Occurrences</Label>
              <Input
                type="number"
                value={formData.occurrences}
                onChange={(e) => setFormData({ ...formData, occurrences: parseInt(e.target.value) })}
                min="1"
                max="100"
              />
            </div>

            <div>
              <Label htmlFor="end_date" className="mb-2 block">Or End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {formData.client_id && formData.start_date && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-purple-900">Preview</span>
              </div>
              <p className="text-sm text-purple-800">
                This will create <Badge className="bg-purple-600">{previewCount()}</Badge> visits
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={createVisitsMutation.isPending}
            >
              <Repeat className="w-4 h-4 mr-2" />
              {createVisitsMutation.isPending ? "Creating..." : "Create Recurring Visits"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}