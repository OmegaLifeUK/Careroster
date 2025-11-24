import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Clock, Star, Award } from "lucide-react";
import { isWithinInterval, parseISO } from "date-fns";

export default function StaffPerformanceReport({ timesheets, staff, feedback, shifts, filters }) {
  const { dateFrom, dateTo, selectedStaff } = filters;

  const filteredTimesheets = timesheets.filter(t => {
    try {
      const date = parseISO(t.timesheet_date);
      const inRange = isWithinInterval(date, { 
        start: parseISO(dateFrom), 
        end: parseISO(dateTo) 
      });
      const matchesStaff = selectedStaff === "all" || t.staff_id === selectedStaff;
      return inRange && matchesStaff;
    } catch {
      return false;
    }
  });

  const filteredFeedback = feedback.filter(f => {
    try {
      const date = parseISO(f.feedback_date);
      const inRange = isWithinInterval(date, { 
        start: parseISO(dateFrom), 
        end: parseISO(dateTo) 
      });
      return inRange;
    } catch {
      return false;
    }
  });

  const staffPerformance = staff.map(s => {
    const staffTimesheets = filteredTimesheets.filter(t => t.staff_id === s.id);
    const staffFeedback = filteredFeedback.filter(f => f.staff_id === s.id);
    
    const totalHours = staffTimesheets.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const standardHours = staffTimesheets.filter(t => t.pay_bucket === 'standard').reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const overtimeHours = staffTimesheets.filter(t => t.pay_bucket === 'overtime').reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const nightHours = staffTimesheets.filter(t => t.pay_bucket === 'night').reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const weekendHours = staffTimesheets.filter(t => t.pay_bucket === 'weekend').reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    
    const avgRating = staffFeedback.length > 0 
      ? staffFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / staffFeedback.length 
      : 0;
    
    const punctuality = staffTimesheets.length > 0
      ? (staffTimesheets.filter(t => !t.is_clocked_in_late).length / staffTimesheets.length) * 100
      : 0;

    return {
      ...s,
      totalHours,
      standardHours,
      overtimeHours,
      nightHours,
      weekendHours,
      avgRating,
      feedbackCount: staffFeedback.length,
      punctuality,
      shiftsCompleted: staffTimesheets.length
    };
  }).filter(s => s.totalHours > 0);

  const exportCSV = () => {
    const headers = ["Staff Name", "Total Hours", "Standard Hours", "Overtime Hours", "Night Hours", "Weekend Hours", "Avg Rating", "Feedback Count", "Punctuality %", "Shifts Completed"];
    const rows = staffPerformance.map(s => [
      s.full_name,
      s.totalHours.toFixed(2),
      s.standardHours.toFixed(2),
      s.overtimeHours.toFixed(2),
      s.nightHours.toFixed(2),
      s.weekendHours.toFixed(2),
      s.avgRating.toFixed(1),
      s.feedbackCount,
      s.punctuality.toFixed(1),
      s.shiftsCompleted
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-performance-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const totalHours = staffPerformance.reduce((sum, s) => sum + s.totalHours, 0);
  const totalOvertimeHours = staffPerformance.reduce((sum, s) => sum + s.overtimeHours, 0);
  const avgRating = staffPerformance.length > 0 
    ? staffPerformance.reduce((sum, s) => sum + s.avgRating, 0) / staffPerformance.length 
    : 0;
  const avgPunctuality = staffPerformance.length > 0
    ? staffPerformance.reduce((sum, s) => sum + s.punctuality, 0) / staffPerformance.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Staff Performance Report</h2>
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600">Total Hours</p>
            </div>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Across all staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-gray-600">Overtime Hours</p>
            </div>
            <p className="text-2xl font-bold">{totalOvertimeHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {totalHours > 0 ? ((totalOvertimeHours / totalHours) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-gray-600">Avg Rating</p>
            </div>
            <p className="text-2xl font-bold">{avgRating.toFixed(1)}/5</p>
            <p className="text-xs text-gray-500 mt-1">Client feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-600">Punctuality</p>
            </div>
            <p className="text-2xl font-bold">{avgPunctuality.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">On-time arrivals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Staff Name</th>
                  <th className="text-right p-3 font-semibold">Total Hours</th>
                  <th className="text-right p-3 font-semibold">Overtime</th>
                  <th className="text-right p-3 font-semibold">Night</th>
                  <th className="text-right p-3 font-semibold">Weekend</th>
                  <th className="text-right p-3 font-semibold">Rating</th>
                  <th className="text-right p-3 font-semibold">Punctuality</th>
                  <th className="text-right p-3 font-semibold">Shifts</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{s.full_name}</td>
                    <td className="p-3 text-right">{s.totalHours.toFixed(1)}h</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="bg-orange-50">
                        {s.overtimeHours.toFixed(1)}h
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{s.nightHours.toFixed(1)}h</td>
                    <td className="p-3 text-right">{s.weekendHours.toFixed(1)}h</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{s.avgRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Badge className={s.punctuality >= 90 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                        {s.punctuality.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{s.shiftsCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {staffPerformance.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No staff performance data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}