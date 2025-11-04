import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, ClipboardCheck, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CarePlanComplianceReport({ visits, staff, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedClient, setSelectedClient] = useState("all");

  const getFilteredVisits = () => {
    return visits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(visitDate, { start: from, end: to });
        const matchesClient = selectedClient === "all" || visit.client_id === selectedClient;
        
        return inRange && matchesClient && visit.status === 'completed';
      } catch {
        return false;
      }
    });
  };

  const calculateComplianceStats = () => {
    const filteredVisits = getFilteredVisits();
    const clientStats = {};

    filteredVisits.forEach(visit => {
      if (!visit.client_id) return;

      if (!clientStats[visit.client_id]) {
        const client = clients.find(c => c.id === visit.client_id);
        clientStats[visit.client_id] = {
          name: client?.full_name || "Unknown",
          careNeeds: client?.care_needs || [],
          standardDuration: client?.standard_visit_duration || 30,
          totalVisits: 0,
          tasksCompleted: 0,
          totalTasks: 0,
          onTimeVisits: 0,
          durationCompliance: 0,
          missedTasks: [],
        };
      }

      const stats = clientStats[visit.client_id];
      stats.totalVisits++;

      // Check task completion
      if (visit.tasks && visit.tasks.length > 0) {
        stats.totalTasks += visit.tasks.length;
        stats.tasksCompleted += visit.tasks.length; // Assume completed in completed visits
      }

      // Check duration compliance
      if (visit.actual_start && visit.actual_end) {
        const actualMinutes = Math.round((new Date(visit.actual_end) - new Date(visit.actual_start)) / 60000);
        const scheduledMinutes = Math.round((new Date(visit.scheduled_end) - new Date(visit.scheduled_start)) / 60000);
        const variance = Math.abs(actualMinutes - scheduledMinutes);
        
        if (variance <= 5) {
          stats.durationCompliance++;
        }
      }

      // Check on-time arrival
      if (visit.actual_start && visit.scheduled_start) {
        const lateness = Math.round((new Date(visit.actual_start) - new Date(visit.scheduled_start)) / 60000);
        if (Math.abs(lateness) <= 15) {
          stats.onTimeVisits++;
        }
      } else {
        stats.onTimeVisits++; // Assume on time if no actual time
      }
    });

    return Object.entries(clientStats).map(([clientId, stat]) => ({
      clientId,
      ...stat,
      taskComplianceRate: stat.totalTasks > 0 ? ((stat.tasksCompleted / stat.totalTasks) * 100).toFixed(1) : 100,
      durationComplianceRate: stat.totalVisits > 0 ? ((stat.durationCompliance / stat.totalVisits) * 100).toFixed(1) : 0,
      punctualityRate: stat.totalVisits > 0 ? ((stat.onTimeVisits / stat.totalVisits) * 100).toFixed(1) : 0,
      overallCompliance: stat.totalVisits > 0 
        ? (((stat.tasksCompleted / (stat.totalTasks || 1)) + (stat.durationCompliance / stat.totalVisits) + (stat.onTimeVisits / stat.totalVisits)) / 3 * 100).toFixed(1)
        : 0,
    })).sort((a, b) => parseFloat(b.overallCompliance) - parseFloat(a.overallCompliance));
  };

  const exportToCSV = () => {
    const stats = calculateComplianceStats();
    const headers = [
      "Client Name",
      "Total Visits",
      "Task Compliance",
      "Duration Compliance",
      "Punctuality",
      "Overall Compliance",
      "Care Needs Count"
    ];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalVisits,
      `${stat.taskComplianceRate}%`,
      `${stat.durationComplianceRate}%`,
      `${stat.punctualityRate}%`,
      `${stat.overallCompliance}%`,
      stat.careNeeds.length
    ]);

    const csvContent = [
      "Care Plan Compliance Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `care-plan-compliance-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateComplianceStats();
  const avgCompliance = stats.length > 0
    ? (stats.reduce((sum, s) => sum + parseFloat(s.overallCompliance), 0) / stats.length).toFixed(1)
    : "0";

  const highCompliance = stats.filter(s => parseFloat(s.overallCompliance) >= 90).length;
  const mediumCompliance = stats.filter(s => parseFloat(s.overallCompliance) >= 75 && parseFloat(s.overallCompliance) < 90).length;
  const lowCompliance = stats.filter(s => parseFloat(s.overallCompliance) < 75).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Care Plan Compliance Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Track adherence to care tasks and frequencies</p>
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
                  setDateFrom(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
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
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className="w-4 h-4 text-teal-600" />
                  <p className="text-sm font-medium text-teal-900">Avg Compliance</p>
                </div>
                <p className="text-2xl font-bold text-teal-900">{avgCompliance}%</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">High (≥90%)</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{highCompliance}</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900">Medium (75-89%)</p>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{mediumCompliance}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Low (below 75%)</p>
                </div>
                <p className="text-2xl font-bold text-red-900">{lowCompliance}</p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-medium text-gray-900">Client Name</th>
                    <th className="text-right p-3 font-medium text-gray-900">Visits</th>
                    <th className="text-right p-3 font-medium text-gray-900">Care Needs</th>
                    <th className="text-right p-3 font-medium text-gray-900">Task Compliance</th>
                    <th className="text-right p-3 font-medium text-gray-900">Duration</th>
                    <th className="text-right p-3 font-medium text-gray-900">Punctuality</th>
                    <th className="text-right p-3 font-medium text-gray-900">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">{stat.totalVisits}</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline">
                          {stat.careNeeds.length} needs
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.taskComplianceRate) >= 95
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.taskComplianceRate) >= 85
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.taskComplianceRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.durationComplianceRate) >= 90
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.durationComplianceRate) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.durationComplianceRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.punctualityRate) >= 90
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.punctualityRate) >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.punctualityRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.overallCompliance) >= 90
                            ? "bg-teal-100 text-teal-800"
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
                      <td colSpan={7} className="text-center py-8 text-gray-500">
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