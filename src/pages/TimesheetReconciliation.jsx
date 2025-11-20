import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Eye,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";
import TimesheetAdjustmentDialog from "../components/payroll/TimesheetAdjustmentDialog";

export default function TimesheetReconciliation() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({
    matched: true,
    requires_adjustment: true,
    unscheduled: true,
    approved: false,
    rejected: false
  });
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheet-entries'],
    queryFn: async () => {
      const data = await base44.entities.TimesheetEntry.list('-timesheet_date', 500);
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const data = await base44.entities.Shift.list('-date', 500);
      return Array.isArray(data) ? data : [];
    },
  });

  const updateTimesheetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimesheetEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
      toast.success("Timesheet Updated", "Changes saved successfully");
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (timesheetIds) => {
      const user = await base44.auth.me();
      const updates = timesheetIds.map(id => 
        base44.entities.TimesheetEntry.update(id, { 
          status: 'approved',
          approved_by: user.email,
          approved_date: new Date().toISOString()
        })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
      toast.success("Timesheets Approved", "All selected timesheets approved");
    },
  });

  // Group timesheets by status
  const groupedTimesheets = {
    matched: timesheets.filter(t => t.status === 'matched' || t.status === 'pending'),
    requires_adjustment: timesheets.filter(t => t.status === 'requires_adjustment'),
    unscheduled: timesheets.filter(t => !t.shift_id && t.unscheduled_clock_in_reason),
    approved: timesheets.filter(t => t.status === 'approved'),
    rejected: timesheets.filter(t => t.status === 'rejected'),
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || 'Unknown';
  };

  const calculateVariance = (timesheet) => {
    const variance = (timesheet.actual_hours || 0) - (timesheet.planned_hours || 0);
    return variance;
  };

  const toggleGroup = (group) => {
    setExpandedGroups({ ...expandedGroups, [group]: !expandedGroups[group] });
  };

  const renderTimesheetCard = (timesheet) => {
    const variance = calculateVariance(timesheet);
    const isLate = timesheet.is_clocked_in_late;
    const isEarly = timesheet.is_clocked_out_early;

    return (
      <Card key={timesheet.id} className="border-l-4 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{getStaffName(timesheet.staff_id)}</h4>
                <Badge className={
                  timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                  timesheet.status === 'requires_adjustment' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }>
                  {timesheet.status.replace(/_/g, ' ')}
                </Badge>
                {timesheet.pay_bucket && (
                  <Badge variant="outline">{timesheet.pay_bucket}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium">{format(parseISO(timesheet.timesheet_date), 'EEE, MMM d')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Clock Times</p>
                  <p className="font-medium">
                    {timesheet.actual_clock_in || 'N/A'} - {timesheet.actual_clock_out || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Planned</p>
                  <p className="font-medium">{timesheet.planned_hours?.toFixed(2) || '0.00'}h</p>
                </div>
                <div>
                  <p className="text-gray-600">Actual</p>
                  <p className="font-medium">{timesheet.actual_hours?.toFixed(2) || '0.00'}h</p>
                </div>
                <div>
                  <p className="text-gray-600">Variance</p>
                  <p className={`font-medium ${variance > 0 ? 'text-orange-600' : variance < 0 ? 'text-blue-600' : ''}`}>
                    {variance > 0 ? '+' : ''}{variance.toFixed(2)}h
                  </p>
                </div>
              </div>

              {(isLate || isEarly) && (
                <div className="mt-2 flex gap-2">
                  {isLate && (
                    <Badge className="bg-orange-100 text-orange-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Clocked In Late
                    </Badge>
                  )}
                  {isEarly && (
                    <Badge className="bg-orange-100 text-orange-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Clocked Out Early
                    </Badge>
                  )}
                </div>
              )}

              {timesheet.adjustment_reason && (
                <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                  <p className="text-yellow-900">{timesheet.adjustment_reason}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedTimesheet(timesheet)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Adjust
              </Button>
              {timesheet.status !== 'approved' && (
                <Button
                  size="sm"
                  className="bg-green-600"
                  onClick={() => updateTimesheetMutation.mutate({
                    id: timesheet.id,
                    data: { status: 'approved', approved_date: new Date().toISOString() }
                  })}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Timesheet & Shift Reconciliation
            </h1>
            <p className="text-gray-500">Review actual vs planned hours and approve timesheets</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Matched</p>
              <p className="text-2xl font-bold text-blue-600">{groupedTimesheets.matched.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Needs Adjustment</p>
              <p className="text-2xl font-bold text-orange-600">{groupedTimesheets.requires_adjustment.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Unscheduled</p>
              <p className="text-2xl font-bold text-purple-600">{groupedTimesheets.unscheduled.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{groupedTimesheets.approved.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{groupedTimesheets.rejected.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="requires_adjustment">Requires Adjustment</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Filter by date"
              />

              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grouped Timesheets */}
        <div className="space-y-4">
          {/* Matched Timesheets */}
          <Card>
            <CardHeader 
              className="cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
              onClick={() => toggleGroup('matched')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Clocks with Shift Data ({groupedTimesheets.matched.length})
                </CardTitle>
                {expandedGroups.matched ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedGroups.matched && (
              <CardContent className="p-4 space-y-3">
                {groupedTimesheets.matched.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No matched timesheets</p>
                ) : (
                  <>
                    <Button
                      onClick={() => bulkApproveMutation.mutate(groupedTimesheets.matched.map(t => t.id))}
                      className="bg-green-600 mb-3"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve All Matched
                    </Button>
                    {groupedTimesheets.matched.map(renderTimesheetCard)}
                  </>
                )}
              </CardContent>
            )}
          </Card>

          {/* Requires Adjustment */}
          <Card>
            <CardHeader 
              className="cursor-pointer bg-orange-50 hover:bg-orange-100 transition-colors"
              onClick={() => toggleGroup('requires_adjustment')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Requires Adjustment ({groupedTimesheets.requires_adjustment.length})
                </CardTitle>
                {expandedGroups.requires_adjustment ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedGroups.requires_adjustment && (
              <CardContent className="p-4 space-y-3">
                {groupedTimesheets.requires_adjustment.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No timesheets need adjustment</p>
                ) : (
                  groupedTimesheets.requires_adjustment.map(renderTimesheetCard)
                )}
              </CardContent>
            )}
          </Card>

          {/* Approved */}
          <Card>
            <CardHeader 
              className="cursor-pointer bg-green-50 hover:bg-green-100 transition-colors"
              onClick={() => toggleGroup('approved')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Approved ({groupedTimesheets.approved.length})
                </CardTitle>
                {expandedGroups.approved ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedGroups.approved && (
              <CardContent className="p-4 space-y-3">
                {groupedTimesheets.approved.slice(0, 10).map(renderTimesheetCard)}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Adjustment Dialog */}
        {selectedTimesheet && (
          <TimesheetAdjustmentDialog
            timesheet={selectedTimesheet}
            onClose={() => setSelectedTimesheet(null)}
          />
        )}
      </div>
    </div>
  );
}