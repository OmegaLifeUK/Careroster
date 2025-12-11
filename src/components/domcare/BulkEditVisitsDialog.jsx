import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Edit, Trash2, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function BulkEditVisitsDialog({ visits, staff, clients, onClose }) {
  const [selectedVisits, setSelectedVisits] = useState([]);
  const [action, setAction] = useState("");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [changeStatus, setChangeStatus] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateVisitsMutation = useMutation({
    mutationFn: async (updates) => {
      const promises = updates.map(({ id, data }) => 
        base44.entities.Visit.update(id, data)
      );
      return await Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success("Updated", `${data.length} visits updated successfully`);
      onClose();
    },
  });

  const deleteVisitsMutation = useMutation({
    mutationFn: async (visitIds) => {
      const promises = visitIds.map(id => base44.entities.Visit.delete(id));
      return await Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success("Deleted", `${data.length} visits deleted successfully`);
      onClose();
    },
  });

  const toggleVisit = (visitId) => {
    if (selectedVisits.includes(visitId)) {
      setSelectedVisits(selectedVisits.filter(id => id !== visitId));
    } else {
      setSelectedVisits([...selectedVisits, visitId]);
    }
  };

  const toggleAll = () => {
    if (selectedVisits.length === visits.length) {
      setSelectedVisits([]);
    } else {
      setSelectedVisits(visits.map(v => v.id));
    }
  };

  const handleBulkAction = () => {
    if (selectedVisits.length === 0) {
      toast.error("No Selection", "Please select at least one visit");
      return;
    }

    if (action === "delete") {
      if (window.confirm(`Are you sure you want to delete ${selectedVisits.length} visit(s)?`)) {
        deleteVisitsMutation.mutate(selectedVisits);
      }
    } else if (action === "assign_staff" && assignStaffId) {
      const updates = selectedVisits.map(id => ({
        id,
        data: { 
          assigned_staff_id: assignStaffId,
          staff_id: assignStaffId,
          status: "published"
        }
      }));
      updateVisitsMutation.mutate(updates);
    } else if (action === "change_status" && changeStatus) {
      const updates = selectedVisits.map(id => ({
        id,
        data: { status: changeStatus }
      }));
      updateVisitsMutation.mutate(updates);
    } else if (action === "unassign") {
      const updates = selectedVisits.map(id => ({
        id,
        data: { 
          assigned_staff_id: null,
          staff_id: null,
          status: "draft"
        }
      }));
      updateVisitsMutation.mutate(updates);
    } else {
      toast.error("Invalid Action", "Please configure the action settings");
    }
  };

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.full_name || "Unknown";
  };

  const getStaffName = (staffId) => {
    return staff.find(s => s.id === staffId)?.full_name || "Unassigned";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Edit className="w-5 h-5 text-orange-600" />
            Bulk Edit Visits
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              Select visits below and choose an action to apply to all selected visits
            </p>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              checked={selectedVisits.length === visits.length && visits.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium">
              Select All ({selectedVisits.length} of {visits.length} selected)
            </span>
          </div>

          <div className="space-y-2 mb-6">
            {visits.map(visit => {
              const startDate = visit.scheduled_start ? parseISO(visit.scheduled_start) : null;
              return (
                <div
                  key={visit.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedVisits.includes(visit.id)
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => toggleVisit(visit.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedVisits.includes(visit.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleVisit(visit.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{getClientName(visit.client_id)}</span>
                        <Badge variant="outline" className="text-xs">
                          {visit.visit_type || 'regular'}
                        </Badge>
                        <Badge className={`text-xs ${
                          visit.status === 'completed' ? 'bg-green-100 text-green-700' :
                          visit.status === 'published' ? 'bg-blue-100 text-blue-700' :
                          visit.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {visit.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>{startDate ? format(startDate, 'MMM d, yyyy HH:mm') : 'No date'}</span>
                        <span>•</span>
                        <span>{getStaffName(visit.assigned_staff_id || visit.staff_id)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-6 space-y-4 bg-gray-50">
          <div>
            <Label className="mb-2 block">Bulk Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign_staff">Assign Staff</SelectItem>
                <SelectItem value="unassign">Unassign Staff</SelectItem>
                <SelectItem value="change_status">Change Status</SelectItem>
                <SelectItem value="delete">Delete Visits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === "assign_staff" && (
            <div>
              <Label className="mb-2 block">Select Staff</Label>
              <Select value={assignStaffId} onValueChange={setAssignStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.is_active).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "change_status" && (
            <div>
              <Label className="mb-2 block">New Status</Label>
              <Select value={changeStatus} onValueChange={setChangeStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              {selectedVisits.length} visit(s) selected
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkAction}
                disabled={selectedVisits.length === 0 || !action || updateVisitsMutation.isPending || deleteVisitsMutation.isPending}
                className={action === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
              >
                {action === "delete" ? <Trash2 className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {updateVisitsMutation.isPending || deleteVisitsMutation.isPending ? "Processing..." : "Apply Action"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}