import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Sparkles, List, Grid, Shuffle, CalendarDays, CalendarRange, Repeat, Send, Wand2, LayoutGrid } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { QuickFilters } from "@/components/ui/quick-filters";
import { useToast } from "@/components/ui/toast";
import { AdvancedFilter } from "@/components/ui/advanced-filter";
import { Tooltip } from "@/components/ui/tooltip";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state";
import { SmartSuggestion } from "@/components/ui/smart-suggestions";

import ShiftDialog from "../components/schedule/ShiftDialog";
import ShiftCard from "../components/schedule/ShiftCard";
import DayCalendar from "../components/schedule/DayCalendar";
import WeekCalendar from "../components/schedule/WeekCalendar";
import MonthCalendar from "../components/schedule/MonthCalendar";
import QuarterCalendar from "../components/schedule/QuarterCalendar";
import AIScheduleGenerator from "../components/schedule/AIScheduleGenerator";
import ConflictDetector from "../components/schedule/ConflictDetector";
import SplitScreenScheduler from "../components/schedule/SplitScreenScheduler";
import RecurringShiftDialog from "../components/schedule/RecurringShiftDialog";
import { DragDropScheduler } from "../components/schedule/DragDropScheduler";
import ShiftRequestDialog from "../components/messaging/ShiftRequestDialog";
import AlertBanner from "../components/alerts/AlertBanner";
import AIShiftAllocator from "../components/schedule/AIShiftAllocator";
import EnhancedRosterView from "../components/schedule/EnhancedRosterView";

