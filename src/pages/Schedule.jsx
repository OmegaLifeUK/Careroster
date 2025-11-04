import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, List, Plus, Filter, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

import ShiftDialog from "../components/schedule/ShiftDialog";
import ShiftCard from "../components/schedule/ShiftCard";
import WeekCalendar from "../components/schedule/WeekCalendar";
import ShiftFilters from "../components/schedule/ShiftFilters";
import AIScheduleGenerator from "../components/schedule/AIScheduleGenerator";
import ConflictDetector from "../components/schedule/ConflictDetector";
import SmartAssignButton from "../components/schedule/SmartAssignButton";
import SplitScreenScheduler from "../components/schedule/SplitScreenScheduler";

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
  const [showFilters, setShowFilters] = useState(false);

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
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[98%] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule</h1>
            <p className="text-gray-500">Drag and drop shifts to manage your care schedule</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 md:flex-none"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              onClick={() => setShowAIGenerator(true)}
              className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              AI Generate
            </Button>
            <Button
              onClick={handleCreateShift}
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Shift
            </Button>
          </div>
        </div>

        {showFilters && (
          <ShiftFilters
            filters={filters}
            setFilters={setFilters}
            carers={carers}
            clients={clients}
          />
        )}

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