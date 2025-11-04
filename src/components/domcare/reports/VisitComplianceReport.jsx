import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, CheckSquare, Clock, AlertTriangle, Target, CheckCircle } from "lucide-react";
import { format, parseISO, isWithinInterval, differenceInMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VisitComplianceReport({ visits, staff, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedStaff, setSelectedStaff] = useState("all");

  const getFilteredVisits = () => {
    return visits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(visitDate, { start: from, end: to });
        const matchesStaff = selectedStaff === "all" || visit.assigned_staff_id === selectedStaff;
        
        return inRange && matchesStaff;
      } catch {
        return false;
      }
    });
  };

  const calculateComplianceStats = () => {
    const filteredVisits = getFilteredVisits();
    const staffStats = {};

    filteredVisits.forEach(visit => {
      if (!visit.assigned_staff_id) return;

      if (!staffStats[visit.assigned_staff_id]) {
        const staffMember = staff.find(s => s.id === visit.assigned_staff_id);
        staffStats[visit.assigned_staff_id] = {
          name: staffMember?.full_name || "Unknown",
          totalVisits: 0,
          completedVisits: 0,
          missedVisits: 0,
          onTimeArrivals: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          onTimeDepartures: 0,
          tasksCompleted: 0,
          totalTasks: 0,
          durationCompliance: 0,
        };
      }

      const stats = staffStats[visit.assigned_staff_id];
      stats.totalVisits++;

      if (visit.status === "completed") {
        stats.completedVisits++;

        // Check arrival time compliance (within 15 minutes)
        if (visit.actual_start && visit.scheduled_start) {
          const lateness = differenceInMinutes(
            parseISO(visit.actual_start),
            parseISO(visit.scheduled_start)
          );
          if (Math.abs(lateness) <= 15) {
            stats.onTimeArrivals++;
          } else if (lateness > 15) {
            stats.lateArrivals++;
          }
        } else {
          stats.onTimeArrivals++; // Assume on time if no actual time
        }

        // Check departure time compliance
        if (visit.actual_end && visit.scheduled_end) {
          const earlyBy = differenceInMinutes(
            parseISO(visit.scheduled_end),
            parseISO(visit.actual_end)
          );
          if (earlyBy > 10) {
            stats.earlyDepartures++;
          } else {
            stats.onTimeDepartures++;
          }
        } else {
          stats.onTimeDepartures++;
        }

        // Check duration compliance
        if (visit.actual_start && visit.actual_end && visit.scheduled_start && visit.scheduled_end) {
          const actualDuration = differenceInMinutes(
            parseISO(visit.actual_end),
            parseISO(visit.actual_start)
          );
          const scheduledDuration = differenceInMinutes(
            parseISO(visit.scheduled_end),
            parseISO(visit.scheduled_start)
          );
          const variance = Math.abs(actualDuration - scheduledDuration);
          if (variance <= 10) {
            stats.durationCompliance++;
          }
        }

        // Check task completion
        if (visit.tasks && visit.tasks.length > 0) {
          stats.totalTasks += visit.tasks.length;
          stats.tasksCompleted += visit.tasks.length; // Assume all tasks completed in completed visits
        }
      } else if (visit.status === "missed") {
        stats.missedVisits++;
      }
    });

    return Object.values(staffStats).map(stat => ({
      ...stat,
      completionRate: stat.totalVisits > 0 ? ((stat.completedVisits / stat.totalVisits) * 100).toFixed(1) : 0,
      arrivalCompliance: stat.completedVisits > 0 ? ((stat.onTimeArrivals / stat.completedVisits) * 100).toFixed(1) : 0,
      departureCompliance: stat.completedVisits > 0 ? ((stat.onTimeDepartures / stat.completedVisits) * 100).toFixed(1) : 0,
      durationCompliance: stat.completedVisits > 0 ? ((stat.durationCompliance / stat.completedVisits) * 100).toFixed(1) : 0,
      taskCompletionRate: stat.totalTasks > 0 ? ((stat.tasksCompleted / stat.totalTasks) * 100).toFixed(1) : 100,
      overallCompliance: stat.totalVisits > 0 
        ? (((stat.onTimeArrivals + stat.onTimeDepartures + stat.durationCompliance) / (stat.completedVisits * 3)) * 100).toFixed(1)
        : 0,
    })).sort((a, b) => b.overallCompliance - a.overallCompliance);
  };

  const exportToCSV = () => {
    const stats = calculateComplianceStats();
    const headers = [
      "Staff Name",
      "Total Visits",
      "Completed",
      "Missed",
      "Arrival Compliance",
      "Departure Compliance",
      "Duration Compliance",
      "Task Completion",
      "Overall Compliance"
    ];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalVisits,
      stat.completedVisits,
      stat.missedVisits,
      `${stat.arrivalCompliance}%`,
      `${stat.departureCompliance}%`,
      `${stat.durationCompliance}%`,
      `${stat.taskCompletionRate}%`,
      `${stat.overallCompliance}%`
    ]);

    const csvContent = [
      "Visit Compliance Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `visit-compliance-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateComplianceStats();
  const overallAvgCompliance = stats.length > 0
    ? (stats.reduce((sum, s) => sum + parseFloat(s.overallCompliance), 0) / stats.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Visit Compliance Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Adherence to schedules and task completion rates</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="staff-filter">Filter by Staff</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger id="staff-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setDateFrom(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
                  setDateTo(format(new Date(), "yyyy-MM-dd"));
                  setSelectedStaff("all");
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Overall Compliance</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">{overallAvgCompliance}%</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Avg Arrival</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => sum + parseFloat(s.arrivalCompliance), 0) / stats.length).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Avg Duration</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => sum + parseFloat(s.durationCompliance), 0) / stats.length).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Avg Tasks</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => sum + parseFloat(s.taskCompletionRate), 0) / stats.length).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Total Missed</p>
                </div>
                <p className="text-2xl font-bold text-red-900">
                  {stats.reduce((sum, s) => sum + s.missedVisits, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-medium text-gray-900">Staff Name</th>
                    <th className="text-right p-3 font-medium text-gray-900">Visits</th>
                    <th className="text-right p-3 font-medium text-gray-900">Missed</th>
                    <th className="text-right p-3 font-medium text-gray-900">Arrival</th>
                    <th className="text-right p-3 font-medium text-gray-900">Departure</th>
                    <th className="text-right p-3 font-medium text-gray-900">Duration</th>
                    <th className="text-right p-3 font-medium text-gray-900">Tasks</th>
                    <th className="text-right p-3 font-medium text-gray-900">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">{stat.totalVisits}</td>
                      <td className="p-3 text-right text-red-600 font-semibold">{stat.missedVisits}</td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.arrivalCompliance) >= 90
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.arrivalCompliance) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.arrivalCompliance}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.departureCompliance) >= 90
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.departureCompliance) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.departureCompliance}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.durationCompliance) >= 90
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.durationCompliance) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.durationCompliance}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.taskCompletionRate) >= 95
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.taskCompletionRate) >= 85
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.taskCompletionRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.overallCompliance) >= 90
                            ? "bg-purple-100 text-purple-800"
                            : parseFloat(stat.overallCompliance) >= 75
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }>
                          {stat.overallCompliance}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No compliance data available for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}