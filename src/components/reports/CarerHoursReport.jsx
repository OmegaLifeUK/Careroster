import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Printer, Award, Clock, CheckCircle } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CarerHoursReport({ shifts, carers, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCarer, setSelectedCarer] = useState("all");

  const getFilteredShifts = () => {
    return shifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(shiftDate, { start: from, end: to });
        const matchesCarer = selectedCarer === "all" || shift.carer_id === selectedCarer;
        
        return inRange && matchesCarer;
      } catch {
        return false;
      }
    });
  };

  const calculateCarerStats = () => {
    const filteredShifts = getFilteredShifts();
    const carerStats = {};

    filteredShifts.forEach(shift => {
      if (!shift.carer_id) return;

      if (!carerStats[shift.carer_id]) {
        const carer = carers.find(c => c.id === shift.carer_id);
        carerStats[shift.carer_id] = {
          name: carer?.full_name || "Unknown",
          totalHours: 0,
          completedShifts: 0,
          scheduledShifts: 0,
          noShows: 0,
          averageHoursPerShift: 0,
        };
      }

      const hours = shift.duration_hours || 0;
      carerStats[shift.carer_id].totalHours += hours;
      
      if (shift.status === "completed") {
        carerStats[shift.carer_id].completedShifts++;
      } else if (shift.status === "scheduled" || shift.status === "in_progress") {
        carerStats[shift.carer_id].scheduledShifts++;
      } else if (shift.status === "cancelled") {
        carerStats[shift.carer_id].noShows++;
      }
    });

    Object.values(carerStats).forEach(stat => {
      const totalShifts = stat.completedShifts + stat.scheduledShifts + stat.noShows;
      stat.averageHoursPerShift = totalShifts > 0 ? (stat.totalHours / totalShifts).toFixed(1) : 0;
      stat.completionRate = totalShifts > 0 ? ((stat.completedShifts / totalShifts) * 100).toFixed(1) : 0;
    });

    return Object.values(carerStats).sort((a, b) => b.totalHours - a.totalHours);
  };

  const exportToCSV = () => {
    const stats = calculateCarerStats();
    const headers = ["Carer Name", "Total Hours", "Completed Shifts", "Scheduled Shifts", "No Shows", "Avg Hours/Shift", "Completion Rate"];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalHours.toFixed(2),
      stat.completedShifts,
      stat.scheduledShifts,
      stat.noShows,
      stat.averageHoursPerShift,
      `${stat.completionRate}%`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carer-hours-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const printReport = () => {
    window.print();
  };

  const stats = calculateCarerStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Carer Hours & Performance Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Track working hours and performance metrics</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={printReport}>
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
              <Label htmlFor="carer-filter">Filter by Carer</Label>
              <Select value={selectedCarer} onValueChange={setSelectedCarer}>
                <SelectTrigger id="carer-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carers</SelectItem>
                  {carers.map(carer => (
                    <SelectItem key={carer.id} value={carer.id}>
                      {carer.full_name}
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
                  setSelectedCarer("all");
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Total Hours</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.reduce((sum, s) => sum + s.totalHours, 0).toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Completed</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.reduce((sum, s) => sum + s.completedShifts, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Avg Hours/Shift</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.length > 0 
                    ? (stats.reduce((sum, s) => sum + parseFloat(s.averageHoursPerShift), 0) / stats.length).toFixed(1)
                    : "0"}h
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Active Carers</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Carer Name</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Scheduled</TableHead>
                  <TableHead className="text-right">No Shows</TableHead>
                  <TableHead className="text-right">Avg Hours/Shift</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell className="text-right font-semibold">{stat.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{stat.completedShifts}</TableCell>
                    <TableCell className="text-right">{stat.scheduledShifts}</TableCell>
                    <TableCell className="text-right">{stat.noShows}</TableCell>
                    <TableCell className="text-right">{stat.averageHoursPerShift}h</TableCell>
                    <TableCell className="text-right">
                      <Badge className={
                        parseFloat(stat.completionRate) >= 90 
                          ? "bg-green-100 text-green-800"
                          : parseFloat(stat.completionRate) >= 70
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }>
                        {stat.completionRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}