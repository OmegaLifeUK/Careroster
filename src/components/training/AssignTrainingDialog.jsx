import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Users, Calendar, Send } from "lucide-react";
import { format, addDays } from "date-fns";

export default function AssignTrainingDialog({ module, staff, carers, existingAssignments, onClose }) {
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [sendReminder, setSendReminder] = useState(true);

  const queryClient = useQueryClient();

  const allStaffMembers = [...staff, ...carers];

  const assignTrainingMutation = useMutation({
    mutationFn: async (assignments) => {
      const currentUser = await base44.auth.me();
      const adminStaff = staff.find(s => s.email === currentUser.email);

      const results = await Promise.all(
        assignments.map(async (assignment) => {
          // Check if already assigned
          const existing = existingAssignments.find(
            a => a.training_module_id === module.id && a.staff_id === assignment.staff_id
          );

          if (existing) {
            return { skipped: true, staffId: assignment.staff_id };
          }

          // Create assignment
          const newAssignment = await base44.entities.TrainingAssignment.create({
            training_module_id: module.id,
            staff_id: assignment.staff_id,
            assigned_by_staff_id: adminStaff?.id || currentUser.id,
            assigned_date: new Date().toISOString(),
            due_date: dueDate,
            status: "not_started",
            expiry_date: module.expiry_months 
              ? format(addDays(new Date(dueDate), module.expiry_months * 30), "yyyy-MM-dd")
              : null,
          });

          // Send notification
          if (sendReminder) {
            const staffMember = allStaffMembers.find(s => s.id === assignment.staff_id);
            if (staffMember?.email) {
              await base44.entities.DomCareNotification.create({
                recipient_id: staffMember.email,
                title: "New Training Assigned",
                message: `You have been assigned the training module: "${module.title}". Due date: ${format(new Date(dueDate), "MMM d, yyyy")}`,
                type: "general",
                priority: module.is_mandatory ? "high" : "normal",
                is_read: false,
                related_entity_id: newAssignment.id,
                related_entity_type: "training",
              });
            }
          }

          return { success: true, staffId: assignment.staff_id };
        })
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
      onClose();
    },
  });

  const handleToggleStaff = (staffId) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStaff.length === allStaffMembers.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(allStaffMembers.map(s => s.id));
    }
  };

  const handleAssign = () => {
    if (selectedStaff.length === 0) {
      alert("Please select at least one staff member");
      return;
    }

    const assignments = selectedStaff.map(staff_id => ({ staff_id }));
    assignTrainingMutation.mutate(assignments);
  };

  const isAlreadyAssigned = (staffId) => {
    return existingAssignments.some(
      a => a.training_module_id === module.id && a.staff_id === staffId
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assign Training: {module.title}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">{module.title}</h4>
              <p className="text-sm text-blue-800">{module.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {module.duration_minutes} mins
                </Badge>
                <Badge className="bg-purple-100 text-purple-800">
                  {module.category}
                </Badge>
                {module.is_mandatory && (
                  <Badge className="bg-red-500 text-white">Mandatory</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="due-date">Due Date *</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="send-reminder"
                  checked={sendReminder}
                  onChange={(e) => setSendReminder(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="send-reminder" className="cursor-pointer">
                  Send notification to staff
                </Label>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Select Staff Members</h4>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedStaff.length === allStaffMembers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg p-2">
              {allStaffMembers.map((staffMember) => {
                const alreadyAssigned = isAlreadyAssigned(staffMember.id);
                const isSelected = selectedStaff.includes(staffMember.id);

                return (
                  <div
                    key={staffMember.id}
                    className={`p-3 rounded-lg mb-2 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    } ${alreadyAssigned ? 'opacity-50' : 'cursor-pointer hover:bg-blue-50'}`}
                    onClick={() => !alreadyAssigned && handleToggleStaff(staffMember.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !alreadyAssigned && handleToggleStaff(staffMember.id)}
                        disabled={alreadyAssigned}
                        className="rounded"
                      />
                      <div>
                        <p className="font-medium">{staffMember.full_name}</p>
                        <p className="text-xs text-gray-500">{staffMember.email}</p>
                      </div>
                    </div>
                    {alreadyAssigned && (
                      <Badge variant="outline" className="text-xs">
                        Already Assigned
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAssign}
              disabled={selectedStaff.length === 0 || assignTrainingMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {assignTrainingMutation.isPending 
                ? "Assigning..." 
                : `Assign to ${selectedStaff.length} Staff`
              }
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}