import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, List, Plus, Filter, ChevronLeft, ChevronRight, LayoutGrid, Sparkles, Zap, AlertTriangle, BarChart3, Repeat, FileText, Edit } from "lucide-react";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

import VisitDialog from "../components/domcare/VisitDialog";
import RunDialog from "../components/domcare/RunDialog";
import RecurringVisitDialog from "../components/domcare/RecurringVisitDialog";
import VisitTemplateManager from "../components/domcare/VisitTemplateManager";
import BulkEditVisitsDialog from "../components/domcare/BulkEditVisitsDialog";
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
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

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

  const handleTemplateSelect = (template) => {
    const now = new Date();
    const scheduledEnd = new Date(now.getTime() + template.duration_minutes * 60000);
    
    setEditingVisit({
      visit_type: template.visit_type,
      duration_minutes: template.duration_minutes,
      scheduled_start: format(now, "yyyy-MM-dd'T'HH:mm"),
      scheduled_end: format(scheduledEnd, "yyyy-MM-dd'T'HH:mm"),
      tasks: template.tasks,
      visit_notes: template.notes
    });
    setShowTemplateManager(false);
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">Visit Schedule</h1>
            <p className="text-sm text-gray-500">Drag and drop visits to organize care runs</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowAIAllocator(true)}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">AI Allocate</span>
            </Button>
            <Button
              onClick={() => setShowConflicts(true)}
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Conflicts</span>
            </Button>
            <Button
              onClick={() => setShowAutoSchedule(true)}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Zap className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Auto Schedule</span>
            </Button>
            <Button
              onClick={() => setShowBulkEdit(true)}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Edit className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Bulk Edit</span>
            </Button>
            <Button
              onClick={() => setShowTemplateManager(true)}
              variant="outline"
              size="sm"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <FileText className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
            <Button
              onClick={() => setShowRecurringDialog(true)}
              variant="outline"
              size="sm"
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              <Repeat className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Recurring</span>
            </Button>
            <Button
              onClick={handleCreateRun}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Run</span>
            </Button>
            <Button
              onClick={handleCreateVisit}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Visit</span>
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={view === "roster" ? "default" : "ghost"}
              onClick={() => setView("roster")}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-xs">Roster</span>
            </Button>
            <Button
              variant={view === "split" ? "default" : "ghost"}
              onClick={() => setView("split")}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="text-xs">Split</span>
            </Button>
            <Button
              variant={view === "timeline" ? "default" : "ghost"}
              onClick={() => setView("timeline")}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Timeline</span>
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-xs">List</span>
            </Button>
          </div>

          {view !== "list" && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="h-8 px-2">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <div className="px-3 py-1.5 bg-gray-50 rounded text-xs font-medium whitespace-nowrap">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </div>
              <Button variant="outline" size="sm" onClick={goToNextWeek} className="h-8 px-2">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-3 text-xs">
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
        ) : view === "split" ? (
          <div className="grid grid-rows-[200px_1fr] gap-4 h-[calc(100vh-280px)]">
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="bg-orange-500 text-white p-3 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Unassigned Visits
                  </h3>
                  <p className="text-xs text-orange-100 mt-1">Drag to staff in roster below to assign</p>
                </div>
                <span className="text-2xl font-bold">{visits.filter(v => !v.staff_id && !v.assigned_staff_id).length}</span>
              </div>
              <div className="overflow-x-auto p-3">
                <div className="flex gap-2">
                  {visits.filter(v => !v.staff_id && !v.assigned_staff_id).map(visit => {
                    const client = clients.find(c => c.id === visit.client_id);
                    const visitDate = visit.scheduled_start ? new Date(visit.scheduled_start) : null;
                    return (
                      <div 
                        key={visit.id}
                        onClick={() => handleEditVisit(visit)}
                        className="p-3 bg-orange-50 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors min-w-[200px]"
                      >
                        <p className="font-semibold text-sm text-gray-900 truncate">{client?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <Calendar className="w-3 h-3" />
                          {visitDate ? format(visitDate, 'EEE, MMM d') : 'No date'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <span>⏰ {visit.scheduled_start ? format(new Date(visit.scheduled_start), 'HH:mm') : 'No time'}</span>
                          {visit.duration_minutes && <span>• {visit.duration_minutes}min</span>}
                        </div>
                      </div>
                    );
                  })}
                  {visits.filter(v => !v.staff_id && !v.assigned_staff_id).length === 0 && (
                    <div className="text-center py-8 text-gray-400 w-full">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">All visits assigned!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
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
          </div>
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

        {showRecurringDialog && (
          <RecurringVisitDialog
            clients={clients}
            staff={staff}
            onClose={() => setShowRecurringDialog(false)}
          />
        )}

        {showTemplateManager && (
          <VisitTemplateManager
            onSelectTemplate={handleTemplateSelect}
            onClose={() => setShowTemplateManager(false)}
          />
        )}

        {showBulkEdit && (
          <BulkEditVisitsDialog
            visits={visits}
            staff={staff}
            clients={clients}
            onClose={() => setShowBulkEdit(false)}
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