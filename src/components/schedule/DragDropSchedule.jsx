import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, UserCircle } from "lucide-react";
import { format, addDays, parseISO, startOfWeek } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import TimeGrid from "./TimeGrid";
import CarerList from "./CarerList";
import ClientList from "./ClientList";

export default function DragDropSchedule({
  shifts,
  carers,
  clients,
  leaveRequests,
  selectedDate,
  setSelectedDate,
  onEditShift,
  isLoading,
}) {
  const [viewMode, setViewMode] = useState("carers");
  const queryClient = useQueryClient();

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Parse the destination droppableId: "timeslot-personId-date-time"
    const destParts = destination.droppableId.split("-");
    if (destParts[0] !== "timeslot") return;

    const personId = destParts[1];
    const date = destParts[2];
    const time = destParts[3];

    // Parse draggableId: "shift-shiftId" or "unassigned-clientId" or "available-carerId"
    const dragParts = draggableId.split("-");
    const dragType = dragParts[0];
    const entityId = dragParts[1];

    if (dragType === "shift") {
      // Moving existing shift
      const shift = shifts.find(s => s.id === entityId);
      if (!shift) return;

      const [hours, minutes] = time.split(":").map(Number);
      const duration = shift.duration_hours || 1;
      const endHours = hours + Math.floor(duration);
      const endMinutes = minutes + (duration % 1) * 60;

      const updatedShift = {
        ...shift,
        [viewMode === "carers" ? "carer_id" : "client_id"]: personId,
        date,
        start_time: time,
        end_time: `${String(endHours).padStart(2, '0')}:${String(Math.floor(endMinutes)).padStart(2, '0')}`,
        status: "scheduled",
      };

      updateShiftMutation.mutate({ id: entityId, data: updatedShift });
    } else if (dragType === "unassigned" && viewMode === "carers") {
      // Assigning carer to unassigned shift (client already set)
      const shift = shifts.find(s => s.client_id === entityId && !s.carer_id);
      if (!shift) return;

      updateShiftMutation.mutate({
        id: shift.id,
        data: { ...shift, carer_id: personId, status: "scheduled" }
      });
    } else if (dragType === "available" && viewMode === "clients") {
      // Creating new shift by dragging available carer to client slot
      const [hours, minutes] = time.split(":").map(Number);
      const endHours = hours + 1;

      createShiftMutation.mutate({
        client_id: personId,
        carer_id: entityId,
        date,
        start_time: time,
        end_time: `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        duration_hours: 1,
        status: "scheduled",
        shift_type: hours < 12 ? "morning" : hours < 17 ? "afternoon" : "evening",
      });
    }
  };

  const goToPreviousWeek = () => {
    setSelectedDate(addDays(selectedDate, -7));
  };

  const goToNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const activeList = viewMode === "carers" 
    ? carers.filter(c => c.status === 'active')
    : clients.filter(c => c.status === 'active');

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="carers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                View by Carers
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                View by Clients
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <span className="font-semibold text-gray-900 min-w-[200px] text-center">
              {format(weekStart, "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-4 max-h-[calc(100vh-200px)] overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <h3 className="font-semibold text-gray-900">
                  {viewMode === "carers" ? "Carers" : "Clients"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {activeList.length} active
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {viewMode === "carers" ? (
                  <CarerList 
                    carers={activeList} 
                    shifts={shifts}
                    leaveRequests={leaveRequests}
                    selectedDate={format(weekStart, "yyyy-MM-dd")}
                  />
                ) : (
                  <ClientList 
                    clients={activeList}
                    shifts={shifts}
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="flex-1 overflow-x-auto">
            <TimeGrid
              weekDays={weekDays}
              people={activeList}
              shifts={shifts}
              carers={carers}
              clients={clients}
              viewMode={viewMode}
              onEditShift={onEditShift}
              isLoading={isLoading}
            />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}