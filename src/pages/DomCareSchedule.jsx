import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, List, Plus, Filter, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

import VisitDialog from "../components/domcare/VisitDialog";
import RunDialog from "../components/domcare/RunDialog";
import DomCareTimeline from "../components/domcare/DomCareTimeline";

export default function DomCareSchedule() {
  const [view, setView] = useState("timeline");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editingRun, setEditingRun] = useState(null);

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
          <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <Button
              onClick={handleCreateRun}
              className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Run
            </Button>
            <Button
              onClick={handleCreateVisit}
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Visit
            </Button>
          </div>
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
      </div>
    </div>
  );
}