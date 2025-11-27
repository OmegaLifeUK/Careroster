import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Users,
  Stethoscope,
  UserCheck,
  Truck,
  Wrench,
  AlertCircle,
  Clock,
  Pencil,
  Trash2,
  User,
  MapPin,
  Car,
  GraduationCap,
  ShoppingBag,
  Activity
} from "lucide-react";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { useToast } from "@/components/ui/toast";
import DailyLogDialog from "@/components/dailylog/DailyLogDialog";

// Helper component for time display
const TimeDisplay = ({ entry }) => {
  const isOuting = entry.entry_type?.startsWith('outing_');
  const hasArrival = !!entry.arrival_time;
  const hasDeparture = !!entry.departure_time;
  const isOngoing = (hasArrival && !hasDeparture) || (isOuting && hasDeparture && !hasArrival);
  
  if (isOuting) {
    // For outings: departure = left, arrival = returned
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded ${isOngoing ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
        <Clock className="w-4 h-4" />
        {entry.departure_time && (
          <span>
            <span className="text-xs text-gray-500">Left:</span> {entry.departure_time}
          </span>
        )}
        {entry.departure_time && entry.arrival_time && <span className="text-gray-400">→</span>}
        {entry.arrival_time ? (
          <span>
            <span className="text-xs text-gray-500">Returned:</span> {entry.arrival_time}
          </span>
        ) : entry.departure_time ? (
          <Badge className="bg-amber-200 text-amber-800 text-xs animate-pulse">Out</Badge>
        ) : null}
      </div>
    );
  }
  
  // For visitors: arrival = in, departure = out
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${isOngoing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
      <Clock className="w-4 h-4" />
      {entry.arrival_time && (
        <span>
          <span className="text-xs text-gray-500">In:</span> {entry.arrival_time}
        </span>
      )}
      {entry.arrival_time && entry.departure_time && <span className="text-gray-400">→</span>}
      {entry.departure_time ? (
        <span>
          <span className="text-xs text-gray-500">Out:</span> {entry.departure_time}
        </span>
      ) : entry.arrival_time ? (
        <Badge className="bg-green-200 text-green-800 text-xs animate-pulse">On Site</Badge>
      ) : null}
    </div>
  );
};

const ENTRY_TYPE_CONFIG = {
  visitor: { label: "Visitor", icon: Users, color: "bg-blue-100 text-blue-700", category: "visitor" },
  doctor_appointment: { label: "Doctor", icon: Stethoscope, color: "bg-red-100 text-red-700", category: "visitor" },
  social_worker_visit: { label: "Social Worker", icon: UserCheck, color: "bg-purple-100 text-purple-700", category: "visitor" },
  nurse_visit: { label: "Nurse", icon: Stethoscope, color: "bg-pink-100 text-pink-700", category: "visitor" },
  therapist_visit: { label: "Therapist", icon: UserCheck, color: "bg-teal-100 text-teal-700", category: "visitor" },
  family_visit: { label: "Family Visit", icon: Users, color: "bg-green-100 text-green-700", category: "visitor" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "bg-orange-100 text-orange-700", category: "visitor" },
  delivery: { label: "Delivery", icon: Truck, color: "bg-amber-100 text-amber-700", category: "visitor" },
  emergency_services: { label: "Emergency", icon: AlertCircle, color: "bg-red-100 text-red-700", category: "visitor" },
  inspection: { label: "Inspection", icon: UserCheck, color: "bg-indigo-100 text-indigo-700", category: "visitor" },
  contractor: { label: "Contractor", icon: Wrench, color: "bg-gray-100 text-gray-700", category: "visitor" },
  outing_activity: { label: "Activity Outing", icon: Activity, color: "bg-cyan-100 text-cyan-700", category: "outing" },
  outing_gp_clinic: { label: "GP/Clinic", icon: Stethoscope, color: "bg-rose-100 text-rose-700", category: "outing" },
  outing_hospital: { label: "Hospital", icon: Stethoscope, color: "bg-red-100 text-red-700", category: "outing" },
  outing_school: { label: "School", icon: GraduationCap, color: "bg-yellow-100 text-yellow-700", category: "outing" },
  outing_shopping: { label: "Shopping", icon: ShoppingBag, color: "bg-pink-100 text-pink-700", category: "outing" },
  outing_day_trip: { label: "Day Trip", icon: MapPin, color: "bg-emerald-100 text-emerald-700", category: "outing" },
  outing_community: { label: "Community", icon: Users, color: "bg-violet-100 text-violet-700", category: "outing" },
  outing_other: { label: "Other Outing", icon: Car, color: "bg-slate-100 text-slate-700", category: "outing" },
  other: { label: "Other", icon: Clock, color: "bg-gray-100 text-gray-700", category: "other" }
};

