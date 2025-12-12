import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MyAvailability({ user }) {
  const [carer, setCarer] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadCarer = async () => {
      if (!user?.email) return;
      try {
        const allCarers = await base44.entities.Carer.list();
        const carerRecord = allCarers.find(c => c.email === user.email);
        setCarer(carerRecord);
      } catch (error) {
        console.error("Error loading carer:", error);
      }
    };
    loadCarer();
  }, [user]);

  const { data: availability = [] } = useQuery({
    queryKey: ['my-availability', carer?.id],
    queryFn: async () => {
      if (!carer?.id) return [];
      const data = await base44.entities.CarerAvailability.filter({ carer_id: carer.id });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!carer?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CarerAvailability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      toast.success("Availability saved");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CarerAvailability.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      toast.success("Availability updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarerAvailability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      toast.success("Availability removed");
    }
  });

  const workingHours = availability.filter(a => a.availability_type === 'working_hours');

  const handleSaveWorkingHours = (dayOfWeek, startTime, endTime) => {
    if (!carer) return;
    
    const existing = workingHours.find(wh => wh.day_of_week === dayOfWeek);
    
    if (existing) {
      updateMutation.mutate({
        id: existing.id,
        data: { start_time: startTime, end_time: endTime }
      });
    } else {
      createMutation.mutate({
        carer_id: carer.id,
        availability_type: 'working_hours',
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_recurring: true
      });
    }
  };

  const handleRemoveDay = (id) => {
    if (confirm("Remove this availability?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!carer) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">Loading your availability...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Set Your Working Hours</h3>
              <p className="text-sm text-blue-800">
                Let us know when you're available to work each week. This helps us schedule shifts that fit your preferences.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day, idx) => {
            const existing = workingHours.find(wh => wh.day_of_week === idx);
            const [startTime, setStartTime] = useState(existing?.start_time || '09:00');
            const [endTime, setEndTime] = useState(existing?.end_time || '17:00');

            return (
              <div key={idx} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-1">{day}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-gray-500 self-center">to</span>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSaveWorkingHours(idx, startTime, endTime)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                {existing && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveDay(existing.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {workingHours.length === 0 ? (
              <p className="text-gray-500 text-sm">No availability set yet</p>
            ) : (
              workingHours.map(wh => (
                <div key={wh.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{DAYS[wh.day_of_week]}</span>
                  </div>
                  <Badge variant="secondary">
                    {wh.start_time} - {wh.end_time}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}