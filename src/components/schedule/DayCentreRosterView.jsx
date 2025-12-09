import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Search,
  Plus,
  User,
  Activity,
  Maximize2,
  MapPin
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, parseISO, addWeeks, subWeeks } from "date-fns";
import { useToast } from "@/components/ui/toast";

const SESSION_COLORS = {
  scheduled: { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" },
  in_progress: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  completed: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-600", dot: "bg-slate-400" },
  cancelled: { bg: "bg-red-100", border: "border-red-300", text: "text-red-800", dot: "bg-red-500" },
};

const ACTIVITY_COLORS = [
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800", dot: "bg-cyan-500" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800", dot: "bg-pink-500" },
];

const TIMELINE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export default function DayCentreRosterView({
  sessions = [],
  activities = [],
  clients = [],
  staff = [],
  onSessionClick,
  onSessionUpdate,
  onAddSession,
  onEditSession,
  locationName = "Day Centre"
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activePanel, setActivePanel] = useState("activities");
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

  const activeClients = useMemo(() => {
    return clients.filter(c => c && c.status === 'active')
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [clients]);

  const weeklyStats = useMemo(() => {
    const weekSessions = sessions.filter(s => {
      if (!s?.session_date) return false;
      try {
        const sessionDate = parseISO(s.session_date);
        return sessionDate >= currentWeekStart && sessionDate < addDays(currentWeekStart, 7);
      } catch { return false; }
    });

    const total = weekSessions.length;
    const totalCapacity = weekSessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
    const totalRegistered = weekSessions.reduce((sum, s) => sum + (s.registered_clients?.length || 0), 0);
    const completed = weekSessions.filter(s => s.status === 'completed').length;

    return { 
      total, 
      completed, 
      totalCapacity, 
      totalRegistered,
      occupancy: totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0
    };
  }, [sessions, currentWeekStart]);

  const getActivityDaySessions = (activityId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions
      .filter(s => s?.session_date === dayStr && s.activity_id === activityId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getClientDaySessions = (clientId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions
      .filter(s => s?.session_date === dayStr && s.registered_clients?.includes(clientId))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const getActivityColor = (activityId) => {
    const activity = activities.find(a => a?.id === activityId);
    const index = (activity?.activity_name?.charCodeAt(0) || 0) % ACTIVITY_COLORS.length;
    return ACTIVITY_COLORS[index];
  };

  const getActivityName = (activityId) => activities.find(a => a?.id === activityId)?.activity_name || '';

  const getTimePosition = (time) => {
    if (!time) return 0;
    const [hour, min] = time.split(':').map(Number);
    return ((hour - 8 + min / 60) / 10) * 100;
  };

  const getTimeWidth = (start, end) => {
    if (!start || !end) return 10;
    const startPos = getTimePosition(start);
    const endPos = getTimePosition(end);
    return Math.max(endPos - startPos, 8);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    toast.info("Session Updated", "Session has been moved");
  };

  const SessionPill = ({ session, showActivity = true, showEdit = false }) => {
    const colors = getActivityColor(session.activity_id);
    const registered = session.registered_clients?.length || 0;
    const capacity = session.max_capacity || 0;
    const occupancy = capacity > 0 ? Math.round((registered / capacity) * 100) : 0;

    return (
      <div
        onClick={(e) => {
          if (e.target.closest('.edit-btn')) return;
          onSessionClick?.(session);
        }}
        className={`
          px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all relative group
          ${colors.bg} ${colors.border} ${colors.text} border
          hover:shadow-md hover:scale-[1.02]
        `}
      >
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className="font-medium truncate">
            {showActivity ? getActivityName(session.activity_id) : session.start_time}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-[10px] opacity-75">
            <Users className="w-3 h-3" />
            <span>{registered}/{capacity}</span>
          </div>
          <div className="h-1 w-12 bg-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full ${occupancy >= 80 ? 'bg-emerald-500' : occupancy >= 50 ? 'bg-amber-500' : 'bg-gray-400'}`}
              style={{ width: `${Math.min(occupancy, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const TimelineSession = ({ session }) => {
    const colors = getActivityColor(session.activity_id);
    const left = getTimePosition(session.start_time);
    const width = getTimeWidth(session.start_time, session.end_time);
    const registered = session.registered_clients?.length || 0;
    const capacity = session.max_capacity || 0;

    return (
      <div
        onClick={() => onSessionClick?.(session)}
        className={`
          absolute top-1 bottom-1 rounded cursor-pointer transition-all
          ${colors.bg} ${colors.border} border
          hover:shadow-lg hover:z-10
        `}
        style={{ left: `${left}%`, width: `${width}%`, minWidth: '50px' }}
      >
        <div className="px-1.5 py-0.5 text-[10px] truncate h-full flex flex-col justify-between">
          <span className={`font-semibold ${colors.text}`}>
            {getActivityName(session.activity_id)}
          </span>
          <span className={`${colors.text} opacity-75`}>
            {registered}/{capacity}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">{locationName}</h2>
              <p className="text-amber-100 text-sm">Activity Schedule</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.total}</p>
                <p className="text-amber-200 text-xs">Sessions</p>
              </div>
              <div className="w-px h-8 bg-amber-400" />
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.totalRegistered}</p>
                <p className="text-amber-200 text-xs">Registered</p>
              </div>
              <div className="w-px h-8 bg-amber-400" />
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.totalCapacity}</p>
                <p className="text-amber-200 text-xs">Capacity</p>
              </div>
              <div className="w-px h-8 bg-amber-400" />
              <div className="text-center">
                <p className={`text-2xl font-bold ${weeklyStats.occupancy >= 70 ? 'text-emerald-300' : 'text-amber-200'}`}>
                  {weeklyStats.occupancy}%
                </p>
                <p className="text-amber-200 text-xs">Occupancy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => viewMode === "day" 
              ? setSelectedDate(addDays(selectedDate, -1))
              : setCurrentWeekStart(subWeeks(currentWeekStart, 1))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex bg-white rounded-lg border p-0.5">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === "day" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === "week" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-sm">
              {viewMode === "day" 
                ? format(selectedDate, 'EEE, d MMM yyyy')
                : `${format(currentWeekStart, 'd MMM')} - ${format(addDays(currentWeekStart, 6), 'd MMM yyyy')}`
              }
            </span>
          </div>

          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => viewMode === "day" 
              ? setSelectedDate(addDays(selectedDate, 1))
              : setCurrentWeekStart(addWeeks(currentWeekStart, 1))
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>

          <div className="flex bg-white rounded-lg border p-0.5">
            <button
              onClick={() => setActivePanel("activities")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "activities" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Activity className="w-3 h-3" />
              Activities
            </button>
            <button
              onClick={() => setActivePanel("clients")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "clients" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <User className="w-3 h-3" />
              Clients
            </button>
            <button
              onClick={() => setActivePanel("both")}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all ${
                activePanel === "both" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              Split
            </button>
          </div>
        </div>
      </div>

      {viewMode === "day" ? (
        /* DAY TIMELINE VIEW */
        <div className="flex flex-col">
          <div className="flex border-b bg-gray-50">
            <div className="w-56 p-2 border-r flex-shrink-0" />
            <div className="flex-1 flex">
              {TIMELINE_HOURS.map(hour => (
                <div key={hour} className="flex-1 text-center py-2 text-xs text-gray-500 border-r">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {(activePanel === "activities" || activePanel === "both") && activeActivities.length > 0 && (
            <div className={activePanel === "both" ? "border-b" : ""}>
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b">
                <Activity className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-900">Activities</span>
                <Badge className="bg-amber-100 text-amber-700 text-xs">{activeActivities.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeActivities.map(activity => {
                  const daySessions = getActivityDaySessions(activity.id, selectedDate);
                  const colors = getActivityColor(activity.id);
                  
                  return (
                    <div key={activity.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
                          <Activity className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{activity.activity_name}</p>
                          {activity.location && (
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {activity.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 relative h-16 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {daySessions.map(session => (
                          <TimelineSession key={session.id} session={session} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activePanel === "clients" || activePanel === "both") && activeClients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b">
                <User className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-orange-900">Attendees</span>
                <Badge className="bg-orange-100 text-orange-700 text-xs">{activeClients.length}</Badge>
              </div>
              <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[280px]" : "max-h-[500px]"}`}>
                {activeClients.map(client => {
                  const daySessions = getClientDaySessions(client.id, selectedDate);
                  
                  return (
                    <div key={client.id} className="flex border-b hover:bg-gray-50 transition-colors">
                      <div className="w-56 p-2 border-r flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {client.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{client.full_name}</p>
                          <p className="text-xs text-gray-500">{daySessions.length} sessions</p>
                        </div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50/50">
                        <div className="absolute inset-0 flex">
                          {TIMELINE_HOURS.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-100" />
                          ))}
                        </div>
                        {daySessions.map(session => (
                          <TimelineSession key={session.id} session={session} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* WEEK GRID VIEW */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col">
            <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-3 border-r flex items-center gap-2">
                {activePanel === "clients" ? (
                  <>
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">Attendees</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">Activities</span>
                  </>
                )}
              </div>
              {weekDays.map((day, idx) => {
                const isTodayDate = isToday(day);
                return (
                  <div 
                    key={idx} 
                    className={`p-2 border-r text-center transition-colors ${
                      isTodayDate ? 'bg-amber-50' : ''
                    }`}
                  >
                    <p className={`text-xs font-medium ${isTodayDate ? 'text-amber-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-bold ${isTodayDate ? 'text-amber-700' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Activities Rows */}
            {(activePanel === "activities" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`}>
              {activeActivities.map((activity) => {
                const colors = getActivityColor(activity.id);
                
                return (
                  <div key={activity.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
                        <Activity className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.activity_name}</p>
                        {activity.location && (
                          <p className="text-xs text-gray-500 truncate">{activity.location}</p>
                        )}
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const daySessions = getActivityDaySessions(activity.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <Droppable key={`${activity.id}_${dayStr}`} droppableId={`${activity.id}_${dayStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 min-h-[70px] border-r transition-colors relative group ${
                                isTodayDate ? 'bg-amber-50/30' : ''
                              } ${snapshot.isDraggingOver ? 'bg-amber-100/50 ring-2 ring-inset ring-amber-300' : ''}`}
                            >
                              <div className="space-y-1 relative z-10">
                                {daySessions.map((session, sIdx) => (
                                  <Draggable key={session.id} draggableId={session.id} index={sIdx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={snapshot.isDragging ? 'z-50' : ''}
                                      >
                                        <SessionPill session={session} showActivity={false} showEdit={true} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </div>
                              {provided.placeholder}
                              
                              {/* Add button - only show when no sessions */}
                              {daySessions.length === 0 && (
                                <button
                                  onClick={() => onAddSession?.({ activity_id: activity.id, session_date: dayStr })}
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-amber-50/50"
                                >
                                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                                    <Plus className="w-4 h-4" />
                                  </div>
                                </button>
                              )}
                              {/* Small add button in corner when sessions exist */}
                              {daySessions.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddSession?.({ activity_id: activity.id, session_date: dayStr });
                                  }}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                  <Plus className="w-3 h-3" />
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
            )}

            {/* Clients Rows */}
            {(activePanel === "clients" || activePanel === "both") && (
            <div className={`overflow-y-auto ${activePanel === "both" ? "max-h-[250px]" : "max-h-[500px]"}`}>
              {activePanel === "both" && (
                <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-orange-50">
                  <div className="p-2 border-r flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Attendees</span>
                  </div>
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="border-r" />
                  ))}
                </div>
              )}
              {activeClients.map((client) => {
                return (
                  <div key={client.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 border-r flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {client.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{client.full_name}</p>
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const daySessions = getClientDaySessions(client.id, day);
                      const isTodayDate = isToday(day);

                      return (
                        <div
                          key={dayStr}
                          className={`p-1 min-h-[60px] border-r transition-colors ${
                            isTodayDate ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            {daySessions.map((session) => (
                              <SessionPill key={session.id} session={session} showEdit={true} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Legend */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">Capacity:</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-600">80%+ Full</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gray-600">50-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <span className="text-gray-600">&lt;50%</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Drag sessions to reschedule
        </div>
      </div>
    </div>
  );
}