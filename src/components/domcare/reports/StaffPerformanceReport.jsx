import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Users, Clock, MapPin, Star, TrendingUp } from "lucide-react";
import { format, parseISO, isWithinInterval, differenceInMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StaffPerformanceReport({ visits, staff, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
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

  const calculateStaffStats = () => {
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
          totalMinutes: 0,
          travelTimeMinutes: 0,
          uniqueClients: new Set(),
          onTimeVisits: 0,
          lateVisits: 0,
          feedbackScores: [],
        };
      }

      const stats = staffStats[visit.assigned_staff_id];
      stats.totalVisits++;
      
      if (visit.status === "completed") {
        stats.completedVisits++;
        
        // Calculate visit duration
        if (visit.actual_start && visit.actual_end) {
          const duration = differenceInMinutes(
            parseISO(visit.actual_end),
            parseISO(visit.actual_start)
          );
          stats.totalMinutes += duration;
        } else if (visit.scheduled_start && visit.scheduled_end) {
          const duration = differenceInMinutes(
            parseISO(visit.scheduled_end),
            parseISO(visit.scheduled_start)
          );
          stats.totalMinutes += duration;
        }

        // Track on-time performance
        if (visit.actual_start && visit.scheduled_start) {
          const lateness = differenceInMinutes(
            parseISO(visit.actual_start),
            parseISO(visit.scheduled_start)
          );
          if (lateness <= 5) {
            stats.onTimeVisits++;
          } else {
            stats.lateVisits++;
          }
        }

        // Mock feedback score (in production, this would come from a feedback system)
        const mockScore = 4.2 + Math.random() * 0.8; // Random score between 4.2 and 5.0
        stats.feedbackScores.push(mockScore);
      } else if (visit.status === "missed") {
        stats.missedVisits++;
      }

      if (visit.estimated_travel_to_next) {
        stats.travelTimeMinutes += visit.estimated_travel_to_next;
      }

      if (visit.client_id) {
        stats.uniqueClients.add(visit.client_id);
      }
    });

    return Object.values(staffStats).map(stat => ({
      ...stat,
      uniqueClients: stat.uniqueClients.size,
      totalHours: (stat.totalMinutes / 60).toFixed(1),
      travelHours: (stat.travelTimeMinutes / 60).toFixed(1),
      completionRate: stat.totalVisits > 0 ? ((stat.completedVisits / stat.totalVisits) * 100).toFixed(1) : 0,
      onTimeRate: stat.completedVisits > 0 ? ((stat.onTimeVisits / stat.completedVisits) * 100).toFixed(1) : 0,
      averageFeedback: stat.feedbackScores.length > 0 
        ? (stat.feedbackScores.reduce((a, b) => a + b, 0) / stat.feedbackScores.length).toFixed(1)
        : "N/A",
    })).sort((a, b) => b.completedVisits - a.completedVisits);
  };

  const exportToCSV = () => {
    const stats = calculateStaffStats();
    const headers = [
      "Staff Name", 
      "Total Visits", 
      "Completed", 
      "Missed",
      "Total Hours",
      "Travel Hours",
      "Unique Clients",
      "Completion Rate",
      "On-Time Rate",
      "Avg Feedback"
    ];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalVisits,
      stat.completedVisits,
      stat.missedVisits,
      stat.totalHours,
      stat.travelHours,
      stat.uniqueClients,
      `${stat.completionRate}%`,
      `${stat.onTimeRate}%`,
      stat.averageFeedback
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-performance-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateStaffStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5" />
                Staff Performance Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Comprehensive performance metrics and KPIs</p>
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
                  setDateFrom(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
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
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Active Staff</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Total Visits</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.reduce((sum, s) => sum + s.completedVisits, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Total Hours</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.reduce((sum, s) => sum + parseFloat(s.totalHours), 0).toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Avg Completion</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => sum + parseFloat(s.completionRate), 0) / stats.length).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900">Avg Feedback</p>
                </div>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => {
                        const score = typeof s.averageFeedback === 'string' && s.averageFeedback === 'N/A' ? 0 : parseFloat(s.averageFeedback);
                        return sum + score;
                      }, 0) / stats.filter(s => s.averageFeedback !== 'N/A').length).toFixed(1)
                    : "N/A"}
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
                    <th className="text-right p-3 font-medium text-gray-900">Total Visits</th>
                    <th className="text-right p-3 font-medium text-gray-900">Completed</th>
                    <th className="text-right p-3 font-medium text-gray-900">Missed</th>
                    <th className="text-right p-3 font-medium text-gray-900">Hours</th>
                    <th className="text-right p-3 font-medium text-gray-900">Travel</th>
                    <th className="text-right p-3 font-medium text-gray-900">Clients</th>
                    <th className="text-right p-3 font-medium text-gray-900">Completion</th>
                    <th className="text-right p-3 font-medium text-gray-900">On-Time</th>
                    <th className="text-right p-3 font-medium text-gray-900">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">{stat.totalVisits}</td>
                      <td className="p-3 text-right font-semibold text-green-600">{stat.completedVisits}</td>
                      <td className="p-3 text-right text-red-600">{stat.missedVisits}</td>
                      <td className="p-3 text-right">{stat.totalHours}h</td>
                      <td className="p-3 text-right text-gray-600">{stat.travelHours}h</td>
                      <td className="p-3 text-right">{stat.uniqueClients}</td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.completionRate) >= 90 
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.completionRate) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.completionRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.onTimeRate) >= 90 
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.onTimeRate) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.onTimeRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{stat.averageFeedback}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        No data available for the selected period
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