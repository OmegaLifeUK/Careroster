import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, List, Plus, Filter, ChevronLeft, ChevronRight, LayoutGrid, Sparkles, Zap, AlertTriangle, BarChart3 } from "lucide-react";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

import VisitDialog from "../components/domcare/VisitDialog";
import RunDialog from "../components/domcare/RunDialog";
import DomCareTimeline from "../components/domcare/DomCareTimeline";
import DomCareRosterView from "../components/schedule/DomCareRosterView";
import AIShiftAllocator from "../components/schedule/AIShiftAllocator";
import ConflictDetector from "../components/schedule/ConflictDetector";
import AutoScheduleHelper from "../components/schedule/AutoScheduleHelper";
import SmartSuggestionsWidget from "../components/dashboard/SmartSuggestionsWidget";

export default function DomCareSchedule() {
  const [view, setView] = useState("roster");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editingRun, setEditingRun] = useState(null);
  const [showAIAllocator, setShowAIAllocator] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);

  const queryClient = useQueryClient();

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-scheduled_start'),
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => base44.entities.Run.list('-run_date'),
  });

  const { data: staffAvailability = [] } = useQuery({
    queryKey: ['staff-availability'],
    queryFn: () => base44.entities.CarerAvailability.list(),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list(),
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Visit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (visitId) => base44.entities.Visit.delete(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    },
  });

  const handleCreateVisit = () => {
    setEditingVisit(null);
    setShowVisitDialog(true);
  };

  const handleCreateRun = () => {
    setEditingRun(null);
    setShowRunDialog(true);
  };

  const handleEditVisit = (visit) => {
    setEditingVisit(visit);
    setShowVisitDialog(true);
  };

  const handleDeleteVisit = (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit?")) {
      deleteVisitMutation.mutate(visitId);
    }
  };

  const handleCloseDialogs = () => {
    setShowVisitDialog(false);
    setShowRunDialog(false);
    setEditingVisit(null);
    setEditingRun(null);
  };

  const handleVisitUpdate = (visitId, updatedData) => {
    updateVisitMutation.mutate({ id: visitId, data: updatedData });
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const goToPreviousWeek = () => {
    setSelectedDate(subWeeks(selectedDate, 1));
  };

  const goToNextWeek = () => {
    setSelectedDate(addWeeks(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isLoading = visitsLoading || staffLoading || clientsLoading || runsLoading;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[98%] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Visit Schedule</h1>
            <p className="text-gray-500">Drag and drop visits to organize care runs</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <Button
              onClick={() => setShowAIAllocator(true)}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Allocate
            </Button>
            <Button
              onClick={() => setShowConflicts(true)}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Conflicts
            </Button>
            <Button
              onClick={() => setShowAutoSchedule(true)}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto Schedule
            </Button>
            <Button
              onClick={handleCreateRun}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Run
            </Button>
            <Button
              onClick={handleCreateVisit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Visit
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button
              variant={view === "roster" ? "default" : "ghost"}
              onClick={() => setView("roster")}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Roster
            </Button>
            <Button
              variant={view === "timeline" ? "default" : "ghost"}
              onClick={() => setView("timeline")}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Timeline
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

        {isLoading ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading schedule...</p>
          </div>
        ) : view === "roster" ? (
          <DomCareRosterView
            visits={visits}
            staff={staff}
            clients={clients}
            runs={runs}
            staffAvailability={staffAvailability}
            onVisitClick={handleEditVisit}
            onVisitUpdate={handleVisitUpdate}
            onAddVisit={(visitData) => {
              setEditingVisit(visitData);
              setShowVisitDialog(true);
            }}
            locationName="Domiciliary Care"
          />
        ) : view === "timeline" ? (
          <DomCareTimeline
            visits={visits}
            staff={staff}
            clients={clients}
            runs={runs}
            weekStart={weekStart}
            onVisitUpdate={handleVisitUpdate}
            onVisitClick={handleEditVisit}
            isLoading={isLoading}
          />
        ) : (
          <div className="bg-white rounded-lg border p-6">
            <p className="text-center text-gray-500">List view coming soon...</p>
          </div>
        )}

        {showVisitDialog && (
          <VisitDialog
            visit={editingVisit}
            staff={staff}
            clients={clients}
            runs={runs}
            onClose={handleCloseDialogs}
          />
        )}

        {showRunDialog && (
          <RunDialog
            run={editingRun}
            staff={staff}
            onClose={handleCloseDialogs}
          />
        )}

        {showAIAllocator && (
          <AIShiftAllocator
            shifts={visits}
            staff={staff}
            clients={clients}
            availability={staffAvailability}
            leaveRequests={leaveRequests}
            entityType="Visit"
            onClose={() => setShowAIAllocator(false)}
            onAllocate={(allocations) => {
              allocations.forEach(({ shiftId, staffId }) => {
                updateVisitMutation.mutate({ 
                  id: shiftId, 
                  data: { staff_id: staffId, assigned_staff_id: staffId, status: 'published' }
                });
              });
              setShowAIAllocator(false);
            }}
          />
        )}

        {showConflicts && (
          <ConflictDetector
            shifts={visits}
            staff={staff}
            clients={clients}
            availability={staffAvailability}
            leaveRequests={leaveRequests}
            entityType="Visit"
            onClose={() => setShowConflicts(false)}
            onResolve={(visitId, updates) => {
              updateVisitMutation.mutate({ id: visitId, data: updates });
            }}
          />
        )}

        {showAutoSchedule && (
          <AutoScheduleHelper
            shifts={visits}
            staff={staff}
            clients={clients}
            availability={staffAvailability}
            leaveRequests={leaveRequests}
            entityType="Visit"
            onClose={() => setShowAutoSchedule(false)}
            onGenerate={(newVisits) => {
              console.log("Generated visits:", newVisits);
              setShowAutoSchedule(false);
            }}
          />
        )}

        {!isLoading && visits.length > 0 && (
          <div className="mt-6">
            <SmartSuggestionsWidget 
              shifts={visits} 
              staff={staff} 
              clients={clients}
              leaveRequests={leaveRequests}
              availability={staffAvailability}
            />
          </div>
        )}
      </div>
    </div>
  );
}