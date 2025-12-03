import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  User,
  FileText,
  Calendar,
  Database,
  Smartphone,
  Loader2,
  ChevronRight,
  MapPin
} from "lucide-react";
import { format, addDays, parseISO, isToday, isTomorrow } from "date-fns";

const OFFLINE_STORAGE_KEY = "careroster_offline_data";
const OFFLINE_SYNC_TIMESTAMP_KEY = "careroster_last_sync";

export default function OfflineDataManager({ user }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [offlineData, setOfflineData] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, status: '' });
  const [expandedClient, setExpandedClient] = useState(null);

  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data and last sync time from localStorage
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const storedTimestamp = localStorage.getItem(OFFLINE_SYNC_TIMESTAMP_KEY);
      
      if (storedData) {
        setOfflineData(JSON.parse(storedData));
      }
      if (storedTimestamp) {
        setLastSyncTime(new Date(storedTimestamp));
      }
    } catch (error) {
      console.error("Error loading offline data:", error);
    }
  }, []);

  // Fetch upcoming shifts for the user
  const { data: myShifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['offline-my-shifts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // Get carers/staff matching user email
      const carers = await base44.entities.Carer.filter({ email: user.email });
      const staff = await base44.entities.Staff.filter({ email: user.email });
      
      const staffIds = [
        ...(Array.isArray(carers) ? carers.map(c => c.id) : []),
        ...(Array.isArray(staff) ? staff.map(s => s.id) : [])
      ];

      if (staffIds.length === 0) return [];

      // Get shifts for next 7 days
      const today = new Date();
      const allShifts = await base44.entities.Shift.list();
      const allVisits = await base44.entities.Visit.list();
      
      const upcomingShifts = (Array.isArray(allShifts) ? allShifts : []).filter(s => {
        const shiftDate = new Date(s.date);
        return staffIds.includes(s.carer_id) && 
               shiftDate >= today && 
               shiftDate <= addDays(today, 7);
      });

      const upcomingVisits = (Array.isArray(allVisits) ? allVisits : []).filter(v => {
        const visitDate = new Date(v.scheduled_start);
        return staffIds.includes(v.assigned_staff_id) && 
               visitDate >= today && 
               visitDate <= addDays(today, 7);
      });

      return [...upcomingShifts, ...upcomingVisits.map(v => ({
        ...v,
        date: v.scheduled_start?.split('T')[0],
        start_time: v.scheduled_start ? format(new Date(v.scheduled_start), 'HH:mm') : '',
        end_time: v.scheduled_end ? format(new Date(v.scheduled_end), 'HH:mm') : '',
        isVisit: true
      }))];
    },
    enabled: !!user?.email && isOnline,
  });

  // Fetch clients for the user's shifts
  const clientIds = [...new Set(myShifts.map(s => s.client_id).filter(Boolean))];
  
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['offline-clients', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const allClients = await base44.entities.Client.list();
      return (Array.isArray(allClients) ? allClients : []).filter(c => clientIds.includes(c.id));
    },
    enabled: clientIds.length > 0 && isOnline,
  });

  // Fetch care plans for clients
  const { data: carePlans = [], isLoading: loadingCarePlans } = useQuery({
    queryKey: ['offline-care-plans', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const allPlans = await base44.entities.CarePlan.list();
      return (Array.isArray(allPlans) ? allPlans : [])
        .filter(cp => clientIds.includes(cp.client_id) && cp.status === 'active');
    },
    enabled: clientIds.length > 0 && isOnline,
  });

  // Sync data for offline use
  const syncForOffline = useCallback(async () => {
    if (!isOnline || !user?.email) return;

    setSyncing(true);
    setSyncProgress({ current: 0, total: 5, status: 'Starting sync...' });

    try {
      // Step 1: Fetch shifts
      setSyncProgress({ current: 1, total: 5, status: 'Syncing schedules...' });
      
      const carers = await base44.entities.Carer.filter({ email: user.email });
      const staff = await base44.entities.Staff.filter({ email: user.email });
      
      const staffIds = [
        ...(Array.isArray(carers) ? carers.map(c => c.id) : []),
        ...(Array.isArray(staff) ? staff.map(s => s.id) : [])
      ];

      const today = new Date();
      const allShifts = await base44.entities.Shift.list();
      const allVisits = await base44.entities.Visit.list();
      
      const shifts = (Array.isArray(allShifts) ? allShifts : []).filter(s => {
        const shiftDate = new Date(s.date);
        return staffIds.includes(s.carer_id) && 
               shiftDate >= today && 
               shiftDate <= addDays(today, 7);
      });

      const visits = (Array.isArray(allVisits) ? allVisits : []).filter(v => {
        const visitDate = new Date(v.scheduled_start);
        return staffIds.includes(v.assigned_staff_id) && 
               visitDate >= today && 
               visitDate <= addDays(today, 7);
      });

      // Step 2: Fetch clients
      setSyncProgress({ current: 2, total: 5, status: 'Syncing clients...' });
      
      const clientIdsToSync = [...new Set([
        ...shifts.map(s => s.client_id),
        ...visits.map(v => v.client_id)
      ].filter(Boolean))];

      const allClients = await base44.entities.Client.list();
      const clientsData = (Array.isArray(allClients) ? allClients : [])
        .filter(c => clientIdsToSync.includes(c.id));

      // Step 3: Fetch care plans
      setSyncProgress({ current: 3, total: 5, status: 'Syncing care plans...' });
      
      const allCarePlans = await base44.entities.CarePlan.list();
      const carePlansData = (Array.isArray(allCarePlans) ? allCarePlans : [])
        .filter(cp => clientIdsToSync.includes(cp.client_id) && cp.status === 'active');

      // Step 4: Fetch medication info
      setSyncProgress({ current: 4, total: 5, status: 'Syncing medications...' });
      
      const allMARSheets = await base44.entities.MARSheet.list();
      const marSheets = (Array.isArray(allMARSheets) ? allMARSheets : [])
        .filter(m => clientIdsToSync.includes(m.client_id));

      // Step 5: Save to localStorage
      setSyncProgress({ current: 5, total: 5, status: 'Saving data...' });
      
      const offlineDataPackage = {
        shifts,
        visits: visits.map(v => ({
          ...v,
          date: v.scheduled_start?.split('T')[0],
          start_time: v.scheduled_start ? format(new Date(v.scheduled_start), 'HH:mm') : '',
          end_time: v.scheduled_end ? format(new Date(v.scheduled_end), 'HH:mm') : '',
        })),
        clients: clientsData,
        carePlans: carePlansData,
        marSheets,
        staffIds,
        syncedAt: new Date().toISOString(),
      };

      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offlineDataPackage));
      localStorage.setItem(OFFLINE_SYNC_TIMESTAMP_KEY, new Date().toISOString());

      setOfflineData(offlineDataPackage);
      setLastSyncTime(new Date());

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['offline-my-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['offline-clients'] });
      queryClient.invalidateQueries({ queryKey: ['offline-care-plans'] });

    } catch (error) {
      console.error("Error syncing for offline:", error);
      alert("Failed to sync data for offline use. Please try again.");
    } finally {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0, status: '' });
    }
  }, [isOnline, user?.email, queryClient]);

  // Get data from either online or offline source
  const getDisplayData = () => {
    if (isOnline && myShifts.length > 0) {
      return { shifts: myShifts, clients, carePlans };
    }
    if (offlineData) {
      return {
        shifts: [...(offlineData.shifts || []), ...(offlineData.visits || [])],
        clients: offlineData.clients || [],
        carePlans: offlineData.carePlans || []
      };
    }
    return { shifts: [], clients: [], carePlans: [] };
  };

  const displayData = getDisplayData();

  const getClientById = (clientId) => {
    return displayData.clients.find(c => c.id === clientId);
  };

  const getCarePlanForClient = (clientId) => {
    return displayData.carePlans.find(cp => cp.client_id === clientId);
  };

  const getShiftDateLabel = (dateStr) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return "Today";
      if (isTomorrow(date)) return "Tomorrow";
      return format(date, "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  const groupShiftsByDate = () => {
    const grouped = {};
    displayData.shifts.forEach(shift => {
      const dateKey = shift.date || shift.scheduled_start?.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(shift);
    });
    return Object.entries(grouped).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  };

  const isLoading = loadingShifts || loadingClients || loadingCarePlans;

  return (
    <div className="space-y-4">
      {/* Connection Status Banner */}
      <Card className={`border-l-4 ${isOnline ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-6 h-6 text-green-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-orange-600" />
              )}
              <div>
                <p className={`font-semibold ${isOnline ? 'text-green-900' : 'text-orange-900'}`}>
                  {isOnline ? 'Online' : 'Offline Mode'}
                </p>
                <p className={`text-sm ${isOnline ? 'text-green-700' : 'text-orange-700'}`}>
                  {isOnline 
                    ? 'Connected - data syncs automatically' 
                    : 'Using cached data from last sync'}
                </p>
              </div>
            </div>
            {lastSyncTime && (
              <Badge variant="outline" className="text-xs">
                Last sync: {format(lastSyncTime, 'MMM d, h:mm a')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Button */}
      <Button
        onClick={syncForOffline}
        disabled={!isOnline || syncing}
        className="w-full bg-blue-600 hover:bg-blue-700 h-14"
      >
        {syncing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {syncProgress.status || 'Syncing...'}
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            Sync Data for Offline Use
          </>
        )}
      </Button>

      {syncing && syncProgress.total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Offline Data Summary */}
      {offlineData && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Cached Data Available</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold text-gray-900">
                  {(offlineData.shifts?.length || 0) + (offlineData.visits?.length || 0)}
                </p>
                <p className="text-xs text-gray-500">Shifts/Visits</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <User className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold text-gray-900">
                  {offlineData.clients?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Clients</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <FileText className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-lg font-bold text-gray-900">
                  {offlineData.carePlans?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Care Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule List */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Offline Schedule & Care Plans
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading && isOnline ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : displayData.shifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No upcoming shifts found</p>
              {!offlineData && (
                <p className="text-sm mt-2">Tap "Sync Data" to download your schedule</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupShiftsByDate().map(([date, shifts]) => (
                <div key={date}>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {getShiftDateLabel(date)}
                  </h3>
                  <div className="space-y-3">
                    {shifts.map((shift) => {
                      const client = getClientById(shift.client_id);
                      const carePlan = getCarePlanForClient(shift.client_id);
                      const isExpanded = expandedClient === shift.id;

                      return (
                        <div 
                          key={shift.id}
                          className="border rounded-lg overflow-hidden bg-white"
                        >
                          <button
                            onClick={() => setExpandedClient(isExpanded ? null : shift.id)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900">
                                    {client?.full_name || 'Unknown Client'}
                                  </span>
                                  {shift.isVisit && (
                                    <Badge variant="outline" className="text-xs">Visit</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  {shift.start_time} - {shift.end_time}
                                </div>
                                {client?.address && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {client.address.city} {client.address.postcode}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t bg-gray-50 p-4 space-y-4">
                              {/* Client Info */}
                              {client && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-600" />
                                    Client Information
                                  </h4>
                                  {client.medical_notes && (
                                    <div className="mb-2">
                                      <span className="text-xs text-gray-500">Medical Notes:</span>
                                      <p className="text-sm text-red-700 bg-red-50 p-2 rounded mt-1">
                                        {client.medical_notes}
                                      </p>
                                    </div>
                                  )}
                                  {client.care_needs?.length > 0 && (
                                    <div className="mb-2">
                                      <span className="text-xs text-gray-500">Care Needs:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {client.care_needs.map((need, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {need}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {client.emergency_contact && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Emergency Contact:</span>
                                      <p className="font-medium">
                                        {client.emergency_contact.name} - {client.emergency_contact.phone}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Care Plan */}
                              {carePlan && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-600" />
                                    Care Plan Summary
                                  </h4>
                                  
                                  {carePlan.care_tasks?.length > 0 && (
                                    <div className="mb-3">
                                      <span className="text-xs text-gray-500">Tasks:</span>
                                      <ul className="mt-1 space-y-1">
                                        {carePlan.care_tasks.slice(0, 5).map((task, idx) => (
                                          <li key={idx} className="text-sm flex items-start gap-2">
                                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                            <span>{task.task_name}</span>
                                          </li>
                                        ))}
                                        {carePlan.care_tasks.length > 5 && (
                                          <li className="text-xs text-gray-500">
                                            +{carePlan.care_tasks.length - 5} more tasks
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                  {carePlan.medication_management?.medications?.length > 0 && (
                                    <div className="mb-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                                      <span className="text-xs font-medium text-yellow-800">
                                        Medications ({carePlan.medication_management.medications.length}):
                                      </span>
                                      <ul className="mt-1 space-y-1">
                                        {carePlan.medication_management.medications.slice(0, 3).map((med, idx) => (
                                          <li key={idx} className="text-xs text-yellow-900">
                                            • {med.name} - {med.dose} ({med.frequency})
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {carePlan.risk_factors?.length > 0 && (
                                    <div className="p-2 bg-red-50 rounded border border-red-200">
                                      <span className="text-xs font-medium text-red-800 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Risk Factors:
                                      </span>
                                      <ul className="mt-1 space-y-1">
                                        {carePlan.risk_factors.map((risk, idx) => (
                                          <li key={idx} className="text-xs text-red-900">
                                            • {risk.risk} ({risk.likelihood} likelihood)
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Shift Tasks */}
                              {shift.tasks?.length > 0 && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <h4 className="font-semibold text-sm text-gray-700 mb-2">
                                    Shift Tasks
                                  </h4>
                                  <ul className="space-y-1">
                                    {shift.tasks.map((task, idx) => (
                                      <li key={idx} className="text-sm flex items-start gap-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                                          {idx + 1}
                                        </span>
                                        {task}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}