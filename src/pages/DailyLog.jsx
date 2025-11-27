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
  User
} from "lucide-react";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { useToast } from "@/components/ui/toast";
import DailyLogDialog from "@/components/dailylog/DailyLogDialog";

const ENTRY_TYPE_CONFIG = {
  visitor: { label: "Visitor", icon: Users, color: "bg-blue-100 text-blue-700" },
  doctor_appointment: { label: "Doctor", icon: Stethoscope, color: "bg-red-100 text-red-700" },
  social_worker_visit: { label: "Social Worker", icon: UserCheck, color: "bg-purple-100 text-purple-700" },
  nurse_visit: { label: "Nurse", icon: Stethoscope, color: "bg-pink-100 text-pink-700" },
  therapist_visit: { label: "Therapist", icon: UserCheck, color: "bg-teal-100 text-teal-700" },
  family_visit: { label: "Family Visit", icon: Users, color: "bg-green-100 text-green-700" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "bg-orange-100 text-orange-700" },
  delivery: { label: "Delivery", icon: Truck, color: "bg-amber-100 text-amber-700" },
  emergency_services: { label: "Emergency", icon: AlertCircle, color: "bg-red-100 text-red-700" },
  inspection: { label: "Inspection", icon: UserCheck, color: "bg-indigo-100 text-indigo-700" },
  contractor: { label: "Contractor", icon: Wrench, color: "bg-gray-100 text-gray-700" },
  other: { label: "Other", icon: Clock, color: "bg-gray-100 text-gray-700" }
};

export default function DailyLog() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
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
      log.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || log.entry_type === filterType;
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
    visitors: logs.filter(l => l.entry_type === 'visitor' || l.entry_type === 'family_visit').length,
    medical: logs.filter(l => ['doctor_appointment', 'nurse_visit', 'therapist_visit'].includes(l.entry_type)).length,
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
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.visitors}</p>
              <p className="text-sm text-gray-600">Visitors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.medical}</p>
              <p className="text-sm text-gray-600">Medical Visits</p>
            </CardContent>
          </Card>
          <Card>
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
                {Object.entries(ENTRY_TYPE_CONFIG).slice(0, 6).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={filterType === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(key)}
                  >
                    {config.label}
                  </Button>
                ))}
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
        ) : (
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
                            <h3 className="font-semibold text-gray-900">{entry.visitor_name}</h3>
                            {entry.visitor_organization && (
                              <p className="text-sm text-gray-600">{entry.visitor_organization}</p>
                            )}
                          </div>
                          <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                          {(entry.arrival_time || entry.departure_time) && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {entry.arrival_time && <span>{entry.arrival_time}</span>}
                              {entry.arrival_time && entry.departure_time && <span>-</span>}
                              {entry.departure_time && <span>{entry.departure_time}</span>}
                            </div>
                          )}
                          {clientName && (
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
            onClose={() => { setShowDialog(false); setEditingEntry(null); }}
          />
        )}
      </div>
    </div>
  );
}