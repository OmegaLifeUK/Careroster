import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, DollarSign, TrendingUp, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format, parseISO, isWithinInterval, differenceInMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinancialSummaryReport({ visits, staff, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState("all");

  // Standard rates (in production these would come from settings/client contracts)
  const HOURLY_RATE = 25.00; // £25 per hour standard rate
  const STAFF_HOURLY_COST = 15.00; // £15 per hour staff cost

  const getFilteredVisits = () => {
    return visits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(visitDate, { start: from, end: to });
        const matchesClient = selectedClient === "all" || visit.client_id === selectedClient;
        const matchesStaff = selectedStaff === "all" || visit.assigned_staff_id === selectedStaff;
        const isCompleted = visit.status === 'completed';
        
        return inRange && matchesClient && matchesStaff && isCompleted;
      } catch {
        return false;
      }
    });
  };

  const calculateFinancialStats = () => {
    const filteredVisits = getFilteredVisits();
    const clientStats = {};

    filteredVisits.forEach(visit => {
      if (!visit.client_id) return;

      if (!clientStats[visit.client_id]) {
        const client = clients.find(c => c.id === visit.client_id);
        clientStats[visit.client_id] = {
          name: client?.full_name || "Unknown",
          fundingType: client?.funding_type || "self_funded",
          totalVisits: 0,
          scheduledMinutes: 0,
          actualMinutes: 0,
          billedAmount: 0,
          costAmount: 0,
        };
      }

      const stats = clientStats[visit.client_id];
      stats.totalVisits++;

      // Calculate scheduled duration
      if (visit.scheduled_start && visit.scheduled_end) {
        const scheduledDuration = differenceInMinutes(
          parseISO(visit.scheduled_end),
          parseISO(visit.scheduled_start)
        );
        stats.scheduledMinutes += scheduledDuration;
        stats.billedAmount += (scheduledDuration / 60) * HOURLY_RATE;
      }

      // Calculate actual duration
      if (visit.actual_start && visit.actual_end) {
        const actualDuration = differenceInMinutes(
          parseISO(visit.actual_end),
          parseISO(visit.actual_start)
        );
        stats.actualMinutes += actualDuration;
        stats.costAmount += (actualDuration / 60) * STAFF_HOURLY_COST;
      } else {
        // If no actual time, use scheduled for cost
        const scheduledDuration = differenceInMinutes(
          parseISO(visit.scheduled_end),
          parseISO(visit.scheduled_start)
        );
        stats.actualMinutes += scheduledDuration;
        stats.costAmount += (scheduledDuration / 60) * STAFF_HOURLY_COST;
      }
    });

    return Object.entries(clientStats).map(([clientId, stat]) => ({
      clientId,
      ...stat,
      scheduledHours: (stat.scheduledMinutes / 60).toFixed(1),
      actualHours: (stat.actualMinutes / 60).toFixed(1),
      variance: ((stat.actualMinutes - stat.scheduledMinutes) / 60).toFixed(1),
      variancePercent: stat.scheduledMinutes > 0 
        ? (((stat.actualMinutes - stat.scheduledMinutes) / stat.scheduledMinutes) * 100).toFixed(1)
        : 0,
      margin: (stat.billedAmount - stat.costAmount).toFixed(2),
      marginPercent: stat.billedAmount > 0 
        ? (((stat.billedAmount - stat.costAmount) / stat.billedAmount) * 100).toFixed(1)
        : 0,
    })).sort((a, b) => b.billedAmount - a.billedAmount);
  };

  const exportToCSV = () => {
    const stats = calculateFinancialStats();
    const headers = [
      "Client Name",
      "Funding Type",
      "Total Visits",
      "Scheduled Hours",
      "Actual Hours",
      "Variance Hours",
      "Billed Amount",
      "Cost Amount",
      "Margin",
      "Margin %"
    ];
    const rows = stats.map(stat => [
      stat.name,
      stat.fundingType,
      stat.totalVisits,
      stat.scheduledHours,
      stat.actualHours,
      stat.variance,
      `£${stat.billedAmount.toFixed(2)}`,
      `£${stat.costAmount.toFixed(2)}`,
      `£${stat.margin}`,
      `${stat.marginPercent}%`
    ]);

    const csvContent = [
      "Financial Summary Report",
      `Period: ${dateFrom} to ${dateTo}`,
      `Hourly Rate: £${HOURLY_RATE}`,
      `Staff Cost: £${STAFF_HOURLY_COST}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-summary-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateFinancialStats();
  
  const totals = {
    billedAmount: stats.reduce((sum, s) => sum + parseFloat(s.billedAmount), 0).toFixed(2),
    costAmount: stats.reduce((sum, s) => sum + parseFloat(s.costAmount), 0).toFixed(2),
    margin: stats.reduce((sum, s) => sum + parseFloat(s.margin), 0).toFixed(2),
    scheduledHours: stats.reduce((sum, s) => sum + parseFloat(s.scheduledHours), 0).toFixed(1),
    actualHours: stats.reduce((sum, s) => sum + parseFloat(s.actualHours), 0).toFixed(1),
  };

  const avgMarginPercent = stats.length > 0
    ? (stats.reduce((sum, s) => sum + parseFloat(s.marginPercent), 0) / stats.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-green-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Summary Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Billed vs actual hours and financial analysis</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              <Label htmlFor="client-filter">Client</Label>
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
            <div>
              <Label htmlFor="staff-filter">Staff</Label>
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
                  setSelectedClient("all");
                  setSelectedStaff("all");
                }}
                variant="outline"
                className="w-full"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-900">Total Billed</p>
                </div>
                <p className="text-2xl font-bold text-emerald-900">£{totals.billedAmount}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Total Cost</p>
                </div>
                <p className="text-2xl font-bold text-red-900">£{totals.costAmount}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Net Margin</p>
                </div>
                <p className="text-2xl font-bold text-green-900">£{totals.margin}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Scheduled Hrs</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{totals.scheduledHours}h</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Actual Hrs</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">{totals.actualHours}h</p>
              </CardContent>
            </Card>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Standard billing rate: £{HOURLY_RATE}/hour | Staff cost: £{STAFF_HOURLY_COST}/hour | 
              Average margin: {avgMarginPercent}%
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-medium text-gray-900">Client Name</th>
                    <th className="text-right p-3 font-medium text-gray-900">Funding</th>
                    <th className="text-right p-3 font-medium text-gray-900">Visits</th>
                    <th className="text-right p-3 font-medium text-gray-900">Scheduled Hrs</th>
                    <th className="text-right p-3 font-medium text-gray-900">Actual Hrs</th>
                    <th className="text-right p-3 font-medium text-gray-900">Variance</th>
                    <th className="text-right p-3 font-medium text-gray-900">Billed</th>
                    <th className="text-right p-3 font-medium text-gray-900">Cost</th>
                    <th className="text-right p-3 font-medium text-gray-900">Margin</th>
                    <th className="text-right p-3 font-medium text-gray-900">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stat.name}</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="text-xs capitalize">
                          {stat.fundingType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{stat.totalVisits}</td>
                      <td className="p-3 text-right">{stat.scheduledHours}h</td>
                      <td className="p-3 text-right">{stat.actualHours}h</td>
                      <td className="p-3 text-right">
                        <span className={parseFloat(stat.variance) > 0 ? "text-red-600" : "text-green-600"}>
                          {parseFloat(stat.variance) > 0 ? "+" : ""}{stat.variance}h
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600">
                        £{parseFloat(stat.billedAmount).toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        £{parseFloat(stat.costAmount).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        £{stat.margin}
                      </td>
                      <td className="p-3 text-right">
                        <Badge className={
                          parseFloat(stat.marginPercent) >= 30
                            ? "bg-green-100 text-green-800"
                            : parseFloat(stat.marginPercent) >= 20
                            ? "bg-blue-100 text-blue-800"
                            : parseFloat(stat.marginPercent) >= 10
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {stat.marginPercent}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        No financial data available for the selected period
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