export default function Schedule() {
  const [viewMode, setViewMode] = useState("roster");
  const [filters, setFilters] = useState({});
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showShiftRequest, setShowShiftRequest] = useState(false);
  const [requestingShift, setRequestingShift] = useState(null);
  const [showAIAllocator, setShowAIAllocator] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const data = await base44.entities.Shift.list('-date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['supported-living-properties'],
    queryFn: async () => {
      const data = await base44.entities.SupportedLivingProperty.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const data = await base44.entities.LeaveRequest.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts'],
    queryFn: async () => {
      const data = await base44.entities.ClientAlert.filter({
        status: 'active',
        display_on_sections: 'schedule'
      });
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 60000,
  });

  const { data: carerAvailability = [] } = useQuery({
    queryKey: ['carer-availability'],
    queryFn: async () => {
      const data = await base44.entities.CarerAvailability.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success("Success", "Shift deleted successfully");
    },
    onError: (error) => {
      toast.error("Error", "Failed to delete shift");
      console.error("Delete error:", error);
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success("Success", "Shift updated successfully");
    },
    onError: (error) => {
      toast.error("Error", "Failed to update shift");
      console.error("Update error:", error);
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem('schedule_saved_views');
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved views:", e);
      }
    }
  }, []);

  const handleSaveView = (view) => {
    const updated = [...savedViews, view];
    setSavedViews(updated);
    localStorage.setItem('schedule_saved_views', JSON.stringify(updated));
    toast.success("View Saved", `"${view.name}" has been saved`);
  };

  const handleDeleteView = (index) => {
    const updated = savedViews.filter((_, i) => i !== index);
    setSavedViews(updated);
    localStorage.setItem('schedule_saved_views', JSON.stringify(updated));
    toast.success("View Deleted", "Saved view removed");
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      deleteShiftMutation.mutate(id);
    }
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setShowShiftDialog(true);
  };

  const handleShiftUpdate = (shiftId, updates) => {
    updateShiftMutation.mutate({ id: shiftId, data: updates });
  };

  const handleSendRequest = (shift) => {
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;
    setRequestingShift({ ...shift, client });
    setShowShiftRequest(true);
  };

  const applyAdvancedFilters = (data, filterList) => {
    if (!Array.isArray(data) || !Array.isArray(filterList)) return data;
    
    return data.filter(item => {
      if (!item) return false;
      return filterList.every(filter => {
        const value = item[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return value === filterValue;
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'greater than':
            return Number(value) > Number(filterValue);
          case 'less than':
            return Number(value) < Number(filterValue);
          case 'is':
            return value === filterValue;
          default:
            return true;
        }
      });
    });
  };

  let filteredShifts = Array.isArray(shifts) ? [...shifts] : [];

  // Apply basic filters
  if (filters.status && filters.status !== "all") {
    filteredShifts = filteredShifts.filter(s => s && s.status === filters.status);
  }
  if (filters.carer_id) {
    filteredShifts = filteredShifts.filter(s => s && s.carer_id === filters.carer_id);
  }
  if (filters.client_id) {
    filteredShifts = filteredShifts.filter(s => s && s.client_id === filters.client_id);
  }

  // Apply advanced filters if they exist
  if (filters.advanced && Array.isArray(filters.advanced) && filters.advanced.length > 0) {
    filteredShifts = applyAdvancedFilters(filteredShifts, filters.advanced);
  }

  const exportData = filteredShifts.map(shift => {
    if (!shift) return {};
    
    const carer = Array.isArray(carers) ? carers.find(c => c && c.id === shift.carer_id) : null;
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;
    
    return {
      date: shift.date || '',
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      carer: carer?.full_name || 'Unassigned',
      client: client?.full_name || 'Unknown',
      shift_type: shift.shift_type || '',
      status: shift.status || '',
      duration_hours: shift.duration_hours || '',
    };
  });

  const exportColumns = [
    { key: 'date', header: 'Date' },
    { key: 'start_time', header: 'Start Time' },
    { key: 'end_time', header: 'End Time' },
    { key: 'carer', header: 'Carer' },
    { key: 'client', header: 'Client' },
    { key: 'shift_type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'duration_hours', header: 'Duration (hrs)' },
  ];

  const filterConfig = [
    { field: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'scheduled', 'completed'], operators: ['is'] },
    { field: 'shift_type', label: 'Shift Type', type: 'select', options: ['morning', 'afternoon', 'evening', 'night'], operators: ['is'] },
    { field: 'date', label: 'Date', type: 'date', operators: ['equals', 'greater than', 'less than'] },
    { field: 'duration_hours', label: 'Duration', type: 'number', operators: ['equals', 'greater than', 'less than'] },
  ];

  // Generate smart suggestions
  const suggestions = [];
  const unfilledShifts = Array.isArray(shifts) ? shifts.filter(s => s && !s.carer_id).length : 0;
  if (unfilledShifts > 0) {
    suggestions.push({
      type: 'warning',
      title: 'Unfilled Shifts Detected',
      description: `You have ${unfilledShifts} shifts without assigned carers. Would you like AI to help assign them?`,
      action: () => setShowAIGenerator(true),
      actionLabel: 'Auto-Assign'
    });
  }

  const isLoading = shiftsLoading || carersLoading || clientsLoading;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Shift Schedule</h1>
            <p className="text-gray-500">Manage and assign shifts to carers</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <QuickFilters
              currentFilters={filters}
              onFilterChange={handleFilterChange}
              savedViews={savedViews}
              onSaveView={handleSaveView}
              onDeleteView={handleDeleteView}
            />
            <ExportButton 
              data={exportData} 
              filename="shifts" 
              columns={exportColumns}
            />
            <Tooltip content="Generate schedule with AI">
              <Button
                onClick={() => setShowAIGenerator(true)}
                variant="outline"
                className="bg-gradient-to-r from-purple-50 to-blue-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
            </Tooltip>
            <Tooltip content="AI Smart Allocation">
              <Button
                onClick={() => setShowAIAllocator(true)}
                variant="outline"
                className="bg-gradient-to-r from-indigo-50 to-purple-50"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Smart Allocate
              </Button>
            </Tooltip>
            <Tooltip content="Create recurring shifts">
              <Button
                onClick={() => setShowRecurringDialog(true)}
                variant="outline"
                className="bg-gradient-to-r from-green-50 to-teal-50"
              >
                <Repeat className="w-4 h-4 mr-2" />
                Recurring
              </Button>
            </Tooltip>
            <Button
              onClick={() => {
                setEditingShift(null);
                setShowShiftDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </div>

        {/* Alert Banner - Show schedule-related alerts */}
        <AlertBanner alerts={alerts} />

        {suggestions.length > 0 && (
          <div className="mb-6">
            {suggestions.map((suggestion, idx) => (
              <SmartSuggestion key={idx} {...suggestion} />
            ))}
          </div>
        )}

        <AdvancedFilter
          filterConfig={filterConfig}
          onFiltersChange={(advancedFilters) => {
            setFilters({ ...filters, advanced: advancedFilters });
          }}
          appliedFilters={filters.advanced || []}
        />

        <div className="flex items-center gap-2 my-6 flex-wrap">
          <Tooltip content="Roster view - drag & drop scheduling">
            <Button
              variant={viewMode === "roster" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("roster")}
              className={viewMode === "roster" ? "bg-blue-600" : ""}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Roster
            </Button>
          </Tooltip>
          <Tooltip content="Day view">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("day")}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Day
            </Button>
          </Tooltip>
          <Tooltip content="Week calendar view">
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Week
            </Button>
          </Tooltip>
          <Tooltip content="Month calendar view">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              <CalendarRange className="w-4 h-4 mr-2" />
              Month
            </Button>
          </Tooltip>
          <Tooltip content="90-day overview">
            <Button
              variant={viewMode === "90days" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("90days")}
            >
              <CalendarRange className="w-4 h-4 mr-2" />
              90 Days
            </Button>
          </Tooltip>
          <Tooltip content="List view">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </Tooltip>
          <Tooltip content="Drag and drop by group">
            <Button
              variant={viewMode === "dragdrop" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("dragdrop")}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              By Group
            </Button>
          </Tooltip>
          <Tooltip content="Split screen view">
            <Button
              variant={viewMode === "split" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("split")}
            >
              <Grid className="w-4 h-4 mr-2" />
              Split
            </Button>
          </Tooltip>
        </div>

        <ConflictDetector shifts={filteredShifts} carers={carers} clients={clients} leaveRequests={leaveRequests} carerAvailability={carerAvailability} />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : viewMode === "roster" ? (
          <EnhancedRosterView
              shifts={filteredShifts}
              carers={carers}
              clients={clients}
              properties={properties}
              carerAvailability={carerAvailability}
              onShiftClick={handleEdit}
              onShiftUpdate={handleShiftUpdate}
              onAddShift={({ carer_id, date }) => {
                setEditingShift({ carer_id, date });
                setShowShiftDialog(true);
              }}
              locationName="Care Home"
            />
        ) : viewMode === "day" ? (
          <DayCalendar 
            shifts={filteredShifts} 
            carers={carers} 
            clients={clients}
            properties={properties}
            onShiftClick={handleEdit}
            onShiftUpdate={handleShiftUpdate}
          />
        ) : viewMode === "week" ? (
          <WeekCalendar 
            shifts={filteredShifts} 
            carers={carers} 
            clients={clients}
            properties={properties}
            onShiftClick={handleEdit}
            onShiftUpdate={handleShiftUpdate}
          />
        ) : viewMode === "month" ? (
          <MonthCalendar 
            shifts={filteredShifts} 
            carers={carers} 
            clients={clients}
            properties={properties}
            onShiftClick={handleEdit}
          />
        ) : viewMode === "90days" ? (
          <QuarterCalendar 
            shifts={filteredShifts} 
            carers={carers} 
            clients={clients}
            properties={properties}
            onShiftClick={handleEdit}
          />
        ) : viewMode === "dragdrop" ? (
          <DragDropScheduler
            shifts={filteredShifts}
            carers={carers}
            clients={clients}
            properties={properties}
            onShiftUpdate={handleShiftUpdate}
            onShiftEdit={handleEdit}
            onShiftDelete={handleDelete}
            groupBy="carer"
          />
        ) : viewMode === "split" ? (
          <SplitScreenScheduler
            shifts={filteredShifts}
            carers={carers}
            clients={clients}
            properties={properties}
            onShiftClick={handleEdit}
            onShiftUpdate={handleShiftUpdate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShifts.length === 0 ? (
              <div className="col-span-full">
                <EnhancedEmptyState
                  type="noData"
                  title="No shifts found"
                  description="Create your first shift or adjust your filters to see results"
                  actionLabel="Create Shift"
                  action={() => {
                    setEditingShift(null);
                    setShowShiftDialog(true);
                  }}
                  secondaryActionLabel="Clear Filters"
                  secondaryAction={() => setFilters({})}
                />
              </div>
            ) : (
              filteredShifts.map((shift) => {
                if (!shift) return null;
                
                return (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    carers={carers}
                    clients={clients}
                    properties={properties}
                    onEdit={() => handleEdit(shift)}
                    onDelete={() => handleDelete(shift.id)}
                    onSendRequest={() => handleSendRequest(shift)}
                  />
                );
              })
            )}
          </div>
        )}

        {showShiftDialog && (
          <ShiftDialog
            shift={editingShift}
            carers={carers}
            clients={clients}
            shifts={shifts}
            leaveRequests={leaveRequests}
            onClose={() => {
              setShowShiftDialog(false);
              setEditingShift(null);
            }}
          />
        )}

        {showAIGenerator && (
          <AIScheduleGenerator
            onClose={() => setShowAIGenerator(false)}
            shifts={shifts}
            carers={carers}
            clients={clients}
          />
        )}

        {showRecurringDialog && (
          <RecurringShiftDialog
            onClose={() => setShowRecurringDialog(false)}
            carers={carers}
            clients={clients}
          />
        )}

        {showShiftRequest && requestingShift && (
          <ShiftRequestDialog
            shift={requestingShift}
            client={requestingShift.client}
            carers={carers}
            onClose={() => {
              setShowShiftRequest(false);
              setRequestingShift(null);
            }}
          />
        )}

        {showAIAllocator && (
          <AIShiftAllocator
            onClose={() => setShowAIAllocator(false)}
            onAllocationsApplied={() => {
              setShowAIAllocator(false);
              queryClient.invalidateQueries({ queryKey: ['shifts'] });
            }}
          />
        )}
      </div>
    </div>
  );
}