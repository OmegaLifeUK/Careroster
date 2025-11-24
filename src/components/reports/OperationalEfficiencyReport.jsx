import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import { isWithinInterval, parseISO, differenceInMinutes } from "date-fns";

export default function OperationalEfficiencyReport({ shifts, staff, clients, timesheets, filters }) {
  const { dateFrom, dateTo, selectedStaff, selectedClient } = filters;

  const filteredShifts = shifts.filter(s => {
    try {
      const date = parseISO(s.date);
      const inRange = isWithinInterval(date, { 
        start: parseISO(dateFrom), 
        end: parseISO(dateTo) 
      });
      const matchesStaff = selectedStaff === "all" || s.carer_id === selectedStaff;
      const matchesClient = selectedClient === "all" || s.client_id === selectedClient;
      return inRange && matchesStaff && matchesClient;
    } catch {
      return false;
    }
  });

  const filteredTimesheets = timesheets.filter(t => {
    try {
      const date = parseISO(t.timesheet_date);
      const inRange = isWithinInterval(date, { 
        start: parseISO(dateFrom), 
        end: parseISO(dateTo) 
      });
      return inRange;
    } catch {
      return false;
    }
  });

  const totalShifts = filteredShifts.length;
  const filledShifts = filteredShifts.filter(s => s.carer_id).length;
  const unfilledShifts = totalShifts - filledShifts;
  const fillRate = totalShifts > 0 ? (filledShifts / totalShifts) * 100 : 0;

  const completedShifts = filteredShifts.filter(s => s.status === 'completed').length;
  const scheduledShifts = filteredShifts.filter(s => s.status === 'scheduled').length;
  const cancelledShifts = filteredShifts.filter(s => s.status === 'cancelled').length;
  const completionRate = filledShifts > 0 ? (completedShifts / filledShifts) * 100 : 0;

  const lateArrivals = filteredTimesheets.filter(t => t.is_clocked_in_late).length;
  const earlyDepartures = filteredTimesheets.filter(t => t.is_clocked_out_early).length;
  const punctualityRate = filteredTimesheets.length > 0 
    ? ((filteredTimesheets.length - lateArrivals) / filteredTimesheets.length) * 100 
    : 0;

  const avgResponseTime = filteredShifts.filter(s => s.created_date && s.carer_id).length > 0
    ? filteredShifts
        .filter(s => s.created_date && s.carer_id)
        .reduce((sum, s) => {
          try {
            const created = new Date(s.created_date);
            const updated = new Date(s.updated_date);
            return sum + differenceInMinutes(updated, created);
          } catch {
            return sum;
          }
        }, 0) / filteredShifts.filter(s => s.created_date && s.carer_id).length
    : 0;

  const staffUtilization = staff.map(s => {
    const staffShifts = filteredShifts.filter(sh => sh.carer_id === s.id);
    const staffTimesheets = filteredTimesheets.filter(t => t.staff_id === s.id);
    const totalHours = staffTimesheets.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const shiftsAssigned = staffShifts.length;
    
    return {
      ...s,
      shiftsAssigned,
      totalHours,
      utilizationRate: shiftsAssigned > 0 ? (totalHours / (shiftsAssigned * 8)) * 100 : 0
    };
  }).filter(s => s.shiftsAssigned > 0);

  const exportCSV = () => {
    const headers = ["Staff Name", "Shifts Assigned", "Total Hours", "Utilization Rate"];
    const rows = staffUtilization.map(s => [
      s.full_name,
      s.shiftsAssigned,
      s.totalHours.toFixed(2),
      s.utilizationRate.toFixed(1) + "%"
    ]);

    const csv = [
      "Operational Efficiency Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      `Fill Rate: ${fillRate.toFixed(1)}%`,
      `Completion Rate: ${completionRate.toFixed(1)}%`,
      `Punctuality Rate: ${punctualityRate.toFixed(1)}%`,
      `Avg Response Time: ${avgResponseTime.toFixed(0)} minutes`,
      "",
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operational-efficiency-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Operational Efficiency Report</h2>
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-600">Shift Fill Rate</p>
            </div>
            <p className="text-2xl font-bold">{fillRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {filledShifts} of {totalShifts} shifts filled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-gray-600">Vacancy Rate</p>
            </div>
            <p className="text-2xl font-bold">{(100 - fillRate).toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {unfilledShifts} unfilled shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600">Avg Response Time</p>
            </div>
            <p className="text-2xl font-bold">{avgResponseTime.toFixed(0)}m</p>
            <p className="text-xs text-gray-500 mt-1">Time to fill shifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-gray-600">Punctuality Rate</p>
            </div>
            <p className="text-2xl font-bold">{punctualityRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">On-time arrivals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shift Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <Badge className="bg-green-100 text-green-800">
                  {completedShifts}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Scheduled</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {scheduledShifts}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cancelled</span>
                <Badge className="bg-red-100 text-red-800">
                  {cancelledShifts}
                </Badge>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="font-bold text-green-600">
                    {completionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Punctuality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Late Arrivals</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {lateArrivals}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Early Departures</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {earlyDepartures}
                </Badge>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Issues</span>
                  <span className="font-bold text-orange-600">
                    {lateArrivals + earlyDepartures}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coverage Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Staff</span>
                <span className="font-semibold">{staffUtilization.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Shifts</span>
                <span className="font-semibold">{totalShifts}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Shifts per Staff</span>
                  <span className="font-bold">
                    {staffUtilization.length > 0 ? (filledShifts / staffUtilization.length).toFixed(1) : 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Staff Name</th>
                  <th className="text-right p-3 font-semibold">Shifts Assigned</th>
                  <th className="text-right p-3 font-semibold">Total Hours</th>
                  <th className="text-right p-3 font-semibold">Avg Hours/Shift</th>
                  <th className="text-right p-3 font-semibold">Utilization Rate</th>
                </tr>
              </thead>
              <tbody>
                {staffUtilization.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{s.full_name}</td>
                    <td className="p-3 text-right">{s.shiftsAssigned}</td>
                    <td className="p-3 text-right">{s.totalHours.toFixed(1)}h</td>
                    <td className="p-3 text-right">
                      {(s.totalHours / s.shiftsAssigned).toFixed(1)}h
                    </td>
                    <td className="p-3 text-right">
                      <Badge className={
                        s.utilizationRate >= 90 ? "bg-green-100 text-green-800" :
                        s.utilizationRate >= 70 ? "bg-blue-100 text-blue-800" :
                        "bg-orange-100 text-orange-800"
                      }>
                        {s.utilizationRate.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {staffUtilization.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No staff utilization data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}