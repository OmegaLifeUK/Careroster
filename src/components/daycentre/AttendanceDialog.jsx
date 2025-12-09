import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Clock, Smile, Meh, Frown, AlertCircle, Sparkles, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export default function AttendanceDialog({ attendance, selectedDate, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!attendance;

  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const getDefaultRecordedBy = () => {
    if (attendance?.recorded_by_staff_id) return attendance.recorded_by_staff_id;
    if (currentUser?.email) {
      const matchingStaff = staff.find(s => s.email === currentUser.email);
      return matchingStaff?.id || "";
    }
    return "";
  };

  const [formData, setFormData] = useState({
    client_id: attendance?.client_id || "",
    session_id: attendance?.session_id || "",
    attendance_date: attendance?.attendance_date || (selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    status: attendance?.status || "present",
    arrival_time: attendance?.arrival_time?.split('T')[1]?.substring(0, 5) || "",
    departure_time: attendance?.departure_time?.split('T')[1]?.substring(0, 5) || "",
    transport_used: attendance?.transport_used || "",
    mood_on_arrival: attendance?.mood_on_arrival || "happy",
    mood_on_departure: attendance?.mood_on_departure || "",
    lunch_consumed: attendance?.lunch_consumed !== false,
    medication_administered: attendance?.medication_administered || false,
    activities_participated: attendance?.activities_participated || [],
    positive_highlights: attendance?.positive_highlights || "",
    incidents_or_concerns: attendance?.incidents_or_concerns || "",
    recorded_by_staff_id: attendance?.recorded_by_staff_id || "",
  });

  React.useEffect(() => {
    if (staff.length > 0 && !formData.recorded_by_staff_id) {
      setFormData(prev => ({ ...prev, recorded_by_staff_id: getDefaultRecordedBy() }));
    }
  }, [staff, currentUser]);

  const { data: clients = [] } = useQuery({
    queryKey: ['daycentre-clients'],
    queryFn: async () => {
      const data = await base44.entities.DayCentreClient.list();
      return Array.isArray(data) ? data.filter(c => c.status === 'active') : [];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['daycentre-sessions'],
    queryFn: async () => {
      const data = await base44.entities.DayCentreSession.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data.filter(s => s.is_active !== false) : [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['daycentre-activities'],
    queryFn: async () => {
      const data = await base44.entities.DayCentreActivity.list();
      return Array.isArray(data) ? data.filter(a => a.is_active !== false) : [];
    },
  });

  const dateSessions = sessions.filter(s => s.session_date === formData.attendance_date);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DayCentreAttendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-attendance'] });
      toast.success("Attendance Recorded", "Attendance saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to record attendance");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DayCentreAttendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycentre-attendance'] });
      toast.success("Attendance Updated", "Changes saved successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Error", "Failed to update attendance");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.attendance_date) {
      toast.error("Missing Fields", "Please select a client and date");
      return;
    }

    if (!formData.recorded_by_staff_id) {
      toast.error("Missing Fields", "Please select who is recording this attendance");
      return;
    }

    const submitData = {
      ...formData,
      arrival_time: formData.arrival_time ? `${formData.attendance_date}T${formData.arrival_time}:00` : null,
      departure_time: formData.departure_time ? `${formData.attendance_date}T${formData.departure_time}:00` : null,
    };

    if (isEditing) {
      updateMutation.mutate({ id: attendance.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const toggleActivity = (activityName) => {
    setFormData({
      ...formData,
      activities_participated: formData.activities_participated.includes(activityName)
        ? formData.activities_participated.filter(a => a !== activityName)
        : [...formData.activities_participated, activityName]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Edit Attendance" : "Record Attendance"}
            </h2>
            <p className="text-amber-100 text-sm">Daily attendance register</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_id">Client <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger id="client_id">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="attendance_date">Date <span className="text-red-500">*</span></Label>
                <Input
                  id="attendance_date"
                  type="date"
                  value={formData.attendance_date}
                  onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="session_id">Session (Optional)</Label>
              <Select
                value={formData.session_id}
                onValueChange={(value) => setFormData({ ...formData, session_id: value })}
              >
                <SelectTrigger id="session_id">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {dateSessions.map((session) => {
                    const activity = activities.find(a => a.id === session.activity_id);
                    return (
                      <SelectItem key={session.id} value={session.id}>
                        {activity?.activity_name || 'Session'} - {session.start_time}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Attendance Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent_notified">Absent (Notified)</SelectItem>
                  <SelectItem value="absent_unnotified">Absent (Unnotified)</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="early_departure">Early Departure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="arrival_time">Arrival Time</Label>
                <Input
                  id="arrival_time"
                  type="time"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="departure_time">Departure Time</Label>
                <Input
                  id="departure_time"
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mood_arrival">Mood on Arrival</Label>
                <Select
                  value={formData.mood_on_arrival}
                  onValueChange={(value) => setFormData({ ...formData, mood_on_arrival: value })}
                >
                  <SelectTrigger id="mood_arrival">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="happy">😊 Happy</SelectItem>
                    <SelectItem value="neutral">😐 Neutral</SelectItem>
                    <SelectItem value="anxious">😟 Anxious</SelectItem>
                    <SelectItem value="upset">😢 Upset</SelectItem>
                    <SelectItem value="excited">✨ Excited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mood_departure">Mood on Departure</Label>
                <Select
                  value={formData.mood_on_departure}
                  onValueChange={(value) => setFormData({ ...formData, mood_on_departure: value })}
                >
                  <SelectTrigger id="mood_departure">
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Not recorded</SelectItem>
                    <SelectItem value="happy">😊 Happy</SelectItem>
                    <SelectItem value="neutral">😐 Neutral</SelectItem>
                    <SelectItem value="anxious">😟 Anxious</SelectItem>
                    <SelectItem value="upset">😢 Upset</SelectItem>
                    <SelectItem value="excited">✨ Excited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="transport">Transport Used</Label>
              <Select
                value={formData.transport_used}
                onValueChange={(value) => setFormData({ ...formData, transport_used: value })}
              >
                <SelectTrigger id="transport">
                  <SelectValue placeholder="Select transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Not specified</SelectItem>
                  <SelectItem value="self_transport">Self Transport</SelectItem>
                  <SelectItem value="family_transport">Family Transport</SelectItem>
                  <SelectItem value="centre_transport">Centre Transport</SelectItem>
                  <SelectItem value="taxi">Taxi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Checkbox
                  id="lunch"
                  checked={formData.lunch_consumed}
                  onCheckedChange={(checked) => setFormData({ ...formData, lunch_consumed: checked })}
                />
                <Label htmlFor="lunch" className="cursor-pointer">Lunch Consumed</Label>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <Checkbox
                  id="medication"
                  checked={formData.medication_administered}
                  onCheckedChange={(checked) => setFormData({ ...formData, medication_administered: checked })}
                />
                <Label htmlFor="medication" className="cursor-pointer">Medication Given</Label>
              </div>
            </div>

            <div>
              <Label className="mb-3 block flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activities Participated ({formData.activities_participated.length} selected)
              </Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No activities available</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`activity-${activity.id}`}
                          checked={formData.activities_participated.includes(activity.activity_name)}
                          onCheckedChange={() => toggleActivity(activity.activity_name)}
                        />
                        <Label htmlFor={`activity-${activity.id}`} className="cursor-pointer flex-1">
                          {activity.activity_name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="highlights" className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                Positive Highlights
              </Label>
              <Textarea
                id="highlights"
                value={formData.positive_highlights}
                onChange={(e) => setFormData({ ...formData, positive_highlights: e.target.value })}
                placeholder="Note any positive moments or achievements..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="concerns" className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                Incidents or Concerns
              </Label>
              <Textarea
                id="concerns"
                value={formData.incidents_or_concerns}
                onChange={(e) => setFormData({ ...formData, incidents_or_concerns: e.target.value })}
                placeholder="Record any incidents or concerns..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="recorded_by">Recorded By <span className="text-red-500">*</span></Label>
              <Select
                value={formData.recorded_by_staff_id}
                onValueChange={(value) => setFormData({ ...formData, recorded_by_staff_id: value })}
              >
                <SelectTrigger id="recorded_by">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 bg-white mt-6 -mx-6 -mb-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing ? "Update Attendance" : "Record Attendance"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}