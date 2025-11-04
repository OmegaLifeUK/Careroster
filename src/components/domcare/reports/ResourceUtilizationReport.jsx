import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Activity, Users, Car, Clock, TrendingUp, Calendar } from "lucide-react";
import { format, parseISO, isWithinInterval, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export default function ResourceUtilizationReport({ visits, staff, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const getFilteredVisits = () => {
    return visits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        return isWithinInterval(visitDate, { start: from, end: to });
      } catch {
        return false;
      }
    });
  };

  const calculateResourceUtilization = () => {
    const filteredVisits = getFilteredVisits();
    const staffStats = {};

    // Calculate total available hours per day per staff member
    const daysInPeriod = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
    const standardDailyHours = 8; // Assuming 8-hour workdays

    filteredVisits.forEach(visit => {
      if (!visit.assigned_staff_id) return;

      if (!staffStats[visit.assigned_staff_id]) {
        const staffMember = staff.find(s => s.id === visit.assigned_staff_id);
        staffStats[visit.assigned_staff_id] = {
          name: staffMember?.full_name || "Unknown",
          vehicleType: staffMember?.vehicle_type || "N/A",
          totalVisits: 0,
          totalWorkMinutes: 0,
          totalTravelMinutes: 0,
          uniqueClients: new Set(),
          workingDays: new Set(),
          visitsByDay: {},
        };
      }

      const stats = staffStats[visit.assigned_staff_id];
      stats.totalVisits++;

      // Track unique clients
      if (visit.client_id) {
        stats.uniqueClients.add(visit.client_id);
      }

      // Track working days
      const visitDay = format(parseISO(visit.scheduled_start), "yyyy-MM-dd");
      stats.workingDays.add(visitDay);
      
      if (!stats.visitsByDay[visitDay]) {
        stats.visitsByDay[visitDay] = 0;
      }
      stats.visitsByDay[visitDay]++;

      // Calculate work time
      if (visit.scheduled_start && visit.scheduled_end) {
        const duration = differenceInMinutes(
          parseISO(visit.scheduled_end),
          parseISO(visit.scheduled_start)
        );
        stats.totalWorkMinutes += duration;
      }

      // Track travel time
      if (visit.estimated_travel_to_next) {
        stats.totalTravelMinutes += visit.estimated_travel_to_next;
      }
    });

    return Object.values(staffStats).map(stat => {
      const workingDays = stat.workingDays.size;
      const totalAvailableMinutes = workingDays * standardDailyHours * 60;
      const totalActiveMinutes = stat.totalWorkMinutes + stat.totalTravelMinutes;
      const utilizationRate = totalAvailableMinutes > 0 
        ? ((totalActiveMinutes / totalAvailableMinutes) * 100).toFixed(1)
        : 0;
      
      const avgVisitsPerDay = workingDays > 0 ? (stat.totalVisits / workingDays).toFixed(1) : 0;
      const workHours = (stat.totalWorkMinutes / 60).toFixed(1);
      const travelHours = (stat.totalTravelMinutes / 60).toFixed(1);
      const totalHours = ((stat.totalWorkMinutes + stat.totalTravelMinutes) / 60).toFixed(1);
      
      return {
        ...stat,
        uniqueClients: stat.uniqueClients.size,
        workingDays,
        utilizationRate,
        avgVisitsPerDay,
        workHours,
        travelHours,
        totalHours,
        travelPercentage: totalActiveMinutes > 0 
          ? ((stat.totalTravelMinutes / totalActiveMinutes) * 100).toFixed(1)
          : 0,
      };
    }).sort((a, b) => b.utilizationRate - a.utilizationRate);
  };

  const exportToCSV = () => {
    const stats = calculateResourceUtilization();
    const headers = [
      "Staff Name",
      "Vehicle Type",
      "Total Visits",
      "Working Days",
      "Work Hours",
      "Travel Hours",
      "Total Hours",
      "Utilization Rate",
      "Avg Visits/Day",
      "Unique Clients",
      "Travel %"
    ];
    const rows = stats.map(stat => [
      stat.name,
      stat.vehicleType,
      stat.totalVisits,
      stat.workingDays,
      stat.workHours,
      stat.travelHours,
      stat.totalHours,
      `${stat.utilizationRate}%`,
      stat.avgVisitsPerDay,
      stat.uniqueClients,
      `${stat.travelPercentage}%`
    ]);

    const csvContent = [
      "Resource Utilization Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resource-utilization-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateResourceUtilization();
  const avgUtilization = stats.length > 0
    ? (stats.reduce((sum, s) => sum + parseFloat(s.utilizationRate), 0) / stats.length).toFixed(1)
    : "0";
  
  const totalHours = stats.reduce((sum, s) => sum + parseFloat(s.totalHours), 0).toFixed(1);
  const vehicleBreakdown = stats.reduce((acc, s) => {
    acc[s.vehicleType] = (acc[s.vehicleType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Resource Utilization Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Staff and vehicle usage patterns</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setDateFrom(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
                  setDateTo(format(new Date(), "yyyy-MM-dd"));
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <p className="text-sm font-medium text-indigo-900">Avg Utilization</p>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{avgUtilization}%</p>
              </CardContent>
            </Card>

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
                  <Clock className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Total Hours</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{totalHours}h</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Avg Visits/Day</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => sum + parseFloat(s.avgVisitsPerDay), 0) / stats.length).toFixed(1)
                    : 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Vehicles</p>
                </div>
                <div className="text-sm text-orange-900 mt-1">
                  {Object.entries(vehicleBreakdown).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-medium text-gray-900">Staff Name</th>
                    <th className="text-right p-3 font-medium text-gray-900">Vehicle</th>
                    <th className="text-right p-3 font-medium text-gray-900">Visits</th>
                    <th className="text-right p-3 font-medium text-gray-900">Days Worked</th>
                    <th className="text-right p-3 font-medium text-gray-900">Work Hours</th>
                    <th className="text-right p-3 font-medium text-gray-900">Travel Hours</th>
                    <th className="text-right p-3 font-medium text-gray-900">Total Hours</th>
                    <th className="text-right p-3 font-medium text-gray-900">Utilization</th>
                    <th className="text-right p-3 font-medium text-gray-900">Avg Visits/Day</th>
                    <th className="text-right p-3 font-medium text-gray-900">Clients</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="capitalize">
                          {stat.vehicleType}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{stat.totalVisits}</td>
                      <td className="p-3 text-right">{stat.workingDays}</td>
                      <td className="p-3 text-right">{stat.workHours}h</td>
                      <td className="p-3 text-right text-gray-600">{stat.travelHours}h</td>
                      <td className="p-3 text-right font-semibold">{stat.totalHours}h</td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.utilizationRate) >= 80
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.utilizationRate) >= 60
                            ? "bg-blue-100 text-blue-800"
                            : parseFloat(stat.utilizationRate) >= 40
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-orange-100 text-orange-800"
                        }>
                          {stat.utilizationRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{stat.avgVisitsPerDay}</td>
                      <td className="p-3 text-right">{stat.uniqueClients}</td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        No utilization data available for the selected period
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