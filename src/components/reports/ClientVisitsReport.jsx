import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, UserCircle, Heart, Calendar } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientVisitsReport({ shifts, clients, carers, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedClient, setSelectedClient] = useState("all");

  const getFilteredShifts = () => {
    return shifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(shiftDate, { start: from, end: to });
        const matchesClient = selectedClient === "all" || shift.client_id === selectedClient;
        
        return inRange && matchesClient;
      } catch {
        return false;
      }
    });
  };

  const calculateClientStats = () => {
    const filteredShifts = getFilteredShifts();
    const clientStats = {};

    filteredShifts.forEach(shift => {
      if (!shift.client_id) return;

      if (!clientStats[shift.client_id]) {
        const client = clients.find(c => c.id === shift.client_id);
        clientStats[shift.client_id] = {
          name: client?.full_name || "Unknown",
          careNeeds: client?.care_needs || [],
          totalVisits: 0,
          completedVisits: 0,
          totalHours: 0,
          uniqueCarers: new Set(),
          missedVisits: 0,
        };
      }

      clientStats[shift.client_id].totalVisits++;
      
      if (shift.status === "completed") {
        clientStats[shift.client_id].completedVisits++;
        clientStats[shift.client_id].totalHours += shift.duration_hours || 0;
      } else if (shift.status === "cancelled") {
        clientStats[shift.client_id].missedVisits++;
      }

      if (shift.carer_id) {
        clientStats[shift.client_id].uniqueCarers.add(shift.carer_id);
      }
    });

    return Object.values(clientStats).map(stat => ({
      ...stat,
      uniqueCarers: stat.uniqueCarers.size,
      averageHoursPerVisit: stat.completedVisits > 0 ? (stat.totalHours / stat.completedVisits).toFixed(1) : 0,
      completionRate: stat.totalVisits > 0 ? ((stat.completedVisits / stat.totalVisits) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.totalVisits - a.totalVisits);
  };

  const exportToCSV = () => {
    const stats = calculateClientStats();
    const headers = ["Client Name", "Total Visits", "Completed", "Missed", "Total Hours", "Unique Carers", "Avg Hours/Visit", "Completion Rate"];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalVisits,
      stat.completedVisits,
      stat.missedVisits,
      stat.totalHours.toFixed(2),
      stat.uniqueCarers,
      stat.averageHoursPerVisit,
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
    link.download = `client-visits-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateClientStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Client Visit Summaries
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Overview of client care and visits</p>
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
              <Label htmlFor="client-filter">Filter by Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
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
                  setSelectedClient("all");
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Total Visits</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.reduce((sum, s) => sum + s.totalVisits, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Completed</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.reduce((sum, s) => sum + s.completedVisits, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Active Clients</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Missed Visits</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.reduce((sum, s) => sum + s.missedVisits, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Client Name</TableHead>
                  <TableHead>Care Needs</TableHead>
                  <TableHead className="text-right">Total Visits</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Missed</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Unique Carers</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {stat.careNeeds.slice(0, 2).map((need, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {need}
                          </Badge>
                        ))}
                        {stat.careNeeds.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{stat.careNeeds.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{stat.totalVisits}</TableCell>
                    <TableCell className="text-right">{stat.completedVisits}</TableCell>
                    <TableCell className="text-right">{stat.missedVisits}</TableCell>
                    <TableCell className="text-right font-semibold">{stat.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{stat.uniqueCarers}</TableCell>
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
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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