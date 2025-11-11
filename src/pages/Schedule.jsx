
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, List, Plus, Filter, ChevronLeft, ChevronRight, LayoutGrid, Sparkles } from "lucide-react"; // Added Sparkles
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

import ShiftDialog from "../components/schedule/ShiftDialog";
import ShiftCard from "../components/schedule/ShiftCard";
import WeekCalendar from "../components/schedule/WeekCalendar";
import ShiftFilters from "../components/schedule/ShiftFilters";
import AIScheduleGenerator from "../components/schedule/AIScheduleGenerator";
import ConflictDetector from "../components/schedule/ConflictDetector";
import SmartAssignButton from "../components/schedule/SmartAssignButton";
import SplitScreenScheduler from "../components/schedule/SplitScreenScheduler";
import { ExportButton } from "@/components/ui/export-button";
import { QuickFilters } from "@/components/ui/quick-filters";
import { useToast } from "@/components/ui/use-toast"; // Corrected import path for useToast

export default function Schedule() {
  const [view, setView] = useState("timeline");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    carer: "all",
    client: "all",
  });
  const [showFilters, setShowFilters] = useState(false); // This can likely be removed as QuickFilters will manage the filter display

  const [savedViews, setSavedViews] = useState([]);
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list(),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (shiftId) => base44.entities.Shift.delete(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({
        title: "Success",
        description: "Shift deleted successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete shift",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({
        title: "Success",
        description: "Shift updated successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update shift",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  // Load saved views from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('schedule_saved_views');
    if (saved) {
      setSavedViews(JSON.parse(saved));
    }
  }, []);

  const handleSaveView = (viewToSave) => {
    const updated = [...savedViews, viewToSave];
    setSavedViews(updated);
    localStorage.setItem('schedule_saved_views', JSON.stringify(updated));
    toast({
      title: "View Saved",
      description: `"${viewToSave.name}" has been saved`,
      variant: "success",
    });
  };

  const handleDeleteView = (index) => {
    const updated = savedViews.filter((_, i) => i !== index);
    setSavedViews(updated);
    localStorage.setItem('schedule_saved_views', JSON.stringify(updated));
    toast({
      title: "View Deleted",
      description: "Saved view removed",
      variant: "success",
    });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleCreateShift = () => {
    setEditingShift(null);
    setShowDialog(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShowDialog(true);
  };

  const handleDeleteShift = (shiftId) => {
    if (window.confirm("Are you sure you want to delete this shift?")) {
      deleteShiftMutation.mutate(shiftId);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingShift(null);
  };

  const handleShiftUpdate = (shiftId, updatedData) => {
    updateShiftMutation.mutate({ id: shiftId, data: updatedData });
  };

  const filteredShifts = shifts.filter(shift => {
    if (filters.status !== "all" && shift.status !== filters.status) return false;
    if (filters.carer !== "all" && shift.carer_id !== filters.carer) return false;
    if (filters.client !== "all" && shift.client_id !== filters.client) return false;
    return true;
  });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isLoading = shiftsLoading || carersLoading || clientsLoading;

  const goToPreviousWeek = () => {
    setSelectedDate(subWeeks(selectedDate, 1));
  };

  const goToNextWeek = () => {
    setSelectedDate(addWeeks(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Prepare data for export
  const exportData = filteredShifts.map(shift => {
    const carer = carers.find(c => c.id === shift.carer_id);
    const client = clients.find(c => c.id === shift.client_id);

    return {
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      carer: carer?.full_name || 'Unassigned',
      client: client?.full_name || 'Unknown',
      shift_type: shift.shift_type,
      status: shift.status,
      duration_hours: shift.duration_hours,
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
              filterOptions={{
                status: [{ value: "all", label: "All Statuses" }, { value: "filled", label: "Filled" }, { value: "unfilled", label: "Unfilled" }],
                carer: [{ value: "all", label: "All Carers" }, ...carers.map(c => ({ value: c.id, label: c.full_name }))],
                client: [{ value: "all", label: "All Clients" }, ...clients.map(cl => ({ value: cl.id, label: cl.full_name }))],
              }}
            />
            <ExportButton
              data={exportData}
              filename="shifts"
              columns={exportColumns}
            />
            <Button
              onClick={() => setShowAIGenerator(true)}
              variant="outline"
              className="bg-gradient-to-r from-purple-50 to-blue-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </Button>
            <Button
              onClick={() => {
                setEditingShift(null);
                setShowDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </div>

        {/* Removed the ShiftFilters component as QuickFilters now handles it */}
        {/* {showFilters && (
          <ShiftFilters
            filters={filters}
            setFilters={setFilters}
            carers={carers}
            clients={clients}
          />
        )} */}

        <div className="mb-6">
          <ConflictDetector shifts={shifts} carers={carers} clients={clients} />
        </div>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button
              variant={view === "timeline" ? "default" : "ghost"}
              onClick={() => setView("timeline")}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Timeline
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              onClick={() => setView("week")}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Week View
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              List View
            </Button>
          </div>

          {view !== "list" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4 py-2 bg-gray-50 rounded-lg min-w-[200px] text-center">
                <p className="font-semibold text-gray-900">
                  {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
          )}
        </div>

        {view === "timeline" ? (
          <SplitScreenScheduler
            shifts={filteredShifts}
            carers={carers}
            clients={clients}
            weekStart={weekStart}
            onShiftUpdate={handleShiftUpdate}
            onShiftClick={handleEditShift}
          />
        ) : view === "week" ? (
          <WeekCalendar
            weekDays={weekDays}
            shifts={filteredShifts}
            carers={carers}
            clients={clients}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            isLoading={isLoading}
          />
        ) : (
          <div className="grid gap-4">
            {filteredShifts.map((shift) => (
              <div key={shift.id} className="relative">
                <ShiftCard
                  shift={shift}
                  carers={carers}
                  clients={clients}
                  onEdit={() => handleEditShift(shift)}
                  onDelete={() => handleDeleteShift(shift.id)}
                />
                {shift.status === 'unfilled' && (
                  <div className="absolute top-4 right-4">
                    <SmartAssignButton
                      shift={shift}
                      carers={carers}
                      clients={clients}
                      shifts={shifts}
                      leaveRequests={leaveRequests}
                    />
                  </div>
                )}
              </div>
            ))}
            {filteredShifts.length === 0 && !isLoading && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No shifts found</p>
                <p className="text-sm">Create a new shift to get started</p>
              </div>
            )}
          </div>
        )}

        {showDialog && (
          <ShiftDialog
            shift={editingShift}
            carers={carers}
            clients={clients}
            shifts={shifts}
            leaveRequests={leaveRequests}
            onClose={handleCloseDialog}
          />
        )}

        {showAIGenerator && (
          <AIScheduleGenerator
            carers={carers}
            clients={clients}
            shifts={shifts}
            leaveRequests={leaveRequests}
            onClose={() => setShowAIGenerator(false)}
          />
        )}
      </div>
    </div>
  );
}
