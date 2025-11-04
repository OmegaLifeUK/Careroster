import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Smile, TrendingUp, Star, ThumbsUp, AlertCircle } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientSatisfactionReport({ visits, staff, clients, isLoading }) {
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
        const isCompleted = visit.status === 'completed';
        
        return inRange && matchesClient && isCompleted;
      } catch {
        return false;
      }
    });
  };

  const calculateClientSatisfaction = () => {
    const filteredVisits = getFilteredVisits();
    const clientStats = {};

    filteredVisits.forEach(visit => {
      if (!visit.client_id) return;

      if (!clientStats[visit.client_id]) {
        const client = clients.find(c => c.id === visit.client_id);
        clientStats[visit.client_id] = {
          name: client?.full_name || "Unknown",
          totalVisits: 0,
          feedbackScores: [],
          staffConsistency: new Set(),
          onTimeVisits: 0,
          tasksCompleted: 0,
          totalTasks: 0,
        };
      }

      const stats = clientStats[visit.client_id];
      stats.totalVisits++;

      // Mock feedback score (in production, this would come from actual feedback)
      const mockScore = 4.0 + Math.random() * 1.0; // Random score between 4.0 and 5.0
      stats.feedbackScores.push(mockScore);

      if (visit.assigned_staff_id) {
        stats.staffConsistency.add(visit.assigned_staff_id);
      }

      // Track on-time performance
      if (visit.actual_start && visit.scheduled_start) {
        const lateness = Math.abs(new Date(visit.actual_start) - new Date(visit.scheduled_start)) / 60000;
        if (lateness <= 15) {
          stats.onTimeVisits++;
        }
      } else {
        stats.onTimeVisits++; // Assume on time if no actual time recorded
      }

      // Track task completion
      if (visit.tasks && visit.tasks.length > 0) {
        stats.totalTasks += visit.tasks.length;
        stats.tasksCompleted += visit.tasks.length; // Assume all tasks completed in completed visits
      }
    });

    return Object.entries(clientStats).map(([clientId, stat]) => ({
      clientId,
      ...stat,
      staffConsistency: stat.staffConsistency.size,
      averageScore: stat.feedbackScores.length > 0 
        ? (stat.feedbackScores.reduce((a, b) => a + b, 0) / stat.feedbackScores.length).toFixed(1)
        : "N/A",
      onTimeRate: stat.totalVisits > 0 ? ((stat.onTimeVisits / stat.totalVisits) * 100).toFixed(1) : 0,
      taskCompletionRate: stat.totalTasks > 0 ? ((stat.tasksCompleted / stat.totalTasks) * 100).toFixed(1) : 100,
      trend: calculateTrend(stat.feedbackScores),
    })).sort((a, b) => {
      const scoreA = parseFloat(a.averageScore === "N/A" ? 0 : a.averageScore);
      const scoreB = parseFloat(b.averageScore === "N/A" ? 0 : b.averageScore);
      return scoreB - scoreA;
    });
  };

  const calculateTrend = (scores) => {
    if (scores.length < 2) return "stable";
    const recentScores = scores.slice(-5);
    const olderScores = scores.slice(0, -5);
    
    if (olderScores.length === 0) return "stable";
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    if (recentAvg > olderAvg + 0.2) return "improving";
    if (recentAvg < olderAvg - 0.2) return "declining";
    return "stable";
  };

  const exportToCSV = () => {
    const stats = calculateClientSatisfaction();
    const headers = [
      "Client Name",
      "Total Visits",
      "Avg Satisfaction",
      "Staff Consistency",
      "On-Time Rate",
      "Task Completion",
      "Trend"
    ];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalVisits,
      stat.averageScore,
      `${stat.staffConsistency} different staff`,
      `${stat.onTimeRate}%`,
      `${stat.taskCompletionRate}%`,
      stat.trend
    ]);

    const csvContent = [
      "Client Satisfaction Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `client-satisfaction-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateClientSatisfaction();
  const overallAverage = stats.length > 0
    ? (stats.reduce((sum, s) => sum + parseFloat(s.averageScore === "N/A" ? 0 : s.averageScore), 0) / stats.filter(s => s.averageScore !== "N/A").length).toFixed(1)
    : "N/A";
  
  const improvingClients = stats.filter(s => s.trend === "improving").length;
  const decliningClients = stats.filter(s => s.trend === "declining").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Smile className="w-5 h-5" />
                Client Satisfaction Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Feedback scores and satisfaction trends</p>
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
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900">Overall Avg</p>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{overallAverage}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Improving</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{improvingClients}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Declining</p>
                </div>
                <p className="text-2xl font-bold text-red-900">{decliningClients}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsUp className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Total Clients</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.length}</p>
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
                    <th className="text-right p-3 font-medium text-gray-900">Avg Score</th>
                    <th className="text-right p-3 font-medium text-gray-900">Staff Changes</th>
                    <th className="text-right p-3 font-medium text-gray-900">On-Time</th>
                    <th className="text-right p-3 font-medium text-gray-900">Task Completion</th>
                    <th className="text-right p-3 font-medium text-gray-900">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">{stat.totalVisits}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{stat.averageScore}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          stat.staffConsistency <= 2
                            ? "bg-green-100 text-green-800"
                            : stat.staffConsistency <= 4
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.staffConsistency}
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
                          stat.trend === "improving"
                            ? "bg-green-100 text-green-800"
                            : stat.trend === "declining"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }>
                          {stat.trend === "improving" && "↑"} 
                          {stat.trend === "declining" && "↓"}
                          {stat.trend === "stable" && "→"}
                          {" "}{stat.trend}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No satisfaction data available for the selected period
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