export default function DailyLog() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("timeline"); // "timeline" or "list"
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily-logs', dateStr],
    queryFn: async () => {
      const data = await base44.entities.DailyLog.filter({ log_date: dateStr });
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      toast.success("Deleted", "Log entry removed");
    }
  });

  const filteredLogs = logs.filter(log => {
    if (!log) return false;
    const matchesSearch = !searchQuery || 
      log.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.outing_destination?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesType = filterType === "all";
    if (filterType === "outings") {
      matchesType = log.entry_type?.startsWith('outing_');
    } else if (filterType === "visitors") {
      matchesType = !log.entry_type?.startsWith('outing_');
    } else if (filterType !== "all") {
      matchesType = log.entry_type === filterType;
    }
    
    return matchesSearch && matchesType;
  }).sort((a, b) => (a.arrival_time || '').localeCompare(b.arrival_time || ''));

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c?.id === clientId);
    return client?.full_name || null;
  };

  const stats = {
    total: logs.length,
    visitors: logs.filter(l => !l.entry_type?.startsWith('outing_')).length,
    outings: logs.filter(l => l.entry_type?.startsWith('outing_')).length,
    followUp: logs.filter(l => l.follow_up_required).length
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Log</h1>
            <p className="text-gray-500">Record visitors, appointments, and activities</p>
          </div>
          <Button 
            onClick={() => { setEditingEntry(null); setShowDialog(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {/* Date Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div className="text-center">
                  <h2 className="text-xl font-bold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h2>
                  {isToday(selectedDate) && (
                    <Badge className="bg-green-100 text-green-700">Today</Badge>
                  )}
                </div>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                  className="w-40"
                />
              </div>
              <Button variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setFilterType("all")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Entries</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setFilterType("visitor")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.visitors}</p>
              <p className="text-sm text-gray-600">Visitors</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setFilterType("outings")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-cyan-600">{stats.outings}</p>
              <p className="text-sm text-gray-600">Outings</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => { setEditingEntry(null); setShowDialog(true); }}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.followUp}</p>
              <p className="text-sm text-gray-600">Follow-ups Required</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={filterType === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  All
                </Button>
                <Button 
                  variant={filterType === "visitors" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilterType("visitors")}
                >
                  Visitors
                </Button>
                <Button 
                  variant={filterType === "outings" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilterType("outings")}
                  className={filterType === "outings" ? "bg-cyan-600" : ""}
                >
                  Outings
                </Button>
                <Button 
                  variant={filterType === "doctor_appointment" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilterType("doctor_appointment")}
                >
                  Medical
                </Button>
                <Button 
                  variant={filterType === "family_visit" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilterType("family_visit")}
                >
                  Family
                </Button>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    viewMode === "timeline" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    viewMode === "list" ? "bg-white shadow text-blue-600 font-medium" : "text-gray-600"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log Entries */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No entries for this day</h3>
              <p className="text-gray-500 mb-4">Record visitors, appointments, and other activities</p>
              <Button onClick={() => { setEditingEntry(null); setShowDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "timeline" ? (
          /* TIMELINE VIEW */
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                <div className="space-y-6">
                  {filteredLogs.map((entry, index) => {
                    const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.other;
                    const Icon = typeConfig.icon;
                    const clientName = getClientName(entry.client_id);
                    const isOuting = entry.entry_type?.startsWith('outing_');

                    return (
                      <div key={entry.id} className="relative pl-16 group">
                        {/* Time marker */}
                        <div className="absolute left-0 w-12 text-right pr-2">
                          <span className="text-sm font-medium text-gray-700">
                            {entry.arrival_time || '--:--'}
                          </span>
                        </div>
                        
                        {/* Timeline dot */}
                        <div className={`absolute left-[18px] w-5 h-5 rounded-full border-2 border-white shadow ${typeConfig.color.replace('text-', 'bg-').split(' ')[0]}`} />
                        
                        {/* Entry card */}
                        <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                          isOuting ? 'bg-cyan-50 border-cyan-200' : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {isOuting ? (clientName || 'Client Outing') : entry.visitor_name}
                                  </h4>
                                  <Badge className={`text-xs ${typeConfig.color}`}>{typeConfig.label}</Badge>
                                  <TimeDisplay entry={entry} />
                                </div>
                                
                                {!isOuting && entry.visitor_organization && (
                                  <p className="text-sm text-gray-600">{entry.visitor_organization}</p>
                                )}
                                
                                {entry.purpose && (
                                  <p className="text-sm text-gray-700 mt-1">{entry.purpose}</p>
                                )}
                                
                                {isOuting && (
                                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                    {entry.outing_destination && (
                                      <span className="flex items-center gap-1 text-cyan-700">
                                        <MapPin className="w-3 h-3" /> {entry.outing_destination}
                                      </span>
                                    )}
                                    {entry.outing_transport && (
                                      <span className="flex items-center gap-1 text-cyan-700">
                                        <Car className="w-3 h-3" /> {entry.outing_transport.replace('_', ' ')}
                                      </span>
                                    )}
                                    {entry.risk_assessment_completed && (
                                      <Badge className="bg-green-100 text-green-700 text-[10px]">✓ Risk Assessed</Badge>
                                    )}
                                  </div>
                                )}
                                
                                {entry.outing_outcome && (
                                  <p className="text-sm text-gray-600 mt-2 italic">"{entry.outing_outcome}"</p>
                                )}
                                
                                {entry.notes && !entry.outing_outcome && (
                                  <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                                )}
                                
                                {entry.follow_up_required && (
                                  <div className="flex items-center gap-1 mt-2 text-orange-600 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">Follow-up: {entry.follow_up_notes || 'Required'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(entry.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* LIST VIEW */
          <div className="space-y-3">
            {filteredLogs.map(entry => {
              const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.other;
              const Icon = typeConfig.icon;
              const clientName = getClientName(entry.client_id);

              return (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${typeConfig.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {entry.entry_type?.startsWith('outing_') 
                                ? (clientName || 'Client Outing')
                                : entry.visitor_name
                              }
                            </h3>
                            {entry.visitor_organization && !entry.entry_type?.startsWith('outing_') && (
                              <p className="text-sm text-gray-600">{entry.visitor_organization}</p>
                            )}
                          </div>
                          <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                          {(entry.arrival_time || entry.departure_time) && (
                            <TimeDisplay entry={entry} />
                          )}
                          {clientName && !entry.entry_type?.startsWith('outing_') && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{clientName}</span>
                            </div>
                          )}
                        </div>

                        {entry.purpose && (
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Purpose:</strong> {entry.purpose}
                          </p>
                        )}

                        {entry.notes && (
                          <p className="text-sm text-gray-600 mb-2">{entry.notes}</p>
                        )}

                        {/* Outing-specific details */}
                        {entry.entry_type?.startsWith('outing_') && (
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2 p-2 bg-cyan-50 rounded-lg">
                            {entry.outing_destination && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-cyan-600" />
                                <span>{entry.outing_destination}</span>
                              </div>
                            )}
                            {entry.outing_transport && (
                              <div className="flex items-center gap-1">
                                <Car className="w-4 h-4 text-cyan-600" />
                                <span className="capitalize">{entry.outing_transport.replace('_', ' ')}</span>
                              </div>
                            )}
                            {entry.risk_assessment_completed && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Risk Assessed</Badge>
                            )}
                          </div>
                        )}

                        {entry.outing_outcome && (
                          <p className="text-sm text-gray-700 mb-2 p-2 bg-gray-50 rounded">
                            <strong>Outcome:</strong> {entry.outing_outcome}
                          </p>
                        )}

                        {entry.follow_up_required && (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-orange-700 font-medium">Follow-up required</span>
                            {entry.follow_up_notes && (
                              <span className="text-sm text-orange-600">- {entry.follow_up_notes}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {showDialog && (
          <DailyLogDialog
            entry={editingEntry}
            defaultDate={dateStr}
            clients={clients}
            staff={staff}
            onClose={() => { setShowDialog(false); setEditingEntry(null); }}
          />
        )}
      </div>
    </div>
  );
}