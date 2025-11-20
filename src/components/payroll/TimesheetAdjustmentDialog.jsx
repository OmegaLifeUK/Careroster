import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function TimesheetAdjustmentDialog({ timesheet, onClose }) {
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentReason, setAdjustmentReason] = useState(timesheet.adjustment_reason || "");
  const [actualClockIn, setActualClockIn] = useState(timesheet.actual_clock_in || "");
  const [actualClockOut, setActualClockOut] = useState(timesheet.actual_clock_out || "");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.TimesheetEntry.update(timesheet.id, {
        ...data,
        approved_by: user.email,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
      toast.success("Timesheet Updated", "Adjustments saved successfully");
      onClose();
    },
  });

  const addAdjustmentRow = () => {
    setAdjustments([...adjustments, { hours: 0, minutes: 0, pay_bucket: "standard" }]);
  };

  const removeAdjustmentRow = (index) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const calculateTotalAdjustedHours = () => {
    const baseHours = parseFloat(timesheet.actual_hours || 0);
    const adjustmentHours = adjustments.reduce((sum, adj) => {
      return sum + parseFloat(adj.hours || 0) + parseFloat(adj.minutes || 0) / 60;
    }, 0);
    return baseHours + adjustmentHours;
  };

  const handleSave = () => {
    const totalHours = calculateTotalAdjustedHours();
    updateMutation.mutate({
      actual_clock_in: actualClockIn,
      actual_clock_out: actualClockOut,
      actual_hours: totalHours,
      adjustment_reason: adjustmentReason,
      status: 'approved'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Adjust Pay Hours</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Current Timesheet Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
            <div>
              <p className="text-sm text-gray-600">Planned Hours</p>
              <p className="text-lg font-bold">{timesheet.planned_hours?.toFixed(2) || '0.00'}h</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Actual Hours</p>
              <p className="text-lg font-bold">{timesheet.actual_hours?.toFixed(2) || '0.00'}h</p>
            </div>
          </div>

          {/* Clock Times */}
          <div className="space-y-3">
            <h3 className="font-semibold">Clock Times</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Clock In</label>
                <Input
                  type="time"
                  value={actualClockIn}
                  onChange={(e) => setActualClockIn(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Clock Out</label>
                <Input
                  type="time"
                  value={actualClockOut}
                  onChange={(e) => setActualClockOut(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Unscheduled Clock Reason */}
          {!timesheet.shift_id && (
            <div className="p-4 bg-purple-50 rounded border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Unscheduled Clock In Reason</h3>
              <p className="text-sm text-purple-800">
                {timesheet.unscheduled_clock_in_reason || "No reason provided"}
              </p>
            </div>
          )}

          {/* Adjustment Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pay Adjustments</h3>
              <Button size="sm" variant="outline" onClick={addAdjustmentRow}>
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
            </div>

            {adjustments.map((adjustment, idx) => (
              <Card key={idx} className="border-2">
                <CardContent className="p-3">
                  <div className="grid grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Hours</label>
                      <Input
                        type="number"
                        value={adjustment.hours}
                        onChange={(e) => {
                          const newAdj = [...adjustments];
                          newAdj[idx].hours = e.target.value;
                          setAdjustments(newAdj);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Minutes</label>
                      <Input
                        type="number"
                        value={adjustment.minutes}
                        onChange={(e) => {
                          const newAdj = [...adjustments];
                          newAdj[idx].minutes = e.target.value;
                          setAdjustments(newAdj);
                        }}
                        placeholder="0"
                        max="59"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Pay Bucket</label>
                      <Select
                        value={adjustment.pay_bucket}
                        onValueChange={(val) => {
                          const newAdj = [...adjustments];
                          newAdj[idx].pay_bucket = val;
                          setAdjustments(newAdj);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="overtime">Overtime</SelectItem>
                          <SelectItem value="weekend">Weekend</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="bank_holiday">Bank Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAdjustmentRow(idx)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Adjustment Reason */}
          <div>
            <label className="text-sm font-medium mb-2 block">Adjustment Reason</label>
            <Textarea
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Enter reason for adjustment (e.g., 'Rubbish Manager - Unauthorised Overtime')"
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900">Total Adjusted Hours</span>
              <span className="text-2xl font-bold text-blue-900">
                {calculateTotalAdjustedHours().toFixed(2)}h
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 bg-green-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}