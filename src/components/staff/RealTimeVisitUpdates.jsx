import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Send,
  Clock,
  User,
  MapPin,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  FileText,
  Heart,
  Utensils,
  Pill,
  Activity,
  RefreshCw
} from "lucide-react";
import { format, isToday } from "date-fns";

const QUICK_UPDATE_TYPES = [
  { id: 'arrival', label: 'Arrived', icon: MapPin, color: 'bg-green-100 text-green-700' },
  { id: 'task_complete', label: 'Task Done', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'medication', label: 'Medication', icon: Pill, color: 'bg-purple-100 text-purple-700' },
  { id: 'meal', label: 'Meal', icon: Utensils, color: 'bg-orange-100 text-orange-700' },
  { id: 'wellbeing', label: 'Wellbeing', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  { id: 'concern', label: 'Concern', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
];

export default function RealTimeVisitUpdates({ user }) {
  const [selectedShift, setSelectedShift] = useState(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateType, setUpdateType] = useState(null);
  const [sending, setSending] = useState(false);

  const queryClient = useQueryClient();

  // Fetch today's shifts for the user
  const { data: todayShifts = [], isLoading: loadingShifts, refetch: refetchShifts } = useQuery({
    queryKey: ['today-shifts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const carers = await base44.entities.Carer.filter({ email: user.email });
      const staff = await base44.entities.Staff.filter({ email: user.email });
      
      const staffIds = [
        ...(Array.isArray(carers) ? carers.map(c => c.id) : []),
        ...(Array.isArray(staff) ? staff.map(s => s.id) : [])
      ];

      if (staffIds.length === 0) return [];

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get today's shifts
      const allShifts = await base44.entities.Shift.list();
      const todayShiftsList = (Array.isArray(allShifts) ? allShifts : []).filter(s => 
        staffIds.includes(s.carer_id) && s.date === today
      );

      // Get today's visits
      const allVisits = await base44.entities.Visit.list();
      const todayVisits = (Array.isArray(allVisits) ? allVisits : []).filter(v => {
        const visitDate = v.scheduled_start?.split('T')[0];
        return staffIds.includes(v.assigned_staff_id) && visitDate === today;
      });

      return [
        ...todayShiftsList,
        ...todayVisits.map(v => ({
          ...v,
          start_time: v.scheduled_start ? format(new Date(v.scheduled_start), 'HH:mm') : '',
          end_time: v.scheduled_end ? format(new Date(v.scheduled_end), 'HH:mm') : '',
          isVisit: true
        }))
      ].sort((a, b) => {
        const timeA = a.start_time || '';
        const timeB = b.start_time || '';
        return timeA.localeCompare(timeB);
      });
    },
    enabled: !!user?.email,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch clients for the shifts
  const clientIds = [...new Set(todayShifts.map(s => s.client_id).filter(Boolean))];
  
  const { data: clients = [] } = useQuery({
    queryKey: ['visit-clients', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const allClients = await base44.entities.Client.list();
      return (Array.isArray(allClients) ? allClients : []).filter(c => clientIds.includes(c.id));
    },
    enabled: clientIds.length > 0,
  });

  // Fetch daily care notes for today
  const { data: todayNotes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['today-care-notes', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const allNotes = await base44.entities.DailyCareNote.list();
      return (Array.isArray(allNotes) ? allNotes : []).filter(n => 
        clientIds.includes(n.client_id) && n.note_date === today
      );
    },
    enabled: clientIds.length > 0,
  });

  // Send update mutation
  const sendUpdateMutation = useMutation({
    mutationFn: async ({ shiftId, clientId, type, message }) => {
      const noteData = {
        client_id: clientId,
        note_date: format(new Date(), 'yyyy-MM-dd'),
        note_time: format(new Date(), 'HH:mm'),
        note_type: type || 'general',
        staff_id: user?.email,
        staff_name: user?.full_name,
        content: message,
        shift_id: shiftId,
        created_via: 'mobile_portal',
      };

      return await base44.entities.DailyCareNote.create(noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-care-notes'] });
      setUpdateMessage("");
      setUpdateType(null);
      setSelectedShift(null);
    },
  });

  const getClientById = (clientId) => {
    return clients.find(c => c.id === clientId);
  };

  const getNotesForShift = (shiftId, clientId) => {
    return todayNotes.filter(n => n.shift_id === shiftId || n.client_id === clientId);
  };

  const handleSendUpdate = async () => {
    if (!selectedShift || !updateMessage.trim()) return;

    setSending(true);
    try {
      await sendUpdateMutation.mutateAsync({
        shiftId: selectedShift.id,
        clientId: selectedShift.client_id,
        type: updateType,
        message: updateMessage,
      });
    } catch (error) {
      console.error("Error sending update:", error);
      alert("Failed to send update. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleQuickUpdate = (shift, type) => {
    setSelectedShift(shift);
    setUpdateType(type.id);
    setUpdateMessage(`${type.label}: `);
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Today's Schedule</h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            refetchShifts();
            refetchNotes();
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loadingShifts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : todayShifts.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="p-6 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No shifts scheduled for today</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {todayShifts.map((shift) => {
            const client = getClientById(shift.client_id);
            const notes = getNotesForShift(shift.id, shift.client_id);
            
            return (
              <Card key={shift.id} className="overflow-hidden">
                <CardHeader className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        {client?.full_name || 'Unknown Client'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {shift.start_time} - {shift.end_time}
                        {client?.address && (
                          <>
                            <span className="text-gray-300">|</span>
                            <MapPin className="w-4 h-4" />
                            {client.address.postcode}
                          </>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(shift.status)}>
                      {shift.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Quick Update Buttons */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Quick Update:</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_UPDATE_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => handleQuickUpdate(shift, type)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${type.color} hover:opacity-80`}
                        >
                          <type.icon className="w-3 h-3" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Update Input */}
                  {selectedShift?.id === shift.id && (
                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm text-blue-900">
                          New Update {updateType && `(${QUICK_UPDATE_TYPES.find(t => t.id === updateType)?.label})`}
                        </span>
                      </div>
                      <Textarea
                        value={updateMessage}
                        onChange={(e) => setUpdateMessage(e.target.value)}
                        placeholder="Enter your update..."
                        rows={3}
                        className="resize-none bg-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSendUpdate}
                          disabled={sending || !updateMessage.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          {sending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send Update
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedShift(null);
                            setUpdateMessage("");
                            setUpdateType(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Custom Update Button */}
                  {selectedShift?.id !== shift.id && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedShift(shift);
                        setUpdateType('general');
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Update
                    </Button>
                  )}

                  {/* Recent Updates */}
                  {notes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Recent Updates ({notes.length})
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {notes.slice(0, 5).map((note) => (
                          <div 
                            key={note.id}
                            className="p-2 bg-gray-50 rounded-lg border text-sm"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {note.note_type || 'Update'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {note.note_time}
                              </span>
                            </div>
                            <p className="text-gray-700">{note.content}</p>
                            {note.staff_name && (
                              <p className="text-xs text-gray-400 mt-1">
                                By: {note.staff_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Communication Tips */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium text-purple-900">Real-Time Updates</p>
              <p className="text-sm text-purple-700 mt-1">
                Updates are automatically shared with the care team and management. 
                Use quick buttons for common updates or write custom notes for detailed information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}