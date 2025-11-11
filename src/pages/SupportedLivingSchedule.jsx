
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Home,
  Plus,
  Filter,
  Edit
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, addDays, isToday, isSameDay } from "date-fns";
import SupportedLivingShiftDialog from "../components/supportedliving/SupportedLivingShiftDialog";

export default function SupportedLivingSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week"); // week or day
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const queryClient = useQueryClient();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['supported-living-shifts'],
    queryFn: () => base44.entities.SupportedLivingShift.list('-date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['supported-living-properties'],
    queryFn: () => base44.entities.SupportedLivingProperty.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['supported-living-clients'],
    queryFn: () => base44.entities.SupportedLivingClient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const createShiftMutation = useMutation({
    mutationFn: (shiftData) => base44.entities.SupportedLivingShift.create(shiftData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported-living-shifts'] });
      setShowShiftDialog(false);
      setEditingShift(null);
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportedLivingShift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported-living-shifts'] });
      setShowShiftDialog(false);
      setEditingShift(null);
      setSelectedShift(null);
    },
  });

  const handleSaveShift = (shiftData) => {
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data: shiftData });
    } else {
      createShiftMutation.mutate(shiftData);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShowShiftDialog(true);
    setSelectedShift(null);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => {
      try {
        return isSameDay(parseISO(shift.date), date);
      } catch {
        return false;
      }
    });
  };

  const todayShifts = getShiftsForDay(new Date());
  const upcomingShifts = shifts.filter(shift => {
    try {
      const shiftDate = parseISO(shift.date);
      return shiftDate > new Date();
    } catch {
      return false;
    }
  }).slice(0, 10);

  const shiftTypeColors = {
    visiting_support: "bg-blue-100 text-blue-800",
    core_hours: "bg-green-100 text-green-800",
    sleep_in: "bg-purple-100 text-purple-800",
    waking_night: "bg-indigo-100 text-indigo-800",
    on_call: "bg-orange-100 text-orange-800",
  };

  const shiftTypeLabels = {
    visiting_support: "Visiting",
    core_hours: "Core Hours",
    sleep_in: "Sleep-In",
    waking_night: "Waking Night",
    on_call: "On-Call",
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-blue-100 text-blue-800",
    in_progress: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-800",
  };

  if (selectedShift) {
    const property = properties.find(p => p.id === selectedShift.property_id);
    const staffMember = staff.find(s => s.id === selectedShift.staff_id);
    const supportedClients = clients.filter(c => 
      selectedShift.clients_supported?.includes(c.id)
    );

    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedShift(null)}
            className="mb-6"
          >
            ← Back to Schedule
          </Button>

          <Card>
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Shift Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditShift(selectedShift)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Badge className={statusColors[selectedShift.status]}>
                    {selectedShift.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Shift Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Property</p>
                      <p className="font-medium">{property?.property_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{selectedShift.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">{selectedShift.start_time} - {selectedShift.end_time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shift Type</p>
                      <Badge className={shiftTypeColors[selectedShift.shift_type]}>
                        {shiftTypeLabels[selectedShift.shift_type]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Staff & Clients</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Assigned Staff</p>
                      <p className="font-medium">{staffMember?.full_name || 'Unassigned'}</p>
                    </div>
                    {supportedClients.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Clients Supported</p>
                        <div className="space-y-1">
                          {supportedClients.map(client => (
                            <div key={client.id} className="p-2 bg-indigo-50 rounded text-sm">
                              {client.full_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedShift.planned_activities && selectedShift.planned_activities.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Planned Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedShift.planned_activities.map((activity, idx) => (
                      <Badge key={idx} variant="outline">{activity}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedShift.shift_notes && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Shift Notes</h3>
                  <p className="text-blue-800">{selectedShift.shift_notes}</p>
                </div>
              )}

              {selectedShift.completion_notes && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Completion Notes</h3>
                  <p className="text-green-800">{selectedShift.completion_notes}</p>
                </div>
              )}

              {selectedShift.clock_in_time && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Time Tracking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Clock In</p>
                      <p className="font-medium">{format(parseISO(selectedShift.clock_in_time), 'HH:mm')}</p>
                    </div>
                    {selectedShift.clock_out_time && (
                      <div>
                        <p className="text-sm text-gray-600">Clock Out</p>
                        <p className="font-medium">{format(parseISO(selectedShift.clock_out_time), 'HH:mm')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Shift Schedule</h1>
            <p className="text-gray-500">Manage support sessions and shifts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                setEditingShift(null);
                setShowShiftDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">Today's Shifts</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{todayShifts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {shifts.filter(s => s.status === 'in_progress').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-gray-600">Upcoming</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{upcomingShifts.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Week View</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addDays(currentDate, -7))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[200px] text-center">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addDays(currentDate, 7))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`p-3 text-center border-r last:border-r-0 ${
                    isToday(day) ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="text-xs text-gray-600 uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday(day) ? 'text-indigo-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getShiftsForDay(day).length} shifts
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((day, idx) => {
                const dayShifts = getShiftsForDay(day);
                return (
                  <div
                    key={idx}
                    className="p-2 border-r last:border-r-0 min-h-[300px] bg-gray-50"
                  >
                    <div className="space-y-2">
                      {dayShifts.map((shift) => {
                        const property = properties.find(p => p.id === shift.property_id);
                        const staffMember = staff.find(s => s.id === shift.staff_id);
                        
                        return (
                          <div
                            key={shift.id}
                            onClick={() => setSelectedShift(shift)}
                            className="p-2 bg-white rounded border-l-4 border-indigo-500 cursor-pointer hover:shadow-md transition-shadow text-xs"
                          >
                            <div className="font-medium mb-1">{shift.start_time}</div>
                            <Badge variant="outline" className={`text-[10px] mb-1 ${shiftTypeColors[shift.shift_type]}`}>
                              {shiftTypeLabels[shift.shift_type]}
                            </Badge>
                            <div className="text-gray-600 truncate">{property?.property_name}</div>
                            {staffMember && (
                              <div className="text-gray-500 text-[10px] mt-1 truncate">
                                {staffMember.full_name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Today's Shifts</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {todayShifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No shifts scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayShifts.map((shift) => {
                  const property = properties.find(p => p.id === shift.property_id);
                  const staffMember = staff.find(s => s.id === shift.staff_id);
                  const supportedClients = clients.filter(c => 
                    shift.clients_supported?.includes(c.id)
                  );

                  return (
                    <div
                      key={shift.id}
                      onClick={() => setSelectedShift(shift)}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Clock className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-semibold">{shift.start_time} - {shift.end_time}</div>
                            <div className="text-sm text-gray-600">{property?.property_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={shiftTypeColors[shift.shift_type]}>
                            {shiftTypeLabels[shift.shift_type]}
                          </Badge>
                          <Badge className={statusColors[shift.status]}>
                            {shift.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Staff:</span>
                          <span className="font-medium">{staffMember?.full_name || 'Unassigned'}</span>
                        </div>
                        {supportedClients.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Clients:</span>
                            <span className="font-medium">{supportedClients.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {showShiftDialog && (
          <SupportedLivingShiftDialog
            shift={editingShift}
            properties={properties}
            clients={clients}
            staff={staff}
            onSave={handleSaveShift}
            onClose={() => {
              setShowShiftDialog(false);
              setEditingShift(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
