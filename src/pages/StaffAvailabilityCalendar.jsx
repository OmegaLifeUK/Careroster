import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Clock,
  X,
  Check,
  AlertCircle,
  Settings
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import WorkingHoursSetup from "../components/availability/WorkingHoursSetup";
import UnavailabilityDialog from "../components/availability/UnavailabilityDialog";
import { useToast } from "@/components/ui/toast";

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StaffAvailabilityCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showWorkingHoursSetup, setShowWorkingHoursSetup] = useState(false);
  const [showUnavailabilityDialog, setShowUnavailabilityDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-scheduled_start'),
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['staff-availability'],
    queryFn: () => base44.entities.CarerAvailability.list(),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list(),
  });

  const isAdmin = user?.role === 'admin';

  const currentStaffMember = useMemo(() => {
    if (selectedStaff) {
      return staff.find(s => s.id === selectedStaff);
    }
    if (!isAdmin && user?.email) {
      return staff.find(s => s.email === user.email);
    }
    return staff[0];
  }, [selectedStaff, staff, user, isAdmin]);

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const getStaffVisitsForDay = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return visits.filter(v => {
      const visitStaffId = v.staff_id || v.assigned_staff_id;
      if (visitStaffId !== staffId) return false;
      if (!v.scheduled_start) return false;
      try {
        const visitDate = format(new Date(v.scheduled_start), 'yyyy-MM-dd');
        return visitDate === dayStr;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      try {
        return a.scheduled_start.localeCompare(b.scheduled_start);
      } catch {
        return 0;
      }
    });
  };

  const getStaffAvailabilityForDay = (staffId, day) => {
    const dayOfWeek = day.getDay();
    return availability.filter(a => 
      a.carer_id === staffId && 
      a.day_of_week === dayOfWeek &&
      a.availability_type === 'working_hours'
    );
  };

  const getStaffUnavailabilityForDay = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    // Check specific date unavailability
    const specificUnavailability = availability.filter(a => {
      if (a.carer_id !== staffId || a.availability_type !== 'unavailable' || !a.specific_date) return false;
      try {
        return format(new Date(a.specific_date), 'yyyy-MM-dd') === dayStr;
      } catch {
        return false;
      }
    });

    // Check date range unavailability
    const rangeUnavailability = availability.filter(a => 
      a.carer_id === staffId && 
      a.availability_type === 'unavailable' &&
      a.date_range_start && a.date_range_end
    ).filter(a => {
      try {
        const start = new Date(a.date_range_start);
        const end = new Date(a.date_range_end);
        return day >= start && day <= end;
      } catch {
        return false;
      }
    });

    // Check leave requests
    const approvedLeave = leaveRequests.filter(lr =>
      lr.carer_id === staffId &&
      lr.status === 'approved' &&
      lr.start_date && lr.end_date
    ).filter(lr => {
      try {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        return day >= start && day <= end;
      } catch {
        return false;
      }
    });

    return [...specificUnavailability, ...rangeUnavailability, ...approvedLeave];
  };

  const handleAddWorkingHours = () => {
    setShowWorkingHoursSetup(true);
  };

  const handleAddUnavailability = () => {
    setEditingAvailability(null);
    setShowUnavailabilityDialog(true);
  };

  const DayCell = ({ day, staffId }) => {
    const visits = getStaffVisitsForDay(staffId, day);
    const workingHours = getStaffAvailabilityForDay(staffId, day);
    const unavailability = getStaffUnavailabilityForDay(staffId, day);
    const isToday = isSameDay(day, new Date());
    const hasConflict = visits.length > 0 && unavailability.length > 0;

    const handleCellClick = () => {
      setSelectedDate(day);
      setShowQuickAddDialog(true);
    };

    return (
      <div 
        onClick={handleCellClick}
        className={`min-h-[150px] border-r border-b p-2 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50' : 'bg-white'} ${hasConflict ? 'ring-2 ring-red-500' : ''}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {format(day, 'd')}
          </span>
          {isToday && <Badge className="bg-blue-500 text-white text-xs">Today</Badge>}
        </div>

        {/* Working Hours */}
        {workingHours.length > 0 && (
          <div className="mb-2 space-y-1">
            {workingHours.map(wh => (
              <div key={wh.id} className="bg-green-50 border border-green-200 rounded px-2 py-1 text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-green-600" />
                  <span className="font-medium text-green-800">{wh.start_time} - {wh.end_time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unavailability */}
        {unavailability.length > 0 && (
          <div className="mb-2 space-y-1">
            {unavailability.map((unav, idx) => (
              <div key={unav.id || idx} className="bg-red-50 border border-red-200 rounded px-2 py-1 text-xs">
                <div className="flex items-center gap-1">
                  <X className="w-3 h-3 text-red-600" />
                  <span className="font-medium text-red-800">
                    {unav.reason || unav.leave_type || 'Unavailable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scheduled Visits */}
        {visits.length > 0 && (
          <div className="space-y-1">
            {visits.map(visit => (
              <div 
                key={visit.id} 
                className={`rounded px-2 py-1 text-xs ${
                  hasConflict ? 'bg-red-100 border border-red-300' : 'bg-blue-100 border border-blue-300'
                }`}
              >
                <div className="font-medium text-gray-900">
                  {visit.scheduled_start ? (() => {
                    try {
                      return format(new Date(visit.scheduled_start), 'HH:mm');
                    } catch {
                      return 'Invalid time';
                    }
                  })() : 'No time'}
                </div>
                <div className="text-gray-600 truncate text-[10px]">
                  {visit.duration_minutes}min visit
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conflict Warning */}
        {hasConflict && (
          <div className="mt-2 bg-red-100 border border-red-300 rounded px-2 py-1 text-xs text-red-800">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Conflict!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Staff Availability Calendar</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage working hours, availability, and view scheduled visits
                </p>
              </div>
              {isAdmin && (
                <select
                  value={currentStaffMember?.id || ''}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-lg font-semibold">
                  {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                >
                  Today
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddWorkingHours}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Set Working Hours
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddUnavailability}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Mark Unavailable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
                <span>Working Hours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
                <span>Scheduled Visit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded" />
                <span>Conflict</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <div className="grid grid-cols-7">
            {/* Day Headers */}
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="bg-gray-100 border-r border-b p-3 text-center font-semibold text-sm"
              >
                <div>{DAY_NAMES[day.getDay()]}</div>
                <div className="text-xs text-gray-600 mt-1">{format(day, 'MMM d')}</div>
              </div>
            ))}

            {/* Day Cells */}
            {currentStaffMember && weekDays.map((day, idx) => (
              <DayCell key={idx} day={day} staffId={currentStaffMember.id} />
            ))}
          </div>
        </Card>

        {/* Summary Stats */}
        {currentStaffMember && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Week Summary - {currentStaffMember.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {weekDays.reduce((sum, day) => 
                      sum + getStaffVisitsForDay(currentStaffMember.id, day).length, 0
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Visits</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {weekDays.filter(day => 
                      getStaffAvailabilityForDay(currentStaffMember.id, day).length > 0
                    ).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Days Available</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {weekDays.filter(day => 
                      getStaffUnavailabilityForDay(currentStaffMember.id, day).length > 0
                    ).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Days Unavailable</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {weekDays.filter(day => {
                      const visits = getStaffVisitsForDay(currentStaffMember.id, day);
                      const unavail = getStaffUnavailabilityForDay(currentStaffMember.id, day);
                      return visits.length > 0 && unavail.length > 0;
                    }).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Conflicts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        {showWorkingHoursSetup && currentStaffMember && (
          <WorkingHoursSetup
            staffId={currentStaffMember.id}
            onClose={() => setShowWorkingHoursSetup(false)}
          />
        )}

        {showUnavailabilityDialog && currentStaffMember && (
          <UnavailabilityDialog
            staffId={currentStaffMember.id}
            availability={editingAvailability}
            onClose={() => {
              setShowUnavailabilityDialog(false);
              setEditingAvailability(null);
            }}
          />
        )}

        {showQuickAddDialog && currentStaffMember && selectedDate && (
          <QuickAddAvailabilityDialog
            staffId={currentStaffMember.id}
            date={selectedDate}
            onClose={() => {
              setShowQuickAddDialog(false);
              setSelectedDate(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function QuickAddAvailabilityDialog({ staffId, date, onClose }) {
  const [type, setType] = useState('working');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CarerAvailability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
      toast.success('Availability added');
      onClose();
    },
  });

  const handleSave = () => {
    const data = {
      carer_id: staffId,
      availability_type: type === 'working' ? 'working_hours' : 'unavailable',
      specific_date: format(date, 'yyyy-MM-dd'),
      is_recurring: false,
    };

    if (type === 'working') {
      data.start_time = startTime;
      data.end_time = endTime;
    } else {
      data.reason = reason || 'Unavailable';
    }

    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Add Availability - {format(date, 'MMM d, yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={type === 'working' ? 'default' : 'outline'}
                onClick={() => setType('working')}
                className="flex-1"
              >
                Working
              </Button>
              <Button
                variant={type === 'unavailable' ? 'default' : 'outline'}
                onClick={() => setType('unavailable')}
                className="flex-1"
              >
                Unavailable
              </Button>
            </div>
          </div>

          {type === 'working' ? (
            <div className="space-y-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <Label>Reason</Label>
              <Input
                placeholder="Reason for unavailability"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}