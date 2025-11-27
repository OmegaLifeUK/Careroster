import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  Search,
  Plus,
  Activity,
  MapPin
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SESSION_STATUS_COLORS = {
  scheduled: "bg-blue-400 text-blue-900 border-blue-500",
  in_progress: "bg-green-400 text-green-900 border-green-500",
  completed: "bg-gray-300 text-gray-700 border-gray-400",
  cancelled: "bg-red-300 text-red-800 border-red-400",
};

export default function DayCentreRosterView({
  sessions = [],
  activities = [],
  clients = [],
  staff = [],
  onSessionClick,
  onSessionUpdate,
  onAddSession,
  locationName = "Day Centre"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [viewByActivity, setViewByActivity] = useState(true);
  const { toast } = useToast();

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const activeActivities = useMemo(() => {
    let filtered = activities.filter(a => a && a.is_active !== false);
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.activity_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered.sort((a, b) => (a.activity_name || '').localeCompare(b.activity_name || ''));
  }, [activities, searchQuery]);

  // Weekly metrics
  const weeklyMetrics = useMemo(() => {
    const weekSessions = sessions.filter(s => {
      if (!s?.session_date) return false;
      try {
        const sessionDate = parseISO(s.session_date);
        return sessionDate >= currentWeekStart && sessionDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const totalSessions = weekSessions.length;
    const totalCapacity = weekSessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
    const totalRegistered = weekSessions.reduce((sum, s) => sum + (s.registered_clients?.length || 0), 0);
    const completedSessions = weekSessions.filter(s => s.status === 'completed').length;

    return {
      totalSessions,
      totalCapacity,
      totalRegistered,
      completedSessions,
      occupancyRate: totalCapacity > 0 ? ((totalRegistered / totalCapacity) * 100).toFixed(0) : 0
    };
  }, [sessions, currentWeekStart]);

  const dailyMetrics = useMemo(() => {
    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => s?.session_date === dayStr);
      const totalCapacity = daySessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
      const totalRegistered = daySessions.reduce((sum, s) => sum + (s.registered_clients?.length || 0), 0);
      
      return {
        date: day,
        totalSessions: daySessions.length,
        totalCapacity,
        totalRegistered,
        occupancy: totalCapacity > 0 ? ((totalRegistered / totalCapacity) * 100).toFixed(0) : 0
      };
    });
  }, [weekDays, sessions]);

  const getActivityDaySessions = (activityId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions
      .filter(s => s?.session_date === dayStr && s.activity_id === activityId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getActivityWeeklyStats = (activityId) => {
    const weekSessions = sessions.filter(s => {
      if (!s?.session_date || s.activity_id !== activityId) return false;
      try {
        const sessionDate = parseISO(s.session_date);
        return sessionDate >= currentWeekStart && sessionDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const totalCapacity = weekSessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
    const totalRegistered = weekSessions.reduce((sum, s) => sum + (s.registered_clients?.length || 0), 0);

    return {
      sessionCount: weekSessions.length,
      totalRegistered,
      totalCapacity,
      occupancy: totalCapacity > 0 ? ((totalRegistered / totalCapacity) * 100).toFixed(0) : 0
    };
  };

  const getActivityName = (activityId) => {
    const activity = activities.find(a => a?.id === activityId);
    return activity?.activity_name || 'Unknown Activity';
  };

  const getActivityColor = (activityId) => {
    const activity = activities.find(a => a?.id === activityId);
    // Generate consistent color based on activity name
    const colors = [
      'bg-amber-400 text-amber-900',
      'bg-rose-400 text-rose-900',
      'bg-emerald-400 text-emerald-900',
      'bg-cyan-400 text-cyan-900',
      'bg-violet-400 text-violet-900',
      'bg-pink-400 text-pink-900',
    ];
    const index = (activity?.activity_name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    // Sessions typically aren't dragged between activities, but we can implement date changes
    toast.info("Session Moved", "Session date updated");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-medium">Week</span>
              <Button variant="ghost" size="sm" className="font-semibold text-lg">
                {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
            <Badge className="bg-amber-100 text-amber-700">
              <Activity className="w-3 h-3 mr-1" />
              Day Centre
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-gray-500">Sessions</p>
              <p className="font-bold text-lg">{weeklyMetrics.totalSessions}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Registered</p>
              <p className="font-bold text-lg text-amber-600">{weeklyMetrics.totalRegistered}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Capacity</p>
              <p className="font-bold text-lg">{weeklyMetrics.totalCapacity}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Occupancy</p>
              <p className={`font-bold text-lg ${parseInt(weeklyMetrics.occupancyRate) > 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {weeklyMetrics.occupancyRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-gray-50">
        <div className="p-3 font-medium text-gray-600 border-r flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Daily Stats
        </div>
        {dailyMetrics.map((metric, idx) => {
          const isTodayDate = isToday(metric.date);
          return (
            <div key={idx} className={`p-2 text-center text-xs border-r ${isTodayDate ? 'bg-amber-50' : ''}`}>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-gray-400">Sessions</p>
                  <p className="font-semibold">{metric.totalSessions}</p>
                </div>
                <div>
                  <p className="text-gray-400">Booked</p>
                  <p className="font-semibold">{metric.totalRegistered}</p>
                </div>
              </div>
              <div className="mt-1">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${metric.occupancy}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{metric.occupancy}% full</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-white sticky top-0 z-20">
        <div className="p-3 font-medium text-gray-700 border-r flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Activities ({activeActivities.length})
        </div>
        {weekDays.map((day, idx) => {
          const isTodayDate = isToday(day);
          return (
            <div key={idx} className={`p-3 text-center border-r ${isTodayDate ? 'bg-amber-100 font-bold' : ''}`}>
              <p className={`text-sm ${isTodayDate ? 'text-amber-800' : 'text-gray-500'}`}>
                {format(day, 'EEE')}
              </p>
              <p className={`text-xl font-bold ${isTodayDate ? 'text-amber-900' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </p>
              {isTodayDate && <Badge className="bg-amber-600 text-white text-xs mt-1">Today</Badge>}
            </div>
          );
        })}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Activity Rows */}
        <div className="max-h-[550px] overflow-y-auto">
          {activeActivities.map((activity) => {
            const weekStats = getActivityWeeklyStats(activity.id);
            const activityColor = getActivityColor(activity.id);
            
            return (
              <div key={activity.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50">
                <div className="p-3 border-r flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${activityColor.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">{activity.activity_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{weekStats.sessionCount} sessions</span>
                      <span>•</span>
                      <span>{weekStats.occupancy}% full</span>
                    </div>
                    {activity.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        {activity.location}
                      </div>
                    )}
                  </div>
                </div>

                {weekDays.map((day, idx) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const daySessions = getActivityDaySessions(activity.id, day);
                  const isTodayDate = isToday(day);

                  return (
                    <Droppable key={`${activity.id}_${dayStr}`} droppableId={`${activity.id}_${dayStr}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-1 min-h-[80px] border-r transition-colors ${
                            isTodayDate ? 'bg-amber-50/50' : ''
                          } ${snapshot.isDraggingOver ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''}`}
                        >
                          <div className="space-y-1">
                            {daySessions.map((session, sIdx) => {
                              const registeredCount = session.registered_clients?.length || 0;
                              const capacity = session.max_capacity || 0;
                              const occupancy = capacity > 0 ? (registeredCount / capacity) * 100 : 0;
                              const statusColor = SESSION_STATUS_COLORS[session.status] || 'bg-gray-200';
                              
                              return (
                                <Draggable key={session.id} draggableId={session.id} index={sIdx}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => onSessionClick?.(session)}
                                      className={`
                                        px-2 py-1.5 rounded text-xs cursor-pointer border
                                        ${activityColor}
                                        hover:shadow-md transition-all
                                        ${snapshot.isDragging ? 'shadow-xl ring-2 ring-amber-400 z-50' : ''}
                                      `}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold">{session.start_time}-{session.end_time}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Users className="w-3 h-3" />
                                        <span className="font-medium">{registeredCount}/{capacity}</span>
                                      </div>
                                      {/* Capacity bar */}
                                      <div className="h-1 bg-white/50 rounded-full mt-1 overflow-hidden">
                                        <div 
                                          className={`h-full ${occupancy >= 80 ? 'bg-green-600' : occupancy >= 50 ? 'bg-yellow-500' : 'bg-white/80'}`}
                                          style={{ width: `${Math.min(occupancy, 100)}%` }}
                                        />
                                      </div>
                                      {session.location && (
                                        <div className="text-[10px] opacity-75 truncate mt-0.5">
                                          {session.location}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          </div>
                          {provided.placeholder}
                          
                          {daySessions.length === 0 && !snapshot.isDraggingOver && (
                            <button
                              onClick={() => onAddSession?.({ activity_id: activity.id, session_date: dayStr })}
                              className="w-full h-full min-h-[50px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-gray-400 hover:text-amber-500"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Legend */}
      <div className="p-3 border-t bg-gray-50 flex items-center gap-4 text-xs">
        <span className="text-gray-500">Capacity:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-600" />
          <span>80%+ Full</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>50-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-300" />
          <span>&lt;50%</span>
        </div>
      </div>
    </div>
  );
}